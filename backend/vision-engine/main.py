import os
import uuid
import base64
import json
import re
from typing import Any, Dict, List, Literal, Optional
from datetime import datetime, timedelta

from pypdf import PdfReader
import ollama
from json_repair import repair_json
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, BackgroundTasks, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError, field_validator, ConfigDict
import uvicorn
from pymongo import MongoClient

# ==============================================================================
# INICIALIZAÇÃO DA APLICAÇÃO E SEGURANÇA
# ==============================================================================
API_SECRET_TOKEN = os.getenv("VISION_API_SECRET_TOKEN", "0000")
security = HTTPBearer(auto_error=False)

app = FastAPI(
    title="FalaTexto LLM Vision Engine (Multimodal Nativo)",
    description="Motor de extração clínica estruturada utilizando LLMs Multimodais e MongoDB.",
    dependencies=[Depends(security)]
)

def validar_token_bearer(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """
    Validação estrita do token secreto.
    Lança HTTP 401 caso o token enviado seja incorreto ou ausente.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação ausente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if credentials.scheme.lower() != "bearer" or credentials.credentials != API_SECRET_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação inválido.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials

# Tabela em memória para rastreamento do estado das requisições assíncronas
fila_de_sessoes: Dict[str, Any] = {}

# Janela de retenção máxima dos dados na memória (TTL de 7 dias)
DIAS_EXPIRACAO_SESSAO = 7


def limpar_sessoes_expiradas() -> None:
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
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://ollama:11434")
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

    @field_validator("tipo_componente", mode="before")
    @classmethod
    def padronizar_tipo_componente(cls, v):
        """
        Garante a normalização do tipo_componente para caixa baixa antes da validação.
        """
        if isinstance(v, str):
            v_lower = v.lower()
            if v_lower in ["checkbox", "texto", "numero", "data"]:
                return v_lower
        return "texto"

class SecaoDinamica(BaseModel):
    titulo_secao: str = Field(description="Título do agrupamento de campos")
    campos: List[CampoDinamico] = Field(description="Lista de campos extraídos pertencentes à seção")

    @field_validator("campos", mode="before")
    @classmethod
    def filtrar_campos_invalidos(cls, v):
        if isinstance(v, list):
            return [item for item in v if isinstance(item, dict)]
        return v

class ProntuarioUniversal(BaseModel):
    tipo_documento: str = Field(description="Classificação do documento médico")
    secoes: List[SecaoDinamica] = Field(description="Coleção de seções estruturadas")
    resumo_narrativo: Optional[str] = Field(default="", description="Síntese clínica legível")
    criado_em: datetime = Field(default_factory=datetime.utcnow, description="Data de inserção da extração")

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )


# ==============================================================================
# SANITIZAÇÃO E NORMALIZAÇÃO DE RESPOSTAS DA LLM
# ==============================================================================
def sanitizar_dicionario_recursivo(dado: Any) -> Any:
    if isinstance(dado, dict):
        novo_dict = {}
        for k, v in dado.items():
            chave_limpa = k.strip().rstrip(":").strip() if isinstance(k, str) else k
            
            if chave_limpa == "campos" and isinstance(v, list):
                campos_limpos = []
                for idx, item in enumerate(v):
                    if isinstance(item, dict):
                        item_sanitizado = sanitizar_dicionario_recursivo(item)
                        
                        valor_bruto = item_sanitizado.get("valor")
                        if isinstance(valor_bruto, dict):
                            item_sanitizado["valor"] = next(iter(valor_bruto.values()), None) if valor_bruto else None

                        if "campo_id" not in item_sanitizado or not item_sanitizado["campo_id"]:
                            label_ref = str(item_sanitizado.get("label", "")).strip()
                            if label_ref:
                                item_sanitizado["campo_id"] = re.sub(r'[^a-zA-Z0-9_]', '', label_ref.lower().replace(" ", "_")) or f"campo_{idx}"
                            else:
                                item_sanitizado["campo_id"] = f"campo_{idx}"
                        else:
                            item_sanitizado["campo_id"] = str(item_sanitizado["campo_id"]).strip()

                        if "label" not in item_sanitizado or not item_sanitizado["label"]:
                            item_sanitizado["label"] = item_sanitizado["campo_id"].replace("_", " ").title()
                        else:
                            item_sanitizado["label"] = str(item_sanitizado["label"]).strip()

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
    prompt_sistema = """You are an expert Medical Vision AI engine. Your job is to perform OCR on medical forms/documents and map the extracted data into JSON.

### ABSOLUTE RULES AGAINST HALLUCINATION:
1. Extract ONLY information explicitly visible in the document or present in the text.
2. NEVER use default names, example names (like João, Maria, Silva), fake dates, or fictional values.
3. If a field label exists on the paper but has no written value, set `valor: ""` or `null`. DO NOT fill in fake data.
4. If a field is not present in the document at all, DO NOT create it in the JSON.

### JSON SCHEMA RULES:
- The 'campos' property MUST ALWAYS be an array of Objects.
- 'tipo_componente' MUST strictly be one of: 'texto', 'numero', 'checkbox', or 'data'.
- Translate 'label', 'titulo_secao', 'tipo_documento', and 'resumo_narrativo' into Natural Portuguese (pt-BR).

### CHECKBOX DETECTION RULES:
- Box with a mark (X, checkmark, stroke, fill) -> `valor: true`
- Unmarked empty box -> `valor: false`

### STRUCTURAL SCHEMA TEMPLATE (DO NOT COPY KEY NAMES OR VALUES, USE AS STRUCTURAL GUIDE ONLY):
{
  "tipo_documento": "TIPO_DO_DOCUMENTO_DETECTADO",
  "secoes": [
    {
      "titulo_secao": "NOME_DA_SECAO",
      "campos": [
        {
          "campo_id": "id_do_campo",
          "label": "Rótulo do Campo",
          "valor": "VALOR_EXATO_LIDO_OU_EXTRAIDO",
          "tipo_componente": "texto"
        }
      ]
    }
  ],
  "resumo_narrativo": "Resumo sintético baseado exclusivamente nos dados reais encontrados."
}

### OUTPUT FORMAT:
Output ONLY raw JSON. No markdown syntax, no ```json formatting, no commentary."""

    caminho_temporario = None
    imagem_base64 = None

    try:
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

        if caminho_temporario and os.path.exists(caminho_temporario):
            os.remove(caminho_temporario)

        resposta_pura_llm = response['message']['content']

        # Clean Markdown wrappers if present
        resposta_limpa = re.sub(r"^```json\s*", "", resposta_pura_llm.strip(), flags=re.MULTILINE)
        resposta_limpa = re.sub(r"^```\s*", "", resposta_limpa, flags=re.MULTILINE)

        # Parse resiliente com fallback do json-repair
        try:
            dados_brutos = json.loads(resposta_limpa)
        except json.JSONDecodeError:
            # Garante a correção caso o modelo esqueça vírgulas ou aspas
            dados_brutos = json.loads(repair_json(resposta_limpa))

        dados_sanitizados = sanitizar_dicionario_recursivo(dados_brutos)
        dados_validados = ProntuarioUniversal.model_validate(dados_sanitizados)

        # Converte o objeto Pydantic validado diretamente para o formato do MongoDB
        dados_prontuario = dados_validados.model_dump()
        secoes_tratadas = dados_prontuario.get("secoes", [])

        documento_mongo = {
            "_id": id_sessao,  
            "name": f"Prontuário Automático - {dados_prontuario.get('tipo_documento', 'Documento Clínico')}",
            "metadata": {
                "version": "1.0",
                "active": True,
                "origem": f"Vision Engine AI ({MODELO})"
            },
            "sections": secoes_tratadas,
            "resumo_narrativo": dados_prontuario.get("resumo_narrativo", ""),
            "criado_em": dados_prontuario.get("criado_em", datetime.utcnow())
        }
        
        # Persiste o prontuário estruturado na coleção de formulários do MongoDB
        db.forms.insert_one(documento_mongo)

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
# ENDPOINTS REST DA API (Protegidos por Token)
# ==============================================================================

@app.post("/api/v1/processar-clinica")
async def empilhar_processamento_clinico(
    background_tasks: BackgroundTasks,
    texto_clinico: str = Form(...),
    arquivo: UploadFile = File(None),
    token: str = Depends(validar_token_bearer)
):
    limpar_sessoes_expiradas()

    id_sessao = str(uuid.uuid4())
    
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
        "link_consulta": f"/api/v1/status/{id_sessao}"
    }


@app.get("/api/v1/status/{id_sessao}")
async def consultar_status_sessao(
    id_sessao: str,
    token: str = Depends(validar_token_bearer)
):
    """
    Consulta o estado de processamento de uma sessão pelo ID.
    """
    sessao = fila_de_sessoes.get(id_sessao)
    if not sessao:
        raise HTTPException(
            status_code=404, 
            detail="Sessão não encontrada ou expirada (limite de retenção de 7 dias)."
        )
    
    resposta = dict(sessao)
    if "criado_em" in resposta and isinstance(resposta["criado_em"], datetime):
        resposta["criado_em"] = resposta["criado_em"].isoformat()
        
    return resposta


@app.get("/api/v1/sessoes")
async def listar_sessoes_disponiveis(
    token: str = Depends(validar_token_bearer)
):
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