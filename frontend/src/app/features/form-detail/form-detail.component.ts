import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
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
import { TranslateModule } from '@ngx-translate/core';
import { FormService } from '../../core/services/form.service';
import { Form } from '../../core/models/form.model';
import { LanguageService } from '../../core/services/language.service';
import { LanguageSelectorComponent } from '../../shared/components/language-selector/language-selector.component';
import { FillFormDialogComponent } from './components/fill-form-dialog/fill-form-dialog.component';
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
  private readonly formService = inject(FormService);
  private readonly dialog = inject(MatDialog);
  private readonly languageService = inject(LanguageService);

  form: Form | null = null;
  notFound = false;

  readonly inputMethodInfo: Record<string, { labelKey: string; icon: string }> = {
    dictate: { labelKey: 'FORM_DETAIL.INPUT_METHODS.DICTATE', icon: 'lucideMic' },
    upload:  { labelKey: 'FORM_DETAIL.INPUT_METHODS.UPLOAD',  icon: 'lucideImage' },
    camera:  { labelKey: 'FORM_DETAIL.INPUT_METHODS.CAMERA',  icon: 'lucideCamera' },
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.form = this.formService.getFormById(id) ?? null;
      if (!this.form) this.notFound = true;
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  openFillDialog(): void {
    if (!this.form) return;
    this.dialog.open(FillFormDialogComponent, {
      data: { form: this.form },
      width: '420px',
      maxWidth: '95vw',
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(this.languageService.getCurrentLanguage(), {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
