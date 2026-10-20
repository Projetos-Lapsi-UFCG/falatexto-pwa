import base64
import io
import json
import os
import re
from typing import List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
import ollama
from json_repair import repair_json
from PIL import Image

from ..database import db
from ..models import MessageOut
from ..models.form import FormCreate, FormListOut, FormOut, FormUpdate
from ..models.section import SectionCreate, SectionListOut, SectionOut

router = APIRouter(prefix="/forms", tags=["forms"])

FORM_NAO_ENCONTRADO = "Formulário não encontrado"

# Configurações da LLM Multimodal
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://ollama:11434")
MODELO_VISION = os.getenv("OLLAMA_MODEL", "qwen2.5vl:7b")
client_ollama = ollama.Client(host=OLLAMA_HOST)


def _extract_id(item):
    """Extrai o ID caso o item seja um dicionário ou o retorna caso já seja uma string/ID."""
    if isinstance(item, dict):
        return item.get("_id") or item.get("id")
    return item


def _gerar_proximo_id_form() -> str:
    """Gera o próximo ID no padrão 'form_001', 'form_002', etc."""
    forms = list(db.forms.find({}, {"_id": 1}))
    max_num = 0
    for f in forms:
        f_id = str(f["_id"])
        if f_id.startswith("form_") and f_id[5:].isdigit():
            num = int(f_id[5:])
            if num > max_num:
                max_num = num
    return f"form_{max_num + 1:03d}"


@router.get(
    "",
    response_model=FormListOut,
    summary="Lista todos os formulários",
    description="Retorna uma versão resumida (id, nome e metadata) de cada formulário cadastrado.",
)
def listar_forms():
    forms = list(db.forms.find({}, {"_id": 1, "name": 1, "metadata": 1, "sections": 1}))

    all_section_ids = {
        _extract_id(sid)
        for form in forms
        for sid in form.get("sections", [])
        if _extract_id(sid) is not None
    }
    sections = list(
        db.sections.find(
            {"_id": {"$in": list(all_section_ids)}},
            {"_id": 1, "questions": 1, "subSections": 1},
        )
    )
    sections_by_id = {section["_id"]: section for section in sections}

    all_subsection_ids = {
        _extract_id(sid)
        for section in sections
        for sid in section.get("subSections", [])
        if _extract_id(sid) is not None
    }
    subsections = list(
        db.sections.find(
            {"_id": {"$in": list(all_subsection_ids)}}, {"_id": 1, "questions": 1}
        )
    )
    subsections_by_id = {subsection["_id"]: subsection for subsection in subsections}

    all_question_ids = set()
    for section in sections + subsections:
        for q in section.get("questions", []):
            qid = _extract_id(q)
            if qid is not None:
                all_question_ids.add(qid)

    questions = list(
        db.questions.find(
            {"_id": {"$in": list(all_question_ids)}}, {"_id": 1, "compositeFields": 1}
        )
    )
    composite_child_ids = {
        _extract_id(child_id)
        for question in questions
        for child_id in question.get("compositeFields", [])
        if _extract_id(child_id) is not None
    }

    for form in forms:
        question_ids = set()
        for section_ref in form.get("sections", []):
            section_id = _extract_id(section_ref)
            section = sections_by_id.get(section_id)
            if not section:
                continue
            for q in section.get("questions", []):
                qid = _extract_id(q)
                if qid is not None:
                    question_ids.add(qid)

            for sub_ref in section.get("subSections", []):
                sub_id = _extract_id(sub_ref)
                subsection = subsections_by_id.get(sub_id)
                if subsection:
                    for q in subsection.get("questions", []):
                        qid = _extract_id(q)
                        if qid is not None:
                            question_ids.add(qid)

        form["questionCount"] = len(question_ids - composite_child_ids)
        form["_id"] = str(form["_id"])

    return {"forms": forms}


@router.post(
    "/processar-imagem",
    response_model=FormOut,
    status_code=status.HTTP_201_CREATED,
    summary="Cria um formulário extraindo perguntas de qualquer imagem via LLM Vision",
)
async def criar_form_por_imagem(
    name: str = Form(..., min_length=3, max_length=120, description="Nome do formulário"),
    file: UploadFile = File(..., description="Imagem contendo qualquer formulário ou folha de papel"),
):
    conteudo_imagem = await file.read()
    if not conteudo_imagem:
        raise HTTPException(status_code=400, detail="O arquivo de imagem enviado está vazio.")

    try:
        imagem_pil = Image.open(io.BytesIO(conteudo_imagem))
        imagem_pil.thumbnail((1024, 1024)) 

        if imagem_pil.mode in ("RGBA", "P"):
            imagem_pil = imagem_pil.convert("RGB")

        buffer = io.BytesIO()
        imagem_pil.save(buffer, format="JPEG", quality=85)
        imagem_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Erro ao processar o arquivo de imagem: {str(e)}"
        )

    prompt_sistema = """
You are a highly precise, literal multimodal OCR extractor specialized in converting handwritten and printed form sketches into structured JSON.

CRITICAL EXTRACTION RULES (STRICT LITERAL OCR):

1. STRICT LITERAL OCR (ZERO HALLUCINATION):
   - Extract text EXACTLY as written in the image.
   - NEVER invent, assume, or add choices that are not drawn in the image (e.g., do NOT add "Vermelho" if it is not written).
   - NEVER drop visible options. If there are 4 drawn options, extract all 4.
   - NEVER rephrase labels or titles (e.g., do NOT convert "cor escolhida:" into "¿Qual é a cor escolhida?").
   - NEVER insert foreign characters or non-existent symbols (e.g., inverted question marks '¿').

2. LAYOUT & DIVIDING LINES:
   - Vertical or horizontal lines on the paper represent visual column dividers or layout sections within the SAME form page.
   - Do NOT treat multi-column layouts or separated boxes as distinct pages or multi-step screens. All elements in a single image belong to ONE single form page.

3. FIELD TYPE IDENTIFICATION:
   - ESTIMULADA (Selection / Checkbox / Radio):
     * Trigger: Checkboxes [ ], circles ( ), square boxes, bullets, or options grouped next to a label.
     * Set "type": "ESTIMULADA".
     * Extract EVERY VISIBLE choice into the "options" list:
       "options": [
         {"label": "Exact Text 1", "value": "exact_text_1"},
         {"label": "Exact Text 2", "value": "exact_text_2"}
       ]
   - ABERTA (Open Text Input):
     * Trigger: Underlined lines (___), empty rectangular boxes, or blank space reserved for freeform text next to a label.
     * Set "type": "ABERTA".
     * Set "options": [].

4. FIELD LABELS ("title"):
   - Fill "title" with the EXACT string extracted from the image (e.g., "cor escolhida:", "Nome:", "idade:").

MANDATORY JSON FORMAT:
Return ONLY raw JSON with no explanatory text or markdown wrappers.

{
  "title": "Exact Form Title or 'Formulário'",
  "sections": [
    {
      "id": "sec_1",
      "title": "Exact Section Title or 'Geral'",
      "questions": [
        {
          "id": "q_1",
          "title": "Exact Label Text",
          "type": "ESTIMULADA",
          "options": [
            {"label": "Option Label 1", "value": "option_label_1"},
            {"label": "Option Label 2", "value": "option_label_2"}
          ],
          "compositeFields": []
        }
      ]
    }
  ]
}
"""

    try:
        response = client_ollama.chat(
            model=MODELO_VISION,
            format="json",
            options={"temperature": 0.0},
            messages=[
                {"role": "system", "content": prompt_sistema},
                {
                    "role": "user",
                    "content": f"Extraia todas as perguntas e campos da imagem do formulário '{name}'.",
                    "images": [imagem_b64],
                },
            ],
        )

        resposta_bruta = response["message"]["content"]
        print("--- RESPOSTA BRUTA DA LLM ---")
        print(resposta_bruta)
        print("------------------------------")

        resposta_limpa = re.sub(r"^```json\s*", "", resposta_bruta.strip(), flags=re.MULTILINE)
        resposta_limpa = re.sub(r"^```\s*", "", resposta_limpa, flags=re.MULTILINE)

        try:
            dados_extraidos = json.loads(resposta_limpa)
        except json.JSONDecodeError:
            dados_extraidos = json.loads(repair_json(resposta_limpa))

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao processar a imagem na LLM Vision: {str(e)}"
        )

    secoes_brutas = dados_extraidos.get("sections", [])
    if not secoes_brutas:
        raise HTTPException(
            status_code=422, detail="Nenhuma pergunta pôde ser identificada na imagem enviada."
        )

    novo_form_id = _gerar_proximo_id_form()
    ids_secoes_criadas = []

    for idx_sec, sec_data in enumerate(secoes_brutas):
        sec_id = f"sec_{novo_form_id}_{idx_sec + 1}"
        ids_perguntas_criadas = []

        for idx_q, q_data in enumerate(sec_data.get("questions", [])):
            q_id = f"q_{sec_id}_{idx_q + 1}"
            label_texto = q_data.get("title") or q_data.get("label") or f"Campo {idx_q + 1}"
            doc_questao = {
                "_id": q_id,
                "label": label_texto,
                "type": q_data.get("type", "texto"),
                "required": bool(q_data.get("required", False)),
                "placeholder": "",
                "options": q_data.get("options", []),
            }
            db.questions.insert_one(doc_questao)
            ids_perguntas_criadas.append(q_id)

        doc_secao = {
            "_id": sec_id,
            "title": sec_data.get("title", "Dados Gerais"),
            "parentItem": novo_form_id,
            "subSections": [],
            "questions": ids_perguntas_criadas,
            "tags": [],
        }
        db.sections.insert_one(doc_secao)
        ids_secoes_criadas.append(sec_id)

    novo_form = {
        "_id": novo_form_id,
        "name": name.strip(),
        "sections": ids_secoes_criadas,
        "metadata": {"version": "1.0", "active": True},
    }
    db.forms.insert_one(novo_form)

    novo_form["_id"] = str(novo_form["_id"])
    return novo_form


@router.get(
    "/{form_id}",
    response_model=FormOut,
    summary="Busca um formulário pelo id",
    responses={404: {"description": FORM_NAO_ENCONTRADO}},
)
def buscar_form_por_id(form_id: str):
    form = db.forms.find_one({"_id": form_id})

    if form is None:
        raise HTTPException(status_code=404, detail=FORM_NAO_ENCONTRADO)

    form["_id"] = str(form["_id"])
    return form


@router.post(
    "",
    response_model=FormOut,
    status_code=status.HTTP_201_CREATED,
    summary="Cria um novo formulário",
    responses={400: {"description": "Já existe um formulário com esse id"}},
)
def criar_form(form: FormCreate):
    form_existente = db.forms.find_one({"_id": form.id})

    if form_existente is not None:
        raise HTTPException(
            status_code=400, detail="Já existe um formulário com esse id"
        )

    novo_form = {
        "_id": form.id,
        "name": form.name,
        "sections": form.sections,
        "metadata": form.metadata.model_dump(),
    }

    db.forms.insert_one(novo_form)

    return novo_form


@router.put(
    "/{form_id}",
    response_model=FormOut,
    summary="Atualiza um formulário existente",
    responses={404: {"description": FORM_NAO_ENCONTRADO}},
)
def atualizar_form(form_id: str, form: FormUpdate):
    form_existente = db.forms.find_one({"_id": form_id})

    if form_existente is None:
        raise HTTPException(status_code=404, detail=FORM_NAO_ENCONTRADO)

    dados_atualizados = {
        "name": form.name,
        "sections": form.sections,
        "metadata": form.metadata.model_dump(),
    }

    db.forms.update_one({"_id": form_id}, {"$set": dados_atualizados})

    form_atualizado = db.forms.find_one({"_id": form_id})
    form_atualizado["_id"] = str(form_atualizado["_id"])

    return form_atualizado


@router.delete(
    "/{form_id}",
    response_model=MessageOut,
    summary="Remove um formulário",
    responses={404: {"description": FORM_NAO_ENCONTRADO}},
)
def deletar_form(form_id: str):
    resultado = db.forms.delete_one({"_id": form_id})

    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail=FORM_NAO_ENCONTRADO)

    return {"mensagem": "Formulário removido com sucesso", "id": form_id}


@router.get(
    "/{form_id}/sections",
    response_model=SectionListOut,
    summary="Lista as seções de um formulário",
    description="Retorna as seções do formulário na mesma ordem em que estão referenciadas nele.",
    responses={404: {"description": FORM_NAO_ENCONTRADO}},
)
def listar_sections_do_form(form_id: str):
    form = db.forms.find_one({"_id": form_id})

    if form is None:
        raise HTTPException(status_code=404, detail=FORM_NAO_ENCONTRADO)

    raw_sections = form.get("sections", [])
    section_ids = [
        _extract_id(sid) for sid in raw_sections if _extract_id(sid) is not None
    ]

    sections_encontradas = list(db.sections.find({"_id": {"$in": section_ids}}))

    sections_por_id = {section["_id"]: section for section in sections_encontradas}

    sections_ordenadas = []
    for section_ref in raw_sections:
        section_id = _extract_id(section_ref)
        if section_id in sections_por_id:
            section = sections_por_id[section_id]
            section["_id"] = str(section["_id"])
            sections_ordenadas.append(section)

    return {"form_id": form_id, "sections": sections_ordenadas}


@router.post(
    "/{form_id}/sections",
    response_model=SectionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Cria uma seção diretamente em um formulário",
    description="Cria a seção e adiciona sua referência à lista de seções do formulário informado.",
    responses={
        404: {"description": FORM_NAO_ENCONTRADO},
        400: {"description": "Já existe uma seção com esse id"},
    },
)
def criar_section_no_form(form_id: str, section: SectionCreate):
    form = db.forms.find_one({"_id": form_id})

    if form is None:
        raise HTTPException(status_code=404, detail=FORM_NAO_ENCONTRADO)

    section_existente = db.sections.find_one({"_id": section.id})

    if section_existente is not None:
        raise HTTPException(status_code=400, detail="Já existe uma seção com esse id")

    nova_section = {
        "_id": section.id,
        "title": section.title,
        "parentItem": form_id,
        "subSections": section.subSections,
        "questions": section.questions,
        "tags": section.tags,
    }

    db.sections.insert_one(nova_section)

    db.forms.update_one({"_id": form_id}, {"$addToSet": {"sections": section.id}})

    nova_section["_id"] = str(nova_section["_id"])
    return nova_section