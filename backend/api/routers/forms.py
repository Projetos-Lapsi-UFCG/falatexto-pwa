from fastapi import APIRouter, HTTPException, status

from ..database import db
from ..models import MessageOut
from ..models.form import FormCreate, FormListOut, FormOut, FormUpdate
from ..models.section import SectionCreate, SectionListOut, SectionOut

router = APIRouter(prefix="/forms", tags=["forms"])

FORM_NAO_ENCONTRADO = "Formulário não encontrado"


def _extract_id(item):
    """Extrai o ID caso o item seja um dicionário ou o retorna caso já seja uma string/ID."""
    if isinstance(item, dict):
        return item.get("_id") or item.get("id")
    return item


@router.get(
    "",
    response_model=FormListOut,
    summary="Lista todos os formulários",
    description="Retorna uma versão resumida (id, nome e metadata) de cada formulário cadastrado.",
)
def listar_forms():
    forms = list(db.forms.find({}, {"_id": 1, "name": 1, "metadata": 1, "sections": 1}))

    all_section_ids = {
        _extract_id(sid)
        for form in forms
        for sid in form.get("sections", [])
        if _extract_id(sid) is not None
    }
    sections = list(
        db.sections.find(
            {"_id": {"$in": list(all_section_ids)}},
            {"_id": 1, "questions": 1, "subSections": 1},
        )
    )
    sections_by_id = {section["_id"]: section for section in sections}

    all_subsection_ids = {
        _extract_id(sid)
        for section in sections
        for sid in section.get("subSections", [])
        if _extract_id(sid) is not None
    }
    subsections = list(
        db.sections.find(
            {"_id": {"$in": list(all_subsection_ids)}}, {"_id": 1, "questions": 1}
        )
    )
    subsections_by_id = {subsection["_id"]: subsection for subsection in subsections}

    all_question_ids = set()
    for section in sections + subsections:
        for q in section.get("questions", []):
            qid = _extract_id(q)
            if qid is not None:
                all_question_ids.add(qid)

    questions = list(
        db.questions.find(
            {"_id": {"$in": list(all_question_ids)}}, {"_id": 1, "compositeFields": 1}
        )
    )
    composite_child_ids = {
        _extract_id(child_id)
        for question in questions
        for child_id in question.get("compositeFields", [])
        if _extract_id(child_id) is not None
    }

    for form in forms:
        question_ids = set()
        for section_ref in form.get("sections", []):
            section_id = _extract_id(section_ref)
            section = sections_by_id.get(section_id)
            if not section:
                continue
            for q in section.get("questions", []):
                qid = _extract_id(q)
                if qid is not None:
                    question_ids.add(qid)

            for sub_ref in section.get("subSections", []):
                sub_id = _extract_id(sub_ref)
                subsection = subsections_by_id.get(sub_id)
                if subsection:
                    for q in subsection.get("questions", []):
                        qid = _extract_id(q)
                        if qid is not None:
                            question_ids.add(qid)

        form["questionCount"] = len(question_ids - composite_child_ids)
        form["_id"] = str(form["_id"])

    return {"forms": forms}


@router.get(
    "/{form_id}",
    response_model=FormOut,
    summary="Busca um formulário pelo id",
    responses={404: {"description": FORM_NAO_ENCONTRADO}},
)
def buscar_form_por_id(form_id: str):
    form = db.forms.find_one({"_id": form_id})

    if form is None:
        raise HTTPException(status_code=404, detail=FORM_NAO_ENCONTRADO)

    form["_id"] = str(form["_id"])
    return form


@router.post(
    "",
    response_model=FormOut,
    status_code=status.HTTP_201_CREATED,
    summary="Cria um novo formulário",
    responses={400: {"description": "Já existe um formulário com esse id"}},
)
def criar_form(form: FormCreate):
    form_existente = db.forms.find_one({"_id": form.id})

    if form_existente is not None:
        raise HTTPException(
            status_code=400, detail="Já existe um formulário com esse id"
        )

    novo_form = {
        "_id": form.id,
        "name": form.name,
        "sections": form.sections,
        "metadata": form.metadata.model_dump(),
    }

    db.forms.insert_one(novo_form)

    return novo_form


@router.put(
    "/{form_id}",
    response_model=FormOut,
    summary="Atualiza um formulário existente",
    responses={404: {"description": FORM_NAO_ENCONTRADO}},
)
def atualizar_form(form_id: str, form: FormUpdate):
    form_existente = db.forms.find_one({"_id": form_id})

    if form_existente is None:
        raise HTTPException(status_code=404, detail=FORM_NAO_ENCONTRADO)

    dados_atualizados = {
        "name": form.name,
        "sections": form.sections,
        "metadata": form.metadata.model_dump(),
    }

    db.forms.update_one({"_id": form_id}, {"$set": dados_atualizados})

    form_atualizado = db.forms.find_one({"_id": form_id})
    form_atualizado["_id"] = str(form_atualizado["_id"])

    return form_atualizado


@router.delete(
    "/{form_id}",
    response_model=MessageOut,
    summary="Remove um formulário",
    responses={404: {"description": FORM_NAO_ENCONTRADO}},
)
def deletar_form(form_id: str):
    resultado = db.forms.delete_one({"_id": form_id})

    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail=FORM_NAO_ENCONTRADO)

    return {"mensagem": "Formulário removido com sucesso", "id": form_id}


@router.get(
    "/{form_id}/sections",
    response_model=SectionListOut,
    summary="Lista as seções de um formulário",
    description="Retorna as seções do formulário na mesma ordem em que estão referenciadas nele.",
    responses={404: {"description": FORM_NAO_ENCONTRADO}},
)
def listar_sections_do_form(form_id: str):
    form = db.forms.find_one({"_id": form_id})

    if form is None:
        raise HTTPException(status_code=404, detail=FORM_NAO_ENCONTRADO)

    raw_sections = form.get("sections", [])
    section_ids = [
        _extract_id(sid) for sid in raw_sections if _extract_id(sid) is not None
    ]

    sections_encontradas = list(db.sections.find({"_id": {"$in": section_ids}}))

    sections_por_id = {section["_id"]: section for section in sections_encontradas}

    sections_ordenadas = []
    for section_ref in raw_sections:
        section_id = _extract_id(section_ref)
        if section_id in sections_por_id:
            section = sections_por_id[section_id]
            section["_id"] = str(section["_id"])
            sections_ordenadas.append(section)

    return {"form_id": form_id, "sections": sections_ordenadas}


@router.post(
    "/{form_id}/sections",
    response_model=SectionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Cria uma seção diretamente em um formulário",
    description="Cria a seção e adiciona sua referência à lista de seções do formulário informado.",
    responses={
        404: {"description": FORM_NAO_ENCONTRADO},
        400: {"description": "Já existe uma seção com esse id"},
    },
)
def criar_section_no_form(form_id: str, section: SectionCreate):
    form = db.forms.find_one({"_id": form_id})

    if form is None:
        raise HTTPException(status_code=404, detail=FORM_NAO_ENCONTRADO)

    section_existente = db.sections.find_one({"_id": section.id})

    if section_existente is not None:
        raise HTTPException(status_code=400, detail="Já existe uma seção com esse id")

    nova_section = {
        "_id": section.id,
        "title": section.title,
        "parentItem": form_id,
        "subSections": section.subSections,
        "questions": section.questions,
        "tags": section.tags,
    }

    db.sections.insert_one(nova_section)

    db.forms.update_one({"_id": form_id}, {"$addToSet": {"sections": section.id}})

    nova_section["_id"] = str(nova_section["_id"])
    return nova_section