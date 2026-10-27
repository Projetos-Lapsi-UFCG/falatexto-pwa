# Fala-Texto PWA

Backend FastAPI + Frontend Angular PWA para o sistema de documentação clínica.

---

## Pré-requisitos

- [Docker e Docker Compose](https://www.docker.com/get-started/)
- [Ollama](https://ollama.com) rodando localmente na porta padrão (`11434`), com o modelo usado pelo `vision-engine` já baixado:
  ```bash
  ollama pull gemma:7b
  ```
  O `vision-engine` roda em container e acessa o Ollama do host via `host.docker.internal`; sem ele, o endpoint `/api/v1/processar-clinica` falha.

---

## Variáveis de ambiente

Antes de subir os serviços, copie o arquivo de exemplo e preencha os valores:

```bash
cp .env.example .env
```

| Variável                  | Descrição                                                                 |
|---------------------------|--------------------------------------------------------------------------|
| `VISION_API_SECRET_TOKEN` | Token compartilhado exigido pelos endpoints `/vision` (api, vision-engine e frontend usam o mesmo valor). Obrigatório, sem valor padrão. |
| `ADMIN_PIN`               | PIN de 4 dígitos exigido para entrar como **administrador** no frontend. Obrigatório, sem valor padrão. |

O `docker compose` carrega o `.env` da raiz automaticamente. Sem essas variáveis, o `docker compose up` falha indicando qual variável está faltando. O `.env` está no `.gitignore` — nunca faça commit dele.

---

## Executando o projeto completo (recomendado)

A partir da **raiz do repositório** (`falatexto-pwa/`), um único `docker-compose.yml` sobe os três serviços em uma rede compartilhada (requer o `.env` da seção anterior):

```bash
docker compose up --build -d
```

| Serviço   | URL                        |
|-----------|----------------------------|
| Frontend  | http://localhost:4200      |
| Backend   | http://localhost:8000      |
| API Docs  | http://localhost:8000/docs |
| Vision Engine | http://localhost:8001  |

> Na primeira execução o `--build` é necessário para construir as imagens. Nas seguintes, pode omiti-lo se o código não mudou.

### Acompanhar logs

```bash
# Todos os serviços
docker compose logs -f

# Serviço específico
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f database
```

### Reconstruir apenas um serviço

```bash
docker compose up --build -d frontend
docker compose up --build -d api
```

### Derrubar tudo

```bash
# Para os containers (preserva o volume do banco)
docker compose down

# Para os containers e remove o volume do banco
docker compose down -v
```

---

## Executando apenas o backend

```bash
cd backend/
cp .env.example .env   # defina VISION_API_SECRET_TOKEN
docker compose -f docker-compose.backend.yml up -d
```

Sobe a API FastAPI (`assis_api`) e o banco de dados MongoDB (`assis_mongo`) com dados de amostra. A API não sobe sem `VISION_API_SECRET_TOKEN` definido (no `.env` do diretório `backend/` ou exportado no ambiente).

### Desenvolvimento local (API com hot-reload)

```bash
cd backend/

# Sobe apenas o MongoDB em Docker
docker compose -f docker-compose.backend.yml up -d database

# Instala dependências e inicia a API localmente
pip install -r requirements.txt
export VISION_API_SECRET_TOKEN=change-me   # obrigatório
python -m uvicorn api.main:app --reload
```

---

## Executando apenas o frontend

```bash
cd frontend/
cp .env.example .env   # defina VISION_API_SECRET_TOKEN e ADMIN_PIN
docker compose -f docker-compose.frontend.yml up -d
```

O build de produção Angular ocorre dentro do container (etapa Node.js) e os arquivos são servidos via nginx. Na inicialização, o container gera `/config.js` a partir de `VISION_API_SECRET_TOKEN` e `ADMIN_PIN` — sem essas variáveis o container aborta.

### Desenvolvimento local (hot-reload)

```bash
cd frontend/
npm install
npm start
```

---

## Portas

| Container            | Porta host | Porta interna |
|----------------------|------------|---------------|
| `assis_frontend`     | 4200       | 80            |
| `assis_api`          | 8000       | 8000          |
| `assis_vision_engine`| 8001       | 8001          |
| `assis_mongo`        | 27017      | 27017         |
