import { Component, OnInit, inject } from '@angular/core';
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
  lucideHeadphones,
  lucideX,
} from '@ng-icons/lucide';
import { TranslateModule } from '@ngx-translate/core';
import { fadeIn, staggerFade } from '../../shared/animations/fade.animation';
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
      lucideHeadphones,
      lucideX,
    }),
  ],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.css',
  animations: [fadeIn, staggerFade],
})
export class OnboardingComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);

  skipNextTime = false;

  readonly features: Feature[] = [
    { icon: 'lucideCamera',   titleKey: 'ONBOARDING.FEATURES.IMAGE_TO_FORM.TITLE',      descKey: 'ONBOARDING.FEATURES.IMAGE_TO_FORM.DESCRIPTION' },
    { icon: 'lucideMic',      titleKey: 'ONBOARDING.FEATURES.VOICE_DICTATION.TITLE',    descKey: 'ONBOARDING.FEATURES.VOICE_DICTATION.DESCRIPTION' },
    { icon: 'lucideGrid3X3',  titleKey: 'ONBOARDING.FEATURES.SMART_ORGANIZATION.TITLE', descKey: 'ONBOARDING.FEATURES.SMART_ORGANIZATION.DESCRIPTION' },
    { icon: 'lucideZap',      titleKey: 'ONBOARDING.FEATURES.QUICK_ACCESS.TITLE',       descKey: 'ONBOARDING.FEATURES.QUICK_ACCESS.DESCRIPTION' },
    { icon: 'lucideShield',   titleKey: 'ONBOARDING.FEATURES.SECURE_STORAGE.TITLE',     descKey: 'ONBOARDING.FEATURES.SECURE_STORAGE.DESCRIPTION' },
    { icon: 'lucideFileText', titleKey: 'ONBOARDING.FEATURES.MULTI_FORMAT.TITLE',       descKey: 'ONBOARDING.FEATURES.MULTI_FORMAT.DESCRIPTION' },
  ];

  ngOnInit(): void {
    if (this.storage.getItem<boolean>('skipOnboarding')) {
      this.router.navigate(['/login']);
    }
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
