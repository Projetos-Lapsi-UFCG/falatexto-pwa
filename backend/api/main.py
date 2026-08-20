from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .routers import forms, sections, questions, submissions, vision

DESCRIPTION = """
API do **Fala-Texto**, sistema de documentação clínica.

A API organiza os dados em uma hierarquia:

- **Formulários** (`forms`) contêm uma ou mais **seções**.
- **Seções** (`sections`) contêm perguntas e podem ter **subseções** aninhadas.
- **Perguntas** (`questions`) pertencem a uma seção e podem ser dos tipos
  `ABERTA`, `ESTIMULADA`, `MULTIPLA` ou `COMPOSTA`.
"""

tags_metadata = [
    {
        "name": "health",
        "description": "Verificação de disponibilidade da API.",
    },
    {
        "name": "forms",
        "description": "Formulários clínicos e sua estrutura de seções.",
    },
    {
        "name": "sections",
        "description": "Seções e subseções que organizam perguntas dentro de um formulário.",
    },
    {
        "name": "questions",
        "description": (
            "Perguntas associadas a uma seção (abertas, estimuladas, "
            "múltiplas ou compostas)."
        ),
    },
    {
        "name": "submissions",
        "description": "Formulários preenchidos (respostas, dados do paciente e encerramento).",
    },
    {
        "name": "vision",
        "description": "Integração com o Vision Engine para extração de dados clínicos via LLM.",
    },
]

app = FastAPI(
    title="Fala-Texto API",
    description=DESCRIPTION,
    version="1.0.0",
    openapi_tags=tags_metadata,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    # Sem allow_credentials=True: a API não usa cookies/auth, e a combinação
    # allow_origins=["*"] + allow_credentials=True é inválida pela spec de CORS
    # (navegadores rejeitam respostas credenciadas com origin "*").
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_V1_PREFIX = "/api/v1"

app.include_router(forms.router, prefix=API_V1_PREFIX)
app.include_router(sections.router, prefix=API_V1_PREFIX)
app.include_router(questions.router, prefix=API_V1_PREFIX)
app.include_router(submissions.router, prefix=API_V1_PREFIX)
app.include_router(vision.router, prefix=API_V1_PREFIX)


@app.get("/", tags=["health"], summary="Verifica se a API está no ar")
def health():
    """Endpoint simples de *health check*, sem dependência do banco de dados."""
    return {"mensagem": "API funcionando com FastAPI"}
