import { Form } from '../../../core/models/form.model';
import { buildAnswerEntries } from './answer-entries.util';

describe('buildAnswerEntries', () => {
  const form: Form = {
    id: 'form_003',
    name: 'Cadastro',
    questions: 4,
    entity: '',
    createdAt: '2026-11-04T00:00:00Z',
    sections: [
      {
        id: 'sec_1',
        name: 'Dados',
        questions: [
          { id: 'q_nome', label: 'Nome', type: 'text' },
          {
            id: 'q_estado_civil',
            label: 'Estado civil',
            type: 'radio_group',
            options: [
              { id: 'casado_0', label: 'Casado' },
              { id: 'solteiro_1', label: 'Solteiro' },
            ],
          },
          {
            id: 'q_cores',
            label: 'Cores favoritas',
            type: 'checkbox_group',
            options: [
              { id: 'azul_0', label: 'Azul' },
              { id: 'rosa_1', label: 'Rosa' },
              { id: 'verde_2', label: 'Verde' },
            ],
          },
          { id: 'q_fuma', label: 'Fuma?', type: 'boolean_na' },
        ],
      },
    ],
  };

  it('shows the option label instead of the raw option id for single choice', () => {
    const entries = buildAnswerEntries(form, { q_estado_civil: 'solteiro_1' }, {});
    expect(entries).toEqual([{ key: 'q_estado_civil', label: 'Estado civil', value: 'Solteiro' }]);
  });

  it('groups checkbox answers under the question, listing only checked options', () => {
    const entries = buildAnswerEntries(form, {}, { azul_0: false, rosa_1: true, verde_2: true });
    expect(entries).toEqual([{ key: 'q_cores', label: 'Cores favoritas', value: ['Rosa', 'Verde'] }]);
  });

  it('follows the form question order and maps boolean answers', () => {
    const entries = buildAnswerEntries(
      form,
      { q_fuma: 'na', q_estado_civil: 'casado_0', q_nome: 'Ana' },
      { rosa_1: true }
    );
    expect(entries.map(e => e.label)).toEqual(['Nome', 'Estado civil', 'Cores favoritas', 'Fuma?']);
    expect(entries.at(-1)?.value).toBe('Não se aplica');
  });

  it('maps sim/nao to booleans so the pipe can translate them', () => {
    const [entry] = buildAnswerEntries(form, { q_fuma: 'sim' }, {});
    expect(entry.value).toBe(true);
  });

  it('keeps answers that are not in the form, with a humanized label', () => {
    const entries = buildAnswerEntries(form, { campo_antigo: 'x' }, { opcao_solta: true });
    expect(entries).toEqual([
      { key: 'campo_antigo', label: 'Campo Antigo', value: 'x' },
      { key: 'opcao_solta', label: 'Opcao Solta', value: true },
    ]);
  });

  it('still lists every answer when the form is not available', () => {
    const entries = buildAnswerEntries(null, { q_nome: 'Ana' }, { rosa_1: true });
    expect(entries.map(e => e.key)).toEqual(['q_nome', 'rosa_1']);
  });
});
