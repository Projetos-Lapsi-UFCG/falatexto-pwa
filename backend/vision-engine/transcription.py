import os
import tempfile
import threading
from typing import Optional, Union

import numpy as np
from faster_whisper import WhisperModel
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.concurrency import run_in_threadpool

router = APIRouter(
    prefix="/transcrever-campo",
    tags=["Transcrição"]
)

# Configuração do modelo (GPU: large-v3-turbo/cuda/float16; CPU: small/cpu/int8)
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

# Contexto padrão: orienta vocabulário e pontuação do Whisper para o domínio clínico
PROMPT_PADRAO = (
    "Nome de formulário clínico, por exemplo: Anamnese, Avaliação Fisioterapêutica, "
    "Ficha de Admissão, Evolução de Enfermagem."
)

SAMPLE_RATE = 16000

# Segmentos com estes indicadores costumam ser alucinação sobre silêncio/ruído
NO_SPEECH_PROB_MAX = 0.6
AVG_LOGPROB_MIN = -1.0

_model: Optional[WhisperModel] = None
# Carregamento e inferência serializados: uma GPU/um stream do CTranslate2 por vez
_model_lock = threading.Lock()


def get_whisper_model() -> WhisperModel:
    """Chamar no startup, na thread principal: criado numa thread secundária, o
    CTranslate2 (CPU) fica ~3x mais lento em toda inferência seguinte."""
    global _model
    with _model_lock:
        if _model is None:
            print(f"Carregando Whisper {WHISPER_MODEL} ({WHISPER_DEVICE}/{WHISPER_COMPUTE_TYPE})...")
            _model = WhisperModel(WHISPER_MODEL, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE_TYPE)
            # Aquecimento: a primeira inferência inicializa kernels/cache
            segmentos, _ = _model.transcribe(np.zeros(SAMPLE_RATE, dtype=np.float32), language="pt")
            list(segmentos)
            print("Whisper pronto.")
        return _model


def transcrever(
    audio: Union[str, np.ndarray],
    prompt: Optional[str] = None,
    beam_size: int = 5,
    word_timestamps: bool = False,
) -> list:
    """Transcreve um arquivo ou array float32 16 kHz e devolve os segmentos confiáveis."""
    model = get_whisper_model()
    with _model_lock:
        segmentos, _ = model.transcribe(
            audio,
            language="pt",
            beam_size=beam_size,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300},
            condition_on_previous_text=False,
            initial_prompt=prompt or PROMPT_PADRAO,
            word_timestamps=word_timestamps,
        )
        # O gerador é preguiçoso: precisa ser consumido dentro do lock
        segmentos = list(segmentos)

    return [
        s for s in segmentos
        if not (s.no_speech_prob > NO_SPEECH_PROB_MAX and s.avg_logprob < AVG_LOGPROB_MIN)
    ]


def texto_dos_segmentos(segmentos: list) -> str:
    return " ".join(s.text.strip() for s in segmentos).strip()


@router.post("")
async def transcrever_campo(
    audio: UploadFile = File(...),
    contexto: Optional[str] = Form(None),
):
    extensao = os.path.splitext(audio.filename)[1] if audio.filename else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=extensao) as temp_file:
        caminho_temp = temp_file.name
        temp_file.write(await audio.read())

    try:
        # Roda fora do event loop para não travar as demais rotas do engine
        segmentos = await run_in_threadpool(transcrever, caminho_temp, contexto)
        texto_transcrito = texto_dos_segmentos(segmentos)
        if not texto_transcrito:
            raise HTTPException(status_code=422, detail="Nenhuma fala detectada no áudio.")

        duracao_fala = sum(s.end - s.start for s in segmentos)
        return {
            "sucesso": True,
            "texto": texto_transcrito,
            "analise_acustica": f"Fala detectada: {duracao_fala:.1f}s"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")

    finally:
        if os.path.exists(caminho_temp):
            os.remove(caminho_temp)
