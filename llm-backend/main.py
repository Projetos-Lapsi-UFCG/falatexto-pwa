import os
from typing import Any, List, Literal, Optional
from pypdf import PdfReader
import ollama
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# --- INICIALIZAÇÃO DA API ---
# Inicializa o framework FastAPI definindo o título da documentação automática (Swagger/OpenAPI).
app = FastAPI(title="FalaTexto LLM Gateway API")

# --- CONFIGURAÇÃO DE SEGURANÇA (CORS) ---
# Permite que o Front-end consiga fazer requisições para este Backend sem bloqueios de segurança do navegador.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite requisições de qualquer origem
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos os métodos HTTP (GET, POST, etc.)
    allow_headers=["*"],  # Permite todos os cabeçalhos de metadados
)

# --- CONFIGURAÇÃO DO CLIENTE DE INTEGRAÇÃO COM A IA (OLLAMA) ---
# Tenta ler a URL do Ollama de uma variável de ambiente (Docker). Se não achar, usa o localhost como padrão.
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
client = ollama.Client(host=OLLAMA_HOST)
MODELO = os.getenv("OLLAMA_MODEL", "gemma4")  # Define o modelo LLM específico que será utilizado no projeto

# --- SCHEMAS DE VALIDAÇÃO DE DADOS (PYDANTIC V2) ---
# Estas classes garantem que a saída da IA siga rigorosamente uma estrutura de dados conhecida,
# evitando que o Front-end receba dados nulos, corrompidos ou em formatos inesperados.

class CampoDinamico(BaseModel):
    """Define a estrutura de cada campo de um formulário clínico médico."""
    campo_id: str = Field(description="ID único em snake_case")
    label: str = Field(description="Nome amigável do campo")
    valor: Any = Field(None, description="Valor dinâmico extraído (texto, número, bool ou nulo)")
    tipo_componente: Literal["checkbox", "texto", "numero"] = Field(description="Tipo de input do Front")

class SecaoDinamica(BaseModel):
    """Agrupa os campos clínicos em seções lógicas (ex: Sinais Vitais, Sintomas)."""
    titulo_secao: str = Field(description="Título do bloco de dados")
    campos: List[CampoDinamico] = Field(description="Lista de campos dentro da seção")

class ProntuarioUniversal(BaseModel):
    """Contrato final e completo do documento que será devolvido estruturado para o Front-end."""
    tipo_documento: str = Field(description="Tipo do prontuário ou consulta")
    secoes: List[SecaoDinamica] = Field(description="Seções do documento")
    resumo_narrativo: str = Field(description="Resumo descritivo da consulta")


# --- ROTA PRINCIPAL DE PROCESSAMENTO (ENDPOINT) ---
@app.post("/api/processar-clinica")
async def processar_clinica(
    arquivo: UploadFile = File(None),  # Recebe um arquivo opcional enviado pelo usuário via formulário
    texto_clinico: str = Form(...),             # Recebe o relato em texto enviado pelo usuário via formulário
):
    # Prompt do Sistema: Define a persona da IA, as regras de negócio médicas e o esquema estrito do JSON.
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
    2. Respeite as regras de tipagem: se foi um checkbox de Sim/Não, o valor deve ser booleano (true ou false).
    3. Não invente dados. Se não existir informação sobre o campo, retorne null.
    """

    # Inicia a pilha de mensagens que será enviada para o Ollama
    mensagens = [{"role": "system", "content": prompt_sistema}]
    caminho_temporario = None
    usar_visao = False

    try:
        # --- TRATAMENTO E PROCESSAMENTO DE ARQUIVOS ANEXOS ---
        if arquivo and arquivo.filename:
            extensao = arquivo.filename.lower().split('.')[-1]
            conteudo_arquivo = await arquivo.read()

            # Cenário A: O arquivo é uma imagem (A IA usará visão multimodal para analisar o documento)
            if extensao in ["png", "jpg", "jpeg", "webp"]:
                caminho_temporario = f"temp_{arquivo.filename}"
                with open(caminho_temporario, "wb") as f:
                    f.write(conteudo_arquivo)
                usar_visao = True

            # Cenário B: O arquivo é um PDF (O código extrai o texto nativamente antes de enviar à IA)
            elif extensao == "pdf":
                caminho_temporario = f"temp_{arquivo.filename}"
                with open(caminho_temporario, "wb") as f:
                    f.write(conteudo_arquivo)

                reader = PdfReader(caminho_temporario)
                texto_extraido_pdf = ""
                for pagina in reader.pages:
                    texto_extraido_pdf += pagina.extract_text() or ""

                # Injeta o texto extraído do PDF dentro do texto clínico principal
                texto_clinico += f"\n\n[CONTEÚDO EXTRAÍDO DO PDF ANEXO]:\n{texto_extraido_pdf}"

            # Cenário C: O arquivo é uma planilha CSV (O texto é decodificado nativamente)
            elif extensao == "csv":
                texto_extraido_csv = conteudo_arquivo.decode("utf-8", errors="ignore")
                texto_clinico += f"\n\n[CONTEÚDO EXTRAÍDO DA PLANILHA CSV ANEXA]:\n{texto_extraido_csv}"

            # Cenário D: Formato não aceito (Gera uma exceção HTTP 400 - Bad Request)
            else:
                raise HTTPException(status_code=400, detail=f"Extensão .{extensao} não é suportada pelo FalaTexto.")

        # --- MONTAGEM DO PROMPT DO USUÁRIO ---
        if usar_visao and caminho_temporario:
            # Se for imagem, injeta a imagem na lista estruturada para o modelo multimodal processar visualmente
            mensagens.append({
                "role": "user",
                "content": f"Processe as seguintes informações médicas: {texto_clinico}",
                "images": [caminho_temporario]
            })
        else:
            # Se for apenas texto ou arquivos de texto extraídos, faz uma chamada de chat comum
            mensagens.append({
                "role": "user",
                "content": f"Processe as seguintes informações médicas: {texto_clinico}"
            })

        # --- CHAMADA DO MODELO DE INTELIGÊNCIA ARTIFICIAL ---
        response = client.chat(
            model=MODELO,
            format='json',               # Força o Ollama a garantir uma saída estritamente em formato JSON válido
            options={'temperature': 0.0}, # Temperatura 0 força respostas determinísticas (sem "alucinações" ou criatividade)
            messages=mensagens
        )

        # Limpeza física pós-processamento: Deleta do servidor o arquivo temporário gerado para a requisição
        if caminho_temporario and os.path.exists(caminho_temporario):
            os.remove(caminho_temporario)

        # --- VALIDAÇÃO E ENTREGA DOS DADOS ---
        # Pega a string JSON retornada pela IA e valida contra a classe ProntuarioUniversal (Pydantic). 
        # Se os dados forem válidos, retorna o JSON perfeitamente estruturado e tipado ao solicitante.
        return ProntuarioUniversal.model_validate_json(response['message']['content'])

    except Exception as e:
        # Garante a limpeza do arquivo temporário mesmo em caso de erro no meio do processo
        if caminho_temporario and os.path.exists(caminho_temporario):
            os.remove(caminho_temporario)
        # Retorna um erro HTTP 500 (Internal Server Error) com os detalhes do problema para facilitar o debug
        raise HTTPException(status_code=500, detail=str(e))

# --- INICIALIZAÇÃO DO SERVIDOR LOCAL ---
# Se o arquivo for executado diretamente, levanta o servidor Uvicorn na porta 8000 com Auto-Reload ativado (reinicia ao salvar).
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)