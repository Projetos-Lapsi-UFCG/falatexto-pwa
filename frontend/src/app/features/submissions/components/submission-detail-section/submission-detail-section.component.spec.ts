import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { SubmissionDetailSectionComponent } from './submission-detail-section.component';

describe('SubmissionDetailSectionComponent', () => {
  let fixture: ComponentFixture<SubmissionDetailSectionComponent>;
  let component: SubmissionDetailSectionComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmissionDetailSectionComponent],
      providers: [provideTranslateService({ defaultLanguage: 'pt-BR' })],
    }).compileComponents();

    fixture = TestBed.createComponent(SubmissionDetailSectionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.titleKey = 'SUBMISSIONS.DETAIL.PATIENT_DATA';
    component.entries = [];
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders nothing when entries is empty', () => {
    component.titleKey = 'SUBMISSIONS.DETAIL.PATIENT_DATA';
    component.entries = [];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('renders a section with a dt/dd pair per entry', () => {
    component.titleKey = 'SUBMISSIONS.DETAIL.PATIENT_DATA';
    component.entries = [
      { key: 'birthDate', label: 'Birth Date', value: '2020-01-01' },
      { key: 'room', label: 'Room', value: '204' },
    ];
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('section');
    expect(section).not.toBeNull();
    expect(section.querySelector('h3').textContent).toContain('SUBMISSIONS.DETAIL.PATIENT_DATA');
    expect(section.querySelectorAll('dt').length).toBe(2);
    expect(section.querySelectorAll('dd').length).toBe(2);
    expect(section.querySelectorAll('dt')[0].textContent).toContain('Birth Date');
    expect(section.querySelectorAll('dd')[0].textContent).toContain('2020-01-01');
  });
});
