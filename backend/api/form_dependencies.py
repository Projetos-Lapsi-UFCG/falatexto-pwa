from fastapi import HTTPException

from .database import db


def coletar_dependencias_formulario(form_id: str, session = None):
    form = db.forms.find_one({"_id": form_id}, session=session)

    if form is None:
        raise HTTPException(
            status_code=404,
            detail="Formulário não encontrado",
        )

    secoes = set()
    perguntas = set()

    pendentes = [
        (section_id, form_id)
        for section_id in form.get("sections", [])
    ]

    while pendentes:
        section_id, parent_id = pendentes.pop()

        if section_id in secoes:
            raise HTTPException(
                status_code=409,
                detail=f"Seção repetida ou circular: {section_id}",
            )

        section = db.sections.find_one({"_id": section_id}, session=session)

        if section is None:
            raise HTTPException(
                status_code=409,
                detail=f"Seção inexistente: {section_id}",
            )

        if section.get("parentItem") != parent_id:
            raise HTTPException(
                status_code=409,
                detail=f"Vínculo inconsistente: {section_id}",
            )

        secoes.add(section_id)

        for question_id in section.get("questions", []):
            question = db.questions.find_one({"_id": question_id}, session=session)

            if question is None:
                raise HTTPException(
                    status_code=409,
                    detail=f"Pergunta inexistente: {question_id}",
                )

            if question.get("parentItem") != section_id:
                raise HTTPException(
                    status_code=409,
                    detail=f"Vínculo inconsistente: {question_id}",
                )

            perguntas.add(question_id)

        for sub_id in section.get("subSections", []):
            pendentes.append((sub_id, section_id))

    # Impede cascata sobre seções compartilhadas
    for section_id in secoes:
        outro_form = db.forms.find_one({
            "_id": {"$ne": form_id},
            "sections": section_id
        }, session=session)

        outra_secao = db.sections.find_one({
            "_id": {"$nin": list(secoes)},
            "subSections": section_id
        }, session=session)

        if outro_form or outra_secao:
            raise HTTPException(
                status_code=409,
                detail=f"Seção compartilhada: {section_id}"
            )

    # Impede cascata sobre perguntas compartilhadas
    for question_id in perguntas:
        outra_secao = db.sections.find_one({
            "_id": {"$nin": list(secoes)},
            "questions": question_id
        }, session=session)

        pergunta_externa = db.questions.find_one({
            "_id": {"$nin": list(perguntas)},
            "compositeFields": question_id
        }, session=session)

        if outra_secao or pergunta_externa:
            raise HTTPException(
                status_code=409,
                detail=f"Pergunta compartilhada: {question_id}"
            )

    # Verifica referências compostas para fora do formulário
    for pergunta in db.questions.find(
        {"_id": {"$in": list(perguntas)}},
        {"_id": 1, "compositeFields": 1}
    ):
        referencias = set(
            pergunta.get("compositeFields", [])
        )

        referencias_externas = referencias - perguntas

        if referencias_externas:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"A pergunta {pergunta['_id']} referencia "
                    "perguntas fora do formulário: "
                    + ", ".join(sorted(referencias_externas))
                )
            )
    return {
        "form_id": form_id,
        "sections": sorted(secoes),
        "questions": sorted(perguntas),
    }