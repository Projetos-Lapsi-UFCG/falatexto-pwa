import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, VISION_API_TOKEN } from '../config/api.config';

export interface TranscriptionResponse {
  sucesso: boolean;
  texto: string;
  analise_acustica?: string;
}

/** Envia um áudio ditado para transcrição (Whisper, via /vision/transcrever-campo). */
@Injectable({ providedIn: 'root' })
export class DictationService {
  private readonly http = inject(HttpClient);

  transcreverAudio(audioBlob: Blob): Observable<TranscriptionResponse> {
    const extension = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const formData = new FormData();
    formData.append('audio', audioBlob, `ditado.${extension}`);

    return this.http.post<TranscriptionResponse>(
      `${API_BASE_URL}/vision/transcrever-campo`,
      formData,
      { headers: { Authorization: `Bearer ${VISION_API_TOKEN}` } }
    );
  }
}
