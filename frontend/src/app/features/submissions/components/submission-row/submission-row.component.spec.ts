import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideTranslateService } from '@ngx-translate/core';
import { SubmissionRowComponent } from './submission-row.component';
import { SubmissionOut } from '../../../../core/models/backend-form.model';

describe('SubmissionRowComponent', () => {
  let fixture: ComponentFixture<SubmissionRowComponent>;
  let component: SubmissionRowComponent;

  const baseSubmission: SubmissionOut = {
    _id: 'sub_1',
    formId: 'form_003',
    formName: 'Intake Form',
    patientData: { birthDate: '2020-01-01' },
    answers: { q1_symptom: 'fever' },
    checkboxAnswers: { consentGiven: true },
    closingData: { responsible: 'Dra. Silva', date: '2026-08-20' },
    status: 'completed',
    entity: 'Clinic A',
    submittedAt: '2026-08-20T10:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmissionRowComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideTranslateService({ defaultLanguage: 'pt-BR' }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubmissionRowComponent);
    component = fixture.componentInstance;
  });

  function header(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.submission-row-header');
  }

  async function render(submission: SubmissionOut = baseSubmission): Promise<void> {
    component.submission = submission;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('should create', async () => {
    await render();
    expect(component).toBeTruthy();
  });

  it('is collapsed by default', async () => {
    await render();
    expect(component.expanded).toBe(false);
    expect(fixture.nativeElement.querySelector('.submission-row-detail')).toBeNull();
    expect(header().getAttribute('aria-expanded')).toBe('false');
  });

  it('expands on header click', async () => {
    await render();
    header().click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.expanded).toBe(true);
    expect(fixture.nativeElement.querySelector('.submission-row-detail')).not.toBeNull();
    expect(header().getAttribute('aria-expanded')).toBe('true');
  });

  it('collapses again on a second header click', async () => {
    await render();
    header().click();
    fixture.detectChanges();
    await fixture.whenStable();

    header().click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.expanded).toBe(false);
    expect(fixture.nativeElement.querySelector('.submission-row-detail')).toBeNull();
  });

  it('shows humanized patientData and answers entries when expanded', async () => {
    await render();
    header().click();
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Birth Date');
    expect(text).toContain('2020-01-01');
    expect(text).toContain('Q1 Symptom');
    expect(text).toContain('fever');
  });

  it('excludes responsible from the closing data section (already shown in the header)', async () => {
    await render();
    expect(component.closingDataEntries.map(e => e.key)).not.toContain('responsible');
    expect(component.closingDataEntries.map(e => e.key)).toContain('date');
  });

  it('falls back to the translated placeholder when responsible is missing', async () => {
    await render({ ...baseSubmission, closingData: { date: '2026-08-20' } });
    expect(component.responsible).toBeUndefined();
  });

  it('does not render a detail section for an empty data group', async () => {
    await render({ ...baseSubmission, checkboxAnswers: {} });
    expect(component.checkboxEntries).toEqual([]);
  });
});
