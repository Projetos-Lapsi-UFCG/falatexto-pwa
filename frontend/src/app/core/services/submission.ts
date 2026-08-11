import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { SubmissionCreate, SubmissionOut } from '../models/backend-form.model';

/**
 * Service responsável pela comunicação com o backend para submissões
 * (formulários preenchidos). Ver FormApiService para forms/sections/questions.
 */
@Injectable({
  providedIn: 'root',
})
export class SubmissionService {
  private readonly http = inject(HttpClient);

  /**
   * Envia as respostas preenchidas pelo usuário para o backend salvar.
   * Método: POST
   * Endpoint: /api/v1/submissions
   */
  salvarRespostas(dados: SubmissionCreate): Observable<SubmissionOut> {
    return this.http.post<SubmissionOut>(`${API_BASE_URL}/submissions`, dados);
  }
}