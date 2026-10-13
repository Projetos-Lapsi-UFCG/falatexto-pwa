import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "assis_db")

VISION_ENGINE_URL = os.getenv("VISION_ENGINE_URL", "http://vision-engine:8001")

# Segredo obrigatório: sem fallback para não subir a API com um token inseguro.
try:
    VISION_API_SECRET_TOKEN = os.environ["VISION_API_SECRET_TOKEN"]
except KeyError as exc:
    raise RuntimeError(
        "A variável de ambiente VISION_API_SECRET_TOKEN é obrigatória e não foi definida."
    ) from exc

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
