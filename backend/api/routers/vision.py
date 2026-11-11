import os
import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional
from datetime import datetime, timezone
from uuid import UUID

from pydantic import ValidationError
from pymongo.errors import DuplicateKeyError

from ..database import db
from ..models.form import FormOut
from ..models.section import SectionOut
from ..models.question import QuestionOut
from ..models.submission import SubmissionOut
from ..security import validar_codigo_api
from ..vision_adapter import preparar_submission_vision
from .submissions import validar_respostas_do_formulario

from ..config import VISION_ENGINE_URL
from ..models.vision import (
    VisionProcessarClinicaOut,
    VisionSessoesListOut,
    VisionStatusOut,
)

router = APIRouter(prefix="/vision", tags=["vision"])

VISION_ENGINE_TIMEOUT = 120.0
VISION_INDISPONIVEL = "Não foi possível conectar ao Motor de Visão"

API_SECRET_TOKEN = os.getenv("VISION_API_SECRET_TOKEN", "0000")

security = HTTPBearer(auto_error=False)


def validar_token_bearer(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Valida estritamente se o token enviado é o correto (0000)."""
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


async def _proxy_get(caminho: str, token: str):
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=VISION_ENGINE_TIMEOUT) as client_http:
        try:
            response = await client_http.get(f"{VISION_ENGINE_URL}{caminho}", headers=headers)
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503, detail=f"{VISION_INDISPONIVEL}: {exc}"
            ) from exc

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return response.json()


@router.post(
    "/processar-clinica",
    response_model=VisionProcessarClinicaOut,
    summary="Envia texto clínico (e opcionalmente um arquivo) para processamento pela LLM",
    description=(
        "Repassa o texto clínico e, se enviado, um arquivo (imagem, PDF ou CSV) "
        "para o Vision Engine, que processa em segundo plano e devolve o id da "
        "sessão para consulta posterior via `/vision/status/{id_sessao}`."
    ),
    responses={503: {"description": VISION_INDISPONIVEL}},
)
async def processar_clinica(
    texto_clinico: str = Form(...),
    file: UploadFile = File(None),
    token: str = Depends(validar_token_bearer),
):
    dados_formulario = {"texto_clinico": texto_clinico}
    arquivos = {}

    if file:
        conteudo_arquivo = await file.read()
        arquivos = {"arquivo": (file.filename, conteudo_arquivo, file.content_type)}

    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=VISION_ENGINE_TIMEOUT) as client_http:
        try:
            response = await client_http.post(
                f"{VISION_ENGINE_URL}/api/v1/processar-clinica",
                data=dados_formulario,
                files=arquivos,
                headers=headers,
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503, detail=f"{VISION_INDISPONIVEL}: {exc}"
            ) from exc

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return response.json()


@router.get(
    "/sessoes",
    response_model=VisionSessoesListOut,
    summary="Lista as sessões de processamento registradas no Vision Engine",
    responses={503: {"description": VISION_INDISPONIVEL}},
)
async def listar_sessoes(token: str = Depends(validar_token_bearer)):
    return await _proxy_get("/api/v1/sessoes", token)


@router.get(
    "/status/{id_sessao}",
    response_model=VisionStatusOut,
    summary="Consulta o status/resultado de uma sessão de processamento",
    description=(
        "Retorna o estado da sessão (`pending`, `executed` ou `failed`). Em "
        "`executed`, o campo `dados` traz o prontuário extraído pela LLM."
    ),
    responses={
        404: {"description": "Sessão não encontrada ou expirada"},
        503: {"description": VISION_INDISPONIVEL},
    },
)
async def consultar_status(id_sessao: str, token: str = Depends(validar_token_bearer)):
    return await _proxy_get(f"/api/v1/status/{id_sessao}", token)



@router.post(
    "/status/{id_sessao}/submission",
    response_model=SubmissionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Importa respostas do Vision Engine como rascunho",
)
async def importar_submission_vision(
    id_sessao: str,
    _: None = Depends(validar_codigo_api),
):
    # 1. Validar a identificacao da sessao.
    try:
        sessao_uuid = UUID(id_sessao)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail="ID de sessao invalido.",
        )

    if str(sessao_uuid) != id_sessao:
        raise HTTPException(
            status_code=422,
            detail="ID de sessao nao canonico.",
        )

    # 2. Exigir o indice que impede importacoes duplicadas.
    indice = db.submissions.index_information().get(
        "uniq_vision_session_id", {}
    )

    if indice.get("unique") is not True:
        raise HTTPException(
            status_code=503,
            detail="Indice de unicidade nao configurado.",
        )

    if db.submissions.find_one(
        {"visionSessionId": id_sessao},
        {"_id": 1},
    ):
        raise HTTPException(
            status_code=409,
            detail="Esta sessao ja foi importada.",
        )

    # 3. Consultar o Vision Engine com credencial interna.
    token_interno = os.getenv("VISION_API_SECRET_TOKEN")

    if not token_interno or token_interno == "0000":
        raise HTTPException(
            status_code=503,
            detail="Token interno do Vision Engine nao configurado.",
        )

    resultado_vision = await _proxy_get(
        f"/api/v1/status/{id_sessao}",
        token_interno,
    )

    if resultado_vision.get("status") != "executed":
        raise HTTPException(
            status_code=409,
            detail="Sessao do Vision Engine nao concluida.",
        )

    dados = resultado_vision.get("dados")

    if not isinstance(dados, dict):
        raise HTTPException(
            status_code=502,
            detail="Resultado do Vision Engine invalido.",
        )

    # 4. Recuperar o formulario salvo no MongoDB.
    formulario = db.forms.find_one({
        "_id": id_sessao,
        "deletedAt": None,
    })

    if formulario is None:
        raise HTTPException(
            status_code=404,
            detail="Formulario da sessao nao encontrado.",
        )

    # 5. Validar a arvore de secoes e perguntas.
    perguntas = []
    ids_visitados = set()

    try:
        FormOut.model_validate(formulario)

        for secao_id in formulario["sections"]:
            secao = db.sections.find_one({"_id": secao_id})

            if secao is None:
                raise ValueError("Secao nao encontrada")

            SectionOut.model_validate(secao)

            if secao["parentItem"] != id_sessao:
                raise ValueError("Vinculo de secao incorreto")

            if secao["subSections"]:
                raise ValueError(
                    "Subsecoes ainda nao suportadas na importacao"
                )

            for pergunta_id in secao["questions"]:
                if pergunta_id in ids_visitados:
                    raise ValueError("Pergunta referenciada duas vezes")

                ids_visitados.add(pergunta_id)

                pergunta = db.questions.find_one({
                    "_id": pergunta_id
                })

                if pergunta is None:
                    raise ValueError("Pergunta nao encontrada")

                QuestionOut.model_validate(pergunta)

                if pergunta["parentItem"] != secao_id:
                    raise ValueError("Vinculo de pergunta incorreto")

                perguntas.append(pergunta)

        if not perguntas:
            raise ValueError("Formulario sem perguntas")

        # 6. Converter respostas e validar seus identificadores.
        submission = preparar_submission_vision(
            dados=dados,
            form_id=id_sessao,
            perguntas_persistidas=perguntas,
        )

        validar_respostas_do_formulario(
            form_id=submission.formId,
            answers=submission.answers,
            checkbox_answers=submission.checkboxAnswers,
        )

    except (ValueError, KeyError, TypeError, ValidationError):
        raise HTTPException(
            status_code=409,
            detail="Formulario incompatível com o resultado do Vision Engine.",
        )

    # 7. Gravar uma submissao como rascunho.
    agora = datetime.now(timezone.utc)

    documento = submission.model_dump()
    documento.update({
        "visionSessionId": id_sessao,
        "submittedAt": agora,
        "updatedAt": agora,
        "deletedAt": None,
        "purgeAt": None,
    })

    try:
        insercao = db.submissions.insert_one(documento)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="Esta sessao ja foi importada.",
        )

    documento["_id"] = str(insercao.inserted_id)

    return SubmissionOut.model_validate(documento)

