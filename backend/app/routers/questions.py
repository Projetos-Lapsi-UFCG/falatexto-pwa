from fastapi import APIRouter, Body, HTTPException, status

from ..database import db
from ..models import MessageOut
from ..models.question import QuestionCreate, QuestionListOut, QuestionOut, QuestionUpdate

router = APIRouter(tags=["questions"])

SECTION_NAO_ENCONTRADA = "Seção não encontrada"
QUESTION_NAO_ENCONTRADA = "Pergunta não encontrada"

QUESTION_EXAMPLES = {
    "aberta": {
        "summary": "Pergunta aberta",
        "description": "Resposta de texto livre, sem options nem compositeFields.",
        "value": {
            "id": "q_queixa_principal",
            "title": "Queixa principal",
            "type": "ABERTA",
            "options": [],
            "compositeFields": [],
        },
    },
    "estimulada_ou_multipla": {
        "summary": "Pergunta estimulada ou múltipla",
        "description": "Escolha entre opções pré-definidas; exige options.",
        "value": {
            "id": "q_sexo",
            "title": "Sexo",
            "type": "ESTIMULADA",
            "options": [
                {"label": "Feminino", "value": "F"},
                {"label": "Masculino", "value": "M"},
            ],
            "compositeFields": [],
        },
    },
    "composta": {
        "summary": "Pergunta composta",
        "description": "Agrupa outras perguntas por id; exige compositeFields.",
        "value": {
            "id": "q_endereco",
            "title": "Endereço",
            "type": "COMPOSTA",
            "options": [],
            "compositeFields": ["q_rua", "q_numero", "q_cidade"],
        },
    },
}


@router.get(
    "/sections/{section_id}/questions",
    response_model=QuestionListOut,
    summary="Lista as perguntas de uma seção",
    description="Retorna as perguntas na mesma ordem em que estão referenciadas na seção.",
    responses={404: {"description": SECTION_NAO_ENCONTRADA}},
)
def listar_questions_da_section(section_id: str):
    section = db.sections.find_one({"_id": section_id})

    if section is None:
        raise HTTPException(status_code=404, detail=SECTION_NAO_ENCONTRADA)

    question_ids = section.get("questions", [])

    questions_encontradas = list(db.questions.find({"_id": {"$in": question_ids}}))

    questions_por_id = {question["_id"]: question for question in questions_encontradas}

    questions_ordenadas = []
    for question_id in question_ids:
        if question_id in questions_por_id:
            question = questions_por_id[question_id]
            question["_id"] = str(question["_id"])
            questions_ordenadas.append(question)

    return {"section_id": section_id, "questions": questions_ordenadas}


@router.post(
    "/sections/{section_id}/questions",
    response_model=QuestionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Cria uma pergunta em uma seção",
    description=(
        "Cria a pergunta e adiciona sua referência à lista de perguntas da seção. "
        "As regras de `options`/`compositeFields` variam por `type` "
        "(veja os exemplos disponíveis)."
    ),
    responses={
        404: {"description": SECTION_NAO_ENCONTRADA},
        400: {"description": "Já existe uma pergunta com esse id"},
    },
)
def criar_question_na_section(
    section_id: str,
    question: QuestionCreate = Body(..., openapi_examples=QUESTION_EXAMPLES),
):
    section = db.sections.find_one({"_id": section_id})

    if section is None:
        raise HTTPException(status_code=404, detail=SECTION_NAO_ENCONTRADA)

    question_existente = db.questions.find_one({"_id": question.id})

    if question_existente is not None:
        raise HTTPException(
            status_code=400, detail="Já existe uma pergunta com esse id"
        )

    nova_question = {
        "_id": question.id,
        "parentItem": section_id,
        "title": question.title,
        "type": question.type.value,
        "options": [option.model_dump() for option in question.options],
        "compositeFields": question.compositeFields,
    }

    db.questions.insert_one(nova_question)

    db.sections.update_one(
        {"_id": section_id}, {"$addToSet": {"questions": question.id}}
    )

    nova_question["_id"] = str(nova_question["_id"])
    return nova_question


@router.get(
    "/questions/{question_id}",
    response_model=QuestionOut,
    summary="Busca uma pergunta pelo id",
    responses={404: {"description": QUESTION_NAO_ENCONTRADA}},
)
def buscar_question_por_id(question_id: str):
    question = db.questions.find_one({"_id": question_id})

    if question is None:
        raise HTTPException(status_code=404, detail=QUESTION_NAO_ENCONTRADA)

    question["_id"] = str(question["_id"])
    return question


@router.put(
    "/questions/{question_id}",
    response_model=QuestionOut,
    summary="Atualiza uma pergunta existente",
    responses={404: {"description": QUESTION_NAO_ENCONTRADA}},
)
def atualizar_question(
    question_id: str,
    question: QuestionUpdate = Body(..., openapi_examples=QUESTION_EXAMPLES),
):
    question_existente = db.questions.find_one({"_id": question_id})

    if question_existente is None:
        raise HTTPException(status_code=404, detail=QUESTION_NAO_ENCONTRADA)

    dados_atualizados = {
        "title": question.title,
        "type": question.type.value,
        "options": [option.model_dump() for option in question.options],
        "compositeFields": question.compositeFields,
    }

    db.questions.update_one({"_id": question_id}, {"$set": dados_atualizados})

    question_atualizada = db.questions.find_one({"_id": question_id})
    question_atualizada["_id"] = str(question_atualizada["_id"])

    return question_atualizada


@router.delete(
    "/questions/{question_id}",
    response_model=MessageOut,
    summary="Remove uma pergunta",
    description="Remove a pergunta e o vínculo com sua seção pai.",
    responses={404: {"description": QUESTION_NAO_ENCONTRADA}},
)
def deletar_question(question_id: str):
    question = db.questions.find_one({"_id": question_id})

    if question is None:
        raise HTTPException(status_code=404, detail=QUESTION_NAO_ENCONTRADA)

    parent_item = question.get("parentItem")

    resultado = db.questions.delete_one({"_id": question_id})

    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail=QUESTION_NAO_ENCONTRADA)

    if parent_item:
        db.sections.update_one(
            {"_id": parent_item}, {"$pull": {"questions": question_id}}
        )

    return {"mensagem": "Pergunta removida com sucesso", "id": question_id}
