
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class CampoVision(BaseModel):
    model_config = ConfigDict(extra="forbid")

    campo_id: str = Field(min_length=1)
    title: str = "Pergunta sem título"
    label: str = "Pergunta sem título"
    valor: Any = None

    type: Literal[
        "ABERTA",
        "ESTIMULADA",
        "MULTIPLA",
        "COMPOSTA",
    ] = "ABERTA"

    tipo_componente: str = "aberta"
    required: bool = False
    placeholder: str = ""
    options: list[dict[str, Any]] = Field(default_factory=list)
    parentItem: str | None = ""
    compositeFields: list[Any] = Field(default_factory=list)


class SecaoVision(BaseModel):
    model_config = ConfigDict(extra="forbid")

    titulo_secao: str = "Geral"
    campos: list[CampoVision]


class ProntuarioVision(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo_documento: str = "Formulário de Atendimento"
    secoes: list[SecaoVision]
    resumo_narrativo: str | None = ""
    criado_em: datetime = Field(default_factory=datetime.utcnow)


def validar_saida_vision(dados: dict) -> ProntuarioVision:
    """Valida a saída estruturada do Vision Engine."""
    return ProntuarioVision.model_validate(dados)


def preparar_submission_vision(
    dados: dict,
    form_id: str,
    perguntas_persistidas: list[dict],
):
    """
    Converte respostas do Vision Engine em SubmissionCreate.

    As perguntas devem vir na ordem registrada em
    sections.questions.

    Nao realiza operacoes no MongoDB.
    """
    from api.models.submission import SubmissionCreate

    prontuario = validar_saida_vision(dados)

    campos = [
        campo
        for secao in prontuario.secoes
        for campo in secao.campos
    ]

    if not form_id or not form_id.strip():
        raise ValueError("form_id invalido")

    if not campos:
        raise ValueError("Prontuario sem perguntas")

    if len(campos) != len(perguntas_persistidas):
        raise ValueError(
            "Quantidade de perguntas diferente da persistida"
        )

    opcoes_proprietarias = {}

    # Confere o mapeamento com as perguntas persistidas.
    for indice, (campo, pergunta) in enumerate(
        zip(campos, perguntas_persistidas), start=1
    ):
        id_esperado = f"q_{form_id}_{indice}"

        if pergunta.get("_id") != id_esperado:
            raise ValueError(
                f"ID persistido inesperado: {id_esperado}"
            )

        if pergunta.get("title") != campo.title:
            raise ValueError(
                f"Titulo divergente: {id_esperado}"
            )

        if pergunta.get("type") != campo.type:
            raise ValueError(
                f"Tipo divergente: {id_esperado}"
            )

        if campo.type == "MULTIPLA":
            for opcao in pergunta.get("options", []):
                valor_opcao = opcao.get("value")

                if (
                    not isinstance(valor_opcao, str)
                    or not valor_opcao
                ):
                    raise ValueError(
                        f"Opcao invalida: {id_esperado}"
                    )

                if valor_opcao in opcoes_proprietarias:
                    raise ValueError(
                        "Valor de checkbox duplicado: "
                        + valor_opcao
                    )

                opcoes_proprietarias[valor_opcao] = id_esperado

    answers = {}
    checkbox_answers = {}

    for campo, pergunta in zip(
        campos, perguntas_persistidas
    ):
        pergunta_id = pergunta["_id"]
        valor = campo.valor

        if valor is None or valor == "" or valor == []:
            continue

        if campo.type == "MULTIPLA":
            selecionadas = (
                valor if isinstance(valor, list) else [valor]
            )

            for opcao in selecionadas:
                if (
                    not isinstance(opcao, str)
                    or opcoes_proprietarias.get(opcao)
                    != pergunta_id
                ):
                    raise ValueError(
                        f"Opcao desconhecida: {pergunta_id}"
                    )

                checkbox_answers[opcao] = True

        elif campo.type == "COMPOSTA":
            raise ValueError(
                "Pergunta COMPOSTA requer mapeamento especifico"
            )

        else:
            if not (
                isinstance(valor, (str, int, float, bool))
                or (
                    isinstance(valor, list)
                    and all(
                        isinstance(item, str)
                        for item in valor
                    )
                )
            ):
                raise ValueError(
                    f"Resposta incompatível: {pergunta_id}"
                )

            answers[pergunta_id] = valor

    return SubmissionCreate(
        formId=form_id,
        answers=answers,
        checkboxAnswers=checkbox_answers,
        closingData={
            "visionResumoNarrativo":
                prontuario.resumo_narrativo or ""
        },
        status="draft",
    )
