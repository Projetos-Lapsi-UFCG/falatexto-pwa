import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCamera,
  lucideMic,
  lucideGrid3X3,
  lucideZap,
  lucideShield,
  lucideFileText,
  lucideX,
} from '@ng-icons/lucide';
import { TranslateModule } from '@ngx-translate/core';
import { fadeIn } from '../../shared/animations/fade.animation';
import { StorageService } from '../../core/services/storage.service';
import { LanguageSelectorComponent } from '../../shared/components/language-selector/language-selector.component';

interface Feature {
  icon: string;
  titleKey: string;
  descKey: string;
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [MatButtonModule, MatCheckboxModule, FormsModule, NgIcon, TranslateModule, LanguageSelectorComponent],
  providers: [
    provideIcons({
      lucideCamera,
      lucideMic,
      lucideGrid3X3,
      lucideZap,
      lucideShield,
      lucideFileText,
      lucideX,
    }),
  ],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.css',
  animations: [fadeIn],
})
export class OnboardingComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);

  skipNextTime = false;

  // Índice do slide atual
  currentSlide = 0;

  // Referência do intervalo para poder cancelar quando sair da tela
  private autoplayInterval: ReturnType<typeof setInterval> | null = null;

  readonly features: Feature[] = [
    { icon: 'lucideCamera',   titleKey: 'ONBOARDING.FEATURES.IMAGE_TO_FORM.TITLE',      descKey: 'ONBOARDING.FEATURES.IMAGE_TO_FORM.DESCRIPTION' },
    { icon: 'lucideMic',      titleKey: 'ONBOARDING.FEATURES.VOICE_DICTATION.TITLE',    descKey: 'ONBOARDING.FEATURES.VOICE_DICTATION.DESCRIPTION' },
    { icon: 'lucideGrid3X3',  titleKey: 'ONBOARDING.FEATURES.SMART_ORGANIZATION.TITLE', descKey: 'ONBOARDING.FEATURES.SMART_ORGANIZATION.DESCRIPTION' },
    { icon: 'lucideZap',      titleKey: 'ONBOARDING.FEATURES.QUICK_ACCESS.TITLE',       descKey: 'ONBOARDING.FEATURES.QUICK_ACCESS.DESCRIPTION' },
    { icon: 'lucideShield',   titleKey: 'ONBOARDING.FEATURES.SECURE_STORAGE.TITLE',     descKey: 'ONBOARDING.FEATURES.SECURE_STORAGE.DESCRIPTION' },
    { icon: 'lucideFileText', titleKey: 'ONBOARDING.FEATURES.MULTI_FORMAT.TITLE',       descKey: 'ONBOARDING.FEATURES.MULTI_FORMAT.DESCRIPTION' },
  ];

  // Total de slides: 1 (logo) + features
  get totalSlides(): number {
    return 1 + this.features.length;
  }

  ngOnInit(): void {
    if (this.storage.getItem<boolean>('skipOnboarding')) {
      this.router.navigate(['/login']);
    }
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  startAutoplay(): void {
    this.stopAutoplay();
    this.autoplayInterval = setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
    }, 6000);
  }

  stopAutoplay(): void {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
    }
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
    this.stopAutoplay();
    this.startAutoplay();
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
  }

  handleContinue(): void {
    if (this.skipNextTime) {
      this.storage.setItem('skipOnboarding', true);
    }
    this.router.navigate(['/login']);
  }

  handleExit(): void {
    this.router.navigate(['/login']);
  }
}