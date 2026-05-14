/**
 * Representa um campo/pergunta individual dentro de uma seção do formulário.
 * Cada pergunta tem um tipo que define como ela será renderizada na tela.
 *
 * Tipos disponíveis:
 * - boolean: resposta Sim / Não
 * - boolean_na: resposta Sim / Não / Não se Aplica
 * - text: campo de texto livre
 * - date: campo de data
 */
export interface QuestionField {
  id: string;
  label: string;
  type: 'boolean' | 'boolean_na' | 'text' | 'date';
  complement?: string; // campo complementar opcional (ex: "Qual?", "Entregues/Conferidas")
}

/**
 * Representa uma seção do formulário.
 * Um formulário pode ser dividido em múltiplas seções,
 * cada uma contendo suas próprias perguntas.
 */
export interface Section {
  id: string;
  name: string;
  questions: QuestionField[];
}

/**
 * Representa um formulário na biblioteca do app.
 * Formulários podem ser templates pré-instalados ou criados manualmente pelo usuário.
 * O campo sections é opcional — formulários sem seções definidas
 * foram criados manualmente e ainda não têm perguntas mapeadas.
 */
export interface Form {
  id: string;
  name: string;
  questions: number;
  entity: string;
  createdAt: string;
  type?: 'template' | 'manual';
  inputMethod?: 'dictate' | 'upload' | 'camera';
  sections?: Section[]; // seções com perguntas — presentes apenas em templates mapeados
}

/**
 * Representa uma instância de preenchimento de um formulário.
 * Criada quando o usuário inicia o preenchimento de um formulário.
 */
export interface FormInstance {
  id: string;
  formId: string;
  patientName: string;
  createdAt: string;
}