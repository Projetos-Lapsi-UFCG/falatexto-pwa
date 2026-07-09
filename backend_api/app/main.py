from fastapi import FastAPI, HTTPException , status
import os
from pymongo import MongoClient
from typing import List
from pydantic import BaseModel, Field, field_validator, ConfigDict
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    id: str = Field(..., pattern=r"^form_\d{3}$")

    @field_validator("id")
    @classmethod
    def validar_id(cls, value: str) -> str:
        value = value.strip()

        if value.lower() == "string":
            raise ValueError("O id não pode ser 'string'")

        return value


class FormUpdate(FormBase):
    pass

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
    id: str = Field(..., pattern=r"^sec_[A-Za-z0-9_]+$")

    @field_validator("id")
    @classmethod
    def validar_id(cls, value: str) -> str:
        value = value.strip()

        if value.lower() == "string":
            raise ValueError("O id não pode ser 'string'")

        return value


class SectionUpdate(SectionBase):
    pass

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
                raise ValueError("Perguntas do tipo ABERTA não devem ter compositeFields")

        elif self.type in [QuestionType.ESTIMULADA, QuestionType.MULTIPLA]:
            if not self.options:
                raise ValueError("Perguntas do tipo ESTIMULADA ou MULTIPLA devem ter options")
            if self.compositeFields:
                raise ValueError("Perguntas do tipo ESTIMULADA ou MULTIPLA não devem ter compositeFields")

        elif self.type == QuestionType.COMPOSTA:
            if self.options:
                raise ValueError("Perguntas do tipo COMPOSTA não devem ter options")
            if not self.compositeFields:
                raise ValueError("Perguntas do tipo COMPOSTA devem ter compositeFields")

        return self


class QuestionCreate(QuestionBase):
    id: str = Field(..., pattern=r"^q_[A-Za-z0-9_]+$")

    @field_validator("id")
    @classmethod
    def validar_id(cls, value: str) -> str:
        value = value.strip()

        if value.lower() == "string":
            raise ValueError("O id não pode ser 'string'")

        return value


class QuestionUpdate(QuestionBase):
    pass

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "assis_db")

client = MongoClient(MONGO_URI)
db = client[MONGO_DB_NAME]

@app.get("/")
def raiz():
    return {"mensagem": "API funcionando com FastAPI"}

@app.get("/forms")
def listar_forms():
    forms = list(db.forms.find({}, {"_id": 1, "name": 1, "metadata": 1}))
    for form in forms:
        form["_id"] = str(form["_id"])
    return {"forms": forms}

@app.get("/forms/{form_id}")
def buscar_form_por_id(form_id: str):
    form = db.forms.find_one({"_id": form_id})

    if form is None:
        raise HTTPException(status_code=404, detail="Formulário não encontrado")

    form["_id"] = str(form["_id"])
    return form

@app.post("/forms", status_code=status.HTTP_201_CREATED)
def criar_form(form: FormCreate):
    form_existente = db.forms.find_one({"_id": form.id})

    if form_existente is not None:
        raise HTTPException(status_code=400, detail="Já existe um formulário com esse id")

    novo_form = {
        "_id": form.id,
        "name": form.name,
        "sections": form.sections,
        "metadata": form.metadata.model_dump()
    }

    db.forms.insert_one(novo_form)

    return novo_form

@app.delete("/forms/{form_id}")
def deletar_form(form_id: str):
    resultado = db.forms.delete_one({"_id": form_id})

    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Formulário não encontrado")

    return {
        "mensagem": "Formulário removido com sucesso",
        "id": form_id
    }

@app.put("/forms/{form_id}")
def atualizar_form(form_id: str, form: FormUpdate):
    form_existente = db.forms.find_one({"_id": form_id})

    if form_existente is None:
        raise HTTPException(status_code=404, detail="Formulário não encontrado")

    dados_atualizados = {
        "name": form.name,
        "sections": form.sections,
        "metadata": form.metadata.model_dump()
    }

    db.forms.update_one(
        {"_id": form_id},
        {"$set": dados_atualizados}
    )

    form_atualizado = db.forms.find_one({"_id": form_id})
    form_atualizado["_id"] = str(form_atualizado["_id"])

    return form_atualizado

@app.get("/forms/{form_id}/sections")
def listar_sections_do_form(form_id: str):
    form = db.forms.find_one({"_id": form_id})

    if form is None:
        raise HTTPException(status_code=404, detail="Formulário não encontrado")

    section_ids = form.get("sections", [])

    sections_encontradas = list(
        db.sections.find({"_id": {"$in": section_ids}})
    )

    sections_por_id = {
        section["_id"]: section for section in sections_encontradas
    }

    sections_ordenadas = []
    for section_id in section_ids:
        if section_id in sections_por_id:
            section = sections_por_id[section_id]
            section["_id"] = str(section["_id"])
            sections_ordenadas.append(section)

    return {
        "form_id": form_id,
        "sections": sections_ordenadas
    }
@app.post("/forms/{form_id}/sections", status_code=status.HTTP_201_CREATED)
def criar_section_no_form(form_id: str, section: SectionCreate):
    form = db.forms.find_one({"_id": form_id})

    if form is None:
        raise HTTPException(status_code=404, detail="Formulário não encontrado")

    section_existente = db.sections.find_one({"_id": section.id})

    if section_existente is not None:
        raise HTTPException(status_code=400, detail="Já existe uma seção com esse id")

    nova_section = {
        "_id": section.id,
        "title": section.title,
        "parentItem": form_id,
        "subSections": section.subSections,
        "questions": section.questions,
        "tags": section.tags
    }

    db.sections.insert_one(nova_section)

    db.forms.update_one(
        {"_id": form_id},
        {"$addToSet": {"sections": section.id}}
    )

    nova_section["_id"] = str(nova_section["_id"])
    return nova_section

@app.delete("/sections/{section_id}")
def deletar_section(section_id: str):
    section = db.sections.find_one({"_id": section_id})

    if section is None:
        raise HTTPException(status_code=404, detail="Seção não encontrada")

    if section.get("questions"):
        raise HTTPException(
            status_code=400,
            detail="Não é possível remover a seção porque ela possui perguntas associadas"
        )

    if section.get("subSections"):
        raise HTTPException(
            status_code=400,
            detail="Não é possível remover a seção porque ela possui subseções associadas"
        )

    parent_item = section.get("parentItem")

    resultado = db.sections.delete_one({"_id": section_id})

    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Seção não encontrada")

    if parent_item:
        if str(parent_item).startswith("form_"):
            db.forms.update_one(
                {"_id": parent_item},
                {"$pull": {"sections": section_id}}
            )
        elif str(parent_item).startswith("sec_"):
            db.sections.update_one(
                {"_id": parent_item},
                {"$pull": {"subSections": section_id}}
            )

    return {
        "mensagem": "Seção removida com sucesso",
        "id": section_id
    }

@app.get("/sections/{section_id}/questions")
def listar_questions_da_section(section_id: str):
    section = db.sections.find_one({"_id": section_id})

    if section is None:
        raise HTTPException(status_code=404, detail="Seção não encontrada")

    question_ids = section.get("questions", [])

    questions_encontradas = list(
        db.questions.find({"_id": {"$in": question_ids}})
    )

    questions_por_id = {
        question["_id"]: question for question in questions_encontradas
    }

    questions_ordenadas = []
    for question_id in question_ids:
        if question_id in questions_por_id:
            question = questions_por_id[question_id]
            question["_id"] = str(question["_id"])
            questions_ordenadas.append(question)

    return {
        "section_id": section_id,
        "questions": questions_ordenadas
    }

@app.post("/sections/{section_id}/questions", status_code=status.HTTP_201_CREATED)
def criar_question_na_section(section_id: str, question: QuestionCreate):
    section = db.sections.find_one({"_id": section_id})

    if section is None:
        raise HTTPException(status_code=404, detail="Seção não encontrada")

    question_existente = db.questions.find_one({"_id": question.id})

    if question_existente is not None:
        raise HTTPException(status_code=400, detail="Já existe uma pergunta com esse id")

    nova_question = {
        "_id": question.id,
        "parentItem": section_id,
        "title": question.title,
        "type": question.type.value,
        "options": [option.model_dump() for option in question.options],
        "compositeFields": question.compositeFields
    }

    db.questions.insert_one(nova_question)

    db.sections.update_one(
        {"_id": section_id},
        {"$addToSet": {"questions": question.id}}
    )

    nova_question["_id"] = str(nova_question["_id"])
    return nova_question

@app.get("/questions/{question_id}")
def buscar_question_por_id(question_id: str):
    question = db.questions.find_one({"_id": question_id})

    if question is None:
        raise HTTPException(status_code=404, detail="Pergunta não encontrada")

    question["_id"] = str(question["_id"])
    return question

@app.put("/questions/{question_id}")
def atualizar_question(question_id: str, question: QuestionUpdate):
    question_existente = db.questions.find_one({"_id": question_id})

    if question_existente is None:
        raise HTTPException(status_code=404, detail="Pergunta não encontrada")

    dados_atualizados = {
        "title": question.title,
        "type": question.type.value,
        "options": [option.model_dump() for option in question.options],
        "compositeFields": question.compositeFields
    }

    db.questions.update_one(
        {"_id": question_id},
        {"$set": dados_atualizados}
    )

    question_atualizada = db.questions.find_one({"_id": question_id})
    question_atualizada["_id"] = str(question_atualizada["_id"])

    return question_atualizada
@app.delete("/questions/{question_id}")
def deletar_question(question_id: str):
    question = db.questions.find_one({"_id": question_id})

    if question is None:
        raise HTTPException(status_code=404, detail="Pergunta não encontrada")

    parent_item = question.get("parentItem")

    resultado = db.questions.delete_one({"_id": question_id})

    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pergunta não encontrada")

    if parent_item:
        db.sections.update_one(
            {"_id": parent_item},
            {"$pull": {"questions": question_id}}
        )

    return {
        "mensagem": "Pergunta removida com sucesso",
        "id": question_id

    }

