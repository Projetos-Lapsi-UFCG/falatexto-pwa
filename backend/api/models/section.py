from typing import List

from pydantic import BaseModel, Field, field_validator, ConfigDict


class SectionBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=3, max_length=120)
    subSections: List[str] = Field(default_factory=list)
    questions: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def validar_title(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("O título não pode estar vazio")

        if value.lower() == "string":
            raise ValueError("O título não pode ser 'string'")

        return value

    @field_validator("subSections", "questions", "tags")
    @classmethod
    def validar_listas(cls, value: List[str]) -> List[str]:
        itens_limpos = []

        for item in value:
            item = item.strip()

            if not item:
                raise ValueError("A lista não pode conter valores vazios")

            itens_limpos.append(item)

        if len(itens_limpos) != len(set(itens_limpos)):
            raise ValueError("A lista não pode conter valores duplicados")

        return itens_limpos


class SectionCreate(SectionBase):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "id": "sec_dados_pessoais",
                "title": "Dados Pessoais",
                "subSections": [],
                "questions": [],
                "tags": ["identificacao"],
            }
        },
    )

    id: str = Field(..., pattern=r"^sec_[A-Za-z0-9_]+$")

    @field_validator("id")
    @classmethod
    def validar_id(cls, value: str) -> str:
        value = value.strip()

        if value.lower() == "string":
            raise ValueError("O id não pode ser 'string'")

        return value


class SectionUpdate(SectionBase):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "title": "Dados Pessoais e Contato",
                "subSections": [],
                "questions": ["q_nome_completo"],
                "tags": ["identificacao"],
            }
        },
    )


class SectionOut(BaseModel):
    """Representação completa de uma seção."""

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., alias="_id")
    title: str
    parentItem: str
    subSections: List[str]
    questions: List[str]
    tags: List[str]


class SectionListOut(BaseModel):
    form_id: str
    sections: List[SectionOut]
