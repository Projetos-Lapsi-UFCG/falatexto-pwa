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

  addForm(form: Omit<Form, 'id' | 'createdAt'>): void {
    const newForm: Form = {
      ...form,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const custom = this.storage.getItem<Form[]>('customForms') ?? [];
    custom.push(newForm);
    this.storage.setItem('customForms', custom);
    this.formsSubject.next([...this.formsSubject.value, newForm]);
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