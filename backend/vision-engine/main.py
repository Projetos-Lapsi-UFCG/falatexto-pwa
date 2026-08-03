import os
import uuid
import base64
import json
import re
from typing import Any, Dict, List, Literal, Optional
from datetime import datetime, timedelta

from pypdf import PdfReader
import ollama
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError, field_validator
import uvicorn
from pymongo import MongoClient

# ==============================================================================
# INICIALIZAÇÃO DA APLICAÇÃO E GERENCIAMENTO DE MEMÓRIA (TTL)
# ==============================================================================
app = FastAPI(
    title="FalaTexto LLM Vision Engine (Multimodal Nativo)",
    description="Motor de extração clínica estruturada utilizando LLMs Multimodais e MongoDB."
)

# Tabela em memória para rastreamento do estado das requisições assíncronas
fila_de_sessoes: Dict[str, Any] = {}

# Janela de retenção máxima dos dados na memória (TTL de 7 dias para evitar estouro de RAM)
DIAS_EXPIRACAO_SESSAO = 7


def limpar_sessoes_expiradas() -> None:
    """
    Varre o dicionário de sessões em memória e descarta registros
    criados há mais de 7 dias para otimizar o uso da memória RAM.
    """
    agora = datetime.now()
    limite = agora - timedelta(days=DIAS_EXPIRACAO_SESSAO)
    
    ids_expirados = [
        id_sessao for id_sessao, dados in fila_de_sessoes.items()
        if dados.get("criado_em") and dados["criado_em"] < limite
    ]
    
    for id_sessao in ids_expirados:
        del fila_de_sessoes[id_sessao]


# ==============================================================================
# CONFIGURAÇÕES DE REDE, BANCO E CLIENTES
# ==============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://172.17.0.1:11434")
client = ollama.Client(host=OLLAMA_HOST)

MODELO = os.getenv("OLLAMA_MODEL", "llama3.2-vision")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://database:27017")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["assis_db"]


# ==============================================================================
# SCHEMAS PYDANTIC DE VALIDAÇÃO DOS DADOS
# ==============================================================================
class CampoDinamico(BaseModel):
    campo_id: str = Field(description="Identificador único no formato snake_case")
    label: str = Field(description="Rótulo legível para apresentação na UI")
    valor: Any = Field(None, description="Conteúdo extraído do documento/áudio/texto")
    tipo_componente: Literal["checkbox", "texto", "numero", "Texto", "Numero", "Checkbox", "data", "Data"] = Field(
        default="texto",
        description="Tipo do componente de formulário na UI"
    )

class SecaoDinamica(BaseModel):
    titulo_secao: str = Field(description="Título do agrupamento de campos")
    campos: List[CampoDinamico] = Field(description="Lista de campos extraídos pertencentes à seção")

    @field_validator("campos", mode="before")
    @classmethod
    def filtrar_campos_invalidos(cls, v):
        # Garante que apenas objetos válidos entrem no processamento do Pydantic
        if isinstance(v, list):
            return [item for item in v if isinstance(item, dict)]
        return v

class ProntuarioUniversal(BaseModel):
    tipo_documento: str = Field(description="Classificação do documento médico")
    secoes: List[SecaoDinamica] = Field(description="Coleção de seções estruturadas")
    resumo_narrativo: Optional[str] = Field(default="", description="Síntese clínica legível")


# ==============================================================================
# SANITIZAÇÃO E NORMALIZAÇÃO DE RESPOSTAS DA LLM (BLINDAGEM DE PAYLOAD)
# ==============================================================================
def sanitizar_dicionario_recursivo(dado: Any) -> Any:
    """
    Função de higienização defensiva para conter imperfeições comuns de LLMs menores:
    1. Remove caracteres de controle, espaços excedentes e sufixos ':' nas chaves.
    2. Corrigi desaninhar de payloads como {"valor": {"": "Conteudo"}}.
    3. Trata alucinações de nomes de chaves (ex: 'campostein' no lugar de 'campo_id').
    4. Auto-gera 'campo_id' e 'label' sintéticos em fallback para evitar falhas do Pydantic.
    """
    if isinstance(dado, dict):
        novo_dict = {}
        for k, v in dado.items():
            chave_limpa = k.strip().rstrip(":").strip() if isinstance(k, str) else k
            
            if chave_limpa == "campos" and isinstance(v, list):
                campos_limpos = []
                for idx, item in enumerate(v):
                    if isinstance(item, dict):
                        item_sanitizado = sanitizar_dicionario_recursivo(item)
                        
                        # Correção 1: Desaninha o atributo 'valor' caso a IA retorne como um dicionário
                        valor_bruto = item_sanitizado.get("valor")
                        if isinstance(valor_bruto, dict):
                            item_sanitizado["valor"] = next(iter(valor_bruto.values()), None) if valor_bruto else None

                        # Correção 2: Fallback defensivo para a chave 'campo_id'
                        if "campo_id" not in item_sanitizado or not item_sanitizado["campo_id"]:
                            label_ref = str(item_sanitizado.get("label", "")).strip()
                            if label_ref:
                                # Converte o label para formato snake_case limpo
                                item_sanitizado["campo_id"] = re.sub(r'[^a-zA-Z0-9_]', '', label_ref.lower().replace(" ", "_")) or f"campo_{idx}"
                            else:
                                item_sanitizado["campo_id"] = f"campo_{idx}"
                        else:
                            item_sanitizado["campo_id"] = str(item_sanitizado["campo_id"]).strip()

                        # Correção 3: Fallback defensivo para a chave 'label'
                        if "label" not in item_sanitizado or not item_sanitizado["label"]:
                            item_sanitizado["label"] = item_sanitizado["campo_id"].replace("_", " ").title()
                        else:
                            item_sanitizado["label"] = str(item_sanitizado["label"]).strip()

                        # Correção 4: Normalização do tipo do componente
                        if "tipo_componente" not in item_sanitizado or not item_sanitizado["tipo_componente"]:
                            item_sanitizado["tipo_componente"] = "texto"

                        campos_limpos.append(item_sanitizado)
                novo_dict[chave_limpa] = campos_limpos
            else:
                novo_dict[chave_limpa] = sanitizar_dicionario_recursivo(v)
        return novo_dict

    elif isinstance(dado, list):
        itens_filtrados = []
        for item in dado:
            if isinstance(item, (dict, list)):
                itens_filtrados.append(sanitizar_dicionario_recursivo(item))
            elif isinstance(item, (str, int, float, bool)) or item is None:
                itens_filtrados.append(item)
        return itens_filtrados

    return dado


# ==============================================================================
# FLUXO DE EXECUÇÃO ASSÍNCRONA EM BACKGROUND
# ==============================================================================
def processar_llm_em_segundo_plano(
    id_sessao: str, 
    texto_clinico: str, 
    conteudo_arquivo: bytes = None, 
    nome_arquivo: str = None
):
    prompt_sistema = """You are a precise medical AI assistant extracting form data from medical images and text into JSON.

CRITICAL STRUCTURAL RULE:
The 'campos' property MUST BE an array of JSON Objects.
NEVER insert raw strings or key names into the 'campos' array. Do NOT add trailing colons to JSON key names.

CORRECT STRUCTURAL EXAMPLE:
{
  "tipo_documento": "Prontuário Médico",
  "secoes": [
    {
      "titulo_secao": "Identificação do Paciente",
      "campos": [
        {
          "campo_id": "nome_paciente",
          "label": "Nome do Paciente",
          "valor": "João Silva",
          "tipo_componente": "texto"
        },
        {
          "campo_id": "idade",
          "label": "Idade",
          "valor": 45,
          "tipo_componente": "numero"
        }
      ]
    }
  ],
  "resumo_narrativo": "Paciente do sexo masculino, 45 anos, sem queixas."
}

INSTRUCTIONS:
1. Parse all clinical text and handwritten notes from the image.
2. Group the extracted information logically into sections.
3. Translate all 'label', 'titulo_secao', 'tipo_documento', and 'resumo_narrativo' to Portuguese.
4. 'tipo_componente' must strictly be one of: 'texto', 'numero', or 'checkbox'.
5. Output ONLY valid JSON, without markdown formatting or conversational prose."""

    caminho_temporario = None
    imagem_base64 = None

    try:
        # Processamento preliminar de anexos (Imagens, PDFs e CSVs)
        if conteudo_arquivo and nome_arquivo:
            extensao = nome_arquivo.lower().split('.')[-1]
            
            if extensao in ["png", "jpg", "jpeg", "webp"]:
                imagem_base64 = base64.b64encode(conteudo_arquivo).decode('utf-8')
            
            elif extensao == "pdf":
                caminho_temporario = f"temp_{id_sessao}_{nome_arquivo}"
                with open(caminho_temporario, "wb") as f:
                    f.write(conteudo_arquivo)
                reader = PdfReader(caminho_temporario)
                texto_extraido_pdf = "".join([p.extract_text() or "" for p in reader.pages])
                texto_clinico += f"\n\n[CONTEÚDO EXTRAÍDO DO PDF]:\n{texto_extraido_pdf}"

            elif extensao == "csv":
                texto_clinico += f"\n\n[CONTEÚDO EXTRAÍDO DO CSV]:\n{conteudo_arquivo.decode('utf-8', errors='ignore')}"

        mensagem_usuario: Dict[str, Any] = {
            "role": "user",
            "content": f"Analyze and structure the following clinical information according to the required schema: {texto_clinico}"
        }

        if imagem_base64:
            mensagem_usuario["images"] = [imagem_base64]

        mensagens = [
            {"role": "system", "content": prompt_sistema},
            mensagem_usuario
        ]

        # Chamada à API da LLM garantindo formato JSON estrito
        response = client.chat(
            model=MODELO, 
            format="json",
            options={
                'temperature': 0.0,
                'num_predict': 2048,
                'num_ctx': 8192
            }, 
            messages=mensagens
        )

        # Limpeza do arquivo de disco temporário (se houver)
        if caminho_temporario and os.path.exists(caminho_temporario):
            os.remove(caminho_temporario)

        resposta_pura_llm = response['message']['content']

        # Desserialização e duplo pipeline de sanitização/validação
        dados_brutos = json.loads(resposta_pura_llm)
        dados_sanitizados = sanitizar_dicionario_recursivo(dados_brutos)
        dados_validados = ProntuarioUniversal.model_validate(dados_sanitizados)

        dados_prontuario = dados_validados.model_dump()
        secoes_tratadas = dados_prontuario.get("secoes", [])

        # Persistência estruturada do documento final no MongoDB
        documento_mongo = {
            "_id": id_sessao,  
            "name": f"Prontuário Automático - {dados_prontuario.get('tipo_documento', 'Documento Clínico')}",
            "metadata": {
                "version": "1.0",
                "active": True,
                "origem": f"Vision Engine AI ({MODELO})"
            },
            "sections": secoes_tratadas,
            "resumo_narrativo": dados_prontuario.get("resumo_narrativo", "")
        }
        
        db.forms.insert_one(documento_mongo)

        # Atualização do estado mantendo o timestamp original da requisição
        data_criacao = fila_de_sessoes.get(id_sessao, {}).get("criado_em", datetime.now())
        fila_de_sessoes[id_sessao] = {
            "status": "executed",
            "dados": dados_prontuario,
            "criado_em": data_criacao
        }

    except ValidationError as erro_schema:
        if caminho_temporario and os.path.exists(caminho_temporario): 
            os.remove(caminho_temporario)
        data_criacao = fila_de_sessoes.get(id_sessao, {}).get("criado_em", datetime.now())
        fila_de_sessoes[id_sessao] = {
            "status": "failed",
            "erro": "Erro de Validação: A IA não seguiu o Schema exigido pelo sistema.",
            "detalhes": erro_schema.errors(),
            "criado_em": data_criacao
        }
    except Exception as e:
        if caminho_temporario and os.path.exists(caminho_temporario): 
            os.remove(caminho_temporario)
        data_criacao = fila_de_sessoes.get(id_sessao, {}).get("criado_em", datetime.now())
        fila_de_sessoes[id_sessao] = {
            "status": "failed",
            "erro": str(e),
            "criado_em": data_criacao
        }


# ==============================================================================
# ENDPOINTS REST DA API
# ==============================================================================

@app.post("/vision/processar-clinica")
@app.post("/api/processar-clinica")
async def empilhar_processamento_clinico(
    background_tasks: BackgroundTasks,
    arquivo: UploadFile = File(None),
    texto_clinico: str = Form(...),
):
    """
    Recebe requisições de extração, faz o controle de sessão e delega
    o processamento pesado para as BackgroundTasks do FastAPI.
    """
    # Limpeza proativa de registros antigos (> 7 dias) antes de aceitar novos dados
    limpar_sessoes_expiradas()

    id_sessao = str(uuid.uuid4())
    
    # Registra o item na fila com o timestamp de criação atual
    fila_de_sessoes[id_sessao] = {
        "status": "pending",
        "criado_em": datetime.now()
    }

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
        "link_consulta": f"/vision/status/{id_sessao}"
    }


@app.get("/vision/status/{id_sessao}")
@app.get("/api/status/{id_sessao}")
async def consultar_status_sessao(id_sessao: str):
    """
    Consulta o estado de processamento de uma sessão pelo ID.
    """
    sessao = fila_de_sessoes.get(id_sessao)
    if not sessao:
        raise HTTPException(
            status_code=404, 
            detail="Sessão não encontrada ou expirada (limite de retenção de 7 dias)."
        )
    
    # Serialização do campo datetime para ISO String
    resposta = dict(sessao)
    if "criado_em" in resposta and isinstance(resposta["criado_em"], datetime):
        resposta["criado_em"] = resposta["criado_em"].isoformat()
        
    return resposta


@app.get("/vision/sessoes")
@app.get("/api/sessoes")
async def listar_sessoes_disponiveis():
    """
    Lista todas as sessões registradas em memória dentro do período de retenção.
    """
    limpar_sessoes_expiradas()
    
    if not fila_de_sessoes:
        return {
            "total_sessoes": 0,
            "mensagem": "Nenhuma sessão ativa no momento.",
            "sessoes": []
        }
    
    historico_sessoes = []
    for id_sessao, dados_da_sessao in fila_de_sessoes.items():
        criado_em = dados_da_sessao.get("criado_em")
        criado_em_str = criado_em.isoformat() if isinstance(criado_em, datetime) else criado_em
        
        historico_sessoes.append({
            "id_sessao": id_sessao,
            "status": dados_da_sessao["status"],
            "criado_em": criado_em_str
        })
        
    return {
        "total_sessoes": len(historico_sessoes),
        "sessoes": historico_sessoes
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)