/**
 * Tipos que descrevem EXATAMENTE o formato que o backend devolve.
 * Servem só para tipar as respostas HTTP — não são usados na tela.
 */

/** Uma opção de resposta, como o backend envia */
export interface ApiQuestionOption {
  label: string;
  value: string;
}

/** Os quatro tipos de pergunta que o backend conhece */
export type ApiQuestionType = 'ABERTA' | 'ESTIMULADA' | 'MULTIPLA' | 'COMPOSTA';

/** Uma pergunta, como o backend envia (GET /sections/{id}/questions) */
export interface ApiQuestion {
  _id: string;
  parentItem: string;
  title: string;
  type: ApiQuestionType;
  options: ApiQuestionOption[];
  compositeFields: string[];
}

/** Uma seção, como o backend envia (GET /forms/{id}/sections) */
export interface ApiSection {
  _id: string;
  title: string;
  parentItem: string;
  subSections: string[];
  questions: string[];
  tags: string[];
}

/** Resposta de GET /forms/{form_id}/sections */
export interface ApiSectionsResponse {
  form_id: string;
  sections: ApiSection[];
}

/** Resposta de GET /sections/{section_id}/questions */
export interface ApiQuestionsResponse {
  section_id: string;
  questions: ApiQuestion[];
}