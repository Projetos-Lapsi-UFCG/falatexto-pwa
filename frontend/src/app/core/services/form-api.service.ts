import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';
import { Form } from '../models/form.model';
import {
  BackendFormCreate,
  BackendFormOut,
  BackendFormSummary,
  BackendQuestionOut,
  BackendSectionOut,
} from '../models/backend-form.model';
import { mapFormFromBackend, toBackendFormId } from './form-mapper';

/** Forma crua de um DTO `*Out` como o backend realmente serializa: id como `_id`
 *  (FastAPI serializa por alias por padrão — ver nota no topo de backend-form.model.ts). */
type Raw<T extends { id: string }> = Omit<T, 'id'> & { _id: string };

function normalizeId<T extends { id: string }>(raw: Raw<T>): T {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id } as unknown as T;
}

interface FormListResponse {
  forms: Raw<BackendFormSummary>[];
}

interface SectionListResponse {
  form_id: string;
  sections: Raw<BackendSectionOut>[];
}

interface QuestionListResponse {
  section_id: string;
  questions: Raw<BackendQuestionOut>[];
}

@Injectable({ providedIn: 'root' })
export class FormApiService {
  private readonly http = inject(HttpClient);

  /** Lista resumida de forms (GET /forms não retorna sections/questions). */
  listForms(): Observable<Form[]> {
    return this.http
      .get<FormListResponse>(`${API_BASE_URL}/forms`)
      .pipe(map(res => res.forms.map(f => this.summaryToForm(normalizeId<BackendFormSummary>(f)))));
  }

  /** Filtro client-side por nome — não há endpoint de busca no backend. */
  searchForms(query: string): Observable<Form[]> {
    const q = query.trim().toLowerCase();
    return this.listForms().pipe(
      map(forms => (q ? forms.filter(f => f.name.toLowerCase().includes(q)) : forms))
    );
  }

  /**
   * Monta um Form completo: GET do form, GET das suas sections, e um GET de
   * questions por section, remontados via mapFormFromBackend().
   */
  getFormById(id: string): Observable<Form> {
    return this.http.get<Raw<BackendFormOut>>(`${API_BASE_URL}/forms/${id}`).pipe(
      map(normalizeId<BackendFormOut>),
      switchMap(form =>
        this.http.get<SectionListResponse>(`${API_BASE_URL}/forms/${id}/sections`).pipe(
          map(res => res.sections.map(normalizeId<BackendSectionOut>)),
          switchMap(sections =>
            this.fetchQuestionsByOwnerId(sections).pipe(
              map(questionsByOwnerId =>
                mapFormFromBackend(form, sections, {}, questionsByOwnerId, {
                  entity: '',
                  createdAt: new Date().toISOString(),
                })
              )
            )
          )
        )
      )
    );
  }

  /**
   * Cria um form vazio (sem sections/questions).
   */
  createForm(name: string): Observable<Form> {
    return this.listForms().pipe(
      switchMap(existing => {
        const sequences = existing
          .map(f => /^form_(\d{3})$/.exec(f.id)?.[1])
          .filter((seq): seq is string => !!seq)
          .map(Number);
        const nextSequence = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;

        const payload: BackendFormCreate = {
          id: toBackendFormId(nextSequence),
          name,
          sections: [],
          metadata: { version: '1.0', active: true },
        };

        return this.http.post<Raw<BackendFormOut>>(`${API_BASE_URL}/forms`, payload);
      }),
      map(normalizeId<BackendFormOut>),
      map(form => this.summaryToForm(form))
    );
  }

  /**
   * Envia a transcrição do áudio completo (ditado contínuo) para o backend
   * processar via LLM e mapear a estrutura dos campos do formulário.
   */
  processarDitadoCompleto(formId: string, texto: string): Observable<any> {
    return this.http.post<any>(`${API_BASE_URL}/forms/${formId}/parse-voice`, { texto });
  }

  private fetchQuestionsByOwnerId(
    sections: BackendSectionOut[]
  ): Observable<Record<string, BackendQuestionOut[]>> {
    if (sections.length === 0) {
      return of({});
    }

    const requestsByOwnerId = Object.fromEntries(
      sections.map(section => [
        section.id,
        this.http
          .get<QuestionListResponse>(`${API_BASE_URL}/sections/${section.id}/questions`)
          .pipe(map(res => res.questions.map(normalizeId<BackendQuestionOut>))),
      ])
    );

    return forkJoin(requestsByOwnerId);
  }

  private summaryToForm(summary: BackendFormSummary): Form {
    return {
      id: summary.id,
      name: summary.name,
      questions: summary.questionCount ?? 0,
      entity: '',
      createdAt: new Date().toISOString(),
    };
  }
}