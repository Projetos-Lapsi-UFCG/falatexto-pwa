import httpx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..config import VISION_ENGINE_URL
from ..models.vision import (
    VisionProcessarClinicaOut,
    VisionSessoesListOut,
    VisionStatusOut,
)

router = APIRouter(prefix="/vision", tags=["vision"])

VISION_ENGINE_TIMEOUT = 120.0
VISION_INDISPONIVEL = "Não foi possível conectar ao Motor de Visão"


async def _proxy_get(caminho: str):
    async with httpx.AsyncClient(timeout=VISION_ENGINE_TIMEOUT) as client_http:
        try:
            response = await client_http.get(f"{VISION_ENGINE_URL}{caminho}")
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
):
    dados_formulario = {"texto_clinico": texto_clinico}
    arquivos = {}

    if file:
        conteudo_arquivo = await file.read()
        arquivos = {"arquivo": (file.filename, conteudo_arquivo, file.content_type)}

    async with httpx.AsyncClient(timeout=VISION_ENGINE_TIMEOUT) as client_http:
        try:
            response = await client_http.post(
                f"{VISION_ENGINE_URL}/api/processar-clinica",
                data=dados_formulario,
                files=arquivos,
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
async def listar_sessoes():
    return await _proxy_get("/api/sessoes")


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
async def consultar_status(id_sessao: str):
    return await _proxy_get(f"/api/status/{id_sessao}")
