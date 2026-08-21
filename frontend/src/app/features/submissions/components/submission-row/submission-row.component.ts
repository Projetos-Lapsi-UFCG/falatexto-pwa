import { Component, Input, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { TranslateModule } from '@ngx-translate/core';
import { SubmissionOut } from '../../../../core/models/backend-form.model';
import { LanguageService } from '../../../../core/services/language.service';
import { LabeledEntry, toLabeledEntries } from '../../../../shared/utils/labeled-entries.util';
import { expandCollapse } from '../../../../shared/animations/fade.animation';
import { SubmissionDetailSectionComponent } from '../submission-detail-section/submission-detail-section.component';

@Component({
  selector: 'app-submission-row',
  standalone: true,
  imports: [MatCardModule, TranslateModule, NgIcon, SubmissionDetailSectionComponent],
  providers: [provideIcons({ lucideChevronDown })],
  templateUrl: './submission-row.component.html',
  styleUrl: './submission-row.component.css',
  animations: [expandCollapse],
})
export class SubmissionRowComponent {
  @Input({ required: true }) submission!: SubmissionOut;
  private readonly languageService = inject(LanguageService);

  expanded = false;

  toggle(): void {
    this.expanded = !this.expanded;
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString(this.languageService.getCurrentLanguage(), {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  get responsible(): string | undefined {
    return this.submission.closingData?.['responsible'] as string | undefined;
  }

  get patientDataEntries(): LabeledEntry[] {
    return toLabeledEntries(this.submission.patientData);
  }

  get answerEntries(): LabeledEntry[] {
    return toLabeledEntries(this.submission.answers);
  }

  get checkboxEntries(): LabeledEntry[] {
    return toLabeledEntries(this.submission.checkboxAnswers);
  }

  get closingDataEntries(): LabeledEntry[] {
    const { responsible: _responsible, ...rest } = this.submission.closingData ?? {};
    return toLabeledEntries(rest);
  }
}
