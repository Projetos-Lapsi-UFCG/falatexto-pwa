import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideTrash2 } from '@ng-icons/lucide';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SubmissionOut } from '../../../../core/models/backend-form.model';
import { Form } from '../../../../core/models/form.model';
import { LanguageService } from '../../../../core/services/language.service';
import { SubmissionService } from '../../../../core/services/submission';
import { LabeledEntry, toLabeledEntries } from '../../../../shared/utils/labeled-entries.util';
import { expandCollapse } from '../../../../shared/animations/fade.animation';
import { SubmissionDetailSectionComponent } from '../submission-detail-section/submission-detail-section.component';
import { buildAnswerEntries } from '../../utils/answer-entries.util';

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
  /** Formulário da submissão, carregado pelo pai. Usado para exibir o texto
   *  real das perguntas e das opções escolhidas (em vez dos ids brutos como
   *  "q_201" ou "solteiro_1"). Pode ser null se o form não carregar. */
  @Input() form: Form | null = null;
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
    responsible: 'SUBMISSIONS.DETAIL.FIELDS.RESPONSIBLE',
  };

  get responsible(): string | undefined {
    return this.submission.closingData?.['responsible'] as string | undefined;
  }

  get patientDataEntries(): LabeledEntry[] {
    return toLabeledEntries(this.submission.patientData, SubmissionRowComponent.PATIENT_DATA_LABEL_KEYS);
  }

  /** Respostas comuns e de caixas de seleção juntas, na ordem do formulário,
   *  com o texto da pergunta e o rótulo das opções escolhidas. */
  get answerEntries(): LabeledEntry[] {
    return buildAnswerEntries(this.form, this.submission.answers, this.submission.checkboxAnswers);
  }

  get closingDataEntries(): LabeledEntry[] {
    return toLabeledEntries(this.submission.closingData, SubmissionRowComponent.CLOSING_DATA_LABEL_KEYS);
  }
}
