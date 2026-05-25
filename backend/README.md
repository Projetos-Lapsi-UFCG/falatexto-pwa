# PWA Backend

Backend da aplicação PWA responsável por disponibilizar a API e, opcionalmente, um banco de dados de amostra para testes.

## Requisitos

Para executar o projeto, é necessário ter instalado:

- Docker
- Docker Compose
- Python 3

## Executando somente a API com Docker (sem banco de dados)

Para construir a imagem da API e executá-la isoladamente:

```bash
docker build -t assis-pwa-api .
docker run -d -p 8000:8000 --name pwa-backend-api assis-pwa-api
``` 
## Executando localmente
1. Abra o diretório do backend no VS Code.
2. No terminal, acesse a pasta do projeto:
cd backend_api
3. Ative o ambiente virtual:
source venv/bin/activate
4. Inicie apenas o banco de dados com Docker:
sudo docker compose up -d mongo
5. Execute a API localmente:
python -m uvicorn app.main:app --reload

## Executando todo o backend com Docker (API + banco de dados de amostra)

Para iniciar a API junto com o banco de dados configurado no projeto:
sudo docker compose up -d

Documentação : 
Swagger UI: http://127.0.0.1:8000/docs
