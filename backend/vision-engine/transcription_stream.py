import asyncio
import json
import os
import re
from typing import List, Optional, Tuple

import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.concurrency import run_in_threadpool

from transcription import (
    PROMPT_PADRAO,
    SAMPLE_RATE,
    texto_dos_segmentos,
    transcrever,
)

API_SECRET_TOKEN = os.getenv("VISION_API_SECRET_TOKEN", "0000")

# App separado (montado em /ws pelo main.py): as dependências HTTPBearer do app
# principal não funcionam em rotas WebSocket.
stream_app = FastAPI(title="Ditado em tempo real")

# Áudio novo mínimo entre duas transcrições parciais
INTERVALO_PARCIAL_S = 0.7
# Acima disso o buffer é cortado no fim da última palavra confirmada
BUFFER_MAX_S = 12.0
# Ditados até este tamanho recebem uma passada final completa (melhor qualidade)
FINAL_COMPLETO_MAX_S = 30.0

Palavra = Tuple[float, float, str]  # (início, fim, texto) em segundos absolutos


def _normalizar(palavra: str) -> str:
    return re.sub(r"[^\w]", "", palavra.lower())


class SessaoDitado:
    """Transcrição incremental com a política LocalAgreement-2 (whisper_streaming):
    uma palavra só é confirmada quando duas transcrições seguidas concordam nela."""

    def __init__(self, contexto: Optional[str]):
        self.prompt_base = contexto or PROMPT_PADRAO
        self.audio_total = np.zeros(0, dtype=np.float32)
        self.buffer = np.zeros(0, dtype=np.float32)
        self.buffer_inicio = 0.0  # posição (s) do buffer no áudio total
        self.amostras_pendentes = 0
        self.confirmadas: List[Palavra] = []
        self.hipotese_anterior: List[Palavra] = []
        self.parado = False

    @property
    def fim_confirmado(self) -> float:
        return self.confirmadas[-1][1] if self.confirmadas else 0.0

    def adicionar(self, pcm16: bytes) -> None:
        amostras = np.frombuffer(pcm16, dtype=np.int16).astype(np.float32) / 32768.0
        self.audio_total = np.concatenate([self.audio_total, amostras])
        self.buffer = np.concatenate([self.buffer, amostras])
        self.amostras_pendentes += len(amostras)

    def pronta_para_parcial(self) -> bool:
        return self.amostras_pendentes >= INTERVALO_PARCIAL_S * SAMPLE_RATE

    def _prompt(self) -> str:
        confirmado = " ".join(p[2] for p in self.confirmadas)
        return f"{self.prompt_base} {confirmado[-200:]}".strip()

    def _nova_hipotese(self, segmentos: list) -> List[Palavra]:
        palavras = [
            (self.buffer_inicio + w.start, self.buffer_inicio + w.end, w.word.strip())
            for s in segmentos for w in (s.words or []) if w.word.strip()
        ]
        # Descarta o que já foi confirmado (o buffer ainda contém esse áudio)
        palavras = [p for p in palavras if p[0] > self.fim_confirmado - 0.1]
        # Remove n-gramas repetidos na emenda entre confirmado e hipótese
        for n in range(min(5, len(self.confirmadas), len(palavras)), 0, -1):
            cauda = [_normalizar(p[2]) for p in self.confirmadas[-n:]]
            inicio = [_normalizar(p[2]) for p in palavras[:n]]
            if cauda == inicio:
                palavras = palavras[n:]
                break
        return palavras

    def atualizar(self) -> str:
        """Roda uma transcrição parcial e devolve o texto confirmado + provisório."""
        self.amostras_pendentes = 0
        segmentos = transcrever(self.buffer, self._prompt(), beam_size=1, word_timestamps=True)
        hipotese = self._nova_hipotese(segmentos)

        concordantes = 0
        for anterior, atual in zip(self.hipotese_anterior, hipotese):
            if _normalizar(anterior[2]) != _normalizar(atual[2]):
                break
            concordantes += 1
        self.confirmadas.extend(hipotese[:concordantes])
        self.hipotese_anterior = hipotese[concordantes:]

        if len(self.buffer) / SAMPLE_RATE > BUFFER_MAX_S and self.confirmadas:
            corte = int((self.fim_confirmado - self.buffer_inicio) * SAMPLE_RATE)
            if corte > 0:
                self.buffer = self.buffer[corte:]
                self.buffer_inicio += corte / SAMPLE_RATE

        return " ".join(p[2] for p in self.confirmadas + self.hipotese_anterior)

    def finalizar(self) -> str:
        if len(self.audio_total) == 0:
            return ""
        if len(self.audio_total) / SAMPLE_RATE <= FINAL_COMPLETO_MAX_S:
            return texto_dos_segmentos(transcrever(self.audio_total, self.prompt_base))
        # Ditado longo: mantém o confirmado e transcreve só o restante
        cauda = self.audio_total[int(self.fim_confirmado * SAMPLE_RATE):]
        resto = texto_dos_segmentos(transcrever(cauda, self._prompt())) if len(cauda) else ""
        return " ".join([p[2] for p in self.confirmadas] + ([resto] if resto else []))


@stream_app.websocket("/transcrever")
async def transcrever_stream(websocket: WebSocket):
    """Protocolo:
    cliente → {"type":"start","token":"...","contexto":"..."} (texto), depois frames binários
              PCM16 mono 16 kHz e por fim {"type":"stop"}
    servidor → {"type":"partial","text":...}* e {"type":"final","text":...} (ou {"type":"error"})
    """
    await websocket.accept()

    try:
        inicio = await asyncio.wait_for(websocket.receive_json(), timeout=10)
    except (asyncio.TimeoutError, ValueError, WebSocketDisconnect):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    if inicio.get("type") != "start" or inicio.get("token") != API_SECRET_TOKEN:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token inválido.")
        return

    sessao = SessaoDitado(inicio.get("contexto"))
    audio_novo = asyncio.Event()

    async def enviar_parciais():
        ultimo = ""
        while True:
            await audio_novo.wait()
            audio_novo.clear()
            if sessao.parado:
                return
            if not sessao.pronta_para_parcial():
                continue
            texto = await run_in_threadpool(sessao.atualizar)
            if texto != ultimo and not sessao.parado:
                ultimo = texto
                await websocket.send_json({"type": "partial", "text": texto})

    worker = asyncio.create_task(enviar_parciais())
    try:
        while True:
            mensagem = await websocket.receive()
            if mensagem["type"] == "websocket.disconnect":
                return
            if mensagem.get("bytes"):
                sessao.adicionar(mensagem["bytes"])
                audio_novo.set()
            elif mensagem.get("text") and json.loads(mensagem["text"]).get("type") == "stop":
                break

        sessao.parado = True
        audio_novo.set()
        await worker
        texto_final = await run_in_threadpool(sessao.finalizar)
        await websocket.send_json({"type": "final", "text": texto_final})
        await websocket.close()
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "detail": f"Erro no processamento: {str(e)}"})
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass
    finally:
        sessao.parado = True
        audio_novo.set()
        if not worker.done():
            worker.cancel()
