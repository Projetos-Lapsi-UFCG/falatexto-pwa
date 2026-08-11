/**
 * Tipos espelhando as DTOs do backend (backend/api/models/form.py, section.py,
 * question.py, submission.py). Mantidos manualmente em sincronia — não há
 * geração automática a partir do schema Pydantic/OpenAPI.
 *
 * IMPORTANTE sobre o campo id: no backend, `id` tem `alias="_id"` e o FastAPI
 * serializa por alias por padrão — ou seja, a resposta HTTP real traz a chave
 * `_id`, não `id` (confirmado empiricamente). As interfaces `Backend*Out`
 * abaixo já representam a forma **normalizada** (pós `_id` -> `id`) esperada
 * por form-mapper.ts; quem faz a chamada HTTP (FormApiService) é responsável
 * por normalizar a resposta crua antes de repassá-la ao mapper.
 */

export type BackendQuestionType = 'ABERTA' | 'ESTIMULADA' | 'MULTIPLA' | 'COMPOSTA';

/** Dica de renderização, válida apenas em perguntas ABERTA (question.py: inputFormat). */
export type BackendInputFormat = 'texto' | 'data' | 'numero';

export type BackendComplementType = 'text' | 'number';

export interface BackendQuestionOption {
  label: string;
  value: string;
  hasComplement?: boolean;
  /** O backend envia `null` explícito (não omite a chave) quando não definido. */
  complementLabel?: string | null;
  complementType?: BackendComplementType | null;
}

export interface BackendQuestionCreate {
  id: string;
  title: string;
  type: BackendQuestionType;
  options: BackendQuestionOption[];
  compositeFields: string[];
  inputFormat?: BackendInputFormat | null;
}

export interface BackendQuestionOut extends BackendQuestionCreate {
  parentItem: string;
}

export interface BackendSectionCreate {
  id: string;
  title: string;
  subSections: string[];
  questions: string[];
  tags: string[];
}

export interface BackendSectionOut extends BackendSectionCreate {
  parentItem: string;
}

export interface BackendFormMetadata {
  version: string;
  active: boolean;
}

export interface BackendFormCreate {
  id: string;
  name: string;
  sections: string[];
  metadata: BackendFormMetadata;
}

export type BackendFormOut = BackendFormCreate;

/** Forma resumida retornada por GET /forms (sem sections/questions). */
export interface BackendFormSummary {
  id: string;
  name: string;
  metadata: BackendFormMetadata;
}

export type BackendAnswerValue = string | number | boolean | string[] | null;

export interface SubmissionCreate {
  formId: string;
  formName?: string;
  entity?: string;
  patientData?: Record<string, unknown>;
  answers?: Record<string, BackendAnswerValue>;
  checkboxAnswers?: Record<string, boolean>;
  closingData?: Record<string, unknown>;
  status?: 'draft' | 'completed';
}

/** Representa a resposta crua do backend: o id vem como `_id` (ver nota no topo do arquivo). */
export interface SubmissionOut extends Required<Omit<SubmissionCreate, 'formName' | 'entity'>> {
  _id: string;
  formName?: string;
  entity?: string;
  submittedAt: string;
}
