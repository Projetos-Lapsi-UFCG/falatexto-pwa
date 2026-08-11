import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormApiService } from './form-api.service';
import { API_BASE_URL } from '../config/api.config';

describe('FormApiService', () => {
  let service: FormApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FormApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listForms() normalizes _id -> id and fills in placeholder fields', () => {
    let result: any;
    service.listForms().subscribe(forms => (result = forms));

    httpMock.expectOne(`${API_BASE_URL}/forms`).flush({
      forms: [
        {
          _id: 'form_001',
          name: 'Protocolo de Cirurgia Cardíaca',
          metadata: { version: '1.0', active: true },
          questionCount: 3,
        },
      ],
    });

    expect(result).toEqual([
      { id: 'form_001', name: 'Protocolo de Cirurgia Cardíaca', questions: 3, entity: '', createdAt: expect.any(String) },
    ]);
  });

  it('getFormById() assembles a full Form from the form/sections/questions chain', () => {
    let result: any;
    service.getFormById('form_001').subscribe(form => (result = form));

    httpMock.expectOne(`${API_BASE_URL}/forms/form_001`).flush({
      _id: 'form_001',
      name: 'Protocolo de Cirurgia Cardíaca',
      sections: ['sec_101'],
      metadata: { version: '1.0', active: true },
    });

    httpMock.expectOne(`${API_BASE_URL}/forms/form_001/sections`).flush({
      form_id: 'form_001',
      sections: [
        {
          _id: 'sec_101',
          title: 'Dados Pré-Operatórios',
          parentItem: 'form_001',
          subSections: [],
          questions: ['q_201'],
          tags: [],
        },
      ],
    });

    httpMock.expectOne(`${API_BASE_URL}/sections/sec_101/questions`).flush({
      section_id: 'sec_101',
      questions: [
        {
          _id: 'q_201',
          parentItem: 'sec_101',
          title: 'O paciente possui alergias?',
          type: 'ESTIMULADA',
          options: [
            { label: 'Sim', value: 'sim' },
            { label: 'Não', value: 'nao' },
          ],
          compositeFields: [],
          inputFormat: null,
        },
      ],
    });

    expect(result.id).toBe('form_001');
    expect(result.sections.length).toBe(1);
    expect(result.sections[0].name).toBe('Dados Pré-Operatórios');
    expect(result.sections[0].questions.length).toBe(1);
    // {Sim, Não} matches the canonical boolean option-set, so it round-trips to 'boolean'
    // (not the generic 'radio_group') — see BOOLEAN_OPTIONS in form-mapper.ts.
    expect(result.sections[0].questions[0].type).toBe('boolean');
    expect(result.sections[0].questions[0].id).toBe('q_201');
  });

  it('getFormById() handles a form with zero sections without hanging', () => {
    let result: any;
    service.getFormById('form_002').subscribe(form => (result = form));

    httpMock.expectOne(`${API_BASE_URL}/forms/form_002`).flush({
      _id: 'form_002',
      name: 'Novo prontuário',
      sections: [],
      metadata: { version: '1.0', active: true },
    });

    httpMock.expectOne(`${API_BASE_URL}/forms/form_002/sections`).flush({ form_id: 'form_002', sections: [] });

    expect(result.id).toBe('form_002');
    expect(result.sections).toEqual([]);
  });

  it('createForm() picks the next form_NNN id after the existing max', () => {
    let result: any;
    service.createForm('Novo Formulário').subscribe(form => (result = form));

    httpMock.expectOne(`${API_BASE_URL}/forms`).flush({
      forms: [
        { _id: 'form_001', name: 'A', metadata: { version: '1.0', active: true } },
        { _id: 'form_003', name: 'B', metadata: { version: '1.0', active: true } },
      ],
    });

    const postReq = httpMock.expectOne(`${API_BASE_URL}/forms`);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      id: 'form_004',
      name: 'Novo Formulário',
      sections: [],
      metadata: { version: '1.0', active: true },
    });
    postReq.flush({ _id: 'form_004', name: 'Novo Formulário', sections: [], metadata: { version: '1.0', active: true } });

    expect(result.id).toBe('form_004');
  });

  it('createForm() starts at form_001 when no forms exist yet', () => {
    let result: any;
    service.createForm('Primeiro').subscribe(form => (result = form));

    httpMock.expectOne(`${API_BASE_URL}/forms`).flush({ forms: [] });

    const postReq = httpMock.expectOne(`${API_BASE_URL}/forms`);
    expect(postReq.request.body).toEqual({
      id: 'form_001',
      name: 'Primeiro',
      sections: [],
      metadata: { version: '1.0', active: true },
    });
    postReq.flush({ _id: 'form_001', name: 'Primeiro', sections: [], metadata: { version: '1.0', active: true } });

    expect(result.id).toBe('form_001');
  });
});
