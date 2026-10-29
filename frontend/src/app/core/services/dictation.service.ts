import { Injectable, inject } from '@angular/core';
<<<<<<< HEAD
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
=======
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, VISION_API_TOKEN } from '../config/api.config';
>>>>>>> origin/main

export interface TranscriptionResponse {
  sucesso: boolean;
  texto: string;
  analise_acustica?: string;
<<<<<<< HEAD
  erro?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DictationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/transcrever-campo';

  transcreverAudio(audioBlob: Blob): Observable<TranscriptionResponse> {
    const formData = new FormData();
    
    // A chave 'audio' bate exatamente com o loc: ["body", "audio"] do seu backend
    formData.append('audio', audioBlob, 'ditado.webm');

    const headers = new HttpHeaders({
      'Authorization': 'Bearer 0000'
    });

    return this.http.post<TranscriptionResponse>(this.apiUrl, formData, { headers });
  }
}
=======
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
>>>>>>> origin/main
