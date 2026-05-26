# Backend — Fala-Texto PWA

FastAPI + MongoDB backend for the Fala-Texto clinical documentation system.

API docs available at: `http://localhost:8000/docs`

---

## Subir com Docker Compose

```bash
# A partir da raiz do repositório (falatexto-pwa/)
docker compose -f backend/docker-compose.backend.yml up -d
```

| Serviço         | Porta  |
|-----------------|--------|
| API (FastAPI)   | 8000   |
| MongoDB         | 27017  |

### Logs e encerramento

```bash
docker compose -f backend/docker-compose.backend.yml logs -f
docker compose -f backend/docker-compose.backend.yml down
```

---

## Desenvolvimento local (hot-reload)

```bash
cd backend/

# Sobe apenas o MongoDB
docker compose -f docker-compose.backend.yml up -d database

# Instala dependências e inicia a API com hot-reload
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```
