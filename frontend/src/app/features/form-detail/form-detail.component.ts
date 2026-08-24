import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideClipboardList,
  lucideBuilding2,
  lucideCalendar,
  lucideHash,
  lucideMic,
  lucideImage,
  lucideCamera,
  lucideFileText,
} from '@ng-icons/lucide';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { FormApiService } from '../../core/services/form-api.service';
import { Form } from '../../core/models/form.model';
import { LanguageService } from '../../core/services/language.service';
import { LanguageSelectorComponent } from '../../shared/components/language-selector/language-selector.component';
import { fadeIn, scaleIn } from '../../shared/animations/fade.animation';

@Component({
  selector: 'app-form-detail',
  standalone: true,
  imports: [MatButtonModule, NgIcon, TranslateModule, LanguageSelectorComponent],
  providers: [
    provideIcons({
      lucideArrowLeft,
      lucideClipboardList,
      lucideBuilding2,
      lucideCalendar,
      lucideHash,
      lucideMic,
      lucideImage,
      lucideCamera,
      lucideFileText,
    }),
  ],
  templateUrl: './form-detail.component.html',
  styleUrl: './form-detail.component.css',
  animations: [fadeIn, scaleIn],
})
export class FormDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formApiService = inject(FormApiService);
  private readonly languageService = inject(LanguageService);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  form: Form | null = null;
  notFound = false;
  loading = true;

  readonly inputMethodInfo: Record<string, { labelKey: string; icon: string }> = {
    dictate: { labelKey: 'FORM_DETAIL.INPUT_METHODS.DICTATE', icon: 'lucideMic' },
    upload:  { labelKey: 'FORM_DETAIL.INPUT_METHODS.UPLOAD',  icon: 'lucideImage' },
    camera:  { labelKey: 'FORM_DETAIL.INPUT_METHODS.CAMERA',  icon: 'lucideCamera' },
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      this.notFound = true;
      return;
    }

    this.formApiService.getFormById(id).subscribe({
      next: form => {
        this.form = form;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        if (err.status === 404) {
          this.notFound = true;
        } else {
          this.toastr.error(this.translate.instant('FORM_DETAIL.ERRORS.LOAD_FAILED'));
        }
        this.cdr.markForCheck();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  openFillDialog(): void {
    if (!this.form) return;
    this.router.navigate(['/forms', this.form.id, 'fill']);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(this.languageService.getCurrentLanguage(), {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
