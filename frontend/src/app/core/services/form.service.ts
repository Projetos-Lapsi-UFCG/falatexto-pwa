import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StorageService } from './storage.service';
import { Form, FormInstance } from '../models/form.model';

@Injectable({ providedIn: 'root' })
export class FormService {
  private readonly storage = inject(StorageService);

  private readonly preInstalled: Form[] = [
    {
      id: '1',
      name: 'Cirugía Segura',
      questions: 32,
      entity: 'HUAC',
      createdAt: '2026-04-17',
      type: 'template',
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
