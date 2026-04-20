import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { StorageService } from './storage.service';

export interface LanguageOption {
  code: string;
  label: string;
  flag: string;
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly storage = inject(StorageService);
  private readonly translate = inject(TranslateService);

  private static readonly STORAGE_KEY = 'appLanguage';
  private static readonly DEFAULT = 'pt-BR';

  readonly availableLanguages: readonly LanguageOption[] = [
    { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
    { code: 'es',    label: 'Español',   flag: '🇪🇸' },
    { code: 'en',    label: 'English',   flag: '🇺🇸' },
  ];

  private readonly langSubject: BehaviorSubject<string>;
  readonly currentLang$: Observable<string>;

  constructor() {
    this.translate.addLangs(['pt-BR', 'es', 'en']);
    this.translate.setDefaultLang(LanguageService.DEFAULT);
    const saved = this.storage.getItem<string>(LanguageService.STORAGE_KEY) ?? LanguageService.DEFAULT;
    this.langSubject = new BehaviorSubject<string>(saved);
    this.currentLang$ = this.langSubject.asObservable();
    this.translate.use(saved);
  }

  setLanguage(lang: string): void {
    if (!this.translate.getLangs().includes(lang)) return;
    this.translate.use(lang);
    this.storage.setItem(LanguageService.STORAGE_KEY, lang);
    this.langSubject.next(lang);
  }

  getCurrentLanguage(): string {
    return this.langSubject.value;
  }
}
