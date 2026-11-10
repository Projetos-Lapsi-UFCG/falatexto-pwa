from fastapi import APIRouter, HTTPException

from ..database import db
from ..models import MessageOut
from ..models.section import  SectionCreate, SectionUpdate, SectionOut
from datetime import datetime, timedelta, timezone
from ..config import SOFT_DELETE_RETENTION_DAYS

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

    if section_existente.get("deletedAt") is not None:
        raise HTTPException(
            status_code=409,
            detail="Não é possível atualizar uma seção excluída",
        )
    
    # Verifica se as perguntas informadas existem
    if section.questions:
        perguntas_existentes = {
            pergunta["_id"]
            for pergunta in db.questions.find(
                {
        "_id": {"$in": section.questions},
        "$or": [
            {"deletedAt": None},
            {"deletedAt": {"$exists": False}},
        ],
    },
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
                {
                    "_id": {"$in": section.subSections},
                    "$or": [
                        {"deletedAt": None},
                        {"deletedAt": {"$exists": False}},
                    ],
                },
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
    if section_pai.get("deletedAt") is not None:
        raise HTTPException(
            status_code=409,
            detail="Não é possível criar subseções em uma seção excluída",
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
                {
                    "_id": {"$in": subsection.questions},
                    "$or": [
                        {"deletedAt": None},
                        {"deletedAt": {"$exists": False}},
                    ],
                },
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
                {
                    "_id": {"$in": subsection.subSections},
                    "$or": [
                        {"deletedAt": None},
                        {"deletedAt": {"$exists": False}},
                    ],
                },
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
        "Marca a seção como excluída logicamente, preservando "
        "seus dados e vínculos com o elemento pai. "
        "Não permite excluir seções com perguntas ou subseções associadas."
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
        raise HTTPException(
            status_code=404,
            detail=SECTION_NAO_ENCONTRADA
        )

    # DELETE idempotente
    if section.get("deletedAt") is not None:
        return {
            "mensagem": "Seção removida com sucesso",
            "id": section_id
        }

    # Mantém a regra de não excluir seções com dependências
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

    # Verifica se o elemento pai existe e está ativo
    parent_item = section.get("parentItem")

    if not parent_item:
        raise HTTPException(
            status_code=409,
            detail="Seção sem elemento pai"
        )

    if parent_item.startswith("form_"):
        parent = db.forms.find_one({"_id": parent_item})

    elif parent_item.startswith("sec_"):
        parent = db.sections.find_one({"_id": parent_item})

    else:
        raise HTTPException(
            status_code=409,
            detail="Tipo de elemento pai inválido"
        )

    if parent is None or parent.get("deletedAt") is not None:
        raise HTTPException(
            status_code=409,
            detail="Não é possível remover uma seção cujo elemento pai está ausente ou excluído"
        )

    agora = datetime.now(timezone.utc)

    purge_at = agora + timedelta(
        days=SOFT_DELETE_RETENTION_DAYS
    )

    resultado = db.sections.update_one(
        {
            "_id": section_id,
            "$or": [
                {"deletedAt": None},
                {"deletedAt": {"$exists": False}},
            ],
        },
        {
            "$set": {
                "deletedAt": agora,
                "purgeAt": purge_at,
                "updatedAt": agora
            }
        }
    )

    if resultado.matched_count == 0:
        raise HTTPException(
            status_code=409,
            detail="Não foi possível remover a seção"
        )

    return {
        "mensagem": "Seção removida com sucesso",
        "id": section_id
    }

@router.post(
    "/sections/{section_id}/restore",
    response_model=MessageOut,
    summary="Restaura uma seção removida",
    responses={404: {"description": SECTION_NAO_ENCONTRADA}},
)
def restaurar_section(section_id: str):

    section = db.sections.find_one({"_id": section_id})

    if section is None:
        raise HTTPException(
            status_code=404,
            detail=SECTION_NAO_ENCONTRADA
        )

    # Se já estiver ativa, não altera nada
    if section.get("deletedAt") is None:
        return {
            "mensagem": "Seção já está ativa",
            "id": section_id
        }

    # Se foi excluída por cascata, deve ser restaurada pelo formulário
    if section.get("deletedByCascade"):
        raise HTTPException(
            status_code=409,
            detail="Restaure a seção pela restauração do formulário"
        )

    agora = datetime.now(timezone.utc)

    # Verifica o prazo de retenção
    purge_at = section.get("purgeAt")

    if not isinstance(purge_at, datetime):
        raise HTTPException(
            status_code=409,
            detail="Prazo de restauração não encontrado"
        )

    if purge_at.tzinfo is None:
        purge_at = purge_at.replace(tzinfo=timezone.utc)

    if purge_at < agora:
        raise HTTPException(
            status_code=409,
            detail="Prazo de restauração expirado"
        )

    # Verifica o elemento pai
    parent_item = section.get("parentItem")

    if not parent_item:
        raise HTTPException(
            status_code=409,
            detail="Seção sem elemento pai"
        )

    if parent_item.startswith("form_"):
        parent = db.forms.find_one({"_id": parent_item})
        campo_vinculo = "sections"

    elif parent_item.startswith("sec_"):
        parent = db.sections.find_one({"_id": parent_item})
        campo_vinculo = "subSections"

    else:
        raise HTTPException(
            status_code=409,
            detail="Tipo de elemento pai inválido"
        )

    if parent is None or parent.get("deletedAt") is not None:
        raise HTTPException(
            status_code=409,
            detail="O elemento pai está ausente ou excluído"
        )

    # Confirma que o vínculo original continua existindo
    if section_id not in parent.get(campo_vinculo, []):
        raise HTTPException(
            status_code=409,
            detail="Vínculo original da seção não encontrado"
        )

    # Restaura a seção
    resultado = db.sections.update_one(
        {
            "_id": section_id,
            "deletedAt": section["deletedAt"],
            "$or": [
                {"deletedByCascade": None},
                {"deletedByCascade": {"$exists": False}},
            ],
        },
        {
            "$set": {
                "deletedAt": None,
                "purgeAt": None,
                "updatedAt": agora
            }
        }
    )

    if resultado.matched_count == 0:
        raise HTTPException(
            status_code=409,
            detail="Não foi possível restaurar a seção"
        )

    return {
        "mensagem": "Seção restaurada com sucesso",
        "id": section_id
    }