import os
import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional

from ..config import VISION_ENGINE_URL
from ..models.vision import (
    VisionProcessarClinicaOut,
    VisionSessoesListOut,
    VisionStatusOut,
    VisionTranscricaoOut,
)

router = APIRouter(prefix="/vision", tags=["vision"])

VISION_ENGINE_TIMEOUT = 120.0
# A primeira transcrição carrega o modelo Whisper na memória (e pode baixá-lo).
TRANSCRICAO_TIMEOUT = 600.0
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
    summary="Envia um arquivo (e opcionalmente nome/texto clínico) para processamento pela LLM",
    description=(
        "Repassa o nome do formulário, o texto clínico e, se enviado, um arquivo "
        "(imagem, PDF ou CSV) para o Vision Engine, que processa em segundo plano "
        "e devolve o id da sessão para consulta posterior via "
        "`/vision/status/{id_sessao}`. Se `nome` for enviado, ele é usado como "
        "nome do formulário gerado."
    ),
    responses={503: {"description": VISION_INDISPONIVEL}},
)
async def processar_clinica(
    texto_clinico: str = Form(""),
    nome: Optional[str] = Form(None),
    file: UploadFile = File(None),
    token: str = Depends(validar_token_bearer),
):
    dados_formulario = {"texto_clinico": texto_clinico}
    if nome:
        dados_formulario["nome"] = nome
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


@router.post(
    "/transcrever-campo",
    response_model=VisionTranscricaoOut,
    summary="Transcreve um áudio curto (ditado) para texto",
    description=(
        "Repassa o áudio (campo `audio`, ex.: webm/mp4/wav) para o Vision Engine, "
        "que verifica a qualidade e transcreve com Whisper (pt). Devolve `422` "
        "quando o áudio está baixo demais ou com muito ruído."
    ),
    responses={
        422: {"description": "Áudio com volume baixo ou ruído elevado"},
        503: {"description": VISION_INDISPONIVEL},
    },
)
async def transcrever_campo(
    audio: UploadFile = File(...),
    token: str = Depends(validar_token_bearer),
):
    conteudo_audio = await audio.read()
    arquivos = {"audio": (audio.filename or "ditado.webm", conteudo_audio, audio.content_type)}
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=TRANSCRICAO_TIMEOUT) as client_http:
        try:
            response = await client_http.post(
                f"{VISION_ENGINE_URL}/api/v1/transcrever-campo",
                files=arquivos,
                headers=headers,
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503, detail=f"{VISION_INDISPONIVEL}: {exc}"
            ) from exc

    if response.status_code != 200:
        # Repassa o `detail` do engine (ex.: "Áudio muito baixo") sem reembrulhar o JSON
        try:
            detalhe = response.json().get("detail", response.text)
        except ValueError:
            detalhe = response.text
        raise HTTPException(status_code=response.status_code, detail=detalhe)

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
