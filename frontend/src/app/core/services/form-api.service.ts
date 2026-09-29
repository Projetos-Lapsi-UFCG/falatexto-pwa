import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';
import { Form, Section } from '../models/form.model';
import {
  BackendFormCreate,
  BackendFormOut,
  BackendFormSummary,
  BackendQuestionOut,
  BackendSectionCreate,
  BackendSectionOut,
} from '../models/backend-form.model';
import { MappedSection, mapFormFromBackend, mapFormToBackend, slugify, toBackendFormId } from './form-mapper';

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

  /**
   * Cria um form completo (nome + seções + perguntas) a partir da estrutura
   * montada no construtor de perguntas (CreateFormComponent). mapFormToBackend()
   * só traduz a forma dos dados (ver nota de escopo no topo de form-mapper.ts);
   * aqui é feito o encadeamento real que faltava: POST /forms, depois um
   * POST /forms/{id}/sections por seção e um POST /sections/{id}/questions
   * por pergunta daquela seção (em paralelo entre si, via forkJoin — não há
   * dependência entre seções, nem entre perguntas da mesma seção).
   *
   * Sem transação: se uma chamada no meio da cadeia falhar, o form (e as
   * seções/perguntas já criadas até ali) permanecem no banco — mesma
   * limitação já aceita em createForm() para a corrida de id.
   */
  createFormWithSections(form: Form): Observable<void> {
    return this.nextFormSequence().pipe(
      switchMap(sequence => {
        const uniqueSections = this.assignBackendIds(form.sections ?? [], sequence);
        const plan = mapFormToBackend({ ...form, sections: uniqueSections }, sequence);

        return this.http
          .post<Raw<BackendFormOut>>(`${API_BASE_URL}/forms`, plan.form)
          .pipe(switchMap(() => this.createSections(plan.form.id, plan.sections)));
      }),
      map(() => undefined)
    );
  }

  /** Remove um formulário existente. */
  deleteForm(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/forms/${id}`);
  }

  /** Mesma lógica de "pega o maior sufixo numérico existente e soma 1" usada
   *  em createForm(), fatorada para ser reaproveitada por createFormWithSections(). */
  private nextFormSequence(): Observable<number> {
    return this.listForms().pipe(
      map(existing => {
        const sequences = existing
          .map(f => /^form_(\d{3})$/.exec(f.id)?.[1])
          .filter((seq): seq is string => !!seq)
          .map(Number);
        return sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
      })
    );
  }

  /**
   * O construtor de perguntas só se importa com rótulos digitados pelo
   * usuário (section.name / question.label) — os ids locais em Section/
   * QuestionField são só placeholders de tracking do Angular. Aqui eles são
   * substituídos pelos ids reais que vão pro backend, derivados do rótulo.
   *
   * O prefixo com o sequence do form é necessário porque o backend exige id
   * único em toda a coleção `sections`/`questions`, não só dentro deste form
   * — sem isso, repetir um rótulo comum (ex.: "Nome") em dois formulários
   * diferentes colidiria (400 "já existe") no segundo. O índice de posição
   * garante unicidade mesmo entre perguntas com o mesmo rótulo dentro do
   * próprio form sendo criado agora.
   *
   * Opções de checkbox_group não precisam desse cuidado: `QuestionOption.value`
   * não tem unicidade exigida pelo backend (só usada como chave de resposta),
   * então só recebem um slug legível + índice pra não colidirem entre si
   * dentro da mesma pergunta.
   */
  private assignBackendIds(sections: Section[], sequence: number): Section[] {
    return sections.map((section, sectionIndex) => ({
      ...section,
      id: `${sequence}_${sectionIndex}_${section.name}`,
      questions: section.questions.map((question, questionIndex) => ({
        ...question,
        id: `${sequence}_${sectionIndex}_${questionIndex}_${question.label}`,
        options: question.options?.map((option, optionIndex) => ({
          ...option,
          id: `${slugify(option.label)}_${optionIndex}`,
        })),
      })),
    }));
  }

  private createSections(formId: string, sections: MappedSection[]): Observable<unknown> {
    if (sections.length === 0) {
      return of(undefined);
    }

    // Sequencial (não forkJoin): cada seção só é criada depois que a anterior
    // termina. O backend guarda a ordem em que os POSTs chegam (via $addToSet
    // em routers/forms.py) — em paralelo, a ordem de chegada das respostas HTTP
    // não é garantida e embaralhava a ordem das seções no formulário.
    return this.sequentially(sections.map(mapped => () => this.createSectionWithQuestions(formId, mapped)));
  }

  private createSectionWithQuestions(formId: string, mapped: MappedSection): Observable<unknown> {
    // Cria a seção sem perguntas pré-listadas: cada POST de pergunta abaixo se
    // auto-adiciona à seção via $addToSet no backend (routers/questions.py).
    // Isso evita a seção referenciar, ainda que momentaneamente, ids de
    // perguntas que ainda não existem como documento.
    const sectionPayload: BackendSectionCreate = { ...mapped.section, questions: [] };
    const questions = (mapped.questionsByOwnerId[mapped.section.id] ?? []).flatMap(q => [
      q.primary,
      ...q.extra,
    ]);

    return this.http.post(`${API_BASE_URL}/forms/${formId}/sections`, sectionPayload).pipe(
      switchMap(() => {
        if (questions.length === 0) {
          return of(undefined);
        }
        // Mesmo motivo do comentário em createSections(): sequencial pra
        // preservar a ordem em que as perguntas foram criadas no construtor.
        return this.sequentially(
          questions.map(
            q => () => this.http.post(`${API_BASE_URL}/sections/${mapped.section.id}/questions`, q)
          )
        );
      })
    );
  }

  /** Executa os observables (lazy — uma factory por item, não o Observable já
   *  inscrito) um de cada vez, só disparando o próximo depois que o anterior
   *  emitir. Ao contrário de forkJoin (paralelo), garante que a ordem de
   *  chegada no backend seja a mesma ordem da lista de entrada. */
  private sequentially<T>(factories: Array<() => Observable<T>>): Observable<T[]> {
    return factories.reduce(
      (acc$, factory) => acc$.pipe(switchMap(results => factory().pipe(map(result => [...results, result])))),
      of([] as T[])
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
