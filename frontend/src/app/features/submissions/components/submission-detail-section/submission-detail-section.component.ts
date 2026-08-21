import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LabeledEntry } from '../../../../shared/utils/labeled-entries.util';
import { DisplayValuePipe } from '../../../../shared/pipes/display-value.pipe';

@Component({
  selector: 'app-submission-detail-section',
  standalone: true,
  imports: [TranslateModule, DisplayValuePipe],
  templateUrl: './submission-detail-section.component.html',
  styleUrl: './submission-detail-section.component.css',
})
export class SubmissionDetailSectionComponent {
  @Input({ required: true }) titleKey!: string;
  @Input({ required: true }) entries: LabeledEntry[] = [];
}
