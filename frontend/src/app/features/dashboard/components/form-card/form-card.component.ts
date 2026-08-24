import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFileText } from '@ng-icons/lucide';
import { TranslateModule } from '@ngx-translate/core';
import { Form } from '../../../../core/models/form.model';
import { LanguageService } from '../../../../core/services/language.service';
import { hoverScale } from '../../../../shared/animations/fade.animation';

@Component({
  selector: 'app-form-card',
  standalone: true,
  imports: [MatCardModule, NgIcon, TranslateModule],
  providers: [provideIcons({ lucideFileText })],
  templateUrl: './form-card.component.html',
  styleUrl: './form-card.component.css',
  animations: [hoverScale],
})
export class FormCardComponent {
  @Input({ required: true }) form!: Form;
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);

  hovered = false;

  navigate(): void {
    this.router.navigate(['/forms', this.form.id]);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(this.languageService.getCurrentLanguage(), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
