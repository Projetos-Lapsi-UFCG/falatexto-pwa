import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Service responsável pela comunicação com o backend.
 * Centraliza todas as requisições HTTP do app — buscar formulários
 * e enviar respostas preenchidas.
 */
@Injectable({
  providedIn: 'root',
})
export class SubmissionService {
  private readonly http = inject(HttpClient);

  // URL base do backend — porta 8000
  private readonly apiUrl = 'http://localhost:8000';

  /**
   * Busca a lista de todos os formulários disponíveis no backend.
   * Método: GET
   * Rota: /forms
   */
  getForms(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/forms`);
  }

  /**
   * Busca um formulário específico pelo id.
   * Método: GET
   * Rota: /forms/{form_id}
   */
  getFormById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/forms/${id}`);
  }

  /**
   * Envia as respostas preenchidas pelo usuário para o backend salvar.
   * Método: POST
   * Rota: /submissions — ainda não implementada no backend
   */
  salvarRespostas(dados: {
    formId: string;
    patientData: {
      name: string;
      birthDate: string;
      record: string;
      room: string;
    };
    answers: Record<string, string>;
    checkboxAnswers: Record<string, boolean>;
    closingData: {
      date: string;
      responsible: string;
    };
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/submissions`, dados);
  }
}