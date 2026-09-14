import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
   * Opcionalmente filtra por formId, para mostrar só as instâncias de um
   * formulário específico.
   * Método: GET
   * Endpoint: /api/v1/submissions
   */
  listSubmissions(formId?: string): Observable<SubmissionOut[]> {
    const params = formId ? new HttpParams().set('formId', formId) : undefined;
    return this.http
      .get<SubmissionListOut>(`${API_BASE_URL}/submissions`, { params })
      .pipe(map(res => res.submissions));
  }

  /**
   * Exclui uma submissão existente.
   * Método: DELETE
   * Endpoint: /api/v1/submissions/{id}
   */
  deleteSubmission(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/submissions/${id}`);
  }
}