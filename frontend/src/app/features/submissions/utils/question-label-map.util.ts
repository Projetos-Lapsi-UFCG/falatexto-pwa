import { Form } from '../../../core/models/form.model';

/**
 * Monta um mapa "id da pergunta/opção" -> rótulo legível, usado para trocar
 * as chaves brutas de submission.answers/checkboxAnswers (ex.: "q_201") pelo
 * texto real da pergunta (ex.: "O paciente possui alergias?") ao exibir uma
 * submissão, a partir das seções/perguntas do formulário correspondente.
 *
 * - question.id -> question.label (perguntas boolean/boolean_na/radio_group/text/date)
 * - option.id   -> option.complementLabel ?? option.label (checkbox_group,
 *   text_group e os campos complementares de radio_with_fields, todos
 *   respondidos sob a chave da option, não da question)
 */
export function buildQuestionLabelMap(form: Form | null | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  if (!form) return map;

  for (const section of form.sections ?? []) {
    for (const question of section.questions) {
      if (question.type === 'divider') continue;

      map[question.id] = question.label;

      for (const option of question.options ?? []) {
        map[option.id] = option.complementLabel ?? option.label;
      }
    }
  }

  return map;
}
