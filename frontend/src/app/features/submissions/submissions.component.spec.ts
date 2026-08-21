import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideTranslateService } from '@ngx-translate/core';
import { provideToastr } from 'ngx-toastr';
import { Router } from '@angular/router';
import { SubmissionsComponent } from './submissions.component';
import { API_BASE_URL } from '../../core/config/api.config';
import { SubmissionListOut, SubmissionOut } from '../../core/models/backend-form.model';

describe('SubmissionsComponent', () => {
  let fixture: ComponentFixture<SubmissionsComponent>;
  let component: SubmissionsComponent;
  let httpMock: HttpTestingController;

  const submissions: SubmissionOut[] = [
    {
      _id: 'sub_1',
      formId: 'form_003',
      formName: 'Intake Form',
      patientData: { birthDate: '2020-01-01' },
      answers: {},
      checkboxAnswers: {},
      closingData: { responsible: 'Dra. Silva' },
      status: 'completed',
      submittedAt: '2026-08-20T10:00:00Z',
    },
    {
      _id: 'sub_2',
      formId: 'form_004',
      formName: 'Follow-up Form',
      patientData: {},
      answers: {},
      checkboxAnswers: {},
      closingData: {},
      status: 'draft',
      submittedAt: '2026-08-19T10:00:00Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmissionsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideTranslateService({ defaultLanguage: 'pt-BR' }),
        provideToastr(),
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubmissionsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('stores the full submissions returned by the API, untrimmed', () => {
    const req = httpMock.expectOne(`${API_BASE_URL}/submissions`);
    req.flush({ submissions } satisfies SubmissionListOut);
    fixture.detectChanges();

    expect(component.submissions).toEqual(submissions);
    expect(fixture.nativeElement.querySelectorAll('app-submission-row').length).toBe(2);
  });
});
