import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StorageService } from './storage.service';
import { Form, FormInstance } from '../models/form.model';

@Injectable({ providedIn: 'root' })
export class FormService {
  private readonly storage = inject(StorageService);

  /**
 * Formulários pré-instalados no app.
 * Esses formulários são templates que já vêm com as perguntas mapeadas
 * e não podem ser removidos pelo usuário.
 */
private readonly preInstalled: Form[] = [
  {
    id: '1',
    name: 'Cirurgia Segura',
    questions: 32,
    entity: 'HUAC',
    createdAt: '2026-04-17',
    type: 'template',
    // Seções baseadas na Lista de Verificação da Cirurgia Segura (HUAC/EBSERH)
    sections: [
      {
        id: 's1',
        name: 'Antes da Indução Anestésica',
        questions: [
          { id: 'q1',  label: 'Paciente confirmou identidade e sítio cirúrgico correto', type: 'boolean' },
          { id: 'q2',  label: 'Paciente confirmou procedimento e consentimento', type: 'boolean' },
          { id: 'q3',  label: 'Sítio demarcado (Lateralidade)', type: 'boolean_na' },
          { id: 'q4',  label: 'Montagem da SO de acordo com o procedimento', type: 'boolean' },
          { id: 'q5',  label: 'Material anestésico disponível, revisados e funcionantes', type: 'boolean' },
          { id: 'q6',  label: 'Outro', type: 'text' },
          { id: 'q7',  label: 'Via aérea difícil / broncoaspiração', type: 'boolean_na' },
          { id: 'q8',  label: 'Risco de grande perda sanguínea superior a 500ml (ou 7ml/kg em crianças)', type: 'boolean' },
          { id: 'q9',  label: 'Reserva de sangue disponível', type: 'boolean' },
          { id: 'q10', label: 'Acesso venoso adequado e pérvio', type: 'boolean' },
          { id: 'q11', label: 'Histórico de reação alérgica', type: 'boolean', complement: 'Qual?' },
        ],
      },
      {
        id: 's2',
        name: 'Antes da Incisão Anestésica',
        questions: [
          { id: 'q12', label: 'Apresentação oral de cada membro da equipe pelo nome e função', type: 'boolean' },
          { id: 'q13', label: 'Cirurgião, anestesista e equipe confirmam: nome do paciente, sítio cirúrgico e procedimento', type: 'boolean' },
          { id: 'q14', label: 'Antibiótico profilático', type: 'boolean_na' },
          { id: 'q15', label: 'Revisão do cirurgião: momentos críticos, tempos principais, riscos, perda sanguínea', type: 'boolean' },
          { id: 'q16', label: 'Revisão do anestesista: há alguma preocupação em relação ao paciente?', type: 'boolean' },
          { id: 'q17', label: 'Correta esterilização do material cirúrgico com fixação dos integradores ao prontuário', type: 'boolean' },
          { id: 'q18', label: 'Placa de eletrocautério posicionada', type: 'boolean' },
          { id: 'q19', label: 'Equipamentos disponíveis e funcionantes', type: 'boolean' },
          { id: 'q20', label: 'Insumos e instrumentais disponíveis', type: 'boolean' },
        ],
      },
      {
        id: 's3',
        name: 'Antes da Saída do Paciente da Sala de Cirurgia',
        questions: [
          { id: 'q21', label: 'Confirmação do procedimento realizado', type: 'boolean' },
          { id: 'q22', label: 'Contagem de compressas', type: 'boolean_na', complement: 'Entregues / Conferidas' },
          { id: 'q23', label: 'Contagem de instrumentos', type: 'boolean_na', complement: 'Entregues / Conferidos' },
          { id: 'q24', label: 'Contagem de agulhas', type: 'boolean_na', complement: 'Entregues / Conferidos' },
          { id: 'q25', label: 'Amostra cirúrgica identificada adequadamente', type: 'boolean_na' },
          { id: 'q26', label: 'Requisição completa', type: 'text' },
          { id: 'q27', label: 'Problema com equipamentos que deve ser solucionado', type: 'boolean_na' },
          { id: 'q28', label: 'Comunicado à enfermeira para providenciar a solução', type: 'text' },
          { id: 'q29', label: 'Recomendações pós-operatórias — Cirurgião', type: 'text' },
          { id: 'q30', label: 'Recomendações pós-operatórias — Anestesista', type: 'text' },
          { id: 'q31', label: 'Recomendações pós-operatórias — Enfermagem', type: 'text' },
          { id: 'q32', label: 'Responsável', type: 'text' },
        ],
      },
    ],
  },
  {
    id: '2',
    name: 'Triagem',
    questions: 10,
    entity: 'UBS',
    createdAt: '2026-04-16',
    type: 'template',
  },
  {
    id: '3',
    name: 'Avaliação Cardiovascular',
    questions: 14,
    entity: 'Hospital do Coração',
    createdAt: '2026-04-20',
    type: 'manual',
  },
];

  private readonly formsSubject = new BehaviorSubject<Form[]>(this.loadForms());
  readonly forms$: Observable<Form[]> = this.formsSubject.asObservable();

  private loadForms(): Form[] {
    const custom = this.storage.getItem<Form[]>('customForms') ?? [];
    return [...this.preInstalled, ...custom];
  }

  getForms(): Form[] {
    return this.formsSubject.value;
  }

  addForm(form: Omit<Form, 'id' | 'createdAt'>): void {
    const newForm: Form = {
      ...form,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const custom = this.storage.getItem<Form[]>('customForms') ?? [];
    custom.push(newForm);
    this.storage.setItem('customForms', custom);
    this.formsSubject.next([...this.preInstalled, ...custom]);
  }

  getFormById(id: string): Form | undefined {
    return this.formsSubject.value.find(f => f.id === id);
  }

  addFormInstance(instance: Omit<FormInstance, 'id' | 'createdAt'>): FormInstance {
    const newInstance: FormInstance = {
      ...instance,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const instances = this.storage.getItem<FormInstance[]>('formInstances') ?? [];
    instances.push(newInstance);
    this.storage.setItem('formInstances', instances);
    return newInstance;
  }

  searchForms(query: string): Form[] {
    if (!query.trim()) return this.formsSubject.value;
    const q = query.toLowerCase();
    return this.formsSubject.value.filter(
      f => f.name.toLowerCase().includes(q) || f.entity.toLowerCase().includes(q)
    );
  }
}
