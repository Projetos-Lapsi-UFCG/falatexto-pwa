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


class VisionTranscricaoOut(BaseModel):
    """Texto transcrito (Whisper) de um áudio curto ditado pelo usuário."""

    model_config = ConfigDict(extra="allow")

    sucesso: bool
    texto: str
    analise_acustica: Optional[str] = None

class VisionPreencherFormularioIn(BaseModel):
    model_config = ConfigDict(extra="allow")

    transcricao: str
    formulario_nome: str = "Formulário"
    secoes: List[Dict[str, Any]] = Field(default_factory=list)
    respostas_atuais: Dict[str, Any] = Field(default_factory=dict)
    checkbox_atuais: Dict[str, bool] = Field(default_factory=dict)
    etapa_atual: int = 0
    data_atual: Optional[str] = None


class VisionPreencherFormularioOut(BaseModel):
    model_config = ConfigDict(extra="allow")

    answers: Dict[str, str] = Field(default_factory=dict)
    checkboxAnswers: Dict[str, bool] = Field(default_factory=dict)
    closingData: Dict[str, str] = Field(default_factory=dict)