import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { FormApiService } from '../../core/services/form-api.service';
import { VisionApiService } from '../../core/services/vision-api.service';
import { VoiceInputComponent } from '../../shared/components/voice-input/voice-input';
import { scaleIn, fadeIn } from '../../shared/animations/fade.animation';

const ACCEPTED_VISION_FILE_TYPES = ['application/pdf', 'image/'];

@Component({
  selector: 'app-create-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    VoiceInputComponent,
  ],
  templateUrl: './create-form.component.html',
  styleUrl: './create-form.component.css',
  animations: [scaleIn, fadeIn],
})
export class CreateFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly formApiService = inject(FormApiService);
  private readonly visionApiService = inject(VisionApiService);
  private readonly router = inject(Router);
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

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

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

        const formId = response?.id_sessao || response?.id || response?.form_id || response?.sessao_id;

        if (!formId) {
          this.toastr.error('Erro: ID do formulário não retornado pela IA.');
          return;
        }

        this.toastr.success('Formulário extraído com sucesso!');
        
        // Navegação ajustada para o padrão correto 'forms/:id/fill'
        this.router.navigate(['/forms', formId, 'fill']);
      },
      error: () => {
        this.visionLoading = false;
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