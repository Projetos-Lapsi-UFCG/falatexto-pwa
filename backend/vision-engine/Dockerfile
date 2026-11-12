FROM python:3.11-slim-bookworm

RUN rm -rf /var/lib/apt/lists/* && \
    apt-get clean && \
    apt-get update -o Acquire::CompressionTypes::Order::=gz && \
    apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        gcc \
        g++ \
        ca-certificates \
        ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONUNBUFFERED=1

RUN pip install --upgrade pip

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# GPU (docker-compose.gpu.yml): bibliotecas CUDA 12/cuDNN 9 usadas pelo faster-whisper
ARG WITH_CUDA=false
RUN if [ "$WITH_CUDA" = "true" ]; then \
        pip install --no-cache-dir nvidia-cublas-cu12 "nvidia-cudnn-cu12==9.*"; \
    fi
ENV LD_LIBRARY_PATH=/usr/local/lib/python3.11/site-packages/nvidia/cublas/lib:/usr/local/lib/python3.11/site-packages/nvidia/cudnn/lib

COPY . .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]