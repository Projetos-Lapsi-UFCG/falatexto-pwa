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
import { AudioRecorderService } from '../../core/services/audio-recorder.service';
import { DictationService } from '../../core/services/dictation.service';
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
  ],
  templateUrl: './create-form.component.html',
  styleUrl: './create-form.component.css',
  animations: [scaleIn, fadeIn],
})
export class CreateFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly formApiService = inject(FormApiService);
  private readonly visionApiService = inject(VisionApiService);
  readonly audioRecorder = inject(AudioRecorderService);
  private readonly dictationService = inject(DictationService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  visionLoading = false;
  selectedFile: File | null = null;

  activeRecordingField: string | null = null;
  dictationLoadingField: string | null = null;

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
      next: response => {
        this.visionLoading = false;
        this.toastr.success(
          this.translate.instant('CREATE_FORM.VISION.SUCCESS.QUEUED', { id: response.id_sessao })
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.visionLoading = false;
        this.toastr.error(this.translate.instant('CREATE_FORM.VISION.ERRORS.PROCESS_FAILED'));
        this.cdr.markForCheck();
      },
    });
  }

  async toggleDitado(formGroup: any, controlName: string): Promise<void> {
  const control = formGroup.get(controlName);
  if (!control) return;

  if (this.audioRecorder.recordingState && this.activeRecordingField === controlName) {
    this.dictationLoadingField = controlName;
    this.activeRecordingField = null;
    
    // Evita disparar a mensagem vermelha de validação durante o processamento
    control.markAsUntouched();
    this.cdr.markForCheck();

    try {
      const audioBlob = await this.audioRecorder.stopRecording();
      this.toastr.info('Processando áudio com a IA...', '', { timeOut: 3000 });

      this.dictationService.transcreverAudio(audioBlob).subscribe({
        next: (res: any) => {
          // Garante a leitura da resposta mesmo com variações no contrato do backend
          const textoTranscrito = res?.texto || res?.text;

          if (textoTranscrito) {
            const valorAtual = control.value ? String(control.value).trim() + ' ' : '';
            control.setValue(valorAtual + textoTranscrito);
            control.markAsDirty();
            control.markAsTouched(); // Valida novamente apenas após preencher
          } else {
            this.toastr.warning('Nenhum texto detectado na transcrição.');
          }

          this.dictationLoadingField = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Erro na transcrição:', err);
          this.toastr.error('Erro ao processar a transcrição do áudio.');
          this.dictationLoadingField = null;
          this.cdr.markForCheck();
        }
      });
    } catch (err) {
      console.error('Erro ao finalizar gravação:', err);
      this.dictationLoadingField = null;
      this.cdr.markForCheck();
    }
  } else if (!this.audioRecorder.recordingState) {
    try {
      await this.audioRecorder.startRecording();
      this.activeRecordingField = controlName;
      this.cdr.markForCheck();
    } catch (err) {
      this.toastr.error('Permissão de microfone negada ou indisponível.');
    }
  }
}
}