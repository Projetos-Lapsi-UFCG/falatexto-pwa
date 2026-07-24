from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field

AnswerValue = Union[str, int, float, bool, List[str], None]

SUBMISSION_EXAMPLE = {
    "formId": "1",
    "formName": "Cirurgia Segura",
    "entity": "ent_500",
    "patientData": {
        "name": "João da Silva",
        "birthDate": "1980-05-12",
        "record": "123456",
        "room": "Sala 3",
    },
    "answers": {
        "q2": "q2_a",
        "q22_d": "12",
        "q22_e": "12",
    },
    "checkboxAnswers": {
        "q1_a": True,
        "q1_b": True,
    },
    "closingData": {
        "date": "2026-07-24",
        "responsible": "Enf. Maria Souza",
    },
    "status": "completed",
}


class SubmissionBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    formId: str = Field(..., min_length=1)
    formName: Optional[str] = None
    entity: Optional[str] = None
    patientData: Dict[str, Any] = Field(default_factory=dict)
    answers: Dict[str, AnswerValue] = Field(default_factory=dict)
    checkboxAnswers: Dict[str, bool] = Field(default_factory=dict)
    closingData: Dict[str, Any] = Field(default_factory=dict)
    status: Literal["draft", "completed"] = "completed"


class SubmissionCreate(SubmissionBase):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"example": SUBMISSION_EXAMPLE},
    )


class SubmissionOut(SubmissionBase):
    """Representação completa de uma submissão (formulário preenchido)."""

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., alias="_id")
    submittedAt: datetime


class SubmissionListOut(BaseModel):
    submissions: List[SubmissionOut]
