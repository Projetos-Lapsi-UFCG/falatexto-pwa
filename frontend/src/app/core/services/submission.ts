import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';
import { SubmissionCreate, SubmissionListOut, SubmissionOut } from '../models/backend-form.model';

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

  /**
   * Lista as submissões existentes (mais recentes primeiro).
   * Método: GET
   * Endpoint: /api/v1/submissions
   */
  listSubmissions(): Observable<SubmissionOut[]> {
    return this.http
      .get<SubmissionListOut>(`${API_BASE_URL}/submissions`)
      .pipe(map(res => res.submissions));
  }
}