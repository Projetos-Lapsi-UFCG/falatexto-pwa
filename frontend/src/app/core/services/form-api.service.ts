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

/**
 * Service responsável pela comunicação com o backend para forms/sections/
 * questions. Substitui o antigo FormService (mock em localStorage).
 *
 * O backend guarda forms/sections/questions de forma normalizada (cada Form
 * só referencia ids de Section, cada Section só referencia ids de Question),
 * então montar um Form completo exige uma cadeia de N+1 chamadas — ver
 * getFormById(). O form-mapper.ts (já testado) cuida da tradução de forma;
 * este service cuida apenas de buscar os dados e normalizar `_id` -> `id`.
 */
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
   *
   * subSections são sempre tratadas como vazias aqui: não existe endpoint
   * GET /sections/{id} para buscar os metadados (título, tags) de uma
   * subSection isoladamente — só dá para resolvê-las se/quando esse endpoint
   * existir no backend (ver nota em form-mapper.ts sobre a mesma lacuna).
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
   * Cria um form vazio (sem sections/questions — a UI de criação hoje só
   * coleta o nome). O id (`form_NNN`) é gerado no cliente: lista os forms
   * existentes, pega o maior sufixo numérico e soma 1. Não há proteção
   * contra corrida entre o GET e o POST (dois creates simultâneos podem
   * colidir no id) — aceitável por ora, já que a aplicação não tem
   * autenticação nem qualquer outro controle de concorrência multiusuário.
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
