import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideTrash2 } from '@ng-icons/lucide';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SubmissionOut } from '../../../../core/models/backend-form.model';
import { LanguageService } from '../../../../core/services/language.service';
import { SubmissionService } from '../../../../core/services/submission';
import { LabeledEntry, toLabeledEntries } from '../../../../shared/utils/labeled-entries.util';
import { expandCollapse } from '../../../../shared/animations/fade.animation';
import { SubmissionDetailSectionComponent } from '../submission-detail-section/submission-detail-section.component';

@Component({
  selector: 'app-submission-row',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, TranslateModule, NgIcon, SubmissionDetailSectionComponent],
  providers: [provideIcons({ lucideChevronDown, lucideTrash2 })],
  templateUrl: './submission-row.component.html',
  styleUrl: './submission-row.component.css',
  animations: [expandCollapse],
})
export class SubmissionRowComponent {
  @Input({ required: true }) submission!: SubmissionOut;
  /** Mapa id da pergunta/opção -> texto real da pergunta, montado pelo pai a
   *  partir do formulário. Usado para trocar as chaves brutas de answers/
   *  checkboxAnswers (ex.: "q_201") pela pergunta de verdade. */
  @Input() questionLabels: Record<string, string> = {};
  @Output() deleted = new EventEmitter<string>();

  private readonly languageService = inject(LanguageService);
  private readonly submissionService = inject(SubmissionService);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);

  expanded = false;
  deleting = false;

  toggle(): void {
    this.expanded = !this.expanded;
  }

  deleteSubmission(): void {
    if (this.deleting) return;

    const confirmado = confirm(
      this.translate.instant('SUBMISSIONS.DETAIL.DELETE_CONFIRM', {
        name: this.submission.formName || this.submission.formId,
      })
    );
    if (!confirmado) return;

    this.deleting = true;
    this.submissionService.deleteSubmission(this.submission._id).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('SUBMISSIONS.DETAIL.DELETE_SUCCESS'));
        this.deleted.emit(this.submission._id);
      },
      error: () => {
        this.deleting = false;
        this.toastr.error(this.translate.instant('SUBMISSIONS.ERRORS.DELETE_FAILED'));
      },
    });
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString(this.languageService.getCurrentLanguage(), {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  // Campos fixos de dados do paciente/encerramento (preenchidos em form-fill.ts) —
  // têm rótulo traduzível, ao contrário das perguntas dinâmicas do formulário.
  private static readonly PATIENT_DATA_LABEL_KEYS: Record<string, string> = {
    name: 'SUBMISSIONS.DETAIL.FIELDS.NAME',
    birthDate: 'SUBMISSIONS.DETAIL.FIELDS.BIRTH_DATE',
    record: 'SUBMISSIONS.DETAIL.FIELDS.RECORD',
    room: 'SUBMISSIONS.DETAIL.FIELDS.ROOM',
  };

  private static readonly CLOSING_DATA_LABEL_KEYS: Record<string, string> = {
    date: 'SUBMISSIONS.DETAIL.FIELDS.DATE',
  };

  get responsible(): string | undefined {
    return this.submission.closingData?.['responsible'] as string | undefined;
  }

  get patientDataEntries(): LabeledEntry[] {
    return toLabeledEntries(this.submission.patientData, SubmissionRowComponent.PATIENT_DATA_LABEL_KEYS);
  }

  get answerEntries(): LabeledEntry[] {
    return this.withQuestionLabels(toLabeledEntries(this.submission.answers));
  }

  get checkboxEntries(): LabeledEntry[] {
    return this.withQuestionLabels(toLabeledEntries(this.submission.checkboxAnswers));
  }

  /** Troca o label humanizado (ex.: "Q 201") pelo texto real da pergunta,
   *  quando disponível em questionLabels. */
  private withQuestionLabels(entries: LabeledEntry[]): LabeledEntry[] {
    return entries.map(entry => ({
      ...entry,
      label: this.questionLabels[entry.key] ?? entry.label,
    }));
  }

  get closingDataEntries(): LabeledEntry[] {
    const { responsible: _responsible, ...rest } = this.submission.closingData ?? {};
    return toLabeledEntries(rest, SubmissionRowComponent.CLOSING_DATA_LABEL_KEYS);
  }
}
