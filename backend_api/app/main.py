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