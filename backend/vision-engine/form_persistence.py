
from uuid import UUID


def construir_documentos_vision(prontuario: dict, id_sessao: str):
    """
    Converte o ProntuarioUniversal em documentos para
    forms, sections e questions.

    Nao acessa nem modifica o MongoDB.
    """

    # Os IDs de secoes e perguntas nao podem conter hifens.
    identificador = UUID(id_sessao).hex

    secoes_origem = prontuario.get("secoes", [])

    if not secoes_origem:
        raise ValueError("Prontuario sem secoes")

    tipo_documento = str(
        prontuario.get("tipo_documento") or "Documento Clinico"
    ).strip()

    nome_formulario = f"Prontuario - {tipo_documento}"[:120]

    formulario = {
        "_id": id_sessao,
        "name": nome_formulario,
        "metadata": {
            "version": "1.0",
            "active": True,
        },
        "sections": [],
    }

    secoes = []
    perguntas = []
    valores_checkbox = set()
    contador_perguntas = 0

    for indice_secao, secao in enumerate(secoes_origem, start=1):
        secao_id = f"sec_{identificador}_{indice_secao}"
        titulo_secao = str(
            secao.get("titulo_secao") or "Geral"
        ).strip()

        if not 3 <= len(titulo_secao) <= 120:
            raise ValueError("Titulo de secao invalido")

        documento_secao = {
            "_id": secao_id,
            "title": titulo_secao,
            "parentItem": id_sessao,
            "subSections": [],
            "questions": [],
            "tags": [],
        }

        for campo in secao.get("campos", []):
            contador_perguntas += 1

            pergunta_id = (
                f"q_{identificador}_{contador_perguntas}"
            )

            titulo = str(
                campo.get("title")
                or campo.get("label")
                or ""
            ).strip()

            tipo = campo.get("type", "ABERTA")

            if not 3 <= len(titulo) <= 200:
                raise ValueError(
                    f"Titulo invalido: {pergunta_id}"
                )

            if tipo not in {
                "ABERTA", "ESTIMULADA", "MULTIPLA", "COMPOSTA"
            }:
                raise ValueError(
                    f"Tipo invalido: {pergunta_id}"
                )

            if tipo == "COMPOSTA":
                raise ValueError(
                    "Perguntas COMPOSTA exigem mapeamento "
                    "dos subcampos antes da persistencia"
                )

            formato = campo.get("inputFormat") or "texto"

            if tipo == "ABERTA":
                if formato not in {"texto", "numero", "data"}:
                    raise ValueError(
                        f"inputFormat nao suportado: {formato}"
                    )
            else:
                formato = None

            opcoes = []
            valores_da_pergunta = set()

            opcoes_origem = campo.get("options") or []

            # Compatibilidade com checkbox booleano do Vision Engine
            if (
                tipo == "MULTIPLA"
                and not opcoes_origem
                and isinstance(campo.get("valor"), bool)
            ):
                opcoes_origem = [
                    {
                        "label": "Marcado",
                        "value": f"vision_checkbox_{contador_perguntas}",
                    }
                ]

            for opcao in opcoes_origem:
                if not isinstance(opcao, dict):
                    raise ValueError("Opcao invalida")

                label = str(opcao.get("label") or "").strip()
                value = str(opcao.get("value") or "").strip()

                if not 1 <= len(label) <= 80:
                    raise ValueError("Label de opcao invalido")

                if not 1 <= len(value) <= 40:
                    raise ValueError("Value de opcao invalido")

                if value in valores_da_pergunta:
                    raise ValueError(
                        f"Opcao duplicada: {value}"
                    )

                valores_da_pergunta.add(value)

                if tipo == "MULTIPLA":
                    if value in valores_checkbox:
                        raise ValueError(
                            "Valor de checkbox repetido "
                            f"entre perguntas: {value}"
                        )
                    valores_checkbox.add(value)

                opcao_normalizada = {
                    "label": label,
                    "value": value,
                }

                for atributo in (
                    "hasComplement",
                    "complementLabel",
                    "complementType",
                ):
                    if atributo in opcao:
                        opcao_normalizada[atributo] = opcao[atributo]

                opcoes.append(opcao_normalizada)

            if tipo == "ABERTA" and opcoes:
                raise ValueError(
                    "Pergunta ABERTA nao deve conter opcoes"
                )

            if tipo in {"ESTIMULADA", "MULTIPLA"} and not opcoes:
                raise ValueError(
                    f"Pergunta sem opcoes: {pergunta_id}"
                )

            documento_pergunta = {
                "_id": pergunta_id,
                "parentItem": secao_id,
                "title": titulo,
                "type": tipo,
                "options": opcoes,
                "compositeFields": [],
                "inputFormat": formato,
            }

            perguntas.append(documento_pergunta)
            documento_secao["questions"].append(pergunta_id)

        secoes.append(documento_secao)
        formulario["sections"].append(secao_id)

    return formulario, secoes, perguntas


def persistir_documentos_vision(
    db,
    formulario: dict,
    secoes: list[dict],
    perguntas: list[dict],
) -> str:
    """
    Persiste formulario, secoes e perguntas em uma
    unica transacao MongoDB.

    Requer MongoDB configurado como replica set.
    """

    form_id = formulario.get("_id")

    if not isinstance(form_id, str) or not form_id:
        raise ValueError("ID do formulario invalido")

    if not secoes or not perguntas:
        raise ValueError(
            "Formulario precisa ter secoes e perguntas"
        )

    ids_secoes = [s["_id"] for s in secoes]
    ids_perguntas = [q["_id"] for q in perguntas]

    if len(set(ids_secoes)) != len(ids_secoes):
        raise ValueError("IDs de secoes duplicados")

    if len(set(ids_perguntas)) != len(ids_perguntas):
        raise ValueError("IDs de perguntas duplicados")

    if formulario.get("sections") != ids_secoes:
        raise ValueError(
            "Referencias de secoes inconsistentes"
        )

    referencias_perguntas = []

    for secao in secoes:
        if secao.get("parentItem") != form_id:
            raise ValueError(
                "Secao vinculada ao formulario incorreto"
            )

        for pergunta_id in secao.get("questions", []):
            referencias_perguntas.append(pergunta_id)

    if (
        len(referencias_perguntas) != len(ids_perguntas)
        or set(referencias_perguntas) != set(ids_perguntas)
    ):
        raise ValueError(
            "Referencias de perguntas inconsistentes"
        )

    vinculos = {
        pergunta_id: secao["_id"]
        for secao in secoes
        for pergunta_id in secao.get("questions", [])
    }

    for pergunta in perguntas:
        if pergunta.get("parentItem") != vinculos.get(
            pergunta["_id"]
        ):
            raise ValueError(
                "Pergunta vinculada a secao incorreta"
            )

    # Todas as verificacoes anteriores acontecem
    # antes de qualquer gravacao no banco.

    with db.client.start_session() as session:
        with session.start_transaction():
            db.forms.insert_one(
                formulario,
                session=session,
            )

            db.sections.insert_many(
                secoes,
                ordered=True,
                session=session,
            )

            db.questions.insert_many(
                perguntas,
                ordered=True,
                session=session,
            )

    return form_id
