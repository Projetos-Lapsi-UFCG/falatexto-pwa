import os
import uuid
import base64
import json
import re
import io
from typing import Any, Dict, List, Literal, Optional
from datetime import datetime, timedelta

from PIL import Image
from pypdf import PdfReader
import ollama
from json_repair import repair_json
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, BackgroundTasks, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError, field_validator, ConfigDict
import uvicorn
from pymongo import MongoClient

import transcription
from transcription_stream import stream_app

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

fila_de_sessoes: Dict[str, Any] = {}
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

MODELO = os.getenv("OLLAMA_MODEL", "qwen2.5vl:7b")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://database:27017")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["assis_db"]


# ==============================================================================
# HELPERS DE PROCESSAMENTO DE IMAGEM E EXTRAÇÃO DE JSON
# ==============================================================================
def otimizar_imagem_base64(conteudo_bytes: bytes, max_dim: int = 768) -> str:
    """Redimensiona a imagem para no máximo max_dim px mantendo proporção e converte para JPEG RGB."""
    try:
        img = Image.open(io.BytesIO(conteudo_bytes))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        if max(img.width, img.height) > max_dim:
            img.thumbnail((max_dim, max_dim))
        
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception:
        return base64.b64encode(conteudo_bytes).decode("utf-8")


def extrair_bloco_json(texto: str) -> str:
    """Extrai estritamente o objeto JSON entre a primeira '{' e a última '}', ignorando markdown ou sujeiras ao redor."""
    match = re.search(r'\{.*\}', texto, re.DOTALL)
    if match:
        return match.group(0)
    return texto.strip()


# ==============================================================================
# SCHEMAS PYDANTIC ADAPTADOS AO SCHEMA DA API
# ==============================================================================
class CampoDinamico(BaseModel):
    campo_id: str = Field(default_factory=lambda: f"campo_{uuid.uuid4().hex[:8]}", description="Identificador único")
    title: str = Field(default="Pergunta sem título", description="Título exigido pelo PWA/API")
    label: str = Field(default="Pergunta sem título", description="Compatibilidade legado")
    valor: Any = Field(None, description="Conteúdo extraído")
    type: Literal["ABERTA", "ESTIMULADA", "MULTIPLA", "COMPOSTA"] = Field(
        default="ABERTA",
        description="Tipo estrito do componente de formulário"
    )
    tipo_componente: str = Field(default="aberta")
    required: bool = Field(default=False)
    placeholder: str = Field(default="")
    options: List[Dict[str, Any]] = Field(default_factory=list)
    parentItem: Optional[str] = Field(default="")
    compositeFields: List[Any] = Field(default_factory=list)

    @field_validator("type", mode="before")
    @classmethod
    def padronizar_tipo(cls, v):
        if isinstance(v, str):
            v_lower = v.lower().strip()
            if v_lower in ["checkbox", "multipla", "multiple"]:
                return "MULTIPLA"
            elif v_lower in ["radio", "select", "estimulada", "single"]:
                return "ESTIMULADA"
            elif v_lower in ["composta", "composite"]:
                return "COMPOSTA"
            elif v_lower in ["aberta", "texto", "numero", "data", "textarea", "text", "number", "date"]:
                return "ABERTA"
        return "ABERTA"

class SecaoDinamica(BaseModel):
    titulo_secao: str = Field(default="Geral", description="Título do agrupamento de campos")
    campos: List[CampoDinamico] = Field(description="Lista de campos pertencentes à seção")

    @field_validator("campos", mode="before")
    @classmethod
    def filtrar_campos_invalidos(cls, v):
        if isinstance(v, list):
            return [item for item in v if isinstance(item, dict)]
        return v

class ProntuarioUniversal(BaseModel):
    tipo_documento: str = Field(default="Formulário de Atendimento", description="Classificação do documento médico")
    secoes: List[SecaoDinamica] = Field(description="Coleção de seções estruturadas")
    resumo_narrativo: Optional[str] = Field(default="", description="Síntese clínica legível")
    criado_em: datetime = Field(default_factory=datetime.utcnow, description="Data de inserção")

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )


# ==============================================================================
# SANITIZAÇÃO E NORMALIZAÇÃO DE RESPOSTAS DA LLM
# ==============================================================================
def sanitizar_dicionario_recursivo(dado: Any) -> Any:
    if isinstance(dado, list):
        dado = {
            "tipo_documento": "Formulário de Atendimento",
            "secoes": [
                {
                    "titulo_secao": "Geral",
                    "campos": dado
                }
            ]
        }

    if isinstance(dado, dict) and ("secoes" not in dado or not isinstance(dado.get("secoes"), list)):
        campos_fallback = []
        if "campos" in dado and isinstance(dado["campos"], list):
            campos_fallback = dado["campos"]
        elif "questions" in dado and isinstance(dado["questions"], list):
            campos_fallback = dado["questions"]
        else:
            for idx, (k, v) in enumerate(dado.items()):
                if k in ["tipo_documento", "resumo_narrativo", "criado_em"]:
                    continue
                titulo_limpo = re.sub(r'^[¿\?\s]+', '', str(k)).strip()
                campos_fallback.append({
                    "campo_id": f"q_{idx + 1}",
                    "title": titulo_limpo,
                    "label": titulo_limpo,
                    "type": "ABERTA",
                    "tipo_componente": "aberta",
                    "valor": v,
                    "required": False,
                    "placeholder": "",
                    "options": [],
                    "parentItem": "",
                    "compositeFields": []
                })
        
        dado = {
            "tipo_documento": dado.get("tipo_documento") if isinstance(dado, dict) else "Formulário de Atendimento",
            "secoes": [
                {
                    "titulo_secao": "Geral",
                    "campos": campos_fallback
                }
            ],
            "resumo_narrativo": dado.get("resumo_narrativo", "") if isinstance(dado, dict) else ""
        }

    def _limpar_recursivo(item: Any) -> Any:
        if isinstance(item, dict):
            novo_dict = {}
            for k, v in item.items():
                chave_limpa = k.strip().rstrip(":").strip() if isinstance(k, str) else k
                
                if chave_limpa in ["campos", "questions"] and isinstance(v, list):
                    campos_limpos = []
                    for idx, campo in enumerate(v):
                        if isinstance(campo, dict):
                            campo_sanitizado = _limpar_recursivo(campo)
                            
                            if "campo_id" not in campo_sanitizado or not campo_sanitizado["campo_id"]:
                                label_ref = str(campo_sanitizado.get("title") or campo_sanitizado.get("label") or "").strip()
                                campo_sanitizado["campo_id"] = re.sub(r'[^a-zA-Z0-9_]', '', label_ref.lower().replace(" ", "_")) or f"campo_{idx}"

                            raw_titulo = campo_sanitizado.get("title") or campo_sanitizado.get("label") or f"Pergunta {idx + 1}"
                            titulo_limpo = re.sub(r'^[¿\?\s]+', '', str(raw_titulo)).strip()
                            campo_sanitizado["title"] = titulo_limpo
                            campo_sanitizado["label"] = titulo_limpo

                            tipo_raw = str(campo_sanitizado.get("type") or campo_sanitizado.get("tipo_componente") or "").lower().strip()
                            if tipo_raw in ["checkbox", "multipla", "multiple"]:
                                tipo_enum = "MULTIPLA"
                            elif tipo_raw in ["radio", "select", "estimulada", "single"]:
                                tipo_enum = "ESTIMULADA"
                            elif tipo_raw in ["composta", "composite"]:
                                tipo_enum = "COMPOSTA"
                            else:
                                tipo_enum = "ABERTA"
                            
                            campo_sanitizado["type"] = tipo_enum
                            campo_sanitizado["tipo_componente"] = tipo_enum.lower()

                            campo_sanitizado["parentItem"] = campo_sanitizado.get("parentItem") or ""
                            campo_sanitizado["compositeFields"] = campo_sanitizado.get("compositeFields", [])
                            campo_sanitizado["placeholder"] = campo_sanitizado.get("placeholder", "")
                            campo_sanitizado["required"] = bool(campo_sanitizado.get("required", False))

                            opts_raw = campo_sanitizado.get("options", [])
                            opts_normalizadas = []
                            if isinstance(opts_raw, list):
                                for o_idx, opt in enumerate(opts_raw):
                                    if isinstance(opt, str):
                                        opt_limpo = re.sub(r'^[¿\?\s]+', '', opt).strip()
                                        opts_normalizadas.append({
                                            "id": f"opt_{o_idx + 1}",
                                            "label": opt_limpo,
                                            "text": opt_limpo,
                                            "value": opt_limpo
                                        })
                                    elif isinstance(opt, dict):
                                        opt_label = re.sub(r'^[¿\?\s]+', '', str(opt.get("label", ""))).strip()
                                        opt["label"] = opt_label
                                        opt["value"] = opt.get("value", opt_label)
                                        opts_normalizadas.append(opt)
                            campo_sanitizado["options"] = opts_normalizadas

                            campos_limpos.append(campo_sanitizado)
                    novo_dict["campos"] = campos_limpos
                else:
                    novo_dict[chave_limpa] = _limpar_recursivo(v)
            return novo_dict

        elif isinstance(item, list):
            return [_limpar_recursivo(i) for i in item]

        return item

    return _limpar_recursivo(dado)


# ==============================================================================
# FLUXO DE EXECUÇÃO ASSÍNCRONA EM BACKGROUND
# ==============================================================================
def processar_llm_em_segundo_plano(
    id_sessao: str, 
    texto_clinico: str, 
    conteudo_arquivo: bytes = None, 
    nome_arquivo: str = None
):
    prompt_sistema = """
You are an expert, highly precise literal multimodal OCR extractor specialized in converting handwritten, scanned, and printed form sketches into structured JSON for system intake.

=== CRITICAL EXTRACTION RULES (STRICT LITERAL OCR) ===

1. DOCUMENT CLASSIFICATION ("tipo_documento"):
- Identify and extract the exact document header/title if present (e.g., "Prontuário Médico", "Formulário de Atendimento", "Anamnese"). If absent or illegible, default to "Formulário Generalista".

2. SECTION MANDATE ("secoes"):
- Group ALL extracted fields into ONE SINGLE section inside the "secoes" array.
- Set "titulo_secao" strictly to "Geral".

3. FIELD TYPES & IDENTIFICATION RULES ("type"):
- "ABERTA": Single-line or multi-line text input (underlines ___, blank boxes, or open spaces).
- "ESTIMULADA": Single-choice selection (radio buttons, circles ( ), or mutually exclusive options).
- "MULTIPLA": Multiple-choice selection (checkboxes [ ], square boxes where multiple ticks are allowed).
- "COMPOSTA": Grouped multi-part inputs under a single overarching parent label (e.g., "Endereço: Rua, Número, Bairro" or "Pressão Arterial: Sistólica / Diastólica").

4. MANDATORY FIELD ATTRIBUTES & FORMAT MAPPING:
Every field object in "campos" MUST strictly include ALL of the following key names:
- "title": EXACT literal text extracted from the visual label (e.g., "Nome do Paciente:"). NEVER use the key name "label" for the question title ("label" is reserved ONLY for items inside "options").
- "parentItem": Set to null (or section ID if applicable). NEVER omit this key.
- "required": Boolean (true or false). Set to false if not explicitly indicated.
- "placeholder": String with placeholder text if present, or empty string "" if none.
- "inputFormat": Infer format for "ABERTA" inputs: "texto", "numero", "data", "cpf", "telefone", or "textarea". Default to "texto".
- "options": Array of choices for "ESTIMULADA" and "MULTIPLA" fields:
- "label": Exact text next to the option.
- "value": Lowercase, normalized snake_case slug without accents/special characters.
- "compositeFields": Array of sub-fields for "COMPOSTA" types. MUST be an empty array [] for all non-COMPOSTA types.

5. VALUE EXTRACTION ("valor"):
- For "ABERTA" fields: Extract filled text if present. If blank/unfilled, set to null.
- For "ESTIMULADA" / "MULTIPLA" fields: 
- If an option is visibly checked/ticked/filled ([X], [V], shaded circle), assign its "value" (or array of values for MULTIPLA) to "valor".
- If no option is marked, set "valor": null.

6. STRICT ANTI-HALLUCINATION & NOISE GUARDRAILS:
- Extract ONLY what is visibly printed or handwritten.
- NEVER generate foreign language tokens (e.g., Korean, Chinese, or systemic non-Latin symbols).
- IGNORE background noise, paper folds, watermarks, or stray ink marks.
- Do NOT loop phrases or repeat characters infinitely.

=== MANDATORY JSON OUTPUT SCHEMA ===
Respond ONLY with a single valid, raw JSON object matching this structure. Do NOT wrap output in markdown code blocks (e.g., no ```json).

{
  "tipo_documento": "Formulário de Atendimento",
  "secoes": [
    {
      "titulo_secao": "Geral",
      "campos": [
        {
          "id": "q_1",
          "title": "Nome Completo:",
          "parentItem": "",
          "required": false,
          "placeholder": "",
          "type": "ABERTA",
          "inputFormat": "texto",
          "options": [],
          "compositeFields": [],
          "valor": "João da Silva"
        },
        {
          "id": "q_2",
          "title": "Fumante?",
          "parentItem": "",
          "required": false,
          "placeholder": "",
          "type": "ESTIMULADA",
          "inputFormat": "checkbox",
          "options": [
            {"label": "Sim", "value": "sim"},
            {"label": "Não", "value": "nao"}
          ],
          "compositeFields": [],
          "valor": "nao"
        },
        {
          "id": "q_3",
          "title": "Sintomas Apresentados:",
          "parentItem": "",
          "required": false,
          "placeholder": "",
          "type": "MULTIPLA",
          "inputFormat": "checkbox",
          "options": [
            {"label": "Febre", "value": "febre"},
            {"label": "Tosse", "value": "tosse"},
            {"label": "Dor de Cabeça", "value": "dor_de_cabeca"}
          ],
          "compositeFields": [],
          "valor": ["febre", "tosse"]
        },
        {
          "id": "q_4",
          "title": "Pressão Arterial",
          "parentItem": "",
          "required": false,
          "placeholder": "",
          "type": "COMPOSTA",
          "inputFormat": "texto",
          "options": [],
          "compositeFields": [
            {
              "id": "q_4_1",
              "title": "Sistólica",
              "parentItem": "q_4",
              "required": false,
              "placeholder": "",
              "type": "ABERTA",
              "inputFormat": "numero",
              "options": [],
              "compositeFields": [],
              "valor": "120"
            },
            {
              "id": "q_4_2",
              "title": "Diastólica",
              "parentItem": "q_4",
              "required": false,
              "placeholder": "",
              "type": "ABERTA",
              "inputFormat": "numero",
              "options": [],
              "compositeFields": [],
              "valor": "80"
            }
          ],
          "valor": null
        }
      ]
    }
  ],
  "resumo_narrativo": "Formulário preenchido para João da Silva com sintomas de febre e tosse."
}
"""

    caminho_temporario = None
    imagem_base64 = None

    try:
        if conteudo_arquivo and nome_arquivo:
            extensao = nome_arquivo.lower().split('.')[-1]
            
            if extensao in ["png", "jpg", "jpeg", "webp"]:
                imagem_base64 = otimizar_imagem_base64(conteudo_arquivo)
            
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
            "content": f"Analyze and structure: {texto_clinico}"
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
                'temperature': 0.1,        
                'top_p': 0.9,
                'repeat_penalty': 1.2,    
                'num_predict': 2048,
                'num_ctx': 8192           
            }, 
            messages=mensagens
        )

        if caminho_temporario and os.path.exists(caminho_temporario):
            os.remove(caminho_temporario)

        resposta_pura_llm = response['message']['content']
        resposta_limpa = extrair_bloco_json(resposta_pura_llm)

        try:
            dados_brutos = json.loads(resposta_limpa)
        except json.JSONDecodeError:
            dados_brutos = json.loads(repair_json(resposta_limpa))

        dados_sanitizados = sanitizar_dicionario_recursivo(dados_brutos)
        dados_validados = ProntuarioUniversal.model_validate(dados_sanitizados)

        dados_prontuario = dados_validados.model_dump()
        secoes_tratadas = dados_prontuario.get("secoes", [])

        todas_perguntas = []
        for sec in secoes_tratadas:
            todas_perguntas.extend(sec.get("campos", []))

        # Utiliza o nome do formulário informado pelo usuário na interface PWA
        if texto_clinico and texto_clinico.strip() and len(texto_clinico.strip()) < 120:
            nome_doc = texto_clinico.strip()
        else:
            nome_doc = f"Prontuário - {dados_prontuario.get('tipo_documento', 'Documento Clínico')}"

        sec_id = f"sec_{id_sessao}_1"

        # 1. Salva o documento pai na coleção 'forms'
        documento_mongo = {
            "_id": id_sessao,  
            "name": nome_doc,
            "title": nome_doc,
            "department": "Atendimento Clínico",
            "metadata": {
                "version": "1.0",
                "active": True,
                "origem": f"Vision Engine AI ({MODELO})"
            },
            "sections": [sec_id],
            "resumo_narrativo": dados_prontuario.get("resumo_narrativo", ""),
            "criado_em": dados_prontuario.get("criado_em", datetime.utcnow())
        }
        db.forms.insert_one(documento_mongo)

        # 2. Prepara perguntas e array de IDs de perguntas
        questoes_doc = []
        questoes_ids = []
        for q_idx, q in enumerate(todas_perguntas):
            q_id = f"q_{id_sessao}_{q_idx + 1}"
            questoes_ids.append(q_id)
            titulo = q.get("title") or q.get("label", "Pergunta sem título")
            questoes_doc.append({
                "_id": q_id,
                "section_id": sec_id,
                "form_id": id_sessao,
                "title": titulo,
                "label": titulo,
                "type": q.get("type", "ABERTA"),
                "required": bool(q.get("required", False)),
                "placeholder": q.get("placeholder", ""),
                "options": q.get("options", []),
                "parentItem": q.get("parentItem") or "",
                "compositeFields": q.get("compositeFields", [])
            })

        # 3. Salva na coleção 'sections' com os campos exigidos pela assis_api (parentItem deve ser string)
        secoes_doc = [{
            "_id": sec_id,
            "form_id": id_sessao,
            "title": "Geral",
            "order": 1,
            "parentItem": "",
            "subSections": [],
            "questions": questoes_ids,
            "tags": []
        }]

        if secoes_doc:
            db.sections.insert_many(secoes_doc)
        if questoes_doc:
            db.questions.insert_many(questoes_doc)

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

app.include_router(
    transcription.router,
    prefix="/api/v1",
    dependencies=[Depends(validar_token_bearer)]
)

# Ditado em tempo real (WebSocket); o token vai na primeira mensagem
app.mount("/ws", stream_app)


@app.on_event("startup")
def carregar_whisper():
    # Handler síncrono roda na thread principal (ver get_whisper_model)
    transcription.get_whisper_model()

@app.post("/api/v1/processar-clinica")
@app.post("/api/v1/vision/processar-clinica")
async def empilhar_processamento_clinico(
    background_tasks: BackgroundTasks,
    texto_clinico: Optional[str] = Form(None),
    nome: Optional[str] = Form(None),
    arquivo: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    token: str = Depends(validar_token_bearer)
):
    limpar_sessoes_expiradas()
    id_sessao = str(uuid.uuid4())
    
    fila_de_sessoes[id_sessao] = {
        "status": "pending",
        "criado_em": datetime.now()
    }

    texto_processado = texto_clinico or nome or ""
    arquivo_upload = file or arquivo

    conteudo_arquivo = None
    nome_arquivo = None
    if arquivo_upload and arquivo_upload.filename:
        conteudo_arquivo = await arquivo_upload.read()
        nome_arquivo = arquivo_upload.filename

    background_tasks.add_task(
        processar_llm_em_segundo_plano, 
        id_sessao, 
        texto_processado, 
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
    sessao = fila_de_sessoes.get(id_sessao)
    if not sessao:
        raise HTTPException(
            status_code=404, 
            detail="Sessão não encontrada ou expirada."
        )
    
    resposta = dict(sessao)
    if "criado_em" in resposta and isinstance(resposta["criado_em"], datetime):
        resposta["criado_em"] = resposta["criado_em"].isoformat()
        
    return resposta


@app.get("/api/v1/sessoes")
async def listar_sessoes_disponiveis(
    token: str = Depends(validar_token_bearer)
):
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