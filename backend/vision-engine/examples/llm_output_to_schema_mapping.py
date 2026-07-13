import json
from typing import List, Optional
from pydantic import BaseModel, ValidationError

# 1. DEFINIÇÃO DO SCHEMA (A Barreira de Segurança)
class EntitySchema(BaseModel):
    termo: str
    categoria: str  # ex: Medicamento, Sintoma, Diagnóstico

class QuestionSchema(BaseModel):
    pergunta: str
    resposta: str
    entities: List[EntitySchema] = []  # Se não houver entidades, vem uma lista vazia

class SectionSchema(BaseModel):
    titulo: str  # ex: Anamnese, Histórico Familiar
    questions: List[QuestionSchema]

class FormSchema(BaseModel):
    id_sessao: Optional[str] = None
    tipo_formulario: str  # ex: "Consulta Geral", "Prontuário de Emergência"
    sections: List[SectionSchema]



# 2. FUNÇÃO VALIDATORA
def mapear_e_validar_output_llm(json_da_ia: str):
    """
    Tenta converter a string JSON da IA no Schema oficial do banco.
    Se a IA errar a estrutura, o Pydantic vai levantar um erro detalhado.
    """
    try:
        # 1. Transforma a string de texto em um dicionário Python
        dados_da_ia = json.loads(json_da_ia)
        
        # 2. Tenta injetar os dados no validador do Pydantic
        form_validado = FormSchema(**dados_da_ia)
        
        print("SUCESSO: O output da LLM está 100% correto e mapeado para o Schema!")
        return form_validado
        
    except json.JSONDecodeError:
        print("ERRO: A LLM não devolveu um JSON válido (Texto quebrado).")
        return None
    except ValidationError as e:
        print("ERRO DE SCHEMA: O JSON da IA quebrou as regras do banco de dados!")
        # Exibe exatamente onde a IA errou (campo faltando, tipo errado, etc.)
        print(e.json(indent=2))
        return None


# 3. SIMULAÇÃO DE TESTE
if __name__ == "__main__":
    # Exemplo de um JSON Perfeito que a IA geraria
    json_exemplo_sucesso = """
    {
        "tipo_formulario": "Consulta Ambulatorial",
        "sections": [
            {
                "titulo": "Anamnese Queixa Principal",
                "questions": [
                    {
                        "pergunta": "O que o paciente está sentindo?",
                        "resposta": "Paciente relata cefaleia intensa há 3 dias.",
                        "entities": [
                            {"termo": "cefaleia", "categoria": "Sintoma"}
                        ]
                    }
                ]
            }
        ]
    }
    """

    print("--- Testando JSON Correto ---")
    mapear_e_validar_output_llm(json_exemplo_sucesso)

    # Exemplo de um JSON Errado (IA esqueceu o campo obrigatório 'resposta')
    json_exemplo_erro = """
    {
        "tipo_formulario": "Consulta Ambulatorial",
        "sections": [
            {
                "titulo": "Anamnese",
                "questions": [
                    {
                        "pergunta": "Qual o sintoma?"
                    }
                ]
            }
        ]
    }
    """

    print("\n--- Testando JSON com Erro de Schema ---")
    mapear_e_validar_output_llm(json_exemplo_erro)