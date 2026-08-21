import { Form, FieldOption, QuestionField, Section } from '../models/form.model';
import {
  BackendFormCreate,
  BackendFormOut,
  BackendQuestionCreate,
  BackendQuestionOption,
  BackendQuestionOut,
  BackendQuestionType,
  BackendSectionCreate,
  BackendSectionOut,
} from '../models/backend-form.model';

/**
 * Tradutor puro entre o modelo local do frontend (Form/Section/QuestionField,
 * pensado para renderização de UI) e as DTOs reais do backend (Form/Section/
 * Question, pensadas para armazenamento normalizado no Mongo).
 *
 * Escopo desta camada: apenas conversão de forma de dados (data-shape). Ela
 * NÃO faz chamadas HTTP nem orquestra a sequência de N+1 requisições que o
 * backend exige para montar um formulário completo (POST /forms, depois um
 * POST /forms/{id}/sections por seção, depois um POST /sections/{id}/questions
 * por pergunta) — isso fica para quando os componentes forem de fato ligados
 * aos endpoints reais.
 *
 * Mapeamento de tipos (frontend -> backend):
 *   text, date              -> ABERTA   (date usa inputFormat: 'data')
 *   boolean, boolean_na     -> ESTIMULADA, com o option-set canônico Sim/Não(/Não se aplica)
 *   radio_group             -> ESTIMULADA (seleção única)
 *   checkbox_group          -> MULTIPLA  (seleção múltipla)
 *   radio_with_fields       -> ESTIMULADA, preservando hasComplement/complementLabel/
 *                               complementType por opção (o backend suporta isso
 *                               diretamente em QuestionOption desde a extensão de schema)
 *   text_group              -> COMPOSTA: uma pergunta ABERTA-filha por option, agrupadas
 *                               via compositeFields (mesmo padrão do exemplo q_endereco)
 *   divider                 -> não é uma pergunta. Delimita um novo grupo que deveria
 *                               virar uma subSection (Section.subSections já existe no
 *                               backend para isso). A API atual, porém, não expõe nenhum
 *                               endpoint para criar uma Section com parentItem = outra
 *                               Section (sections.py só tem DELETE) — então
 *                               splitSectionByDividers()/mapSectionToBackend() modelam a
 *                               divisão, mas persistir de fato exige um endpoint novo
 *                               que ainda não existe.
 *
 * Não têm equivalente no backend hoje (dropados ao converter para o backend):
 *   - Form.entity, Form.type, Form.inputMethod, Form.questions (contagem)
 *   - QuestionField.complement (campo solto na pergunta; não usado nos dados
 *     atuais — só as opções usam hasComplement/complementLabel/complementType)
 */

// ============================================================================
// Geração de ids compatíveis com os patterns do backend
// ============================================================================

function slugify(raw: string): string {
  const semAcentos = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  const limpo = semAcentos.replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');

  return limpo || 'item';
}

/** Backend: `^form_\d{3}$` (form.py). */
export function toBackendFormId(sequence: number): string {
  return `form_${String(sequence).padStart(3, '0')}`;
}

/** Backend: `^sec_[A-Za-z0-9_]+$` (section.py). */
export function toBackendSectionId(raw: string): string {
  return `sec_${slugify(raw)}`;
}

/** Backend: `^q_[A-Za-z0-9_]+$` (question.py). */
export function toBackendQuestionId(raw: string): string {
  return `q_${slugify(raw)}`;
}

// ============================================================================
// Options
// ============================================================================

/** Convenção adotada: FieldOption.id (chave usada em answers/checkboxAnswers)
 *  vira QuestionOption.value no backend, e é reconstruído a partir dele na volta. */
export function mapOptionToBackend(option: FieldOption): BackendQuestionOption {
  const backendOption: BackendQuestionOption = {
    label: option.label,
    value: option.id,
  };

  if (option.hasComplement) {
    backendOption.hasComplement = true;
    backendOption.complementLabel = option.complementLabel;
    backendOption.complementType = option.complementType;
  }

  return backendOption;
}

export function mapOptionFromBackend(option: BackendQuestionOption): FieldOption {
  const fieldOption: FieldOption = {
    id: option.value,
    label: option.label,
  };

  if (option.hasComplement) {
    fieldOption.hasComplement = true;
    // O backend envia `null` explícito para campos opcionais não definidos;
    // o modelo do frontend só conhece `undefined`.
    fieldOption.complementLabel = option.complementLabel ?? undefined;
    fieldOption.complementType = option.complementType ?? undefined;
  }

  return fieldOption;
}

const BOOLEAN_OPTIONS: ReadonlyArray<[string, string]> = [
  ['sim', 'Sim'],
  ['nao', 'Não'],
];

const BOOLEAN_NA_OPTIONS: ReadonlyArray<[string, string]> = [
  ['sim', 'Sim'],
  ['nao', 'Não'],
  ['na', 'Não se aplica'],
];

function buildCanonicalOptions(pairs: ReadonlyArray<[string, string]>): BackendQuestionOption[] {
  return pairs.map(([value, label]) => ({ value, label }));
}

function optionValuesMatch(options: BackendQuestionOption[], pairs: ReadonlyArray<[string, string]>): boolean {
  if (options.length !== pairs.length) return false;
  const values = new Set(options.map(o => o.value));
  return pairs.every(([value]) => values.has(value)) && options.every(o => !o.hasComplement);
}

// ============================================================================
// Questions
// ============================================================================

export interface MappedQuestion {
  /** A pergunta que representa este QuestionField no backend. */
  primary: BackendQuestionCreate;
  /** Perguntas-filhas geradas (hoje, só no caso text_group -> COMPOSTA). */
  extra: BackendQuestionCreate[];
}

function frontendTypeToBackendType(type: QuestionField['type']): BackendQuestionType {
  switch (type) {
    case 'text':
    case 'date':
      return 'ABERTA';
    case 'boolean':
    case 'boolean_na':
    case 'radio_group':
    case 'radio_with_fields':
      return 'ESTIMULADA';
    case 'checkbox_group':
      return 'MULTIPLA';
    case 'text_group':
      return 'COMPOSTA';
    case 'divider':
      throw new Error(
        "Perguntas do tipo 'divider' não existem no backend — remova-as com splitSectionByDividers() antes de mapear as perguntas de uma seção."
      );
  }
}

export function mapQuestionToBackend(question: QuestionField): MappedQuestion {
  const backendId = toBackendQuestionId(question.id);

  if (question.type === 'text_group') {
    const children: BackendQuestionCreate[] = (question.options ?? []).map(opt => ({
      id: toBackendQuestionId(`${question.id}_${opt.id}`),
      title: opt.label,
      type: 'ABERTA',
      options: [],
      compositeFields: [],
      inputFormat: null,
    }));

    return {
      primary: {
        id: backendId,
        title: question.label,
        type: 'COMPOSTA',
        options: [],
        compositeFields: children.map(child => child.id),
        inputFormat: null,
      },
      extra: children,
    };
  }

  const backendType = frontendTypeToBackendType(question.type);
  const isBoolean = question.type === 'boolean' || question.type === 'boolean_na';

  let options: BackendQuestionOption[];
  if (backendType !== 'ESTIMULADA' && backendType !== 'MULTIPLA') {
    options = [];
  } else if (isBoolean) {
    options = buildCanonicalOptions(question.type === 'boolean' ? BOOLEAN_OPTIONS : BOOLEAN_NA_OPTIONS);
  } else {
    options = (question.options ?? []).map(mapOptionToBackend);
  }

  return {
    primary: {
      id: backendId,
      title: question.label,
      type: backendType,
      options,
      compositeFields: [],
      inputFormat: question.type === 'date' ? 'data' : null,
    },
    extra: [],
  };
}

/**
 * Reconstrói um QuestionField a partir de uma BackendQuestionOut.
 *
 * @param question a pergunta "de topo" (não referenciada em compositeFields de outra)
 * @param compositeChildren para perguntas COMPOSTA, as perguntas-filhas na mesma
 *   ordem de `question.compositeFields` (assume-se que são folhas ABERTA — é o único
 *   padrão gerado por mapQuestionToBackend/usado nos dados atuais; filhos não-ABERTA
 *   ainda são convertidos, mas perdem qualquer estrutura própria além do título)
 */
export function mapQuestionFromBackend(
  question: BackendQuestionOut,
  compositeChildren: BackendQuestionOut[] = []
): QuestionField {
  const id = question.id;
  const label = question.title;

  switch (question.type) {
    case 'ABERTA':
      return {
        id,
        label,
        type: question.inputFormat === 'data' ? 'date' : 'text',
      };

    case 'COMPOSTA':
      return {
        id,
        label,
        type: 'text_group',
        options: compositeChildren.map(child => ({ id: child.id, label: child.title })),
      };

    case 'ESTIMULADA':
    case 'MULTIPLA': {
      if (question.type === 'ESTIMULADA' && optionValuesMatch(question.options, BOOLEAN_NA_OPTIONS)) {
        return { id, label, type: 'boolean_na' };
      }
      if (question.type === 'ESTIMULADA' && optionValuesMatch(question.options, BOOLEAN_OPTIONS)) {
        return { id, label, type: 'boolean' };
      }

      const options = question.options.map(mapOptionFromBackend);
      const hasComplement = options.some(o => o.hasComplement);

      if (question.type === 'MULTIPLA') {
        return { id, label, type: 'checkbox_group', options };
      }
      return { id, label, type: hasComplement ? 'radio_with_fields' : 'radio_group', options };
    }
  }
}

// ============================================================================
// Sections (incluindo a divisão de dividers em subSections)
// ============================================================================

interface QuestionGroup {
  /** undefined = fica na própria Section; definido = vira uma subSection com esse título. */
  subSectionTitle?: string;
  questions: QuestionField[];
}

/** Quebra a lista linear de perguntas de uma Section nos pontos onde há um
 *  QuestionField do tipo 'divider', usando o label do divider como título do
 *  próximo grupo (que deveria virar uma subSection). */
export function splitSectionByDividers(section: Section): QuestionGroup[] {
  const groups: QuestionGroup[] = [{ questions: [] }];

  for (const question of section.questions) {
    if (question.type === 'divider') {
      groups.push({ subSectionTitle: question.label, questions: [] });
    } else {
      groups[groups.length - 1].questions.push(question);
    }
  }

  return groups;
}

export interface MappedSection {
  section: BackendSectionCreate;
  /**
   * NOTA: hoje não há endpoint no backend para criar uma Section com
   * parentItem = outra Section (sections.py só tem DELETE). Estas subSections
   * representam a estrutura pretendida, mas não podem ser persistidas via API
   * até que um endpoint desse tipo exista.
   */
  subSections: BackendSectionCreate[];
  /** Perguntas agrupadas por id da Section/subSection dona (chave = section.id ou subSection.id). */
  questionsByOwnerId: Record<string, MappedQuestion[]>;
}

export function mapSectionToBackend(section: Section): MappedSection {
  const groups = splitSectionByDividers(section);
  const [ownSection, ...subGroups] = groups;

  const sectionId = toBackendSectionId(section.id);
  const ownQuestions = ownSection.questions.map(mapQuestionToBackend);

  const subSections: BackendSectionCreate[] = [];
  const questionsByOwnerId: Record<string, MappedQuestion[]> = {
    [sectionId]: ownQuestions,
  };

  subGroups.forEach((group, index) => {
    const subId = toBackendSectionId(`${section.id}_${index}_${group.subSectionTitle ?? ''}`);
    const mappedQuestions = group.questions.map(mapQuestionToBackend);

    subSections.push({
      id: subId,
      title: group.subSectionTitle ?? section.name,
      subSections: [],
      questions: mappedQuestions.flatMap(m => [m.primary.id, ...m.extra.map(e => e.id)]),
      tags: [],
    });
    questionsByOwnerId[subId] = mappedQuestions;
  });

  return {
    section: {
      id: sectionId,
      title: section.name,
      subSections: subSections.map(s => s.id),
      questions: ownQuestions.flatMap(m => [m.primary.id, ...m.extra.map(e => e.id)]),
      tags: [],
    },
    subSections,
    questionsByOwnerId,
  };
}

/**
 * Reconstrói uma Section a partir da SectionOut, suas subSections (na ordem de
 * section.subSections) e as perguntas de cada uma. Perguntas referenciadas no
 * compositeFields de outra pergunta são tratadas como filhas e não aparecem
 * soltas na lista resultante.
 */
export function mapSectionFromBackend(
  section: BackendSectionOut,
  subSections: BackendSectionOut[],
  questionsByOwnerId: Record<string, BackendQuestionOut[]>
): Section {
  const questionsInGroup = (ownerId: string): QuestionField[] => {
    const questions = questionsByOwnerId[ownerId] ?? [];
    const childIds = new Set(questions.flatMap(q => q.compositeFields));
    const byId = new Map(questions.map(q => [q.id, q]));

    return questions
      .filter(q => !childIds.has(q.id))
      .map(q => mapQuestionFromBackend(q, q.compositeFields.map(childId => byId.get(childId)).filter((q): q is BackendQuestionOut => !!q)));
  };

  const ownQuestions = questionsInGroup(section.id);

  const dividerGroups: QuestionField[] = subSections.flatMap(sub => [
    { id: `${sub.id}_divider`, label: sub.title, type: 'divider' as const },
    ...questionsInGroup(sub.id),
  ]);

  return {
    id: section.id,
    name: section.title,
    questions: [...ownQuestions, ...dividerGroups],
  };
}

// ============================================================================
// Forms
// ============================================================================

export interface FormBuildPlan {
  form: BackendFormCreate;
  sections: MappedSection[];
}

/** Monta a "receita" de criação de um Form completo no backend. Não executa
 *  nenhuma chamada HTTP — ver nota de escopo no topo do arquivo. */
export function mapFormToBackend(form: Form, formSequence: number): FormBuildPlan {
  return {
    form: {
      id: toBackendFormId(formSequence),
      name: form.name,
      sections: [],
      metadata: { version: '1.0', active: true },
    },
    sections: (form.sections ?? []).map(mapSectionToBackend),
  };
}

/** Reconstrói um Form local a partir das respostas de GET /forms/{id},
 *  GET /forms/{id}/sections e um GET /sections/{id}/questions por seção
 *  (incluindo subSections, se houver). Campos sem equivalente no backend
 *  (entity, type, inputMethod) recebem um valor default. */
export function mapFormFromBackend(
  form: BackendFormOut,
  sections: BackendSectionOut[],
  subSectionsBySectionId: Record<string, BackendSectionOut[]>,
  questionsByOwnerId: Record<string, BackendQuestionOut[]>,
  defaults: { entity?: string; createdAt?: string } = {}
): Form {
  const mappedSections = sections.map(section =>
    mapSectionFromBackend(section, subSectionsBySectionId[section.id] ?? [], questionsByOwnerId)
  );

  const questionCount = mappedSections.reduce(
    (total, section) => total + section.questions.filter(q => q.type !== 'divider').length,
    0
  );

  return {
    id: form.id,
    name: form.name,
    questions: questionCount,
    entity: defaults.entity ?? '',
    createdAt: defaults.createdAt ?? new Date().toISOString(),
    sections: mappedSections,
  };
}
