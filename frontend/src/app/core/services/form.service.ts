import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { StorageService } from './storage.service';
import { Form, FormInstance, QuestionField, FieldOption, Section } from '../models/form.model';
import { ApiQuestion, ApiQuestionType, ApiSection, ApiSectionsResponse, ApiQuestionsResponse } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class FormService {
  private readonly storage = inject(StorageService);
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:8000';

  private readonly formsSubject = new BehaviorSubject<Form[]>([]);
  readonly forms$: Observable<Form[]> = this.formsSubject.asObservable();

  /**
   * Busca os formulários do backend e atualiza a lista ao vivo.
   * Deve ser chamado quando o app inicializa.
   */
  loadFormsFromApi(): void {
    this.http.get<any>(`${this.apiUrl}/forms`).subscribe({
      next: (response) => {
        // O backend retorna { forms: [...] }
        const formsFromApi = response.forms ?? [];

        // Converte o formato do backend para o formato do frontend
        const converted: Form[] = formsFromApi.map((f: any) => ({
          id: f._id,
          name: f.name,
          questions: 0,
          entity: 'Backend',
          createdAt: new Date().toISOString(),
          type: 'template' as const,
        }));

        // Junta com os formulários criados pelo usuário localmente
        const custom = this.storage.getItem<Form[]>('customForms') ?? [];
        this.formsSubject.next([...converted, ...custom]);
      },
      error: (err) => {
        console.error('Erro ao buscar formulários do backend:', err);
        // Se falhar, carrega só os criados pelo usuário
        const custom = this.storage.getItem<Form[]>('customForms') ?? [];
        this.formsSubject.next(custom);
      },
    });
  }

  getForms(): Form[] {
    return this.formsSubject.value;
  }

  /**
   * Gera o próximo id sequencial no padrão form_XXX.
   * Olha todos os formulários já existentes, encontra o maior número
   * e devolve esse número + 1, formatado com 3 dígitos.
   */
  private generateNextFormId(): string {
    // 1. Pega a lista de formulários que já temos em memória
    const forms = this.formsSubject.value;

    // 2. Descobre qual é o maior número já usado.
    //    Começa em 0 para que, se não houver nenhum, o primeiro seja form_001.
    let maiorNumero = 0;

    for (const form of forms) {
      // Só nos interessam ids que seguem o padrão form_XXX (3 dígitos).
      // O ^ marca o início e o $ marca o fim, então "form_12" ou
      // "abc_form_003" não passam — precisa ser exatamente o formato.
      if (!/^form_\d{3}$/.test(form.id)) {
        continue; // ignora esse id e vai para o próximo
      }

      // 3. Tira o prefixo "form_" e converte o resto para número.
      //    "form_003" -> "003" -> 3
      //    O 10 no parseInt diz "interprete na base decimal".
      const numero = parseInt(form.id.replace('form_', ''), 10);

      // 4. Se esse número for maior que o maior encontrado até agora, atualiza
      if (numero > maiorNumero) {
        maiorNumero = numero;
      }
    }

    // 5. O próximo é o maior + 1
    const proximoNumero = maiorNumero + 1;

    // 6. Converte de volta para texto com 3 dígitos.
    //    padStart(3, '0') significa: "complete com zeros à esquerda
    //    até o texto ter 3 caracteres". 4 -> "4" -> "004"
    const numeroFormatado = String(proximoNumero).padStart(3, '0');

    return `form_${numeroFormatado}`;
  }
  /**
   * Tabela de tradução: tipo do backend -> tipo do frontend.
   * Fica como propriedade da classe porque é informação fixa, não muda nunca.
   */
  private readonly mapaDeTipos: Record<ApiQuestionType, QuestionField['type']> = {
    ABERTA: 'text',
    ESTIMULADA: 'radio_group',
    MULTIPLA: 'checkbox_group',
    COMPOSTA: 'radio_with_fields',
  };

  /**
   * Converte UMA pergunta do formato do backend para o formato do frontend.
   * Este é o coração da tradução (DTO).
   */
  private converterPergunta(apiQuestion: ApiQuestion): QuestionField {
    // 1. Traduz o tipo usando a tabela.
    //    Se vier um tipo desconhecido, cai em 'text' como segurança.
    const tipo = this.mapaDeTipos[apiQuestion.type] ?? 'text';

    // 2. Converte as opções.
    //    Backend:  { label: "Feminino", value: "F" }
    //    Frontend: { id: "F", label: "Feminino" }
    //    Ou seja, o "value" do backend vira o "id" do frontend.
    const opcoes: FieldOption[] = (apiQuestion.options ?? []).map(opt => ({
      id: opt.value,
      label: opt.label,
    }));

    // 3. Monta a pergunta no formato do frontend
    const pergunta: QuestionField = {
      id: apiQuestion._id,
      label: apiQuestion.title,
      type: tipo,
    };

    // 4. Só adiciona "options" se houver alguma.
    //    Perguntas ABERTA não têm opções, e um array vazio
    //    pode confundir a renderização na tela.
    if (opcoes.length > 0) {
      pergunta.options = opcoes;
    }

    return pergunta;
  }

  /**
   * Converte uma lista inteira de perguntas de uma vez.
   */
  private converterPerguntas(apiQuestions: ApiQuestion[]): QuestionField[] {
    return (apiQuestions ?? []).map(q => this.converterPergunta(q));
  }

  /**
   * Converte UMA seção do formato do backend para o formato do frontend.
   * Recebe as perguntas já convertidas, porque elas vêm de outra chamada HTTP.
   */
  private converterSecao(apiSection: ApiSection, perguntas: QuestionField[]): Section {
    return {
      id: apiSection._id,
      name: apiSection.title,
      questions: perguntas,
    };
  }
  /**
   * Busca UM formulário completo do backend, com todas as suas seções
   * e perguntas já convertidas para o formato do frontend.
   *
   * Faz três níveis de chamada:
   *   1. GET /forms/{id}           -> dados básicos do formulário
   *   2. GET /forms/{id}/sections  -> as seções
   *   3. GET /sections/{id}/questions -> as perguntas de CADA seção (em paralelo)
   *
   * Devolve um Observable — quem chamar precisa dar .subscribe().
   */
  loadFormDetail(formId: string): Observable<Form> {
    return new Observable<Form>(observer => {
      // ETAPA 1: busca os dados básicos do formulário
      this.http.get<any>(`${this.apiUrl}/forms/${formId}`).subscribe({
        next: (formData) => {

          // ETAPA 2: busca as seções desse formulário
          this.http.get<ApiSectionsResponse>(`${this.apiUrl}/forms/${formId}/sections`).subscribe({
            next: (sectionsResponse) => {
              const apiSections = sectionsResponse.sections ?? [];

              // Se o formulário não tem nenhuma seção, já terminamos.
              if (apiSections.length === 0) {
                observer.next({
                  id: formData._id,
                  name: formData.name,
                  questions: 0,
                  entity: 'Backend',
                  createdAt: new Date().toISOString(),
                  type: 'template',
                  sections: [],
                });
                observer.complete();
                return;
              }

              // ETAPA 3: monta UMA chamada HTTP para cada seção.
              // Ainda não executa nada — só prepara a lista de "pedidos".
              const pedidosDePerguntas = apiSections.map(secao =>
                this.http.get<ApiQuestionsResponse>(
                  `${this.apiUrl}/sections/${secao._id}/questions`
                )
              );

              // O forkJoin dispara todos os pedidos em paralelo e só
              // devolve quando TODOS responderem.
              forkJoin(pedidosDePerguntas).subscribe({
                next: (respostas) => {
                  // respostas[0] são as perguntas de apiSections[0], e assim por diante.
                  // Por isso usamos o índice para casar seção com suas perguntas.
                  const secoesConvertidas: Section[] = apiSections.map((secao, indice) => {
                    const perguntasDaApi = respostas[indice].questions ?? [];
                    const perguntasConvertidas = this.converterPerguntas(perguntasDaApi);
                    return this.converterSecao(secao, perguntasConvertidas);
                  });

                  // Conta o total de perguntas somando as de todas as seções
                  const totalDePerguntas = secoesConvertidas.reduce(
                    (soma, secao) => soma + secao.questions.length,
                    0
                  );

                  // Monta o formulário completo no formato do frontend
                  const formCompleto: Form = {
                    id: formData._id,
                    name: formData.name,
                    questions: totalDePerguntas,
                    entity: 'Backend',
                    createdAt: new Date().toISOString(),
                    type: 'template',
                    sections: secoesConvertidas,
                  };

                  observer.next(formCompleto);
                  observer.complete();
                },
                error: (err) => observer.error(err),
              });
            },
            error: (err) => observer.error(err),
          });
        },
        error: (err) => observer.error(err),
      });
    });
  }
  /**
   * Cria um novo formulário no backend.
   * Método: POST
   * Rota: /forms
   */
  addForm(form: Omit<Form, 'id' | 'createdAt'>): void {
    // Monta o objeto no formato que o backend espera
    const payload = {
      id: this.generateNextFormId(),
      name: form.name,
      metadata: {
        active: true,
        version: '1.0'
      },
      sections: []
    };

    // Envia para o backend
    this.http.post<any>(`${this.apiUrl}/forms`, payload).subscribe({
      next: () => {
        // Recarrega a lista do backend após criar
        this.loadFormsFromApi();
      },
      error: (err) => {
        console.error('Erro ao criar formulário no backend:', err);
      }
    });
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

  /**
   * Deleta um formulário pelo id no backend.
   * Método: DELETE
   * Rota: /forms/{form_id}
   */
  deleteForm(id: string): void {
    this.http.delete<any>(`${this.apiUrl}/forms/${id}`).subscribe({
      next: () => {
        // Recarrega a lista do backend após deletar
        this.loadFormsFromApi();
      },
      error: (err) => {
        console.error('Erro ao deletar formulário no backend:', err);
      }
    });
  }

  searchForms(query: string): Form[] {
    if (!query.trim()) return this.formsSubject.value;
    const q = query.toLowerCase();
    return this.formsSubject.value.filter(
      f => f.name.toLowerCase().includes(q) || f.entity.toLowerCase().includes(q)
    );
  }
}