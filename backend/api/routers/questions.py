from fastapi import APIRouter, Body, HTTPException, status

from ..database import db
from ..models import MessageOut
from ..models.question import QuestionCreate, QuestionListOut, QuestionOut, QuestionUpdate

from datetime import datetime, timedelta, timezone
from ..config import SOFT_DELETE_RETENTION_DAYS

router = APIRouter(tags=["questions"])

SECTION_NAO_ENCONTRADA = "Seção não encontrada"
QUESTION_NAO_ENCONTRADA = "Pergunta não encontrada"

def obter_formulario_da_secao(section_id: str) -> str:
    visitadas = set()
    atual = section_id

    while atual.startswith("sec_"):

        if atual in visitadas:
            raise HTTPException(
                status_code=400,
                detail="Referência circular entre seções",
            )

        visitadas.add(atual)

        section = db.sections.find_one({"_id": atual})

        if section is None:
            raise HTTPException(
                status_code=400,
                detail=f"Seção inexistente: {atual}",
            )

        if section.get("deletedAt") is not None:
            raise HTTPException(
                status_code=409,
                detail=f"Seção excluída: {atual}",
            )

        atual = section.get("parentItem", "")

    if not atual.startswith("form_"):
        raise HTTPException(
            status_code=400,
            detail="Não foi possível identificar o formulário da seção",
        )

    form = db.forms.find_one({"_id": atual})

    if form is None:
        raise HTTPException(
            status_code=400,
            detail=f"Formulário inexistente: {atual}",
        )

    if form.get("deletedAt") is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Formulário excluído: {atual}",
    )

    return atual


def validar_composite_fields(
    question_id: str,
    composite_fields: list[str],
):
    if not composite_fields:
        return

    if question_id in composite_fields:
        raise HTTPException(
            status_code=400,
            detail="Uma pergunta não pode referenciar a si mesma",
        )
    
    perguntas = {
        pergunta["_id"]: pergunta
        for pergunta in db.questions.find(
            {
                "_id": {"$in": composite_fields},
                "$or": [
                    {"deletedAt": None},
                    {"deletedAt": {"$exists": False}},
                ],
            }
        )
    }

    inexistentes = set(composite_fields) - set(perguntas)

    if inexistentes:
        raise HTTPException(
            status_code=400,
            detail=(
                "Perguntas inexistentes em compositeFields: "
                + ", ".join(sorted(inexistentes))
            ),
        )

    def verificar_ciclo(atual: str, visitados: set[str]):
        if atual == question_id:
            raise HTTPException(
                status_code=400,
                detail="Referência circular em compositeFields",
            )

        if atual in visitados:
            return

        visitados.add(atual)

    pergunta = db.questions.find_one({
        "_id": atual,
        "$or": [
            {"deletedAt": None},
            {"deletedAt": {"$exists": False}},
        ],
    })

    if pergunta is None:
        raise HTTPException(
            status_code=400,
            detail=f"Pergunta inexistente ou excluída em compositeFields: {atual}",
        )

        for campo in pergunta.get("compositeFields", []):
            verificar_ciclo(campo, visitados)

    visitados = set()

    for campo in composite_fields:
        verificar_ciclo(campo, visitados)


def validar_formulario_composite_fields(
    section_id: str,
    composite_fields: list[str],
):
    if not composite_fields:
        return

    formulario_origem = obter_formulario_da_secao(section_id)

    for question_id in composite_fields:

        question = db.questions.find_one({"_id": question_id})

        if question is None:
            raise HTTPException(
                status_code=400,
                detail=f"Pergunta inexistente: {question_id}",
            )

        secao_pergunta = question.get("parentItem", "")

        formulario_pergunta = obter_formulario_da_secao(
            secao_pergunta
        )

        if formulario_pergunta != formulario_origem:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"A pergunta {question_id} pertence a outro formulário"
                ),
            )

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
    "aberta_data": {
        "summary": "Pergunta aberta com dica de formato (data)",
        "description": (
            "Pergunta ABERTA cujo inputFormat orienta o frontend a renderizar "
            "um seletor de data em vez de um campo de texto livre."
        ),
        "value": {
            "id": "q_data_nascimento",
            "title": "Data de nascimento",
            "type": "ABERTA",
            "options": [],
            "compositeFields": [],
            "inputFormat": "data",
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
    "estimulada_com_complemento": {
        "summary": "Pergunta estimulada com opção complementar",
        "description": (
            "Opção com hasComplement=True revela um campo extra na UI quando "
            "selecionada (ex.: 'Outro, qual?')."
        ),
        "value": {
            "id": "q_alergia",
            "title": "Possui alguma alergia?",
            "type": "ESTIMULADA",
            "options": [
                {"label": "Não", "value": "nao"},
                {
                    "label": "Sim",
                    "value": "sim",
                    "hasComplement": True,
                    "complementLabel": "Qual?",
                    "complementType": "text",
                },
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
    section = db.sections.find_one({
        "_id": section_id,
        "$or": [
            {"deletedAt": None},
            {"deletedAt": {"$exists": False}},
        ],
    })

    if section is None:
        raise HTTPException(
            status_code=404,
            detail=SECTION_NAO_ENCONTRADA
        )

    question_ids = section.get("questions", [])

    questions_encontradas = list(
        db.questions.find({
            "_id": {"$in": question_ids},
            "$or": [
                {"deletedAt": None},
                {"deletedAt": {"$exists": False}},
            ],
        })
    )

    questions_por_id = {
        question["_id"]: question
        for question in questions_encontradas
    }

    questions_ordenadas = []

    for question_id in question_ids:
        if question_id in questions_por_id:
            question = questions_por_id[question_id]
            question["_id"] = str(question["_id"])
            questions_ordenadas.append(question)

    return {
        "section_id": section_id,
        "questions": questions_ordenadas
    }


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

    if section.get("deletedAt") is not None:
        raise HTTPException(
            status_code=409,
            detail="Não é possível criar perguntas em uma seção excluída",
    )

    obter_formulario_da_secao(section_id)

    question_existente = db.questions.find_one({
        "_id": question_id,
        "$or": [
            {"deletedAt": None},
            {"deletedAt": {"$exists": False}},
        ],
    })

    if question_existente is not None:
        raise HTTPException(
            status_code=400, detail="Já existe uma pergunta com esse id"
        )
    obter_formulario_da_secao(question_existente["parentItem"])
    
    validar_composite_fields(
        question_id=question.id,
        composite_fields=question.compositeFields,
    )

    validar_formulario_composite_fields(
        section_id=section_id,
        composite_fields=question.compositeFields,
    )

    nova_question = {
        "_id": question.id,
        "parentItem": section_id,
        "title": question.title,
        "type": question.type.value,
        "options": [option.model_dump() for option in question.options],
        "compositeFields": question.compositeFields,
        "inputFormat": question.inputFormat,
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
    question = db.questions.find_one({
        "_id": question_id,
        "$or": [
            {"deletedAt": None},
            {"deletedAt": {"$exists": False}},
        ],
    })

    if question is None:
        raise HTTPException(
            status_code=404,
            detail=QUESTION_NAO_ENCONTRADA,
        )

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

    validar_composite_fields(
        question_id=question_id,
        composite_fields=question.compositeFields,
    )

    validar_formulario_composite_fields(
        section_id=question_existente["parentItem"],
        composite_fields=question.compositeFields,
    )

    dados_atualizados = {
        "title": question.title,
        "type": question.type.value,
        "options": [option.model_dump() for option in question.options],
        "compositeFields": question.compositeFields,
        "inputFormat": question.inputFormat,
    }

    db.questions.update_one({"_id": question_id}, {"$set": dados_atualizados})

    question_atualizada = db.questions.find_one({"_id": question_id})
    question_atualizada["_id"] = str(question_atualizada["_id"])

    return question_atualizada


@router.delete(
    "/questions/{question_id}",
    response_model=MessageOut,
    summary="Remove uma pergunta",
    description="Marca a pergunta como excluída logicamente, preservando seus dados e vínculos.",
    responses={404: {"description": QUESTION_NAO_ENCONTRADA}},
)
def deletar_question(question_id: str):
    question = db.questions.find_one({"_id": question_id})

    if question is None:
        raise HTTPException(
            status_code=404,
            detail=QUESTION_NAO_ENCONTRADA
        )

    # DELETE idempotente
    if question.get("deletedAt") is not None:
        return {
            "mensagem": "Pergunta removida com sucesso",
            "id": question_id
        }

    parent_item = question.get("parentItem")

    if not parent_item:
        raise HTTPException(
            status_code=409,
            detail="Pergunta sem seção pai"
        )

    # Verifica se a seção e o formulário estão ativos
    obter_formulario_da_secao(parent_item)

    # Impede excluir perguntas utilizadas por perguntas compostas ativas
    pergunta_referenciada = db.questions.find_one({
        "_id": {"$ne": question_id},
        "compositeFields": question_id,
        "$or": [
            {"deletedAt": None},
            {"deletedAt": {"$exists": False}},
        ],
    })

    if pergunta_referenciada:
        raise HTTPException(
            status_code=409,
            detail=(
                "Não é possível excluir a pergunta porque "
                "ela é utilizada por uma pergunta composta ativa"
            )
        )

    agora = datetime.now(timezone.utc)

    purge_at = agora + timedelta(
        days=SOFT_DELETE_RETENTION_DAYS
    )

    resultado = db.questions.update_one(
        {
            "_id": question_id,
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
        question_atual = db.questions.find_one({"_id": question_id})

        if question_atual is None:
            raise HTTPException(
                status_code=404,
                detail=QUESTION_NAO_ENCONTRADA
            )

        if question_atual.get("deletedAt") is not None:
            return {
                "mensagem": "Pergunta removida com sucesso",
                "id": question_id
            }

        raise HTTPException(
            status_code=409,
            detail="Não foi possível remover a pergunta"
        )

    return {
        "mensagem": "Pergunta removida com sucesso",
        "id": question_id
    }

@router.post(
    "/questions/{question_id}/restore",
    response_model=MessageOut,
    summary="Restaura uma pergunta removida",
    responses={404: {"description": QUESTION_NAO_ENCONTRADA}},
)
def restaurar_question(question_id: str):

    question = db.questions.find_one({"_id": question_id})

    if question is None:
        raise HTTPException(
            status_code=404,
            detail=QUESTION_NAO_ENCONTRADA
        )

    # Se já estiver ativa, não altera nada
    if question.get("deletedAt") is None:
        return {
            "mensagem": "Pergunta já está ativa",
            "id": question_id
        }

    # Perguntas excluídas por cascata devem ser restauradas
    # pela restauração do formulário correspondente
    if question.get("deletedByCascade"):
        raise HTTPException(
            status_code=409,
            detail="Restaure a pergunta pela restauração do formulário"
        )

    agora = datetime.now(timezone.utc)

    # Verifica o prazo de retenção
    purge_at = question.get("purgeAt")

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

    # Verifica se a seção e o formulário pai estão ativos
    parent_item = question.get("parentItem")

    if not parent_item:
        raise HTTPException(
            status_code=409,
            detail="Pergunta sem seção pai"
        )

    obter_formulario_da_secao(parent_item)

    # Valida as referências compostas
    composite_fields = question.get("compositeFields", [])

    validar_composite_fields(
        question_id=question_id,
        composite_fields=composite_fields
    )

    validar_formulario_composite_fields(
        section_id=parent_item,
        composite_fields=composite_fields
    )

    # Restaura a pergunta
    resultado = db.questions.update_one(
        {
            "_id": question_id,
            "deletedAt": question["deletedAt"],
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
            detail="Não foi possível restaurar a pergunta"
        )

    return {
        "mensagem": "Pergunta restaurada com sucesso",
        "id": question_id
    }
