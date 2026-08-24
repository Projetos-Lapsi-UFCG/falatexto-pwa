import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SubmissionService } from './submission';
import { API_BASE_URL } from '../config/api.config';
import { SubmissionCreate } from '../models/backend-form.model';

describe('SubmissionService', () => {
  let service: SubmissionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SubmissionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('salvarRespostas posts to /api/v1/submissions', () => {
    const dados: SubmissionCreate = {
      formId: 'form_003',
      patientData: { name: 'Teste' },
      answers: {},
      checkboxAnswers: {},
      closingData: {},
    };

    service.salvarRespostas(dados).subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/submissions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dados);
    req.flush({
      _id: 'sub_1',
      formId: 'form_003',
      patientData: {},
      answers: {},
      checkboxAnswers: {},
      closingData: {},
      status: 'completed',
      submittedAt: '2026-08-11T00:00:00Z',
    });
  });
});
