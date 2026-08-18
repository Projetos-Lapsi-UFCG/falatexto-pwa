import os
import httpx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

router = APIRouter(prefix="/vision", tags=["vision"])

VISION_ENGINE_URL = os.getenv("VISION_ENGINE_URL", "http://vision-engine:8001")
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


@router.post("/processar-clinica")
async def repassar_processamento_clinico(
    texto_clinico: str = Form(...),
    arquivo: Optional[UploadFile] = File(None),
    token: str = Depends(validar_token_bearer)
):
    """Encaminha o pedido de extração para o Vision Engine (requer token 0000)."""
    headers = {"Authorization": f"Bearer {token}"}
    
    files = None
    if arquivo:
        conteudo = await arquivo.read()
        files = {"arquivo": (arquivo.filename, conteudo, arquivo.content_type)}

    data = {"texto_clinico": texto_clinico}

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(
                f"{VISION_ENGINE_URL}/vision/processar-clinica",
                data=data,
                files=files,
                headers=headers
            )
            return resp.json()
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Erro ao comunicar com o Vision Engine: {exc}"
            )


@router.get("/status/{id_sessao}")
async def repassar_consulta_status(
    id_sessao: str,
    token: str = Depends(validar_token_bearer)
):
    """Consulta o status no Vision Engine (requer token 0000)."""
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client_http.post(
                f"{VISION_ENGINE_URL}/api/v1/processar-clinica",
                data=dados_formulario,
                files=arquivos,
            )
            if resp.status_code == 404:
                raise HTTPException(status_code=404, detail="Sessão não encontrada.")
            return resp.json()
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Erro ao comunicar com o Vision Engine: {exc}"
            )

@router.get(
    "/sessoes",
    response_model=VisionSessoesListOut,
    summary="Lista as sessões de processamento registradas no Vision Engine",
    responses={503: {"description": VISION_INDISPONIVEL}},
)
async def listar_sessoes():
    return await _proxy_get("/api/v1/sessoes")

@router.get("/sessoes")
async def repassar_lista_sessoes(
    token: str = Depends(validar_token_bearer)
):
    """Lista as sessões no Vision Engine (requer token 0000)."""
    headers = {"Authorization": f"Bearer {token}"}

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
    return await _proxy_get(f"/api/v1/status/{id_sessao}")
