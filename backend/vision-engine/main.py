import os
import uuid
from typing import Any, Dict, List, Literal, Optional
import glob
from pypdf import PdfReader
import ollama
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError
import uvicorn
import json
from pymongo import MongoClient

try:
    import easyocr
except ImportError:
    easyocr = None

leitor_ocr = None

def get_leitor_ocr():
    """Inicializa o leitor OCR apenas na primeira vez que for utilizado."""
    global leitor_ocr
    if leitor_ocr is None and easyocr is not None:
        try:
            leitor_ocr = easyocr.Reader(['pt'], gpu=False)
        except Exception:
            leitor_ocr = None
    return leitor_ocr

# --- INICIALIZAÇÃO DA API E ARMAZENAMENTO EM MEMÓRIA ---
app = FastAPI(title="FalaTexto LLM Gateway API (Assíncrona)")

PASTA_PROMPTS = "prompts"

# Cache global para armazenar os exemplos do prompt de sistema (Few-Shot)
EXEMPLOS_FEW_SHOT_CACHE = ""

# Fila em memória para gerenciar o status das sessões de processamento
fila_de_sessoes: Dict[str, Any] = {}

# --- CONFIGURAÇÃO DE SEGURANÇA (CORS) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURAÇÃO DO OLLAMA ---
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
client = ollama.Client(host=OLLAMA_HOST)
MODELO = os.getenv("OLLAMA_MODEL", "gemma:7b")

# --- CONFIGURAÇÃO DO MONGODB ---
# Conexão utilizando a rede interna do Docker (host 'database')
MONGO_URI = os.getenv("MONGO_URI", "mongodb://database:27017")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["assis_db"]

# --- SCHEMAS DE VALIDAÇÃO (PYDANTIC V2) ---
class CampoDinamico(BaseModel):
    campo_id: str = Field(description="ID único em snake_case")
    label: str = Field(description="Nome amigável do campo")
    valor: Any = Field(None, description="Valor dinâmico extraído")
    tipo_componente: Literal["checkbox", "texto", "numero", "Texto", "Numero", "Checkbox", "data", "Data"] = Field(description="Tipo de input do Front")

class SecaoDinamica(BaseModel):
    titulo_secao: str = Field(description="Título do bloco de dados")
    campos: List[CampoDinamico] = Field(description="Lista de campos dentro da seção")

class ProntuarioUniversal(BaseModel):
    tipo_documento: str = Field(description="Tipo do prontuário ou consulta")
    secoes: List[SecaoDinamica] = Field(description="Seções do documento")
    resumo_narrativo: Optional[str] = Field(default="", description="Resumo descritivo da consulta")


def extrair_texto_de_imagem_local(caminho_imagem: str) -> str:
    """
    Executa o OCR em uma imagem local utilizando a biblioteca EasyOCR.
    Retorna o texto detectado unificado em uma única string.
    """
    ocr = get_leitor_ocr()
    if ocr is None:
        return ""
    try:
        resultado = ocr.readtext(caminho_imagem, detail=0)
        return "\n".join(resultado)
    except Exception:
        return ""


def carregar_exemplos_da_pasta(pasta: str) -> str:
    """
    Varre o diretório de prompts mapeando pares de imagem e JSON.
    Gera a estrutura de suporte para a técnica de Few-Shot Prompting na LLM.
    """
    blocos_exemplo = ""
    extensoes_imagem = ["*.png", "*.jpg", "*.jpeg", "*.webp"]
    arquivos_imagem = []
    
    for ext in extensoes_imagem:
        arquivos_imagem.extend(glob.glob(os.path.join(pasta, ext)))
    
    for caminho_img in arquivos_imagem:
        try:
            caminho_base = os.path.splitext(caminho_img)[0]
            caminho_json = caminho_base + ".json"
            
            if os.path.exists(caminho_json):
                texto_extraido_da_imagem = extrair_texto_de_imagem_local(caminho_img)
                
                with open(caminho_json, "r", encoding="utf-8") as f_json:
                    conteudo_json_esperado = f_json.read()
                
                nome_exemplo = os.path.basename(caminho_base)

                blocos_exemplo += f"\n### EXEMPLO DE REFERÊNCIA DE DOCUMENTO ({nome_exemplo}):\n"
                blocos_exemplo += f"Texto extraído visualmente da imagem pelo OCR:\n\"{texto_extraido_da_imagem}\"\n\n"
                blocos_exemplo += f"SAÍDA JSON ESPERADA CORRESPONDENTE:\n{conteudo_json_esperado}\n"
                blocos_exemplo += "-" * 50 + "\n"
                
        except Exception as e:
            print(f"Erro ao carregar par de exemplos ({caminho_img}): {str(e)}")
            continue
            
    return blocos_exemplo


@app.on_event("startup")
def inicializar_prompts_sistema():
    global EXEMPLOS_FEW_SHOT_CACHE
    print("Carregando base de exemplos do diretório prompts...")
    EXEMPLOS_FEW_SHOT_CACHE = carregar_exemplos_da_pasta(PASTA_PROMPTS)
    print("Exemplos pré-carregados na memória com sucesso.")


# --- PROCESSAMENTO ASSÍNCRONO EM SEGUNDO PLANO ---
# Função definida como síncrona comum (def) para delegação em thread pool separada,
# impedindo o bloqueio do loop de eventos principal do FastAPI durante a execução da LLM e OCR.
def processar_llm_em_segundo_plano(
    id_sessao: str, 
    texto_clinico: str, 
    conteudo_arquivo: bytes = None, 
    nome_arquivo: str = None
):
    global EXEMPLOS_FEW_SHOT_CACHE

    
    prompt_sistema = f"""You are a universal medical AI extraction engine. Your SOLE task is to convert raw clinical data (text/OCR) into the exact JSON schema provided below.

    You are STRICTLY FORBIDDEN from creating keys like 'patient', 'consultation', 'diagnosis', or any other key not present in the schema below. Every piece of clinical information (e.g., patient name, age, clinical findings, checklist items, doctor's notes) MUST be mapped inside the 'campos' array divided into 'secoes'.

    CRITICAL INSTRUCTION - STRICT SKELETON & FULL COVERAGE:
    - DO NOT SKIP, OMIT, COMBINE, OR TRUNCATE ANY FIELD OR CHECKLIST ITEM.
    - If the input matches a document structure found in FEW-SHOT EXAMPLES (e.g., 'Lista de Verificação de Cirurgia Segura'), you MUST preserve ALL sections ('secoes') and fields ('campos') defined in that template.
    - Map the extracted text/audio to each field in the template. If a field is mentioned, update its 'valor' (true/false for checkboxes, string/number for inputs). If a field is NOT mentioned, set its 'valor' to null. NEVER delete the field object.

    You MUST strictly return a JSON object with this exact structure:
    {{
    "tipo_documento": "Ex: Lista de Verificação de Cirurgia Segura, Prontuário Ambulatorial",
    "secoes": [
        {{
        "titulo_secao": "Exact Section Name from document (Ex: Identificação Básica, 1. Antes da Indução Anestésica)",
        "campos": [
            {{
            "campo_id": "field_identifier_in_snake_case (Ex: nome_paciente, sitio_cirurgico_correto, contagem_compressas)",
            "label": "Human-readable label as written on the document",
            "valor": "Extracted value (String, Number, boolean true/false, or null if unmentioned/blank)",
            "tipo_componente": "Strictly defined as 'texto', 'numero', or 'checkbox'"
            }}
        ]
        }}
    ],
    "resumo_narrativo": "A comprehensive, continuous formal medical narrative summarizing the entire form and findings."
    }}

    GOLDEN RULES:
    1. Never alter the primary key names ('tipo_documento', 'secoes', 'titulo_secao', 'campos', 'campo_id', 'label', 'valor', 'tipo_componente', 'resumo_narrativo'). Keep key names exactly as defined in Portuguese to preserve backend contracts.
    2. Output ONLY pure JSON. No markdown code blocks wrapping, no explanatory text before or after.
    3. The 'tipo_componente' field MUST ALWAYS be lowercase string: 'texto', 'numero', or 'checkbox'. Never use 'Texto', 'Date', or 'String'.
    4. For missing or unformatted values, assign null. NEVER hallucinate names, dates, or clinical facts that are not present in the input.
    5. For checkboxes, radios, or option lists:
    - If an option is selected/checked, set 'valor' to true or the selected option string, and 'tipo_componente' to 'checkbox'.
    - If an option is explicitly marked as unchecked or "Não/No", evaluate accordingly (false or null).
    6. Section titles ('titulo_secao') and field labels ('label') MUST be in Portuguese, strictly derived from the medical document context.

    FEW-SHOT EXAMPLES FOR STRUCTURAL GUIDANCE ONLY:
    {EXEMPLOS_FEW_SHOT_CACHE}

    STRICT ISOLATION & DATA INTEGRITY RULES:
    1. NEVER copy terms, medical concepts, or placeholder data from the examples above into the result.
    2. DO NOT use structural terms like 'Few-Shot', 'Example', or 'Fewo' in section titles or field IDs.
    3. For fields containing dates (e.g., birth dates, surgical dates), set 'tipo_componente' strictly to 'texto'.
    4. Ensure 100% field coverage: Header info, all checklist columns, notes, and footer fields (e.g., Responsável, Data) must be included in the JSON.
    """
    mensagens = [{"role": "system", "content": prompt_sistema}]
    caminho_temporario = None

    try:
        # 1. PROCESSAMENTO DE ENTRADAS DE ARQUIVOS
        if conteudo_arquivo and nome_arquivo:
            extensao = nome_arquivo.lower().split('.')[-1]
            caminho_temporario = f"temp_{id_sessao}_{nome_arquivo}"
            
            with open(caminho_temporario, "wb") as f:
                f.write(conteudo_arquivo)

            if extensao in ["png", "jpg", "jpeg", "webp"]:
                texto_da_imagem_usuario = extrair_texto_de_imagem_local(caminho_temporario)
                texto_clinico += f"\n\n[CONTEÚDO EXTRAÍDO DA IMAGEM DO USUÁRIO]:\n{texto_da_imagem_usuario}"

            elif extensao == "pdf":
                reader = PdfReader(caminho_temporario)
                texto_extraido_pdf = "".join([p.extract_text() or "" for p in reader.pages])
                texto_clinico += f"\n\n[CONTEÚDO EXTRAÍDO DO PDF]:\n{texto_extraido_pdf}"

            elif extensao == "csv":
                texto_clinico += f"\n\n[CONTEÚDO EXTRAÍDO DO CSV]:\n{conteudo_arquivo.decode('utf-8', errors='ignore')}"

        mensagens.append({"role": "user", "content": f"Processe as seguintes informações médicas seguindo o padrão estabelecido: {texto_clinico}"})

        # 2. EXECUÇÃO DO MODELO NO OLLAMA
        response = client.chat(
            model=MODELO, 
            format='json', 
            options={
                'temperature': 0.0,   
                'num_predict': 2048,  
                'num_ctx': 8192       
            }, 
            messages=mensagens
        )

        if caminho_temporario and os.path.exists(caminho_temporario):
            os.remove(caminho_temporario)

        # 3. VALIDAÇÃO E PARSING DO RETORNO VIA PYDANTIC
        resposta_pura_llm = response['message']['content']
        dados_validados = ProntuarioUniversal.model_validate_json(resposta_pura_llm)

        # 4. PERSISTÊNCIA DOS DADOS NO MONGODB
        dados_prontuario = dados_validados.model_dump()
        
        # Estruturação do payload mapeando o esquema esperado pela rota GET /forms do Core
        secoes_formatadas = []
        for secao in dados_prontuario.get("secoes", []):
            campos_formatados = []
            for campo in secao.get("campos", []):
                campos_formatados.append({
                    "id": campo.get("campo_id"),
                    "label": campo.get("label"),
                    "value": campo.get("valor"),
                    "type": str(campo.get("tipo_componente")).lower() if campo.get("tipo_componente") else "texto"
                })
            
            secoes_formatadas.append({
                "title": secao.get("titulo_secao"),
                "fields": campos_formatados
            })

        documento_mongo = {
            "_id": id_sessao,
            "name": f"Prontuário Automático - {dados_prontuario.get('tipo_documento', 'Atendimento')}",
            "metadata": {
                   "version": "1.0",
                   "active": True
             },
            "sections": secoes_formatadas
        }
        
        # Persistência na coleção 'forms'
        db.forms.insert_one(documento_mongo)

        # Atualização de estado na fila em memória para consulta via GET /status
        fila_de_sessoes[id_sessao] = {
            "status": "executed",
            "dados": dados_prontuario
        }

    except ValidationError as erro_schema:
        if caminho_temporario and os.path.exists(caminho_temporario): os.remove(caminho_temporario)
        fila_de_sessoes[id_sessao] = {
            "status": "failed",
            "erro": "Erro de Validação: A IA não seguiu o Schema do banco de dados.",
            "detalhes": erro_schema.errors()
        }
    except Exception as e:
        if caminho_temporario and os.path.exists(caminho_temporario): os.remove(caminho_temporario)
        fila_de_sessoes[id_sessao] = {
            "status": "failed",
            "erro": str(e)
        }

@app.post("/api/processar-clinica")
async def empilhar_processamento_clinico(
    background_tasks: BackgroundTasks,
    arquivo: UploadFile = File(None),
    texto_clinico: str = Form(...),
):
    id_sessao = str(uuid.uuid4())
    fila_de_sessoes[id_sessao] = {"status": "pending"}

    conteudo_arquivo = None
    nome_arquivo = None
    if arquivo and arquivo.filename:
        conteudo_arquivo = await arquivo.read()
        nome_arquivo = arquivo.filename

    # Adição da tarefa ao BackgroundTasks para execução assíncrona
    background_tasks.add_task(
        processar_llm_em_segundo_plano, 
        id_sessao, 
        texto_clinico, 
        conteudo_arquivo, 
        nome_arquivo
    )

    return {
        "mensagem": "Requisição empilhada com sucesso.",
        "id_sessao": id_sessao,
        "status": "pending",
        "link_consulta": f"/api/status/{id_sessao}"
    }

@app.get("/api/status/{id_sessao}")
async def consultar_status_sessao(id_sessao: str):
    sessao = fila_de_sessoes.get(id_sessao)
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão não encontrada ou expirada.")
    return sessao

@app.get("/api/sessoes")
async def listar_sessoes_disponiveis():
    if not fila_de_sessoes:
        return {
            "total_sessoes": 0,
            "mensagem": "Nenhuma sessão ativa ou registrada no momento.",
            "sessoes": []
        }
    
    historico_sessoes = []
    for id_sessao, dados_da_sessao in fila_de_sessoes.items():
        historico_sessoes.append({
            "id_sessao": id_sessao,
            "status": dados_da_sessao["status"]
        })
        
    return {
        "total_sessoes": len(historico_sessoes),
        "sessoes": historico_sessoes
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)