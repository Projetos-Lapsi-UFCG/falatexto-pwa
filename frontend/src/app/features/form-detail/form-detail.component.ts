import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  lucideTrash2,
} from '@ng-icons/lucide';
import { TranslateModule } from '@ngx-translate/core';
import { FormService } from '../../core/services/form.service';
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
      lucideTrash2,
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
  private readonly languageService = inject(LanguageService);
  private readonly cdr = inject(ChangeDetectorRef);

  form: Form | null = null;
  notFound = false;

  readonly inputMethodInfo: Record<string, { labelKey: string; icon: string }> = {
    dictate: { labelKey: 'FORM_DETAIL.INPUT_METHODS.DICTATE', icon: 'lucideMic' },
    upload:  { labelKey: 'FORM_DETAIL.INPUT_METHODS.UPLOAD',  icon: 'lucideImage' },
    camera:  { labelKey: 'FORM_DETAIL.INPUT_METHODS.CAMERA',  icon: 'lucideCamera' },
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.notFound = true;
      return;
    }

    // 1. Mostra o que já temos em memória, para a tela não ficar vazia
    //    enquanto o backend responde.
    this.form = this.formService.getFormById(id) ?? null;

    // 2. Busca a versão completa (com seções e perguntas) no backend.
    this.formService.loadFormDetail(id).subscribe({
      next: (formCompleto) => {
        this.form = formCompleto;
        this.notFound = false;
        this.cdr.detectChanges(); // avisa o Angular que a tela mudou
      },
      error: (err) => {
        console.error('Erro ao carregar detalhes do formulário:', err);
        // Se o backend falhou mas temos algo em memória, mantém o que há.
        // Se não temos nada, aí sim é "não encontrado".
        if (!this.form) {
          this.notFound = true;
        }
        this.cdr.detectChanges(); // avisa o Angular que a tela mudou
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

  /**
   * Deleta o formulário atual e volta para o dashboard.
   */
  deleteForm(): void {
    if (!this.form) return;
    this.formService.deleteForm(this.form.id);
    this.router.navigate(['/dashboard']);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(this.languageService.getCurrentLanguage(), {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}