import transcription
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
app.include_router(transcription.router, prefix="/api/v1")

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
def otimizar_imagem_base64(conteudo_bytes: bytes, max_dim: int = 1024) -> str:
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
    parentItem: Optional[str] = Field(default=None)
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
    tipo_documento: str = Field(description="Classificação do documento médico")
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
    if isinstance(dado, dict):
        novo_dict = {}
        for k, v in dado.items():
            chave_limpa = k.strip().rstrip(":").strip() if isinstance(k, str) else k
            
            if chave_limpa in ["campos", "questions"] and isinstance(v, list):
                campos_limpos = []
                for idx, item in enumerate(v):
                    if isinstance(item, dict):
                        item_sanitizado = sanitizar_dicionario_recursivo(item)
                        
                        # ID
                        if "campo_id" not in item_sanitizado or not item_sanitizado["campo_id"]:
                            label_ref = str(item_sanitizado.get("title") or item_sanitizado.get("label") or "").strip()
                            item_sanitizado["campo_id"] = re.sub(r'[^a-zA-Z0-9_]', '', label_ref.lower().replace(" ", "_")) or f"campo_{idx}"

                        # Title e Label: Remove '¿' e pontos de interrogação/espaços no início do texto
                        raw_titulo = item_sanitizado.get("title") or item_sanitizado.get("label") or f"Pergunta {idx + 1}"
                        titulo_limpo = re.sub(r'^[¿\?\s]+', '', str(raw_titulo)).strip()
                        item_sanitizado["title"] = titulo_limpo
                        item_sanitizado["label"] = titulo_limpo

                        # Normalização do valor extraído
                        valor_extraido = item_sanitizado.get("valor")
                        if valor_extraido is None and "value" in item_sanitizado:
                            valor_extraido = item_sanitizado.get("value")
                        item_sanitizado["valor"] = valor_extraido

                        # Normalização do Tipo (Enum exigido: ABERTA, ESTIMULADA, MULTIPLA, COMPOSTA)
                        tipo_raw = str(item_sanitizado.get("type") or item_sanitizado.get("tipo_componente") or "").lower().strip()
                        if tipo_raw in ["checkbox", "multipla", "multiple"]:
                            tipo_enum = "MULTIPLA"
                        elif tipo_raw in ["radio", "select", "estimulada", "single"]:
                            tipo_enum = "ESTIMULADA"
                        elif tipo_raw in ["composta", "composite"]:
                            tipo_enum = "COMPOSTA"
                        else:
                            tipo_enum = "ABERTA"
                        
                        item_sanitizado["type"] = tipo_enum
                        item_sanitizado["tipo_componente"] = tipo_enum.lower()

                        # Campos estruturais obrigatórios da API
                        item_sanitizado["parentItem"] = item_sanitizado.get("parentItem", None)
                        item_sanitizado["compositeFields"] = item_sanitizado.get("compositeFields", [])
                        item_sanitizado["placeholder"] = item_sanitizado.get("placeholder", "")
                        item_sanitizado["required"] = bool(item_sanitizado.get("required", False))

                        # Normalização de Opções
                        opts_raw = item_sanitizado.get("options", [])
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
                        item_sanitizado["options"] = opts_normalizadas

                        campos_limpos.append(item_sanitizado)
                novo_dict[chave_limpa] = campos_limpos
            else:
                novo_dict[chave_limpa] = sanitizar_dicionario_recursivo(v)
        return novo_dict

    elif isinstance(dado, list):
        return [sanitizar_dicionario_recursivo(item) for item in dado]

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
    prompt_sistema = """
You are a highly precise, literal multimodal OCR extractor specialized in converting handwritten and printed form sketches into structured JSON.

CRITICAL EXTRACTION RULES (STRICT LITERAL OCR):

1. DOCUMENT CLASSIFICATION:
- Set "tipo_documento" based on the form header (e.g., "Prontuário Médico", "Formulário de Atendimento", "Anamnese", or "Formulário Generalista").

2. SINGLE SECTION MANDATE:
- Group ALL extracted fields into ONE SINGLE section inside "secoes".
- Set "titulo_secao" to "Geral".

3. STRICT LITERAL OCR (ZERO HALLUCINATION & NO REPHRASING):
- Extract text EXACTLY as written in the image or prompt.
- NEVER invent, rephrase, or convert short labels into questions.
- NEVER insert foreign characters or systemic non-Latin tokens (e.g., '시스템').
- NEVER add extra options that are not drawn in the image.

4. FIELD TYPE IDENTIFICATION & MAPPING ("campos"):
- ESTIMULADA (Selection / Checkbox / Radio):
  - Trigger: Checkboxes [ ], circles ( ), square boxes, bullets, or options grouped next to a label.
  - Set "type": "ESTIMULADA".
  - Extract EVERY VISIBLE choice into the "options" list.
- ABERTA (Open Text Input):
  - Trigger: Underlined lines (___), empty rectangular boxes, or blank space reserved for freeform text next to a label.
  - Set "type": "ABERTA".
  - Set "options": [].
- MULTIPLA: For questions where multiple choices can be checked simultaneously.
- COMPOSTA: For grouped blocks containing sub-questions.

5. FIELD LABELS ("title"):
- Fill "title" with the EXACT string extracted from the image or text (e.g., "Nome:", "idade:", "cor escolhida:").

6. VALUE EXTRACTION ("valor"):
- Extract the clinical content, answers, or data provided for each field into "valor" (e.g., "valor": "Luizmar Neto", "valor": "22 anos", "valor": "Verde").
- If no specific value is provided for a field, set "valor": null.

7. ANTI-LOOP & OUTPUT GUARDRAILS:
- Your output MUST strictly match the Pydantic JSON schema for ProntuarioUniversal.
- Do NOT output repeated words, non-Latin systemic tokens, or infinite character sequences.
- Provide a brief summary of the document in "resumo_narrativo" if legible, or leave it as "".

MANDATORY JSON SCHEMA STRUCTURE:
{
  "tipo_documento": "Formulário de Atendimento",
  "secoes": [
    {
      "titulo_secao": "Geral",
      "campos": [
        {
          "campo_id": "nome",
          "title": "Nome:",
          "label": "Nome:",
          "valor": "Luizmar Neto",
          "type": "ABERTA",
          "options": [],
          "compositeFields": []
        },
        {
          "campo_id": "idade",
          "title": "idade:",
          "label": "idade:",
          "valor": "22 anos",
          "type": "ABERTA",
          "options": [],
          "compositeFields": []
        },
        {
          "campo_id": "cor_escolhida",
          "title": "cor escolhida:",
          "label": "cor escolhida:",
          "valor": "Verde",
          "type": "ABERTA",
          "options": [],
          "compositeFields": []
        }
      ]
    }
  ],
  "resumo_narrativo": "Paciente: Luizmar Neto, 22 anos, com dores de cabeça, gosta da cor verde."
}

Respond ONLY with valid raw JSON matching the structure above. No markdown code blocks, no extra commentary.
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
                'num_ctx': 2048           
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

        # CONSOLIDAÇÃO EM SEÇÃO ÚNICA: Elimina criação de telas/páginas separadas ("Próximo")
        todas_perguntas = []
        for sec in secoes_tratadas:
            todas_perguntas.extend(sec.get("campos", []))

        secoes_formatadas = [
            {
                "title": "Geral",
                "titulo_secao": "Geral",
                "questions": todas_perguntas,
                "campos": todas_perguntas
            }
        ]

        nome_doc = f"Prontuário - {dados_prontuario.get('tipo_documento', 'Documento Clínico')}"

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
            "sections": secoes_formatadas,
            "resumo_narrativo": dados_prontuario.get("resumo_narrativo", ""),
            "criado_em": dados_prontuario.get("criado_em", datetime.utcnow())
        }
        
        # 1. Salva na coleção principal 'forms'
        db.forms.insert_one(documento_mongo)

        # 2. Popula também nas coleções 'sections' e 'questions' para consumo direto da assis_api
        sec_id = f"sec_{id_sessao}_1"
        secoes_doc = [{
            "_id": sec_id,
            "form_id": id_sessao,
            "title": "Geral",
            "order": 1
        }]

        questoes_doc = []
        for q_idx, q in enumerate(todas_perguntas):
            campo_slug = q.get("campo_id") or f"campo_{q_idx + 1}"
            q_id = f"q_{id_sessao}_{campo_slug}"  # Garante unicidade global do _id
            questoes_doc.append({
                "_id": q_id,
                "campo_id": campo_slug,
                "section_id": sec_id,
                "form_id": id_sessao,
                "title": q.get("title") or q.get("label", "Pergunta sem título"),
                "type": q.get("type", "ABERTA"),
                "valor": q.get("valor"),
                "value": q.get("valor"),
                "required": bool(q.get("required", False)),
                "placeholder": q.get("placeholder", ""),
                "options": q.get("options", []),
                "parentItem": q.get("parentItem", None),
                "compositeFields": q.get("compositeFields", [])
            })

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
