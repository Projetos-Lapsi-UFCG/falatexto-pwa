# Fala-Texto PWA

Backend FastAPI + Frontend Angular PWA para o sistema de documentação clínica do UFCG/HUAC.

---

## Pré-requisitos

- Docker e Docker Compose

---

## Executando o projeto completo (Frontend + Backend)

Para subir os dois serviços juntos, execute os comandos abaixo a partir da **raiz do repositório** (`falatexto-pwa/`):

```bash
docker compose -f backend/docker-compose.backend.yml up -d
docker compose -f frontend/docker-compose.frontend.yml up -d
```

| Serviço   | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:4200        |
| Backend   | http://localhost:8000        |
| API Docs  | http://localhost:8000/docs   |

Para acompanhar os logs:

```bash
docker compose -f backend/docker-compose.backend.yml logs -f
docker compose -f frontend/docker-compose.frontend.yml logs -f frontend
```

Para derrubar tudo:

```bash
docker compose -f backend/docker-compose.backend.yml down
docker compose -f frontend/docker-compose.frontend.yml down
```

---

## Executando apenas o backend

```bash
cd backend/
docker compose -f docker-compose.backend.yml up -d
```

Sobe a API FastAPI (`assis_api`) e o banco de dados MongoDB (`assis_mongo`) com dados de amostra.

### Desenvolvimento local (API com hot-reload)

```bash
cd backend/

# Sobe apenas o MongoDB em Docker
docker compose -f docker-compose.backend.yml up -d database

# Instala dependências e inicia a API localmente
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

---

## Executando apenas o frontend

```bash
cd frontend/
docker compose -f docker-compose.frontend.yml up -d
```

O build de produção Angular ocorre dentro do container (etapa Node.js) e os arquivos são servidos via nginx.

### Desenvolvimento local (hot-reload)

```bash
cd frontend/
npm install
npm start
```

---

## Portas

| Container         | Porta host | Porta interna |
|-------------------|------------|---------------|
| `assis_frontend`  | 4200       | 80            |
| `assis_api`       | 8000       | 8000          |
| `assis_mongo`     | 27017      | 27017         |
