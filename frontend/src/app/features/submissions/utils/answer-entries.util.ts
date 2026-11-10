import { Form, QuestionField } from '../../../core/models/form.model';
import { LabeledEntry, humanizeKey } from '../../../shared/utils/labeled-entries.util';
import { buildQuestionLabelMap } from './question-label-map.util';

/** Rótulos das respostas fixas de boolean/boolean_na — os mesmos valores que
 *  o form-fill grava em answers[question.id]. Sim/Não viram boolean para o
 *  DisplayValuePipe traduzir conforme o idioma da interface. */
const BOOLEAN_VALUES: Record<string, unknown> = {
  sim: true,
  nao: false,
  na: 'Não se aplica',
};

/**
 * Monta a lista de respostas de uma submissão já "legível", seguindo a ordem
 * das perguntas do formulário:
 *
 * - radio_group / radio_with_fields: o valor gravado é o id da opção
 *   (ex.: "solteiro_1") → exibe o rótulo da opção ("Solteiro").
 * - checkbox_group: o form-fill grava um boolean por opção em checkboxAnswers
 *   (ex.: { perto_0: true, rosa_1: true }) → agrupa numa única entrada com o
 *   texto da pergunta e a lista das opções marcadas ("Perto, Rosa").
 * - boolean / boolean_na: "sim"/"nao"/"na" → Sim / Não / Não se aplica.
 * - text_group: uma entrada por campo do grupo, como antes.
 * - demais (text/date/number): o valor como está.
 *
 * Chaves de answers/checkboxAnswers que não pertencem a nenhuma pergunta do
 * formulário (ex.: form não carregou, ou foi editado depois da submissão)
 * continuam aparecendo no final, com o rótulo humanizado — nada é escondido.
 */
export function buildAnswerEntries(
  form: Form | null | undefined,
  answers: Record<string, unknown> | null | undefined,
  checkboxAnswers: Record<string, boolean> | null | undefined
): LabeledEntry[] {
  const answerMap = answers ?? {};
  const checkboxMap = checkboxAnswers ?? {};
  const usedAnswerKeys = new Set<string>();
  const usedCheckboxKeys = new Set<string>();
  const entries: LabeledEntry[] = [];

  const has = (key: string) => Object.prototype.hasOwnProperty.call(answerMap, key);
  const take = (key: string): unknown => {
    usedAnswerKeys.add(key);
    return answerMap[key];
  };

  for (const section of form?.sections ?? []) {
    for (const question of section.questions) {
      entries.push(...entriesForQuestion(question, answerMap, checkboxMap, has, take, usedCheckboxKeys));
    }
  }

  // Sobras: respostas sem pergunta correspondente no formulário.
  const labelMap = buildQuestionLabelMap(form);
  for (const [key, value] of Object.entries(answerMap)) {
    if (usedAnswerKeys.has(key)) continue;
    entries.push({ key, label: labelMap[key] ?? humanizeKey(key), value });
  }
  for (const [key, value] of Object.entries(checkboxMap)) {
    if (usedCheckboxKeys.has(key)) continue;
    entries.push({ key, label: labelMap[key] ?? humanizeKey(key), value });
  }

  return entries;
}

function entriesForQuestion(
  question: QuestionField,
  answerMap: Record<string, unknown>,
  checkboxMap: Record<string, boolean>,
  has: (key: string) => boolean,
  take: (key: string) => unknown,
  usedCheckboxKeys: Set<string>
): LabeledEntry[] {
  const options = question.options ?? [];
  const optionLabel = (id: unknown) => options.find(o => o.id === id)?.label ?? id;

  switch (question.type) {
    case 'divider':
      return [];

    case 'checkbox_group': {
      const answered = options.some(o => o.id in checkboxMap);
      if (!answered) return [];

      const selected: string[] = [];
      for (const option of options) {
        usedCheckboxKeys.add(option.id);
        const complementKey = `${option.id}_complement`;
        const complement = has(complementKey) ? take(complementKey) : undefined;
        if (checkboxMap[option.id] === true) {
          selected.push(complement ? `${option.label} (${complement})` : option.label);
        }
      }
      return [{ key: question.id, label: question.label, value: selected }];
    }

    case 'radio_group':
      return has(question.id)
        ? [{ key: question.id, label: question.label, value: optionLabel(take(question.id)) }]
        : [];

    case 'radio_with_fields': {
      const result: LabeledEntry[] = [];
      if (has(question.id)) {
        result.push({ key: question.id, label: question.label, value: optionLabel(take(question.id)) });
      }
      for (const option of options) {
        if (option.hasComplement && has(option.id)) {
          result.push({
            key: option.id,
            label: option.complementLabel ?? option.label,
            value: take(option.id),
          });
        }
      }
      return result;
    }

    case 'boolean':
    case 'boolean_na': {
      if (!has(question.id)) return [];
      const raw = take(question.id);
      const value = typeof raw === 'string' && raw in BOOLEAN_VALUES ? BOOLEAN_VALUES[raw] : raw;
      return [{ key: question.id, label: question.label, value }];
    }

    case 'text_group':
      return options
        .filter(o => has(o.id))
        .map(o => ({ key: o.id, label: o.label, value: take(o.id) }));

    default:
      return has(question.id)
        ? [{ key: question.id, label: question.label, value: take(question.id) }]
        : [];
  }
}
