import pytest
from playwright.sync_api import sync_playwright
import time

# Define a URL base do vision-engine ou backend que está rodando
BASE_URL = "http://localhost:8001"

def test_fluxo_completo_processamento_clinico():
    with sync_playwright() as p:
        # Cliente da requisição HTTP isolado
        request_context = p.request.new_context(
            base_url=BASE_URL,
            extra_http_headers={"Authorization": "Bearer 0000"},
        )

        print("\n [Passo 1] Enviando texto clínico para processamento...")

        # Passando como form e usando a chave exata 'texto_clinico' que o main.py exige.
        response = request_context.post(
            "/api/v1/processar-clinica",
            form={
                "texto_clinico": "Paciente Luizmar, 21 anos, compareceu com forte dor de cabeça. Foi receitado Paracetamol 500mg"
            },
            timeout=0
        )

        # Garante que a requisição inicial deu certo.
        assert response.ok
        dados_post = response.json()
        assert "id_sessao" in dados_post

        id_sessao = dados_post["id_sessao"]
        print(f"Sessão criada com sucesso! ID: {id_sessao}")

        # Loop de checagem (Polling) para esperar a LLM terminar de responder.
        print(f"[Passo 2] Aguardando a IA processar em segundo plano...")

        processado_com_sucesso = False
        dados_finais = {}

        for i in range(15): # Até 15 tentativas
            time.sleep(2) # espera 2 segundos entre checagens

            resposta_status = request_context.get(f"/api/v1/status/{id_sessao}", timeout=0) # Desativando o timeout para não encerrar o processo por pressa do playwright
            assert resposta_status.ok

            dados_finais = resposta_status.json()
            status_atual = dados_finais.get("status")
            print(f"Tentativa {i+1}: status atual é: {status_atual}")

            if status_atual == "executed":
                processado_com_sucesso = True
                break
            elif status_atual == "failed":
                pytest.fail(f"o processamento falhou no backend, Erro: {dados_finais.get('erro')}")
        assert processado_com_sucesso, " Tempo limite esgota esperando a resposta da LLM."

        # Validar se a IA gerou a estrutura certa
        print("[Passo 3] Validando a estrutura do JSON gerado...")
        dados_ia = dados_finais["dados"]

        assert "tipo_documento" in dados_ia
        assert "secoes" in dados_ia
        assert "resumo_narrativo" in dados_ia

        print("/n TESTE PASSED! O fluxo E2E assíncrono com a LLM está funcionando.")
        request_context.dispose()