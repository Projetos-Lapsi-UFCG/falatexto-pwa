import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideClipboardList } from '@ng-icons/lucide';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SubmissionService } from '../../core/services/submission';
import { FormApiService } from '../../core/services/form-api.service';
import { SubmissionOut } from '../../core/models/backend-form.model';
import { LanguageSelectorComponent } from '../../shared/components/language-selector/language-selector.component';
import { SubmissionRowComponent } from './components/submission-row/submission-row.component';
import { buildQuestionLabelMap } from './utils/question-label-map.util';
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
  private readonly route = inject(ActivatedRoute);
  private readonly submissionService = inject(SubmissionService);
  private readonly formApiService = inject(FormApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  submissions: SubmissionOut[] = [];
  loading = true;
  formId: string | null = null;
  formName: string | null = null;
  questionLabels: Record<string, string> = {};

  ngOnInit(): void {
    this.formId = this.route.snapshot.paramMap.get('id');
    if (this.formId) {
      this.formApiService.getFormById(this.formId).subscribe({
        next: form => {
          this.formName = form.name;
          this.questionLabels = buildQuestionLabelMap(form);
          this.cdr.markForCheck();
        },
        // Se o form não puder ser carregado (ex.: 404), a lista de submissões
        // ainda é exibida normalmente — só o título e os rótulos de pergunta
        // ficam sem o texto real (caem no fallback humanizado do id).
        error: () => {},
      });
    }
    this.loadSubmissions();
  }

  private loadSubmissions(): void {
    this.loading = true;
    this.submissionService.listSubmissions(this.formId ?? undefined).subscribe({
      next: submissions => {
        this.submissions = submissions;
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

  goBack(): void {
    if (this.formId) {
      this.router.navigate(['/forms', this.formId]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmissionDeleted(id: string): void {
    this.submissions = this.submissions.filter(s => s._id !== id);
    this.cdr.markForCheck();
  }
}
