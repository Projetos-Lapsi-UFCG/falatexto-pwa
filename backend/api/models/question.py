from enum import Enum
from typing import List

from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict


class QuestionType(str, Enum):
    ABERTA = "ABERTA"
    ESTIMULADA = "ESTIMULADA"
    MULTIPLA = "MULTIPLA"
    COMPOSTA = "COMPOSTA"


class QuestionOption(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str = Field(..., min_length=1, max_length=80)
    value: str = Field(..., min_length=1, max_length=40)

    @field_validator("label", "value")
    @classmethod
    def validar_campos(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("O campo não pode estar vazio")

        if value.lower() == "string":
            raise ValueError("O campo não pode ser 'string'")

        return value


class QuestionBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=3, max_length=200)
    type: QuestionType
    options: List[QuestionOption] = Field(default_factory=list)
    compositeFields: List[str] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def validar_title(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("O título não pode estar vazio")

        if value.lower() == "string":
            raise ValueError("O título não pode ser 'string'")

        return value

    @field_validator("compositeFields")
    @classmethod
    def validar_composite_fields(cls, value: List[str]) -> List[str]:
        itens_limpos = []

        for item in value:
            item = item.strip()

            if not item:
                raise ValueError("compositeFields não pode conter valores vazios")

            itens_limpos.append(item)

        if len(itens_limpos) != len(set(itens_limpos)):
            raise ValueError("compositeFields não pode conter valores duplicados")

        return itens_limpos

    @model_validator(mode="after")
    def validar_regras_por_tipo(self):
        if self.type == QuestionType.ABERTA:
            if self.options:
                raise ValueError("Perguntas do tipo ABERTA não devem ter options")
            if self.compositeFields:
                raise ValueError(
                    "Perguntas do tipo ABERTA não devem ter compositeFields"
                )

        elif self.type in [QuestionType.ESTIMULADA, QuestionType.MULTIPLA]:
            if not self.options:
                raise ValueError(
                    "Perguntas do tipo ESTIMULADA ou MULTIPLA devem ter options"
                )
            if self.compositeFields:
                raise ValueError(
                    "Perguntas do tipo ESTIMULADA ou MULTIPLA não devem ter compositeFields"
                )

        elif self.type == QuestionType.COMPOSTA:
            if self.options:
                raise ValueError("Perguntas do tipo COMPOSTA não devem ter options")
            if not self.compositeFields:
                raise ValueError("Perguntas do tipo COMPOSTA devem ter compositeFields")

        return self


class QuestionCreate(QuestionBase):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "id": "q_sexo",
                "title": "Sexo",
                "type": "ESTIMULADA",
                "options": [
                    {"label": "Feminino", "value": "F"},
                    {"label": "Masculino", "value": "M"},
                ],
                "compositeFields": [],
            }
        },
    )

    id: str = Field(..., pattern=r"^q_[A-Za-z0-9_]+$")

    @field_validator("id")
    @classmethod
    def validar_id(cls, value: str) -> str:
        value = value.strip()

        if value.lower() == "string":
            raise ValueError("O id não pode ser 'string'")

        return value


class QuestionUpdate(QuestionBase):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "title": "Sexo biológico",
                "type": "ESTIMULADA",
                "options": [
                    {"label": "Feminino", "value": "F"},
                    {"label": "Masculino", "value": "M"},
                ],
                "compositeFields": [],
            }
        },
    )


class QuestionOut(BaseModel):
    """Representação completa de uma pergunta."""

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., alias="_id")
    parentItem: str
    title: str
    type: QuestionType
    options: List[QuestionOption]
    compositeFields: List[str]


class QuestionListOut(BaseModel):
    section_id: str
    questions: List[QuestionOut]
