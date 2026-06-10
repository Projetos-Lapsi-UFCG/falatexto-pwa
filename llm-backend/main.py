import os
import uuid
from typing import Any, Dict, List, Literal, Optional
from pypdf import PdfReader
import ollama
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError
import uvicorn
import json

# --- INICIALIZAÇÃO DA API E "BANCO DE DADOS" EM MEMÓRIA ---
app = FastAPI(title="FalaTexto LLM Gateway API (Assíncrona)")

# Fila em memória para armazenar o status das requisições e os dados processados.
fila_de_sessoes: Dict[str, Any] = {}

# --- CONFIGURAÇÃO DE SEGURANÇA (CORS) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURAÇÃO DO OLLAMA ---
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
client = ollama.Client(host=OLLAMA_HOST)
MODELO = os.getenv("OLLAMA_MODEL", "gemma4")

# --- SCHEMAS DE VALIDAÇÃO (PYDANTIC V2) ---
class CampoDinamico(BaseModel):
    campo_id: str = Field(description="ID único em snake_case")
    label: str = Field(description="Nome amigável do campo")
    valor: Any = Field(None, description="Valor dinâmico extraído")
    tipo_componente: Literal["checkbox", "texto", "numero"] = Field(description="Tipo de input do Front")

class SecaoDinamica(BaseModel):
    titulo_secao: str = Field(description="Título do bloco de dados")
    campos: List[CampoDinamico] = Field(description="Lista de campos dentro da seção")

class ProntuarioUniversal(BaseModel):
    tipo_documento: str = Field(description="Tipo do prontuário ou consulta")
    secoes: List[SecaoDinamica] = Field(description="Seções do documento")
    resumo_narrativo: str = Field(description="Resumo descritivo da consulta")

# LÓGICA DE BACKGROUND (A TAREFA QUE RODA EM SEGUNDO PLANO)
async def processar_llm_em_segundo_plano(
    id_sessao: str, 
    texto_clinico: str, 
    conteudo_arquivo: bytes = None, 
    nome_arquivo: str = None
):
    """
    Esta função roda nos bastidores. Ela não trava o usuário.
    Ela faz todo o trabalho pesado e, no final, atualiza o status na `fila_de_sessoes`.
    """
    prompt_sistema = """Você é um motor de IA médico universal. Sua ÚNICA tarefa é transformar dados clínicos brutos no esquema JSON exato fornecido abaixo.

    Você está PROIBIDO de criar chaves como 'paciente', 'consulta', 'diagnostico' ou qualquer outra que não esteja no esquema abaixo. Toda e qualquer informação clínica (como nome do paciente, idade, queixas, conduta, receitas) DEVE ser encaixada obrigatoriamente dentro da lista de 'campos' divididos por 'secoes'.

    Você DEVE retornar OBRIGATORIAMENTE um objeto JSON com esta estrutura exata:
    {
      "tipo_documento": "Ex: Atendimento de Emergência, Prontuário Ambulatorial",
      "secoes": [
        {
          "titulo_secao": "Nome da Seção (Ex: Identificação do Paciente, Histórico Clínico, Prescrição Médica)",
          "campos": [
            {
              "campo_id": "nome_do_campo_em_snake_case (Ex: nome_paciente, queixa_principal, medicamento_receitado)",
              "label": "Nome legível para exibição na tela do usuário",
              "valor": "O dado extraído (Pode ser texto, número ou booleano true/false para checagens. Use null se não mencionado)",
              "tipo_componente": "Defina estritamente como 'texto', 'numero' ou 'checkbox'"
            }
          ]
        }
      ],
      "resumo_narrativo": "Um resumo clínico formal, contínuo e corrido do atendimento médico feito."
    }

    REGRAS DE OURO:
    - Nunca mude os nomes das chaves principais ('tipo_documento', 'secoes', 'titulo_secao', 'campos', 'campo_id', 'label', 'valor', 'tipo_componente', 'resumo_narrativo').
    - Se o paciente tem uma alergia, crie uma seção chamada 'Alergias' ou coloque como um campo de texto dentro de uma seção pertinente.
    - Responda APENAS o JSON puro, sem textos explicativos antes ou depois.
    """
    mensagens = [{"role": "system", "content": prompt_sistema}]
    caminho_temporario = None
    usar_visao = False

    try:
        # 1. PROCESSAMENTO DE ARQUIVOS
        if conteudo_arquivo and nome_arquivo:
            extensao = nome_arquivo.lower().split('.')[-1]
            caminho_temporario = f"temp_{id_sessao}_{nome_arquivo}" # Adiciona ID para evitar conflito de nomes
            
            with open(caminho_temporario, "wb") as f:
                f.write(conteudo_arquivo)

            if extensao in ["png", "jpg", "jpeg", "webp"]:
                usar_visao = True

            elif extensao == "pdf":
                reader = PdfReader(caminho_temporario)
                texto_extraido_pdf = "".join([p.extract_text() or "" for p in reader.pages])
                texto_clinico += f"\n\n[CONTEÚDO EXTRAÍDO DO PDF]:\n{texto_extraido_pdf}"

            elif extensao == "csv":
                texto_clinico += f"\n\n[CONTEÚDO EXTRAÍDO DO CSV]:\n{conteudo_arquivo.decode('utf-8', errors='ignore')}"

        # 2. MONTAGEM DO PROMPT
        if usar_visao and caminho_temporario:
            mensagens.append({"role": "user", "content": f"Processe as seguintes informações médicas: {texto_clinico}", "images": [caminho_temporario]})
        else:
            mensagens.append({"role": "user", "content": f"Processe as seguintes informações médicas: {texto_clinico}"})

        # 3. CHAMADA AO OLLAMA
        response = client.chat(model=MODELO, format='json', options={'temperature': 0.0}, messages=mensagens)

        if caminho_temporario and os.path.exists(caminho_temporario):
            os.remove(caminho_temporario)

        # 4. VALIDAÇÃO DO SCHEMA: Tenta converter o texto da IA para o nosso Schema. Se a IA errou, isso vai lançar um ValidationError.
        resposta_pura_llm = response['message']['content']
        dados_validados = ProntuarioUniversal.model_validate_json(resposta_pura_llm)

        # 5. SUCESSO: Atualiza o status da sessão para EXECUTED e salva os dados
        fila_de_sessoes[id_sessao] = {
            "status": "executed",
            "dados": dados_validados.model_dump()
        }

    except ValidationError as erro_schema:
        # FALHA DE SCHEMA: Atualiza o status para FAILED
        if caminho_temporario and os.path.exists(caminho_temporario): os.remove(caminho_temporario)
        fila_de_sessoes[id_sessao] = {
            "status": "failed",
            "erro": "Erro de Validação: A IA não seguiu o Schema do banco de dados.",
            "detalhes": erro_schema.errors()
        }
    except Exception as e:
        # FALHA CRÍTICA (Ex: Ollama caiu): Atualiza o status para FAILED
        if caminho_temporario and os.path.exists(caminho_temporario): os.remove(caminho_temporario)
        fila_de_sessoes[id_sessao] = {
            "status": "failed",
            "erro": str(e)
        }

# ENDPOINT 1: RECEBE OS DADOS E GERA A SESSÃO (Rápido e Assíncrono)
@app.post("/api/processar-clinica")
async def empilhar_processamento_clinico(
    background_tasks: BackgroundTasks, # Injeta o gerenciador de tarefas do FastAPI
    arquivo: UploadFile = File(None),
    texto_clinico: str = Form(...),
):
    """Recebe a requisição, cria um ID, coloca na fila e responde na hora para não travar o PWA."""
    # Gera um ID de sessão único (UUID)
    id_sessao = str(uuid.uuid4())
    
    # Registra o status inicial como "pending" na fila
    fila_de_sessoes[id_sessao] = {"status": "pending"}

    # Lê o conteúdo do arquivo para a memória para poder passar para a função de background
    conteudo_arquivo = None
    nome_arquivo = None
    if arquivo and arquivo.filename:
        conteudo_arquivo = await arquivo.read()
        nome_arquivo = arquivo.filename

    # Manda a função pesada rodar em segundo plano e libera o servidor na mesma hora
    background_tasks.add_task(
        processar_llm_em_segundo_plano, 
        id_sessao, 
        texto_clinico, 
        conteudo_arquivo, 
        nome_arquivo
    )

    # Retorna o ID para o Front-end saber quem ele é
    return {
        "mensagem": "Requisição empilhada com sucesso.",
        "id_sessao": id_sessao,
        "status": "pending",
        "link_consulta": f"/api/status/{id_sessao}"
    }

# ENDPOINT 2: CONSULTA DE STATUS (Polling)
@app.get("/api/status/{id_sessao}")
async def consultar_status_sessao(id_sessao: str):
    """O Front-end chama esse endpoint a cada X segundos para ver se o JSON já está pronto."""
    # Busca a sessão no nosso "banco de dados" em memória
    sessao = fila_de_sessoes.get(id_sessao)

    # Se o ID não existir, retorna erro
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão não encontrada ou expirada.")

    # Retorna o status atual ("pending", "executed" ou "failed") e os dados (se já terminou)
    return sessao

# ENDPOINT 3: LISTAGEM DE TODAS AS SESSÕES (Histórico/Recuperação de ID)
@app.get("/api/sessoes")
async def listar_sessoes_disponiveis():
    """
    Percorre o dicionário global e retorna todos os IDs que estão ativos no servidor
    junto com seus respectivos status, caso o usuário tenha perdido o seu protocolo.
    """
    # Se o dicionário estiver vazio, avisa o usuário de forma amigável
    if not fila_de_sessoes:
        return {
            "total_sessoes": 0,
            "mensagem": "Nenhuma sessão ativa ou registrada no momento.",
            "sessoes": []
        }
    
    # Criamos uma lista vazia para estruturar a resposta
    historico_sessoes = []
    
    # .items() do Python nos dá o par: chave (id_sessao) e valor (dados da sessao)
    for id_sessao, dados_da_sessao in fila_de_sessoes.items():
        historico_sessoes.append({
            "id_sessao": id_sessao,
            "status": dados_da_sessao["status"]
        })
        
    # Retorna o total de sessões encontradas e a lista para o Front-end
    return {
        "total_sessoes": len(historico_sessoes),
        "sessoes": historico_sessoes
    }

# --- INICIALIZAÇÃO DO SERVIDOR LOCAL ---
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)