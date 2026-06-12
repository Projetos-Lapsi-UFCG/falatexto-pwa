from fastapi import FastAPI, HTTPException , status
import os
from pymongo import MongoClient
from typing import List
from pydantic import BaseModel, Field

app = FastAPI()

class FormMetadata(BaseModel):
    version: str = Field(..., min_length=1)
    active: bool

class FormCreate(BaseModel) : 
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    sections: List[str] = []
    metadata: FormMetadata

class FormUpdate(BaseModel):
    name: str = Field(..., min_length=1)
    sections: List[str] = []
    metadata: FormMetadata

    
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