# PWA Backend

A solução backend utiliza como dependência o `docker`.

Para executar somente a API (sem banco de dados).

```
docker build -t assis-pwa-api .
docker run -d -p 8000:8000 --name pwa-backend-api assis-pwa-api
```

Para executar todo o backend (API + banco de dados de amostra).

```
docker compose up -d
```
