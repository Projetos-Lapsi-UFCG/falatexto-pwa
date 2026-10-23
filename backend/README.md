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

## Soft Delete

Formulários e submissões utilizam exclusão lógica (*soft delete*).

Ao excluir um registro, ele não é removido imediatamente do MongoDB. Os seguintes campos são utilizados:

- `deletedAt`: instante da exclusão, em UTC.
- `purgeAt`: instante a partir do qual a remoção definitiva é permitida.
- `updatedAt`: instante da última alteração.

A retenção padrão é de **90 dias** e pode ser configurada pela variável de ambiente:

`SOFT_DELETE_RETENTION_DAYS=90`

Por exemplo, para utilizar uma retenção de 30 dias:

`SOFT_DELETE_RETENTION_DAYS=30`

Registros excluídos não aparecem nas consultas normais. As rotas de listagem de formulários e submissões aceitam o parâmetro opcional `include_deleted=true` para consultar registros excluídos.

Formulários e submissões podem ser restaurados enquanto estiverem dentro do período de retenção.

A remoção definitiva após `purgeAt` é realizada por índices TTL do MongoDB. O mecanismo TTL possui granularidade aproximada de 60 segundos, portanto a remoção não ocorre necessariamente exatamente no instante de `purgeAt`.

A exclusão de um formulário não exclui automaticamente suas seções, perguntas ou submissões relacionadas.

> A API atualmente não possui autenticação ou autorização. A proteção das operações administrativas continua sendo responsabilidade do frontend.

## Desenvolvimento local (hot-reload)

```bash
cd backend/

# Sobe apenas o MongoDB
docker compose -f docker-compose.backend.yml up -d database

# Instala dependências e inicia a API com hot-reload
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```
