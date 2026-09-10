import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TranscriptionResponse {
  sucesso: boolean;
  texto: string;
  analise_acustica?: string;
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