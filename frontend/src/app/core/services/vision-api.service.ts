import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, VISION_API_TOKEN } from '../config/api.config';
import { VisionProcessarClinicaResponse } from '../models/vision.model';

/** Comunicação com o endpoint /vision do backend (proxy para o Vision Engine). */
@Injectable({ providedIn: 'root' })
export class VisionApiService {
  private readonly http = inject(HttpClient);

  /** `nome` vira o nome do formulário gerado pela LLM a partir do arquivo. */
  processarClinica(nome: string, file: File | null): Observable<VisionProcessarClinicaResponse> {
    const formData = new FormData();
    formData.append('nome', nome);
    if (file) {
      formData.append('file', file);
    }

    return this.http.post<VisionProcessarClinicaResponse>(
      `${API_BASE_URL}/vision/processar-clinica`,
      formData,
      { headers: { Authorization: `Bearer ${VISION_API_TOKEN}` } }
    );
  }
}
