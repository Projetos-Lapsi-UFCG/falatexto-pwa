from datetime import datetime, timedelta, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query, status

from ..database import db
from ..models import MessageOut
from ..models.submission import (
    SubmissionCreate,
    SubmissionListOut,
    SubmissionOut,
    SubmissionUpdate,
)
from ..config import SOFT_DELETE_RETENTION_DAYS

router = APIRouter(prefix="/submissions", tags=["submissions"])

SUBMISSION_NAO_ENCONTRADA = "Submissão não encontrada"


@router.post(
    "",
    response_model=SubmissionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Salva um formulário preenchido",
    description=(
        "Recebe as respostas de um formulário preenchido (dados do paciente, "
        "respostas por pergunta/opção e dados de encerramento) e as persiste "
        "como uma submissão. O formato das respostas é livre para acomodar "
        "qualquer estrutura de formulário/seções/perguntas."
    ),
)
def criar_submission(submission: SubmissionCreate):

    agora = datetime.now(timezone.utc)
    nova_submission = submission.model_dump()
    nova_submission["submittedAt"] = agora
    nova_submission["deletedAt"] = None
    nova_submission["purgeAt"] = None
    nova_submission["updatedAt"] = agora

    resultado = db.submissions.insert_one(nova_submission)

    nova_submission["_id"] = str(resultado.inserted_id)
    return nova_submission


@router.get(
    "",
    response_model=SubmissionListOut,
    summary="Lista submissões",
    description="Retorna as submissões mais recentes primeiro, com filtros opcionais.",
)
def listar_submissions(
    formId: Optional[str] = Query(None, description="Filtra pelo id do formulário"),
    entity: Optional[str] = Query(None, description="Filtra pela entidade/instituição"),
    status_filtro: Optional[str] = Query(
        None, alias="status", description="Filtra por status (draft ou completed)"
    ),
    limit: int = Query(100, ge=1, le=500),
    include_deleted: bool = Query(False),
):
    if include_deleted:
        filtro = {}
    else:
        filtro = {
            "$or": [
                {"deletedAt": None},
                {"deletedAt": {"$exists": False}}
            ]
        }
    if formId is not None:
        filtro["formId"] = formId
    if entity is not None:
        filtro["entity"] = entity
    if status_filtro is not None:
        filtro["status"] = status_filtro

    submissions = list(
        db.submissions.find(filtro).sort("submittedAt", -1).limit(limit)
    )
    for submission in submissions:
        submission["_id"] = str(submission["_id"])

    return {"submissions": submissions}


@router.get(
    "/{submission_id}",
    response_model=SubmissionOut,
    summary="Busca uma submissão pelo id",
    responses={404: {"description": SUBMISSION_NAO_ENCONTRADA}},
)
def buscar_submission_por_id(submission_id: str):
    try:
        object_id = ObjectId(submission_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail=SUBMISSION_NAO_ENCONTRADA)

    submission = db.submissions.find_one({
        "_id": object_id,
        "$or": [
            {"deletedAt": None},
            {"deletedAt": {"$exists": False}}
        ]
    })

    if submission is None:
        raise HTTPException(status_code=404, detail=SUBMISSION_NAO_ENCONTRADA)

    submission["_id"] = str(submission["_id"])
    return submission


@router.delete(
    "/{submission_id}",
    response_model=MessageOut,
    summary="Remove uma submissão",
    responses={404: {"description": SUBMISSION_NAO_ENCONTRADA}},
)
def deletar_submission(submission_id: str):

    try:
        object_id = ObjectId(submission_id)
    except InvalidId:
        raise HTTPException(
            status_code=404,
            detail=SUBMISSION_NAO_ENCONTRADA
        )

    submission = db.submissions.find_one({
        "_id": object_id
    })

    if submission is None:
        raise HTTPException(
            status_code=404,
            detail=SUBMISSION_NAO_ENCONTRADA
        )

    # DELETE idempotente
    if submission.get("deletedAt") is not None:
        return {
            "mensagem": "Submissão removida com sucesso",
            "id": submission_id
        }

    agora = datetime.now(timezone.utc)

    purge_at = agora + timedelta(
        days=SOFT_DELETE_RETENTION_DAYS
    )

    db.submissions.update_one(
        {
            "_id": object_id
        },
        {
            "$set": {
                "deletedAt": agora,
                "purgeAt": purge_at,
                "updatedAt": agora
            }
        }
    )

    return {
        "mensagem": "Submissão removida com sucesso",
        "id": submission_id
    }

@router.patch(
    "/{submission_id}",
    response_model=SubmissionOut,
    summary="Atualiza uma submissão parcialmente",
    responses={404: {"description": SUBMISSION_NAO_ENCONTRADA}},
)
def atualizar_submission(
    submission_id: str,
    submission: SubmissionUpdate
):

    try:
        object_id = ObjectId(submission_id)
    except InvalidId:
        raise HTTPException(
            status_code=404,
            detail=SUBMISSION_NAO_ENCONTRADA
        )

    existente = db.submissions.find_one({
        "_id": object_id,
        "$or": [
            {"deletedAt": None},
            {"deletedAt": {"$exists": False}}
        ]
    })

    if existente is None:
        raise HTTPException(
            status_code=404,
            detail=SUBMISSION_NAO_ENCONTRADA
        )

    dados_atualizados = submission.model_dump(
        exclude_unset=True
    )

    dados_atualizados["updatedAt"] = datetime.now(timezone.utc)

    db.submissions.update_one(
        {"_id": object_id},
        {
            "$set": dados_atualizados
        }
    )

    atualizada = db.submissions.find_one({
        "_id": object_id
    })

    atualizada["_id"] = str(atualizada["_id"])

    return atualizada
