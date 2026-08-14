import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { VisionProcessarClinicaResponse } from '../models/vision.model';

/** Comunicação com o endpoint /vision do backend (proxy para o Vision Engine). */
@Injectable({ providedIn: 'root' })
export class VisionApiService {
  private readonly http = inject(HttpClient);

  processarClinica(textoClinico: string, file: File | null): Observable<VisionProcessarClinicaResponse> {
    const formData = new FormData();
    formData.append('texto_clinico', textoClinico);
    if (file) {
      formData.append('file', file);
    }

    return this.http.post<VisionProcessarClinicaResponse>(
      `${API_BASE_URL}/vision/processar-clinica`,
      formData
    );
  }
}
