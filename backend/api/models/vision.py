from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class VisionProcessarClinicaOut(BaseModel):
    """Resposta ao enfileirar o processamento assíncrono de um texto clínico."""

    model_config = ConfigDict(extra="allow")

    mensagem: str
    id_sessao: str
    status: str
    link_consulta: str


class VisionSessaoResumo(BaseModel):
    model_config = ConfigDict(extra="allow")

    id_sessao: str
    status: str


class VisionSessoesListOut(BaseModel):
    model_config = ConfigDict(extra="allow")

    total_sessoes: int
    mensagem: Optional[str] = None
    sessoes: List[VisionSessaoResumo] = Field(default_factory=list)


class VisionStatusOut(BaseModel):
    """Formato varia conforme `status`: pending (só status), executed (dados),
    failed (erro, e detalhes em falhas de validação de schema)."""

    model_config = ConfigDict(extra="allow")

    status: str
    dados: Optional[Dict[str, Any]] = None
    erro: Optional[str] = None
    detalhes: Optional[List[Dict[str, Any]]] = None
