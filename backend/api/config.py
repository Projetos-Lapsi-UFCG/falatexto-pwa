import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "assis_db")

VISION_ENGINE_URL = os.getenv("VISION_ENGINE_URL", "http://vision-engine:8001")
VISION_API_SECRET_TOKEN = os.getenv("VISION_API_SECRET_TOKEN", "0000")

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
