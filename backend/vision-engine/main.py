import os
import uuid
from typing import Any, Dict, List, Literal, Optional
import glob
from pypdf import PdfReader
import ollama
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError
import uvicorn
import json

try:
    import easyocr
    leitor_ocr = easyocr.Reader(['pt'])
except ImportError:
    leitor_ocr = None

# --- INICIALIZAÇÃO DA API E "BANCO DE DADOS" EM MEMÓRIA ---
app = FastAPI(title="FalaTexto LLM Gateway API (Assíncrona)")

PASTA_PROMPTS = "prompts"

# Memória cache global para os exemplos do prompt de sistema
EXEMPLOS_FEW_SHOT_CACHE = ""

# Fila em memória para armazenar o status das requisições e os dados processados.
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

# --- SCHEMAS DE VALIDAÇÃO (PYDANTIC V2) ---
class CampoDinamico(BaseModel):
    campo_id: str = Field(description="ID único em snake_case")
    label: str = Field(description="Nome amigável do campo")
    valor: Any = Field(None, description="Valor dinâmico extraído")
    tipo_componente: Literal["checkbox", "texto", "numero", "Texto", "Numero", "Checkbox"] = Field(description="Tipo de input do Front")

class SecaoDinamica(BaseModel):
    titulo_secao: str = Field(description="Título do bloco de dados")
    campos: List[CampoDinamico] = Field(description="Lista de campos dentro da seção")

class ProntuarioUniversal(BaseModel):
    tipo_documento: str = Field(description="Tipo do prontuário ou consulta")
    secoes: List[SecaoDinamica] = Field(description="Seções do documento")
    resumo_narrativo: str = Field(description="Resumo descritivo da consulta")


def extrair_texto_de_imagem_local(caminho_imagem: str) -> str:
    """
    Executa o OCR (Reconhecimento Óptico de Caracteres) em uma imagem local.
    Retorna todo o texto detectado unificado em uma única string.
    """
    # Evita quebra do sistema se o motor de OCR não tiver sido inicializado
    if leitor_ocr is None:
        return ""
    try:
        # Lê o texto da imagem. 'detail=0' extrai apenas o texto puro,
        # ignorando as coordenadas espaciais dos blocos na imagem.
        resultado = leitor_ocr.readtext(caminho_imagem, detail=0)
        return "\n".join(resultado)
    except Exception:
        # Captura falhas na leitura ou imagens corrompidas, retornando vazio sem travar a API
        return ""


def carregar_exemplos_da_pasta(pasta: str) -> str:
    """
    Varre um diretório buscando pares de Imagem + JSON para criar um gabarito de referência.
    Esse gabarito aplica a técnica de Few-Shot Prompting, ensinando a LLM a estruturar a saída.
    """
    blocos_exemplo = ""
    extensoes_imagem = ["*.png", "*.jpg", "*.jpeg", "*.webp"]
    arquivos_imagem = []
    
    # Mapeia todas as imagens presentes na pasta de exemplos com base nas extensões válidas
    for ext in extensoes_imagem:
        arquivos_imagem.extend(glob.glob(os.path.join(pasta, ext)))
    
    for caminho_img in arquivos_imagem:
        try:
            # Obtém o caminho base (sem extensão) para deduzir o arquivo .json correspondente
            caminho_base = os.path.splitext(caminho_img)[0]
            caminho_json = caminho_base + ".json"
            
            # O exemplo só é considerado válido se possuir a imagem E a resposta JSON esperada
            if os.path.exists(caminho_json):
                # Extrai o texto da imagem simulando o comportamento que o usuário final terá
                texto_extraido_da_imagem = extrair_texto_de_imagem_local(caminho_img)
                
                # Lê o conteúdo do JSON com a estruturação perfeita desejada para o banco de dados
                with open(caminho_json, "r", encoding="utf-8") as f_json:
                    conteudo_json_esperado = f_json.read()
                
                # Extrai o nome amigável do arquivo para identificação no prompt
                nome_exemplo = os.path.basename(caminho_base)

                # Monta a estrutura textual que servirá de exemplo prático para a IA (LLM)
                blocos_exemplo += f"\n### EXEMPLO DE REFERÊNCIA DE DOCUMENTO ({nome_exemplo}):\n"
                blocos_exemplo += f"Texto extraído visualmente da imagem pelo OCR:\n\"{texto_extraido_da_imagem}\"\n\n"
                blocos_exemplo += f"SAÍDA JSON ESPERADA CORRESPONDENTE:\n{conteudo_json_esperado}\n"
                blocos_exemplo += "-" * 50 + "\n"
                
        except Exception as e:
            # Caso um exemplo específico falhe, loga o erro e continua processando os demais
            print(f"Erro ao carregar par de exemplos ({caminho_img}): {str(e)}")
            continue
            
    return blocos_exemplo


# GATILHO DE INICIALIZAÇÃO DO FASTAPI
@app.on_event("startup")
def inicializar_prompts_sistema():
    global EXEMPLOS_FEW_SHOT_CACHE
    print("Carregando base de exemplos do diretório prompts...")
    EXEMPLOS_FEW_SHOT_CACHE = carregar_exemplos_da_pasta(PASTA_PROMPTS)
    print("Exemplos pré-carregados na memória com sucesso.")


# LÓGICA DE BACKGROUND (A TAREFA QUE RODA EM SEGUNDO PLANO)
async def processar_llm_em_segundo_plano(
    id_sessao: str, 
    texto_clinico: str, 
    conteudo_arquivo: bytes = None, 
    nome_arquivo: str = None
):
    global EXEMPLOS_FEW_SHOT_CACHE

    prompt_sistema = f"""Você é um motor de IA médico universal. Sua ÚNICA tarefa é transformar dados clínicos brutos no esquema JSON exato fornecido abaixo.

    Você está PROIBIDO de criar chaves como 'paciente', 'consulta', 'diagnostico' ou qualquer outra que não esteja no esquema abaixo. Toda e qualquer informação clínica (como nome do paciente, idade, queixas, conduta, receitas) DEVE ser encaixada obrigatoriamente dentro da lista de 'campos' divididos por 'secoes'.

    Você DEVE retornar OBRIGATORIAMENTE um objeto JSON com esta estrutura exata:
    {{
      "tipo_documento": "Ex: Atendimento de Emergência, Prontuário Ambulatorial",
      "secoes": [
        {{
          "titulo_secao": "Nome da Seção (Ex: Identificação do Paciente, Histórico Clínico, Prescrição Médica)",
          "campos": [
            {{
              "campo_id": "nome_do_campo_em_snake_case (Ex: nome_paciente, queixa_principal, medicamento_receitado)",
              "label": "Nome legível para exibição na tela do usuário",
              "valor": "O dado extraído (Pode ser texto, número ou booleano true/false para checagens. Use null se não mencionado)",
              "tipo_componente": "Defina estritamente como 'texto', 'numero' ou 'checkbox'"
            }}
          ]
        }}
      ],
      "resumo_narrativo": "Um resumo clínico formal, contínuo e corrido do atendimento médico feito."
    }}

    REGRAS DE OURO:
    - Nunca mude os nomes das chaves principais ('tipo_documento', 'secoes', 'titulo_secao', 'campos', 'campo_id', 'label', 'valor', 'tipo_componente', 'resumo_narrativo').
    - Se o paciente tem uma alergia, crie uma seção chamada 'Alergias' ou coloque como um campo de texto dentro de uma seção pertinente.
    - Responda APENAS o JSON puro, sem textos explicativos antes ou depois.
    - O campo 'tipo_componente' DEVE ser escrito OBRIGATORIAMENTE em letras totalmente minúsculas: 'texto', 'numero' ou 'checkbox'. Nunca use 'Texto', 'Numero' ou 'Texto/Numero'.

    Se você não encontrar o valor exato de um campo no texto extraído, ou se o texto estiver ilegível, preencha o campo 'valor' como null ou string vazia. NUNCA invente datas, 
    anos ou palavras que não estejam explicitamente no texto.

    Para campos de seleção (caixas de seleção ou checkboxes), identifique qual opção possui uma marcação (como 'X', 'X marcado' ou preenchimento). 
    Exemplo: se o texto contiver um quadrado com X ao lado de 'azul', o valor do campo deve ser 'azul'.

    NUNCA utilize termos das instruções ou exemplos fornecidos (como 'Few-Shot', 'Exemplo', 'Fewo') 
    nos títulos das seções ou IDs dos campos. Os títulos das seções devem ser estritamente baseados no contexto do documento médico encontrado (ex: 'Identificação do Paciente', 'Dados Clínicos').

    Preste atenção a listas com caixas de seleção [ ] ou [X]. Se houver uma opção marcada com um 'X' ou rasurada, você DEVE extrair essa opção e colocá-la no JSON. 
    No caso da imagem, o campo 'Cor' com a opção 'azul' marcada deve gerar um campo com valor 'azul'.

    VEJA ABAIXO OS EXEMPLOS DE DOCUMENTOS E AS RESPECTIVAS SAÍDAS QUE VOCÊ DEVE SEGUIR APENAS COMO GUIA DE ESTRUTURA:
    {EXEMPLOS_FEW_SHOT_CACHE}

    ⚠️ ATENÇÃO EXTREMA - REGRAS DE ISOLAMENTO:
    1. Você NUNCA deve copiar palavras, termos técnicos ou erros contidos nos exemplos acima para o resultado atual. Os exemplos servem APENAS para você entender o formato do JSON.
    2. É terminantemente PROIBIDO gerar termos como 'Fewo', 'Few-Shot', 'data_fewo', ou 'Labela' nos títulos de seções, labels ou valores.
    3. Se um campo ou informação não puder ser lido com clareza na imagem atual, ignore-o ou use null. Não tente adivinhar palavras com base nos exemplos fornecidos.
    4. Baseie-se unicamente nas informações reais encontradas no texto extraído da imagem do usuário.
    """
    mensagens = [{"role": "system", "content": prompt_sistema}]
    caminho_temporario = None

    try:
        # 1. PROCESSAMENTO DE ARQUIVOS
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

        # 3. CHAMADA AO OLLAMA
        response = client.chat(
            model=MODELO, 
            format='json', 
            options={
                'temperature': 0.0,   # Mantém o modelo mais focado e determinístico para tarefas de extração de dados
                'num_predict': 2048,  # Aumenta o limite máximo de tokens gerados na resposta
                'num_ctx': 8192       # Aumenta a janela de contexto para ler todo o seu prompt grande
            }, 
            messages=mensagens
        )

        if caminho_temporario and os.path.exists(caminho_temporario):
            os.remove(caminho_temporario)

        # 4. VALIDAÇÃO DO SCHEMA
        resposta_pura_llm = response['message']['content']
        dados_validados = ProntuarioUniversal.model_validate_json(resposta_pura_llm)

        # 5. SUCESSO
        fila_de_sessoes[id_sessao] = {
            "status": "executed",
            "dados": dados_validados.model_dump()
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