from pymongo import MongoClient

from .config import MONGO_URI, MONGO_DB_NAME

client = MongoClient(MONGO_URI)

db = client[MONGO_DB_NAME]


def criar_indices():
    """
    Cria os índices necessários para o soft delete.

    O índice TTL remove automaticamente documentos quando
    o campo purgeAt atingir a data/hora atual.
    """

    db.forms.create_index(
        [("purgeAt", 1)],
        expireAfterSeconds=0,
        name="forms_purgeAt_ttl",
    )

    db.submissions.create_index(
        [("purgeAt", 1)],
        expireAfterSeconds=0,
        name="submissions_purgeAt_ttl",
    )

    db.forms.create_index(
        [("deletedAt", 1)],
        name="forms_deletedAt",
    )

    db.submissions.create_index(
        [("deletedAt", 1)],
        name="submissions_deletedAt",
    )

    db.submissions.create_index(
        [("formId", 1)],
        name="submissions_formId",
    )