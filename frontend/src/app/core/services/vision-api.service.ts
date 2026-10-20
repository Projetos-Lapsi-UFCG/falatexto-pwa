import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class VisionApiService {
  private readonly http = inject(HttpClient);

  processarClinica(nomeFormulario: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('name', nomeFormulario);
    formData.append('file', file);

    return this.http.post<any>(
      `${API_BASE_URL}/forms/processar-imagem`,
      formData
    );
  }
}