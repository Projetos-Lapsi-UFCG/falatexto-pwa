import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { StorageService } from './storage.service';
import { Form, FormInstance } from '../models/form.model';

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
   * Cria um novo formulário no backend.
   * Método: POST
   * Rota: /forms
   */
  addForm(form: Omit<Form, 'id' | 'createdAt'>): void {
    // Monta o objeto no formato que o backend espera
    const payload = {
      id: `form_${String(Date.now() % 1000).padStart(3, '0')}`,
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