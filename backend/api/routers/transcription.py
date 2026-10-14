import os
import tempfile
import numpy as np
import librosa
import whisper
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter(
    prefix="/transcrever-campo",
    tags=["Transcrição"]
)

print("Carregando modelo Whisper turbo...")
model = whisper.load_model("turbo")

def validar_qualidade_audio(caminho_audio: str):
    try:
        y, sr = librosa.load(caminho_audio, sr=None)
        rms = librosa.feature.rms(y=y)[0]
        rms_medio = float(np.mean(rms))
        
        sinal_pico = np.max(np.abs(y))
        ruido_pico = np.percentile(np.abs(y), 10) + 1e-6
        snr_db = float(20 * np.log10(sinal_pico / ruido_pico))
        
        if rms_medio < 0.005:
            return False, f"Áudio muito baixo (RMS: {rms_medio:.4f})"
        if snr_db < 10.0:
            return False, f"Ruído elevado (SNR: {snr_db:.2f} dB)"
            
        return True, "Qualidade OK"
    except Exception as e:
        return True, f"Aviso na análise acústica: {str(e)}"

@router.post("")
async def transcrever_campo(audio: UploadFile = File(...)):
    extensao = os.path.splitext(audio.filename)[1] if audio.filename else ".mp3"
    with tempfile.NamedTemporaryFile(delete=False, suffix=extensao) as temp_file:
        caminho_temp = temp_file.name
        conteudo = await audio.read()
        temp_file.write(conteudo)

    try:
        qualidade_ok, mensagem_acustica = validar_qualidade_audio(caminho_temp)
        if not qualidade_ok:
            raise HTTPException(status_code=422, detail=mensagem_acustica)

        resultado = model.transcribe(caminho_temp, language="pt", fp16=False)
        texto_transcrito = resultado.get("text", "").strip()

        return {
            "sucesso": True,
            "texto": texto_transcrito,
            "analise_acustica": mensagem_acustica
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")

    finally:
        if os.path.exists(caminho_temp):
            os.remove(caminho_temp)
