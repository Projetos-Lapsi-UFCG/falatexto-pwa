
import os
import re
import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer(auto_error=False)


def validar_codigo_api(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    codigo_correto = os.getenv("API_ACCESS_CODE")

    # Impede o uso da API sem configuracao valida
    if not codigo_correto or not re.fullmatch(r"[0-9]{4}", codigo_correto):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Codigo de acesso da API nao configurado.",
        )

    # Verifica o codigo enviado pelo cliente
    if (
        credentials is None
        or credentials.scheme.lower() != "bearer"
        or not secrets.compare_digest(
            credentials.credentials,
            codigo_correto,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Codigo de acesso ausente ou invalido.",
            headers={"WWW-Authenticate": "Bearer"},
        )
