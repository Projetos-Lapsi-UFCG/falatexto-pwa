import { Form } from '../../../frontend/src/app/core/models/form.model';

/**
 * Extraído verbatim de frontend/src/app/core/services/form.service.ts
 * (preInstalled[0]) antes daquele arquivo ser removido — este é o único
 * lugar onde a estrutura completa da "Cirurgia Segura" (3 seções, 32
 * perguntas) ainda existe depois da migração para o backend real.
 */
export const cirurgiaSeguraForm: Form = {
  id: '1',
  name: 'Cirurgia Segura',
  questions: 32,
  entity: 'HUAC',
  createdAt: '2026-04-17',
  type: 'template',
  sections: [
    {
      id: 's1',
      name: 'Antes da Indução Anestésica',
      questions: [
        {
          id: 'q1',
          label: 'Paciente confirmou:',
          type: 'checkbox_group',
          options: [
            { id: 'q1_a', label: 'Identidade' },
            { id: 'q1_b', label: 'Sítio cirúrgico correto' },
            { id: 'q1_c', label: 'Procedimento' },
            { id: 'q1_d', label: 'Consentimento' },
          ],
        },
        {
          id: 'q2',
          label: 'Sítio demarcado (Lateralidade)',
          type: 'radio_group',
          options: [
            { id: 'q2_a', label: 'Sim' },
            { id: 'q2_b', label: 'Não' },
            { id: 'q2_c', label: 'Não se Aplica' },
          ],
        },
        {
          id: 'q3',
          label: 'Verificação da segurança anestésica:',
          type: 'checkbox_group',
          options: [
            { id: 'q3_a', label: 'Montagem da SO de acordo com o procedimento' },
            { id: 'q3_b', label: 'Material anestésico disponível, revisados e funcionantes' },
            { id: 'q3_c', label: 'Outro', hasComplement: true, complementLabel: 'Descreva' },
          ],
        },
        {
          id: 'q4',
          label: 'Via aérea difícil / broncoaspiração:',
          type: 'checkbox_group',
          options: [
            { id: 'q4_a', label: 'Não' },
            { id: 'q4_b', label: 'Sim e equipamento/assistência disponíveis' },
          ],
        },
        {
          id: 'q5',
          label: 'Risco de grande perda sanguínea superior a 500ml (ou 7ml/kg em crianças):',
          type: 'checkbox_group',
          options: [
            { id: 'q5_a', label: 'Sim' },
            { id: 'q5_b', label: 'Não' },
            { id: 'q5_c', label: 'Reserva de sangue disponível' },
          ],
        },
        {
          id: 'q6',
          label: 'Acesso venoso adequado e pérvio:',
          type: 'checkbox_group',
          options: [
            { id: 'q6_a', label: 'Sim' },
            { id: 'q6_b', label: 'Não' },
            { id: 'q6_c', label: 'Providenciado na SO' },
          ],
        },
        {
          id: 'q7',
          label: 'Histórico de reação alérgica:',
          type: 'checkbox_group',
          options: [
            { id: 'q7_a', label: 'Não' },
            { id: 'q7_b', label: 'Sim' },
            { id: 'q7_c', label: 'Qual?', hasComplement: true, complementLabel: 'Descreva a alergia' },
          ],
        },
      ],
    },
    {
      id: 's2',
      name: 'Antes da Incisão Anestésica',
      questions: [
        {
          id: 'q12',
          label: 'Apresentação oral de cada membro da equipe pelo nome e função.',
          type: 'radio_group',
          options: [
            { id: 'q12_a', label: 'Sim' },
            { id: 'q12_b', label: 'Não' },
          ],
        },
        {
          id: 'q13',
          label: 'Cirurgião, o anestesista e equipe de enfermagem confirmam verbalmente: Nome do paciente, sítio cirúrgico e procedimento a ser realizado.',
          type: 'radio_group',
          options: [
            { id: 'q13_a', label: 'Sim' },
            { id: 'q13_b', label: 'Não' },
          ],
        },
        {
          id: 'q14',
          label: 'Antibiótico profilático:',
          type: 'radio_group',
          options: [
            { id: 'q14_a', label: 'Sim' },
            { id: 'q14_b', label: 'Não' },
            { id: 'q14_c', label: 'Não se Aplica' },
          ],
        },
        {
          id: 'q15',
          label: 'Revisão do cirurgião. Momentos críticos do procedimento, tempos principais, riscos, perda sanguínea.',
          type: 'radio_group',
          options: [
            { id: 'q15_a', label: 'Sim' },
            { id: 'q15_b', label: 'Não' },
          ],
        },
        {
          id: 'q16',
          label: 'Revisão do anestesista. Há alguma preocupação em relação ao paciente?',
          type: 'radio_group',
          options: [
            { id: 'q16_a', label: 'Sim' },
            { id: 'q16_b', label: 'Não' },
          ],
        },
        {
          id: 'q16_divider',
          label: 'Revisão de enfermagem',
          type: 'divider',
        },
        {
          id: 'q17',
          label: 'Correta esterilização do material cirúrgico com fixação dos integradores ao prontuário.',
          type: 'radio_group',
          options: [
            { id: 'q17_a', label: 'Sim' },
            { id: 'q17_b', label: 'Não' },
          ],
        },
        {
          id: 'q18',
          label: 'Placa de eletrocautério posicionada:',
          type: 'radio_group',
          options: [
            { id: 'q18_a', label: 'Sim' },
            { id: 'q18_b', label: 'Não' },
          ],
        },
        {
          id: 'q19',
          label: 'Equipamentos disponíveis e funcionantes:',
          type: 'radio_group',
          options: [
            { id: 'q19_a', label: 'Sim' },
            { id: 'q19_b', label: 'Não' },
          ],
        },
        {
          id: 'q20',
          label: 'Insumos e instrumentais disponíveis:',
          type: 'radio_group',
          options: [
            { id: 'q20_a', label: 'Sim' },
            { id: 'q20_b', label: 'Não' },
          ],
        },
      ],
    },
    {
      id: 's3',
      name: 'Antes da Saída do Paciente da Sala de Cirurgia',
      questions: [
        {
          id: 'q21',
          label: 'Confirmação do procedimento realizado.',
          type: 'radio_group',
          options: [
            { id: 'q21_a', label: 'Sim' },
            { id: 'q21_b', label: 'Não' },
          ],
        },
        {
          id: 'q22',
          label: 'Contagem de compressas:',
          type: 'radio_with_fields',
          options: [
            { id: 'q22_a', label: 'Sim' },
            { id: 'q22_b', label: 'Não' },
            { id: 'q22_c', label: 'Não se Aplica' },
            { id: 'q22_d', label: 'Entregues', hasComplement: true, complementLabel: 'Entregues', complementType: 'number' },
            { id: 'q22_e', label: 'Conferidos', hasComplement: true, complementLabel: 'Conferidos', complementType: 'number' },
          ],
        },
        {
          id: 'q23',
          label: 'Contagem de instrumentos:',
          type: 'radio_with_fields',
          options: [
            { id: 'q23_a', label: 'Sim' },
            { id: 'q23_b', label: 'Não' },
            { id: 'q23_c', label: 'Não se Aplica' },
            { id: 'q23_d', label: 'Entregues', hasComplement: true, complementLabel: 'Entregues', complementType: 'number' },
            { id: 'q23_e', label: 'Conferidos', hasComplement: true, complementLabel: 'Conferidos', complementType: 'number' },
          ],
        },
        {
          id: 'q24',
          label: 'Contagem de agulhas:',
          type: 'radio_with_fields',
          options: [
            { id: 'q24_a', label: 'Sim' },
            { id: 'q24_b', label: 'Não' },
            { id: 'q24_c', label: 'Não se Aplica' },
            { id: 'q24_d', label: 'Entregues', hasComplement: true, complementLabel: 'Entregues', complementType: 'number' },
            { id: 'q24_e', label: 'Conferidos', hasComplement: true, complementLabel: 'Conferidos', complementType: 'number' },
          ],
        },
        {
          id: 'q25',
          label: 'Amostra cirúrgica identificada adequadamente:',
          type: 'radio_with_fields',
          options: [
            { id: 'q25_a', label: 'Sim' },
            { id: 'q25_b', label: 'Não' },
            { id: 'q25_c', label: 'Não se Aplica' },
            { id: 'q25_d', label: 'Requisição completa', hasComplement: true, complementLabel: 'Requisição completa', complementType: 'text' },
          ],
        },
        {
          id: 'q26',
          label: 'Problema com equipamentos que deve ser solucionado:',
          type: 'radio_with_fields',
          options: [
            { id: 'q26_a', label: 'Sim' },
            { id: 'q26_b', label: 'Não' },
            { id: 'q26_c', label: 'Não se Aplica' },
            { id: 'q26_d', label: 'Comunicado à enfermeira para providenciar a solução', hasComplement: true, complementLabel: 'Comunicado à enfermeira para providenciar a solução', complementType: 'text' },
          ],
        },
        {
          id: 'q27',
          label: 'Recomendações importantes na recuperação pós-anestésica e pós-operatória do paciente:',
          type: 'text_group',
          options: [
            { id: 'q27_a', label: 'Cirurgião' },
            { id: 'q27_b', label: 'Anestesista' },
            { id: 'q27_c', label: 'Enfermagem' },
          ],
        },
      ],
    },
  ],
};
