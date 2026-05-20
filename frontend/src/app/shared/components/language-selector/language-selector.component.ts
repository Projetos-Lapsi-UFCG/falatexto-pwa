import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [MatButtonModule, MatMenuModule],
  templateUrl: './language-selector.component.html',
  styleUrl: './language-selector.component.css',
})
export class LanguageSelectorComponent {
  private readonly languageService = inject(LanguageService);

  readonly languages = this.languageService.availableLanguages;
  readonly currentLang = toSignal(this.languageService.currentLang$, {
    initialValue: this.languageService.getCurrentLanguage(),
  });

  readonly currentLangObj = computed(() =>
    this.languages.find(l => l.code === this.currentLang())
  );

  onLanguageChange(lang: string): void {
    this.languageService.setLanguage(lang);
  }
}
