from fastapi import APIRouter, HTTPException

from ..database import db
from ..models import MessageOut
from ..models.section import  SectionCreate, SectionUpdate, SectionOut

router = APIRouter(tags=["sections"])

SECTION_NAO_ENCONTRADA = "Seção não encontrada"



@router.put(
    "/sections/{section_id}",
    response_model=SectionOut,
    summary="Atualiza uma seção existente",
    description=(
        "Atualiza o título, subseções, perguntas e tags de uma seção existente. "
        "O identificador e o item pai da seção não são alterados."
    ),
    responses={
        404: {"description": SECTION_NAO_ENCONTRADA},
        400: {"description": "Referência inválida na seção"},
    },
)
def atualizar_section(section_id: str, section: SectionUpdate):
    section_existente = db.sections.find_one({"_id": section_id})

    if section_existente is None:
        raise HTTPException(
            status_code=404,
            detail=SECTION_NAO_ENCONTRADA,
        )

    # Verifica se as perguntas informadas existem
    if section.questions:
        perguntas_existentes = {
            pergunta["_id"]
            for pergunta in db.questions.find(
                {"_id": {"$in": section.questions}},
                {"_id": 1},
            )
        }

        perguntas_invalidas = set(section.questions) - perguntas_existentes

        if perguntas_invalidas:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Perguntas inexistentes: "
                    + ", ".join(sorted(perguntas_invalidas))
                ),
            )

    # Verifica se as subseções informadas existem
    if section.subSections:
        subsecoes_existentes = {
            sub["_id"]
            for sub in db.sections.find(
                {"_id": {"$in": section.subSections}},
                {"_id": 1},
            )
        }

        subsecoes_invalidas = set(section.subSections) - subsecoes_existentes

        if subsecoes_invalidas:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Subseções inexistentes: "
                    + ", ".join(sorted(subsecoes_invalidas))
                ),
            )

    dados_atualizados = section.model_dump()

    db.sections.update_one(
        {"_id": section_id},
        {"$set": dados_atualizados},
    )

    return db.sections.find_one({"_id": section_id})

@router.post(
    "/sections/{section_id}/subsections",
    response_model=SectionOut,
    status_code=201,
    summary="Cria uma subseção",
    description=(
        "Cria uma nova seção como filha de uma seção existente "
        "e adiciona seu id à lista subSections da seção pai."
    ),
    responses={
        404: {"description": SECTION_NAO_ENCONTRADA},
        400: {"description": "Já existe uma seção com o id informado"},
    },
)
def criar_subsection(section_id: str, subsection: SectionCreate):
    # 1. Verifica se a seção pai existe
    section_pai = db.sections.find_one({"_id": section_id})

    if section_pai is None:
        raise HTTPException(
            status_code=404,
            detail=SECTION_NAO_ENCONTRADA,
        )

    # 2. Verifica se o ID da nova subseção já existe
    section_existente = db.sections.find_one({"_id": subsection.id})

    if section_existente is not None:
        raise HTTPException(
            status_code=400,
            detail="Já existe uma seção com esse id",
        )

    # 3. Verifica se todas as perguntas informadas existem
    if subsection.questions:
        perguntas_existentes = {
            pergunta["_id"]
            for pergunta in db.questions.find(
                {"_id": {"$in": subsection.questions}},
                {"_id": 1},
            )
        }

        perguntas_invalidas = (
            set(subsection.questions) - perguntas_existentes
        )

        if perguntas_invalidas:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Perguntas inexistentes: "
                    + ", ".join(sorted(perguntas_invalidas))
                ),
            )

    # 4. Verifica se todas as subseções informadas existem
    if subsection.subSections:
        subsecoes_existentes = {
            sub["_id"]
            for sub in db.sections.find(
                {"_id": {"$in": subsection.subSections}},
                {"_id": 1},
            )
        }

        subsecoes_invalidas = (
            set(subsection.subSections) - subsecoes_existentes
        )

        if subsecoes_invalidas:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Subseções inexistentes: "
                    + ", ".join(sorted(subsecoes_invalidas))
                ),
            )

    # 5. Monta o documento da nova subseção
    nova_subsection = {
        "_id": subsection.id,
        "title": subsection.title,
        "parentItem": section_id,
        "subSections": subsection.subSections,
        "questions": subsection.questions,
        "tags": subsection.tags,
    }

    # 6. Salva a nova subseção
    db.sections.insert_one(nova_subsection)

    # 7. Adiciona a nova subseção à seção pai
    db.sections.update_one(
        {"_id": section_id},
        {"$addToSet": {"subSections": subsection.id}},
    )

    nova_subsection["_id"] = str(nova_subsection["_id"])

    return nova_subsection

@router.delete(
    "/sections/{section_id}",
    response_model=MessageOut,
    summary="Remove uma seção",
    description=(
        "Remove a seção e o vínculo com seu formulário ou seção pai. "
        "Falha se a seção ainda possuir perguntas ou subseções associadas."
    ),
    responses={
        404: {"description": SECTION_NAO_ENCONTRADA},
        400: {
            "description": (
                "A seção possui perguntas ou subseções associadas e não pode ser removida"
            )
        },
    },
)
def deletar_section(section_id: str):
    section = db.sections.find_one({"_id": section_id})

    if section is None:
        raise HTTPException(status_code=404, detail=SECTION_NAO_ENCONTRADA)

    if section.get("questions"):
        raise HTTPException(
            status_code=400,
            detail="Não é possível remover a seção porque ela possui perguntas associadas",
        )

    if section.get("subSections"):
        raise HTTPException(
            status_code=400,
            detail="Não é possível remover a seção porque ela possui subseções associadas",
        )

    parent_item = section.get("parentItem")

    resultado = db.sections.delete_one({"_id": section_id})

    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail=SECTION_NAO_ENCONTRADA)

    if parent_item:
        if str(parent_item).startswith("form_"):
            db.forms.update_one(
                {"_id": parent_item}, {"$pull": {"sections": section_id}}
            )
        elif str(parent_item).startswith("sec_"):
            db.sections.update_one(
                {"_id": parent_item}, {"$pull": {"subSections": section_id}}
            )

    return {"mensagem": "Seção removida com sucesso", "id": section_id}
