import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
<<<<<<< HEAD
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { FormApiService } from '../../core/services/form-api.service';
import { VisionApiService } from '../../core/services/vision-api.service';
import { VoiceInputComponent } from '../../shared/components/voice-input/voice-input';
=======
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideChevronRight, lucidePencilLine, lucideSparkles } from '@ng-icons/lucide';
import { TranslateModule } from '@ngx-translate/core';
>>>>>>> origin/main
import { scaleIn, fadeIn } from '../../shared/animations/fade.animation';

/** Tela de escolha do modo de criação: com o Assis (IA) em /create/assis ou
 *  manual em /create/manually. */
@Component({
  selector: 'app-create-form',
  standalone: true,
<<<<<<< HEAD
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    VoiceInputComponent,
  ],
=======
  imports: [RouterLink, MatButtonModule, NgIcon, TranslateModule],
  providers: [provideIcons({ lucideArrowLeft, lucideChevronRight, lucidePencilLine, lucideSparkles })],
>>>>>>> origin/main
  templateUrl: './create-form.component.html',
  styleUrl: './create-form.component.css',
  animations: [scaleIn, fadeIn],
})
export class CreateFormComponent {
  private readonly router = inject(Router);
<<<<<<< HEAD
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  visionLoading = false;
  selectedFile: File | null = null;

  readonly createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
  });

  readonly visionForm = this.fb.group({
    nomeFormulario: ['', [Validators.required]],
  });

  handleSubmit(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.toastr.error(this.translate.instant('CREATE_FORM.ERRORS.FILL_REQUIRED'));
      return;
    }

    const name = this.createForm.value.name!;
    this.loading = true;
    this.formApiService.createForm(name).subscribe({
      next: () => {
        this.loading = false;
        this.toastr.success(this.translate.instant('CREATE_FORM.SUCCESS.CREATED'));
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading = false;
        this.toastr.error(this.translate.instant('CREATE_FORM.ERRORS.CREATE_FAILED'));
        this.cdr.markForCheck();
      },
    });
  }
=======
>>>>>>> origin/main

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
<<<<<<< HEAD

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (file && !ACCEPTED_VISION_FILE_TYPES.some(type => file.type.startsWith(type))) {
      this.toastr.error(this.translate.instant('CREATE_FORM.VISION.ERRORS.INVALID_FILE_TYPE'));
      input.value = '';
      return;
    }

    this.selectedFile = file;
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
  }

  handleProcessWithAI(): void {
    if (this.visionForm.invalid || !this.selectedFile) {
      this.visionForm.markAllAsTouched();
      this.toastr.error(this.translate.instant('CREATE_FORM.ERRORS.FILL_REQUIRED'));
      return;
    }

    const nomeFormulario = this.visionForm.value.nomeFormulario!;
    this.visionLoading = true;

    this.visionApiService.processarClinica(nomeFormulario, this.selectedFile).subscribe({
      next: (response: any) => {
        this.visionLoading = false;

        // Adicionado response?._id para capturar o ID do MongoDB ('form_001', etc.)
        const formId = response?._id || response?.id || response?.form_id || response?.id_sessao;

        if (!formId) {
          this.toastr.error('Erro: ID do formulário não retornado pela IA.');
          return;
        }

        this.toastr.success('Formulário extraído com sucesso!');
        
        // Redireciona para o Dashboard ou para a página do formulário criado
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.visionLoading = false;
        console.error('Erro no processamento da imagem:', err);
        this.toastr.error(this.translate.instant('CREATE_FORM.VISION.ERRORS.PROCESS_FAILED'));
        this.cdr.markForCheck();
      },
    });
  }

  appendTexto(formGroup: any, controlName: string, novoTexto: string): void {
    const control = formGroup.get(controlName);
    if (control && novoTexto) {
      const valorAtual = control.value ? String(control.value).trim() + ' ' : '';
      control.setValue(valorAtual + novoTexto);
      control.markAsDirty();
      control.markAsTouched();
      this.cdr.markForCheck();
    }
  }
}
=======
}
>>>>>>> origin/main
