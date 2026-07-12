from typing import List

from pydantic import BaseModel, Field, field_validator, ConfigDict


class FormMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: str = Field(..., min_length=1, max_length=20)
    active: bool

    @field_validator("version")
    @classmethod
    def validar_version(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("A versão não pode estar vazia")

        if value.lower() == "string":
            raise ValueError("A versão não pode ser 'string'")

        return value


class FormBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=3, max_length=120)
    sections: List[str] = Field(default_factory=list)
    metadata: FormMetadata

    @field_validator("name")
    @classmethod
    def validar_name(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("O nome não pode estar vazio")

        if value.lower() == "string":
            raise ValueError("O nome não pode ser 'string'")

        return value

    @field_validator("sections")
    @classmethod
    def validar_sections(cls, value: List[str]) -> List[str]:
        sections_limpas = []

        for item in value:
            item = item.strip()

            if not item:
                raise ValueError("A lista de sections não pode conter valores vazios")

            sections_limpas.append(item)

        if len(sections_limpas) != len(set(sections_limpas)):
            raise ValueError("A lista de sections não pode conter valores duplicados")

        return sections_limpas


class FormCreate(FormBase):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "id": "form_001",
                "name": "Anamnese Inicial",
                "sections": [],
                "metadata": {"version": "1.0", "active": True},
            }
        },
    )

    id: str = Field(..., pattern=r"^form_\d{3}$")

    @field_validator("id")
    @classmethod
    def validar_id(cls, value: str) -> str:
        value = value.strip()

        if value.lower() == "string":
            raise ValueError("O id não pode ser 'string'")

        return value


class FormUpdate(FormBase):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "name": "Anamnese Inicial - Revisão",
                "sections": ["sec_dados_pessoais"],
                "metadata": {"version": "1.1", "active": True},
            }
        },
    )


class FormSummaryOut(BaseModel):
    """Representação resumida de um formulário, usada na listagem."""

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., alias="_id")
    name: str
    metadata: FormMetadata


class FormOut(BaseModel):
    """Representação completa de um formulário."""

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., alias="_id")
    name: str
    sections: List[str]
    metadata: FormMetadata


class FormListOut(BaseModel):
    forms: List[FormSummaryOut]
