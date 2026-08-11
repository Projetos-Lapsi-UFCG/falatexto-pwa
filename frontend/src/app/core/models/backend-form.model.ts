/**
 * Tipos espelhando as DTOs do backend (backend/api/models/form.py, section.py,
 * question.py). Mantidos manualmente em sincronia — não há geração automática
 * a partir do schema Pydantic/OpenAPI.
 */

export type BackendQuestionType = 'ABERTA' | 'ESTIMULADA' | 'MULTIPLA' | 'COMPOSTA';

/** Dica de renderização, válida apenas em perguntas ABERTA (question.py: inputFormat). */
export type BackendInputFormat = 'texto' | 'data' | 'numero';

export type BackendComplementType = 'text' | 'number';

export interface BackendQuestionOption {
  label: string;
  value: string;
  hasComplement?: boolean;
  complementLabel?: string;
  complementType?: BackendComplementType;
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
