from fastapi import FastAPI, HTTPException, UploadFile, File, Form
import os
from pymongo import MongoClient
import httpx # Adicionado para fazer a ponte com a API de visão

app = FastAPI(title= "FalaTexto - API Principal")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "assis_db")

# URL interna para o docker usar e chamar o container de visão
VISION_ENGINE_URL = os.getenv("VISION_ENGINE_URL", "http://vision-engine:8001")
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


@app.post("/vision/processar-clinica", tags=["Vision Engine Integrado"])
async def processar_clinica_integrado(
    texto_clinico: str = Form(...),
    file: UploadFile = File(None)
):
    """
    Rota integrada (Task do Backlog): Recebe os dados clínicos e a imagem (opcional) 
    na API Principal, repassa para o vision-engine e retorna a resposta.
    """
    async with httpx.AsyncClient(timeout=120.0) as client_http:
        try:
            # 1. Prepara os dados de formulário simples
            data = {"texto_clinico": texto_clinico}
            files = {}

            # 2. Se o usuário enviou um arquivo, lê e adiciona no dicionário de arquivos
            if file:
                file_content = await file.read()
                files = {"arquivo": (file.filename, file_content, file.content_type)}
            
            # 3. Envia o POST interno para o container de visão
            url_completa = f"{VISION_ENGINE_URL}/api/processar-clinica"
            response = await client_http.post(url_completa, data=data, files=files)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Erro no Motor de Visão: {response.text}"
                )
                
            return response.json()
            
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503, 
                detail=f"Não foi possível conectar ao Motor de Visão (assis_vision_engine): {exc}"
            )
        
@app.get("/vision/sessoes", tags=["Vision Engine Integrado"])
async def listar_sessoes_vision_integrado():
    """
    Rota integrada: Busca no vision-engine a lista de todas as sessões 
    ativas ou registradas na memória.
    """

    async with httpx.AsyncClient(timeout=120.0) as client_http:
        try:
            url_completa = f"{VISION_ENGINE_URL}/api/sessoes"
            response = await client_http.get(url_completa)

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Erro ao buscar sessões no Motor de Visão: {response.text}"
                )
            
            return response.json()
        
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503, 
                detail=f"Não foi possível conectar ao Motor de Visão: {exc}"
            )
        
@app.get("/vision/status/{id_sessao}", tags=["Vision Engine Integrado"])
async def consultar_status_vision_integrado(id_sessao: str):
    """
    Rota integrada: Consulta o status e o resultado final de processamento 
    de uma sessão específica no vision-engine.
    """

    async with httpx.AsyncClient(timeout=120.0) as client_http:
        try:
            url_completa = f"{VISION_ENGINE_URL}/api/status/{id_sessao}"
            response = await client_http.get(url_completa)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Erro ao buscar status no Motor de Visão: {response.text}"
                )
                
            return response.json()
            
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503, 
                detail=f"Não foi possível conectar ao Motor de Visão: {exc}"
            )