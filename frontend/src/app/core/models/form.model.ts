/**
 * Representa uma opção dentro de um campo de múltipla escolha ou checkbox.
 */
export interface FieldOption {
  id: string;
  label: string;
  hasComplement?: boolean;
  complementLabel?: string;
  complementType?: 'text' | 'number'; // tipo do campo complementar
}

/**
 * Representa um campo/pergunta individual dentro de uma seção do formulário.
 *
 * Tipos disponíveis:
 * - boolean: resposta Sim / Não
 * - boolean_na: resposta Sim / Não / Não se Aplica
 * - text: campo de texto livre
 * - date: campo de data
 * - checkbox_group: múltiplos checkboxes independentes
 * - radio_group: opções onde só uma pode ser selecionada
 */
export interface QuestionField {
  id: string;
  label: string;
  type: 'boolean' | 'boolean_na' | 'text' | 'date' | 'checkbox_group' | 'radio_group' | 'divider' | 'radio_with_fields' | 'text_group';
  options?: FieldOption[]; // opções para checkbox_group e radio_group
  complement?: string;
}

/**
 * Representa uma seção do formulário.
 */
export interface Section {
  id: string;
  name: string;
  questions: QuestionField[];
}

/**
 * Representa um formulário na biblioteca do app.
 */
export interface Form {
  id: string;
  name: string;
  questions: number;
  entity: string;
  createdAt: string;
  type?: 'template' | 'manual';
  inputMethod?: 'dictate' | 'upload' | 'camera';
  sections?: Section[];
}