import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideClipboardList } from '@ng-icons/lucide';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SubmissionService } from '../../core/services/submission';
import { SubmissionOut } from '../../core/models/backend-form.model';
import { SubmissionListItem } from '../../core/models/submission-view.model';
import { LanguageSelectorComponent } from '../../shared/components/language-selector/language-selector.component';
import { SubmissionRowComponent } from './components/submission-row/submission-row.component';
import { fadeIn, staggerFade } from '../../shared/animations/fade.animation';

@Component({
  selector: 'app-submissions',
  standalone: true,
  imports: [
    MatButtonModule,
    NgIcon,
    TranslateModule,
    LanguageSelectorComponent,
    SubmissionRowComponent,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideClipboardList })],
  templateUrl: './submissions.component.html',
  styleUrl: './submissions.component.css',
  animations: [fadeIn, staggerFade],
})
export class SubmissionsComponent implements OnInit {
  private readonly submissionService = inject(SubmissionService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  submissions: SubmissionListItem[] = [];
  loading = true;

  ngOnInit(): void {
    this.loadSubmissions();
  }

  private loadSubmissions(): void {
    this.loading = true;
    this.submissionService.listSubmissions().subscribe({
      next: submissions => {
        this.submissions = submissions.map(s => this.toListItem(s));
        this.loading = false;
        // App é zoneless — sem isso, a view não re-renderiza após o retorno assíncrono.
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.toastr.error(this.translate.instant('SUBMISSIONS.ERRORS.LOAD_FAILED'));
        this.cdr.markForCheck();
      },
    });
  }

  private toListItem(s: SubmissionOut): SubmissionListItem {
    return {
      id: s._id,
      formName: s.formName || s.formId,
      submittedAt: s.submittedAt,
      responsible:
        (s.closingData?.['responsible'] as string | undefined) ||
        this.translate.instant('SUBMISSIONS.RESPONSIBLE_FALLBACK'),
    };
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
