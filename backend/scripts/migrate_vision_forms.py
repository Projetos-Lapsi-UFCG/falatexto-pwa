"""
Migra formulários gravados pelo Vision Engine no formato antigo (_id = UUID da
sessão, seções embutidas com `titulo_secao`/`campos`) para o modelo do backend:
form_NNN + documentos em `sections` e `questions` (+ submissão em rascunho com
os valores extraídos).

Uso (a partir de backend/):
    python scripts/migrate_vision_forms.py            # dry-run: só lista o que mudaria
    python scripts/migrate_vision_forms.py --apply    # grava as alterações

Variáveis de ambiente: MONGO_URI (padrão mongodb://localhost:27017) e
MONGO_DB_NAME (padrão assis_db).
"""

import argparse
import os
import re
import sys
from pathlib import Path

from pymongo import MongoClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "vision-engine"))

from form_builder import montar_documentos, persistir_formulario, proximo_form_id  # noqa: E402

PADRAO_ORIGEM = re.compile(r"\((.+)\)\s*$")


def formato_antigo(form: dict) -> bool:
    return any(isinstance(s, dict) for s in form.get("sections", []))


def para_prontuario(form: dict) -> dict:
    """Reconstrói o dicionário no formato de ProntuarioUniversal.model_dump()."""
    nome = form.get("name", "")
    prefixo = "Prontuário Automático - "
    return {
        "tipo_documento": nome[len(prefixo):] if nome.startswith(prefixo) else nome,
        "secoes": [s for s in form.get("sections", []) if isinstance(s, dict)],
        "resumo_narrativo": form.get("resumo_narrativo", ""),
        "criado_em": form.get("criado_em"),
    }


def modelo_de_origem(form: dict) -> str:
    origem = (form.get("metadata") or {}).get("origem", "")
    m = PADRAO_ORIGEM.search(origem)
    return m.group(1) if m else "desconhecido"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="grava as alterações (padrão: dry-run)")
    args = parser.parse_args()

    db = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))[
        os.getenv("MONGO_DB_NAME", "assis_db")
    ]

    antigos = [f for f in db.forms.find({}) if formato_antigo(f)]
    if not antigos:
        print("Nenhum formulário no formato antigo encontrado.")
        return 0

    for form in antigos:
        antigo_id = form["_id"]
        prontuario = para_prontuario(form)
        modelo = modelo_de_origem(form)

        if not args.apply:
            previa = montar_documentos(prontuario, proximo_form_id(db), str(antigo_id), modelo)
            print(f"[dry-run] {antigo_id} -> {previa.form['_id']} "
                  f"({len(previa.sections)} seções, {len(previa.questions)} perguntas, "
                  f"{len(previa.answers)} respostas)")
            continue

        documentos = persistir_formulario(db, prontuario, str(antigo_id), modelo)
        db.forms.delete_one({"_id": antigo_id})
        print(f"{antigo_id} -> {documentos.form['_id']} "
              f"({len(documentos.sections)} seções, {len(documentos.questions)} perguntas)")

    if not args.apply:
        print("\nNada foi gravado. Rode novamente com --apply para migrar.")
        print("Obs.: no dry-run, vários formulários recebem o mesmo form_NNN de prévia; "
              "com --apply, cada um recebe um id sequencial próprio.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
