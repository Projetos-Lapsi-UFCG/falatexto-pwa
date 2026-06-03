import os
from typing import Any, List, Literal, Optional
from pypdf import PdfReader
import ollama
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

app = FastAPI(title="FalaTexto LLM Gateway API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
client = ollama.Client(host=OLLAMA_HOST)
MODELO = "gemma4"

class CampoDinamico(BaseModel):
    campo_id: str = Field(description="ID único em snake_case")
    label: str = Field(description="Nome amigável do campo")
    valor: Any = Field(None, description="Valor dinâmico extraído (texto, número, bool ou nulo)")
    tipo_componente: Literal["checkbox", "texto", "numero"] = Field(description="Tipo de input do Front")

class SecaoDinamica(BaseModel):
    titulo_secao: str = Field(description="Título do bloco de dados")
    campos: List[CampoDinamico] = Field(description="Lista de campos dentro da seção")

class ProntuarioUniversal(BaseModel):
    tipo_documento: str = Field(description="Tipo do prontuário ou consulta")
    secoes: List[SecaoDinamica] = Field(description="Seções do documento")
    resumo_narrativo: str = Field(description="Resumo descritivo da consulta")

@app.post("/api/processar-clinica")
async def processar_clinica(
    texto_clinico: str = Form(...),
    arquivo: Optional[UploadFile] = File(None) 
):
    prompt_sistema = """Você é um motor de IA médico universal. Transforme dados clínicos brutos em um JSON estruturado.
    
    Você DEVE retornar OBRIGATORIAMENTE um objeto JSON que siga exatamente esta estrutura:
    {
      "tipo_documento": "string descrevendo o tipo de atendimento",
      "secoes": [
        {
          "titulo_secao": "string",
          "campos": [
            {
              "campo_id": "string_em_snake_case",
              "label": "Nome legível do campo",
              "valor": "qualquer valor correspondente, booleano ou null se não mencionado",
              "tipo_componente": "checkbox", "texto" ou "numero"
            }
          ]
        }
      ],
      "resumo_narrativo": "Resumo clínico profissional do atendimento"
    }
    
    Diretrizes cruciais:
    1. Defina o 'tipo_componente' de forma inteligente para o Front-end (checkbox, texto, numero).
    2. Respeite as regras de tipagem: se for um checkbox de Sim/Não, o valor deve ser booleano (true ou false).
    3. Não invente dados. Se não existir informação sobre o campo, retorne null.
    """

    mensagens = [{"role": "system", "content": prompt_sistema}]
    caminho_temporario = None
    usar_visao = False

    try:
        if arquivo and arquivo.filename:
            extensao = arquivo.filename.lower().split('.')[-1]
            conteudo_arquivo = await arquivo.read()

            if extensao in ["png", "jpg", "jpeg", "webp"]:
                caminho_temporario = f"temp_{arquivo.filename}"
                with open(caminho_temporario, "wb") as f:
                    f.write(conteudo_arquivo)
                usar_visao = True

            elif extensao == "pdf":
                caminho_temporario = f"temp_{arquivo.filename}"
                with open(caminho_temporario, "wb") as f:
                    f.write(conteudo_arquivo)

                reader = PdfReader(caminho_temporario)
                texto_extraido_pdf = ""
                for pagina in reader.pages:
                    texto_extraido_pdf += pagina.extract_text() or ""

                texto_clinico += f"\n\n[CONTEÚDO EXTRAÍDO DO PDF ANEXO]:\n{texto_extraido_pdf}"

            elif extensao == "csv":
                texto_extraido_csv = conteudo_arquivo.decode("utf-8", errors="ignore")
                texto_clinico += f"\n\n[CONTEÚDO EXTRAÍDO DA PLANILHA CSV ANEXA]:\n{texto_extraido_csv}"

            else:
                raise HTTPException(status_code=400, detail=f"Extensão .{extensao} não é suportada pelo FalaTexto.")

        if usar_visao and caminho_temporario:
            mensagens.append({
                "role": "user",
                "content": f"Processe as seguintes informações médicas: {texto_clinico}",
                "images": [caminho_temporario]
            })
        else:
            mensagens.append({
                "role": "user",
                "content": f"Processe as seguintes informações médicas: {texto_clinico}"
            })

        response = client.chat(
            model=MODELO,
            format='json',
            options={'temperature': 0.0},
            messages=mensagens
        )

        if caminho_temporario and os.path.exists(caminho_temporario):
            os.remove(caminho_temporario)

        return ProntuarioUniversal.model_validate_json(response['message']['content'])

    except Exception as e:
        if caminho_temporario and os.path.exists(caminho_temporario):
            os.remove(caminho_temporario)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("AutomaçãoAPI:app", host="127.0.0.1", port=8000, reload=True)