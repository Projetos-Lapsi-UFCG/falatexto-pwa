from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .routers import forms, sections, questions, vision

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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forms.router)
app.include_router(sections.router)
app.include_router(questions.router)
app.include_router(vision.router)


@app.get("/", tags=["health"], summary="Verifica se a API está no ar")
def health():
    """Endpoint simples de *health check*, sem dependência do banco de dados."""
    return {"mensagem": "API funcionando com FastAPI"}
