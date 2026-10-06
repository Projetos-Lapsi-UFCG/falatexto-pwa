"""
Converte o prontuário extraído pela LLM no modelo de dados do backend principal
(coleções `forms`, `sections`, `questions` e `submissions`).

O backend (api/models) espera:
  - forms:     {_id: "form_NNN", name, sections: [ids de seção], metadata: {version, active}}
  - sections:  {_id: "sec_...", title, parentItem: form_id, subSections, questions: [ids], tags}
  - questions: {_id: "q_...", parentItem: sec_id, title, type, options, compositeFields, inputFormat}

Os valores extraídos (`valor`) não pertencem ao formulário (que é um modelo
reutilizável) e são gravados como uma submissão em rascunho.
"""

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pymongo.database import Database
from pymongo.errors import BulkWriteError, DuplicateKeyError

PADRAO_FORM_ID = re.compile(r"^form_(\d{3})$")
MAX_FORM_NUMERO = 999
TENTATIVAS_ID = 3

# Mesmas opções canônicas de BOOLEAN_OPTIONS no frontend (form-mapper.ts), para
# que a pergunta seja reconhecida como do tipo 'boolean' (Sim/Não).
OPCOES_BOOLEANAS = [{"label": "Sim", "value": "sim"}, {"label": "Não", "value": "nao"}]

INPUT_FORMAT_POR_TIPO = {"texto": "texto", "numero": "numero", "data": "data"}


# ==============================================================================
# ESPELHO DAS REGRAS DE VALIDAÇÃO DO BACKEND (api/models)
# ==============================================================================
# O Vision Engine é construído em um contexto Docker separado e não importa
# api/models; estes modelos replicam as regras que tornariam o documento
# inválido para a API.

class _FormMetadataDoc(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: str = Field(..., min_length=1, max_length=20)
    active: bool


class _FormDoc(BaseModel):
    # extra="allow": campos de origem (`source`) ficam no nível raiz e são
    # ignorados pelo FormOut da API.
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    id: str = Field(..., alias="_id", pattern=r"^form_\d{3}$")
    name: str = Field(..., min_length=3, max_length=120)
    sections: List[str]
    metadata: _FormMetadataDoc


class _SectionDoc(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(..., alias="_id", pattern=r"^sec_[A-Za-z0-9_]+$")
    title: str = Field(..., min_length=3, max_length=120)
    parentItem: str
    subSections: List[str]
    questions: List[str]
    tags: List[str]


class _QuestionDoc(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(..., alias="_id", pattern=r"^q_[A-Za-z0-9_]+$")
    parentItem: str
    title: str = Field(..., min_length=3, max_length=200)
    type: Literal["ABERTA", "ESTIMULADA"]
    options: List[Dict[str, str]]
    compositeFields: List[str]
    inputFormat: Optional[Literal["texto", "data", "numero"]]

    @model_validator(mode="after")
    def validar_regras_por_tipo(self):
        if self.type == "ABERTA" and self.options:
            raise ValueError("Perguntas do tipo ABERTA não devem ter options")
        if self.type == "ESTIMULADA" and (not self.options or self.inputFormat is not None):
            raise ValueError("Perguntas ESTIMULADA devem ter options e não ter inputFormat")
        return self


# ==============================================================================
# MONTAGEM DOS DOCUMENTOS
# ==============================================================================
@dataclass
class DocumentosFormulario:
    form: Dict[str, Any]
    sections: List[Dict[str, Any]] = field(default_factory=list)
    questions: List[Dict[str, Any]] = field(default_factory=list)
    answers: Dict[str, Any] = field(default_factory=dict)


def slugify(raw: Any) -> str:
    """Mesmas regras do slugify do frontend (form-mapper.ts)."""
    sem_acentos = unicodedata.normalize("NFD", str(raw).strip().lower())
    sem_acentos = "".join(c for c in sem_acentos if not unicodedata.combining(c))
    limpo = re.sub(r"[^a-z0-9_]+", "_", sem_acentos).strip("_")
    return limpo or "item"


def _ajustar_texto(valor: Any, padrao: str, minimo: int, maximo: int) -> str:
    texto = str(valor or "").strip().rstrip(":").strip()
    if len(texto) < minimo:
        texto = padrao
    return texto[:maximo].strip()


def _id_unico(base: str, usados: set) -> str:
    candidato, sufixo = base, 2
    while candidato in usados:
        candidato = f"{base}_{sufixo}"
        sufixo += 1
    usados.add(candidato)
    return candidato


def _resposta(valor: Any, tipo_componente: str) -> Optional[str]:
    """Converte o valor extraído no formato de `answers` usado pelo frontend."""
    if tipo_componente == "checkbox":
        if isinstance(valor, bool):
            return "sim" if valor else "nao"
        return None
    if valor is None or isinstance(valor, (dict, list)):
        return None
    texto = str(valor).strip()
    return texto or None


def montar_documentos(
    prontuario: Dict[str, Any],
    form_id: str,
    id_sessao: str,
    modelo: str,
) -> DocumentosFormulario:
    """Converte o prontuário validado (ProntuarioUniversal.model_dump()) nos
    documentos de forms/sections/questions esperados pelo backend."""
    numero = PADRAO_FORM_ID.match(form_id).group(1)

    nome = _ajustar_texto(
        f"Prontuário Automático - {prontuario.get('tipo_documento') or 'Documento Clínico'}",
        "Prontuário Automático",
        3,
        120,
    )

    documentos = DocumentosFormulario(form={})
    ids_secoes: set = set()
    ids_perguntas: set = set()

    for secao in prontuario.get("secoes") or []:
        campos = secao.get("campos") or []
        if not campos:
            continue

        titulo = _ajustar_texto(secao.get("titulo_secao"), "Seção", 3, 120)
        section_id = _id_unico(f"sec_{numero}_{slugify(titulo)}", ids_secoes)
        question_ids = []

        for campo in campos:
            tipo_componente = campo.get("tipo_componente") or "texto"
            titulo_pergunta = _ajustar_texto(campo.get("label"), "Campo", 3, 200)
            question_id = _id_unico(
                f"q_{numero}_{slugify(campo.get('campo_id') or titulo_pergunta)}", ids_perguntas
            )

            if tipo_componente == "checkbox":
                tipo, opcoes, input_format = "ESTIMULADA", [dict(o) for o in OPCOES_BOOLEANAS], None
            else:
                tipo, opcoes, input_format = "ABERTA", [], INPUT_FORMAT_POR_TIPO.get(tipo_componente, "texto")

            question = {
                "_id": question_id,
                "parentItem": section_id,
                "title": titulo_pergunta,
                "type": tipo,
                "options": opcoes,
                "compositeFields": [],
                "inputFormat": input_format,
            }
            _QuestionDoc.model_validate(question)
            documentos.questions.append(question)
            question_ids.append(question_id)

            resposta = _resposta(campo.get("valor"), tipo_componente)
            if resposta is not None:
                documentos.answers[question_id] = resposta

        section = {
            "_id": section_id,
            "title": titulo,
            "parentItem": form_id,
            "subSections": [],
            "questions": question_ids,
            "tags": ["vision"],
        }
        _SectionDoc.model_validate(section)
        documentos.sections.append(section)

    criado_em = prontuario.get("criado_em") or datetime.now(timezone.utc)
    documentos.form = {
        "_id": form_id,
        "name": nome,
        "sections": [s["_id"] for s in documentos.sections],
        "metadata": {"version": "1.0", "active": True},
        # Informações de origem ficam fora de `metadata`, que o backend valida
        # com extra="forbid".
        "source": {
            "engine": "vision",
            "model": modelo,
            "sessionId": id_sessao,
            "resumo_narrativo": prontuario.get("resumo_narrativo") or "",
            "createdAt": criado_em,
        },
    }
    _FormDoc.model_validate(documentos.form)

    return documentos


# ==============================================================================
# PERSISTÊNCIA
# ==============================================================================
def proximo_form_id(db: Database) -> str:
    numeros = [
        int(m.group(1))
        for doc in db.forms.find({"_id": {"$regex": PADRAO_FORM_ID.pattern}}, {"_id": 1})
        if (m := PADRAO_FORM_ID.match(str(doc["_id"])))
    ]
    proximo = max(numeros, default=0) + 1
    if proximo > MAX_FORM_NUMERO:
        raise RuntimeError("Limite de ids de formulário (form_999) atingido")
    return f"form_{proximo:03d}"


def _inserir_lote(colecao, docs: List[Dict[str, Any]], inseridos: List[Any]) -> None:
    """insert_many ordenado que registra em `inseridos` os ids efetivamente gravados."""
    if not docs:
        return
    try:
        colecao.insert_many(docs, ordered=True)
        inseridos.extend(d["_id"] for d in docs)
    except BulkWriteError as erro:
        inseridos.extend(d["_id"] for d in docs[: erro.details.get("nInserted", 0)])
        raise


def _id_duplicado(erro: Exception) -> bool:
    if isinstance(erro, DuplicateKeyError):
        return True
    if isinstance(erro, BulkWriteError):
        return any(e.get("code") == 11000 for e in erro.details.get("writeErrors", []))
    return False


def _inserir(db: Database, documentos: DocumentosFormulario) -> None:
    """Insere perguntas e seções antes do formulário, para que ele só fique
    visível na listagem quando tudo o que ele referencia já existir. Em caso de
    falha, remove apenas o que esta chamada gravou (nunca documentos de outro
    processamento que tenha reservado os mesmos ids)."""
    questions_inseridas: List[Any] = []
    sections_inseridas: List[Any] = []
    try:
        _inserir_lote(db.questions, documentos.questions, questions_inseridas)
        _inserir_lote(db.sections, documentos.sections, sections_inseridas)
        db.forms.insert_one(documentos.form)
    except Exception:
        if sections_inseridas:
            db.sections.delete_many({"_id": {"$in": sections_inseridas}})
        if questions_inseridas:
            db.questions.delete_many({"_id": {"$in": questions_inseridas}})
        raise


def persistir_formulario(
    db: Database,
    prontuario: Dict[str, Any],
    id_sessao: str,
    modelo: str,
) -> DocumentosFormulario:
    """Cria form/sections/questions no formato do backend e, se houver valores
    extraídos, uma submissão em rascunho. Retorna os documentos gravados."""
    for tentativa in range(TENTATIVAS_ID):
        documentos = montar_documentos(prontuario, proximo_form_id(db), id_sessao, modelo)
        try:
            _inserir(db, documentos)
            break
        except (DuplicateKeyError, BulkWriteError) as erro:
            # Outro processamento concorrente reservou o mesmo form_NNN (e,
            # portanto, os mesmos ids de seção/pergunta derivados dele).
            if not _id_duplicado(erro) or tentativa == TENTATIVAS_ID - 1:
                raise

    if documentos.answers:
        db.submissions.insert_one({
            "formId": documentos.form["_id"],
            "formName": documentos.form["name"],
            "entity": None,
            "patientData": {},
            "answers": documentos.answers,
            "checkboxAnswers": {},
            "closingData": {},
            "status": "draft",
            "submittedAt": datetime.now(timezone.utc),
        })

    return documentos
