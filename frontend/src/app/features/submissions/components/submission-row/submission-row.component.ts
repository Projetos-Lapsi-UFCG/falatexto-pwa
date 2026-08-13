import { Component, Input, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';
import { SubmissionListItem } from '../../../../core/models/submission-view.model';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-submission-row',
  standalone: true,
  imports: [MatCardModule, TranslateModule],
  templateUrl: './submission-row.component.html',
  styleUrl: './submission-row.component.css',
})
export class SubmissionRowComponent {
  @Input({ required: true }) submission!: SubmissionListItem;
  private readonly languageService = inject(LanguageService);

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString(this.languageService.getCurrentLanguage(), {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }
}
