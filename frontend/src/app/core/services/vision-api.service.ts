import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class VisionApiService {
  private readonly http = inject(HttpClient);

<<<<<<< HEAD
  processarClinica(nomeFormulario: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('name', nomeFormulario);
    formData.append('file', file);
=======
  /** `nome` vira o nome do formulário gerado pela LLM a partir do arquivo. */
  processarClinica(nome: string, file: File | null): Observable<VisionProcessarClinicaResponse> {
    const formData = new FormData();
    formData.append('nome', nome);
    if (file) {
      formData.append('file', file);
    }
>>>>>>> origin/main

    return this.http.post<any>(
      `${API_BASE_URL}/forms/processar-imagem`,
      formData
    );
  }
}