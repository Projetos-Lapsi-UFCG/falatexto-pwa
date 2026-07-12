from fastapi import APIRouter, HTTPException

from ..database import db
from ..models import MessageOut

router = APIRouter(tags=["sections"])

SECTION_NAO_ENCONTRADA = "Seção não encontrada"


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
