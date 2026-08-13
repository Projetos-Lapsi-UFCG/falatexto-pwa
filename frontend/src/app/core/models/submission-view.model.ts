/** Forma resumida de uma submissão, usada pela tela de listagem (admin). */
export interface SubmissionListItem {
  id: string;
  formName: string;
  submittedAt: string;
  responsible: string;
}
