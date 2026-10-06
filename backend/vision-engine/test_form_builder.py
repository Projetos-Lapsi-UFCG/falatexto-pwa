import mongomock
import pytest
from pydantic import ValidationError
from pymongo.errors import DuplicateKeyError

import form_builder
from form_builder import montar_documentos, persistir_formulario, proximo_form_id, slugify

PRONTUARIO = {
    "tipo_documento": "Ficha Clínica",
    "secoes": [
        {
            "titulo_secao": "Dados do Paciente",
            "campos": [
                {"campo_id": "nome", "label": "Nome:", "valor": "jeferson", "tipo_componente": "texto"},
                {"campo_id": "idade", "label": "Idade:", "valor": "32 anos", "tipo_componente": "texto"},
            ],
        },
        {
            "titulo_secao": "Sintomas",
            "campos": [
                {"campo_id": "febre", "label": "Febre", "valor": True, "tipo_componente": "checkbox"},
                {"campo_id": "data_inicio", "label": "Início", "valor": "", "tipo_componente": "data"},
                {"campo_id": "temperatura", "label": "Temp.", "valor": 38.5, "tipo_componente": "numero"},
            ],
        },
        {"titulo_secao": "Vazia", "campos": []},
    ],
    "resumo_narrativo": "Paciente jeferson, 32 anos, com sintomas de febre.",
}


@pytest.fixture
def db():
    return mongomock.MongoClient()["assis_db"]


def test_slugify_segue_regras_do_frontend():
    assert slugify("Dados do Paciente") == "dados_do_paciente"
    assert slugify("Ação: Prévia!") == "acao_previa"
    assert slugify("  ") == "item"


def test_monta_form_no_formato_do_backend():
    docs = montar_documentos(PRONTUARIO, "form_003", "f4fbf61b-uuid", "gemma2:9b")

    assert docs.form["_id"] == "form_003"
    assert docs.form["name"] == "Prontuário Automático - Ficha Clínica"
    assert docs.form["sections"] == ["sec_003_dados_do_paciente", "sec_003_sintomas"]
    assert docs.form["metadata"] == {"version": "1.0", "active": True}
    assert docs.form["source"]["sessionId"] == "f4fbf61b-uuid"
    assert docs.form["source"]["model"] == "gemma2:9b"


def test_monta_secoes_e_perguntas_referenciadas():
    docs = montar_documentos(PRONTUARIO, "form_003", "s", "m")

    secao = docs.sections[0]
    assert secao == {
        "_id": "sec_003_dados_do_paciente",
        "title": "Dados do Paciente",
        "parentItem": "form_003",
        "subSections": [],
        "questions": ["q_003_nome", "q_003_idade"],
        "tags": ["vision"],
    }

    perguntas = {q["_id"]: q for q in docs.questions}
    assert perguntas["q_003_nome"]["title"] == "Nome"
    assert perguntas["q_003_nome"]["parentItem"] == "sec_003_dados_do_paciente"
    assert (perguntas["q_003_nome"]["type"], perguntas["q_003_nome"]["inputFormat"]) == ("ABERTA", "texto")
    assert perguntas["q_003_data_inicio"]["inputFormat"] == "data"
    assert perguntas["q_003_temperatura"]["inputFormat"] == "numero"

    febre = perguntas["q_003_febre"]
    assert febre["type"] == "ESTIMULADA"
    assert febre["inputFormat"] is None
    assert [o["value"] for o in febre["options"]] == ["sim", "nao"]


def test_valores_extraidos_viram_respostas_e_nao_ficam_no_form():
    docs = montar_documentos(PRONTUARIO, "form_003", "s", "m")

    assert docs.answers == {
        "q_003_nome": "jeferson",
        "q_003_idade": "32 anos",
        "q_003_febre": "sim",
        "q_003_temperatura": "38.5",
    }
    assert all("valor" not in q for q in docs.questions)


def test_ids_duplicados_recebem_sufixo():
    prontuario = {
        "tipo_documento": "X",
        "secoes": [
            {"titulo_secao": "Dados", "campos": [{"campo_id": "nome", "label": "Nome"}] * 2},
            {"titulo_secao": "Dados", "campos": [{"campo_id": "nome", "label": "Nome"}]},
        ],
    }
    docs = montar_documentos(prontuario, "form_001", "s", "m")

    assert docs.form["sections"] == ["sec_001_dados", "sec_001_dados_2"]
    assert [q["_id"] for q in docs.questions] == ["q_001_nome", "q_001_nome_2", "q_001_nome_3"]


def test_titulos_curtos_recebem_padrao():
    prontuario = {"tipo_documento": "", "secoes": [{"titulo_secao": "A", "campos": [{"label": "X:"}]}]}
    docs = montar_documentos(prontuario, "form_001", "s", "m")

    assert docs.sections[0]["title"] == "Seção"
    assert docs.questions[0]["title"] == "Campo"
    assert docs.questions[0]["_id"] == "q_001_campo"


def test_form_id_invalido_e_rejeitado():
    with pytest.raises((ValidationError, AttributeError)):
        montar_documentos(PRONTUARIO, "f4fbf61b-2c44-4ba7-ada7-e219063df38e", "s", "m")


def test_proximo_form_id_ignora_ids_fora_do_padrao(db):
    assert proximo_form_id(db) == "form_001"

    db.forms.insert_many([{"_id": "form_001"}, {"_id": "form_002"}, {"_id": "f4fbf61b-uuid"}])
    assert proximo_form_id(db) == "form_003"


def test_proximo_form_id_falha_no_limite(db):
    db.forms.insert_one({"_id": "form_999"})
    with pytest.raises(RuntimeError):
        proximo_form_id(db)


def test_persiste_form_secoes_perguntas_e_rascunho(db):
    db.forms.insert_many([{"_id": "form_001"}, {"_id": "form_002"}])

    docs = persistir_formulario(db, PRONTUARIO, "sessao-1", "gemma2:9b")

    assert docs.form["_id"] == "form_003"
    assert db.forms.find_one({"_id": "form_003"})["sections"] == docs.form["sections"]
    assert db.sections.count_documents({"parentItem": "form_003"}) == 2
    assert db.questions.count_documents({}) == 5

    submissao = db.submissions.find_one({"formId": "form_003"})
    assert submissao["status"] == "draft"
    assert submissao["answers"]["q_003_nome"] == "jeferson"


def test_sem_valores_nao_cria_submissao(db):
    prontuario = {"tipo_documento": "X", "secoes": [{"titulo_secao": "Dados", "campos": [{"label": "Nome", "valor": ""}]}]}
    persistir_formulario(db, prontuario, "s", "m")

    assert db.submissions.count_documents({}) == 0


def test_conflito_de_id_tenta_novamente_sem_apagar_dados_alheios(db, monkeypatch):
    # Simula outro processamento que já gravou form_001 e suas seções/perguntas
    # entre a escolha do id e a inserção.
    alheio = montar_documentos(PRONTUARIO, "form_001", "outro", "m")
    db.questions.insert_many(alheio.questions)
    db.sections.insert_many(alheio.sections)
    db.forms.insert_one(alheio.form)

    ids = iter(["form_001", "form_002"])
    monkeypatch.setattr(form_builder, "proximo_form_id", lambda _db: next(ids))

    docs = persistir_formulario(db, PRONTUARIO, "sessao-2", "m")

    assert docs.form["_id"] == "form_002"
    assert db.forms.find_one({"_id": "form_001"})["source"]["sessionId"] == "outro"
    assert db.sections.count_documents({"parentItem": "form_001"}) == 2
    assert db.questions.count_documents({"_id": {"$regex": "^q_001_"}}) == 5
    assert db.questions.count_documents({"_id": {"$regex": "^q_002_"}}) == 5


def test_conflito_persistente_propaga_erro(db, monkeypatch):
    db.forms.insert_one({"_id": "form_001"})
    monkeypatch.setattr(form_builder, "proximo_form_id", lambda _db: "form_001")

    with pytest.raises(DuplicateKeyError):
        persistir_formulario(db, PRONTUARIO, "s", "m")

    # Nada da tentativa ficou órfão
    assert db.sections.count_documents({}) == 0
    assert db.questions.count_documents({}) == 0
