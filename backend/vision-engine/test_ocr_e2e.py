import time
import pytest
from playwright.sync_api import sync_playwright

# URL do vision-engine FastAPI (Docker porto 8001)
BASE_URL = "http://127.0.0.1:8001"

def test_upload_imagem_e_validacao_ocr():
    with sync_playwright() as p:
        # Cliente de requisição HTTP isolado
        request_context = p.request.new_context(base_url=BASE_URL)
        
        print("\n [Passo 1] Fazendo upload da imagem...")
        
        caminho_imagem = "backend/vision-engine/prompts/exemplo1.png"

        # O Playwright facilita o upload de arquivos via API usando multipart/form-data
        with open(caminho_imagem, "rb") as f_imagem:
            response = request_context.post(
                "/api/processar-clinica",
                multipart={
                    # Campos de texto comuns vão como strings normais
                    "texto_clinico": "Processamento de OCR com imagem de exemplo do HUAC.",
                    
                    # O arquivo precisa ser uma tupla contendo (nome, tipo, buffer)
                    "arquivo": (
                        "exemplo1.png",
                        "image/png",
                        f_imagem.read()
                    )
                },
                timeout=0
            )
        
        # Garante que o upload foi aceito (Status 200)
        assert response.ok
        dados_post = response.json()
        assert "id_sessao" in dados_post
        
        id_sessao = dados_post["id_sessao"]
        print(f" Sessão de OCR criada! ID: {id_sessao}")
        
        # [Passo 2] Aguardar o processamento (OCR + LLM)
        print("[Passo 2] Aguardando o EasyOCR e a IA processarem...")
        
        processado_com_sucesso = False
        dados_finais = {}
        
        # O OCR é rápido, mas a LLM ainda roda depois, então precisamos de timeout 0
        for i in range(100):  # Dá até 100 tentativas
            time.sleep(10)
            
            # NOTA: Desativando timeout no GET para o backend não pesar
            resposta_status = request_context.get(f"/api/status/{id_sessao}", timeout=0)
            assert resposta_status.ok
            
            dados_finais = resposta_status.json()
            status_atual = dados_finais.get("status")
            print(f" Tentativa {i+1}: Status atual é '{status_atual}'")
            
            if status_atual == "executed":
                processado_com_sucesso = True
                break
            elif status_atual == "failed":
                # Se falhar no OCR ou no Schema da LLM
                erro_backend = dados_finais.get("erro", "Erro desconhecido")
                detalhes = dados_finais.get("detalhes", "")
                pytest.fail(f" Falha no processamento: {erro_backend}. Detalhes: {detalhes}")
        
        assert processado_com_sucesso, "Tempo limite esgotado."
        
        # A Validação de Ponta a Ponta do OCR
        print(" [Passo 3] Validando se o OCR extraiu o texto corretamente...")
        dados_estruturados = dados_finais["dados"]

        # Convertemos o JSON gerado para string para checar o conteúdo extraído
        conteudo_json = str(dados_estruturados)
                
        assert "Lista de Verificação" in conteudo_json, "O tipo do documento não foi identificado."
        assert "123456789" in conteudo_json, "O número do prontuário não foi extraído."
        # assert "A1" in conteudo_json, "A identificação da sala não foi extraída."
        
        print("\nTESTE DE OCR PASSED! O EasyOCR capturou o texto e a IA estruturou com base nele.")
        request_context.dispose()