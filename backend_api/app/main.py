from fastapi import FastAPI, HTTPException
import os
from pymongo import MongoClient

app = FastAPI()

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