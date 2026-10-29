import { ChangeDetectorRef, Component, EventEmitter, Output, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle, lucideMic, lucideMicOff } from '@ng-icons/lucide';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { AudioRecorderService } from '../../../core/services/audio-recorder.service';
import { DictationService } from '../../../core/services/dictation.service';

export type VoiceState = 'idle' | 'recording' | 'transcribing';

/** Botão de microfone: grava, transcreve e emite o texto. Não sabe nada do
 *  formulário — quem usa decide onde o texto entra (ex.: matSuffix de um input). */
@Component({
  selector: 'app-voice-input',
  standalone: true,
  imports: [MatButtonModule, MatTooltipModule, NgIcon, TranslateModule],
  providers: [provideIcons({ lucideMic, lucideMicOff, lucideLoaderCircle })],
  templateUrl: './voice-input.component.html',
  styleUrl: './voice-input.component.css',
})
export class VoiceInputComponent {
  private readonly audioRecorder = inject(AudioRecorderService);
  private readonly dictationService = inject(DictationService);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Output() textReceived = new EventEmitter<string>();

  state: VoiceState = 'idle';

  get tooltipKey(): string {
    switch (this.state) {
      case 'recording':
        return 'DICTATION.STOP';
      case 'transcribing':
        return 'DICTATION.PROCESSING';
      default:
        return 'DICTATION.START';
    }
  }

  async toggle(): Promise<void> {
    if (this.state === 'idle') {
      await this.startRecording();
    } else if (this.state === 'recording') {
      await this.stopAndTranscribe();
    }
  }

  private async startRecording(): Promise<void> {
    // Outro botão já está gravando (o gravador é compartilhado no app)
    if (this.audioRecorder.isRecording) {
      return;
    }

    try {
      await this.audioRecorder.startRecording();
      this.state = 'recording';
    } catch {
      this.state = 'idle';
      this.toastr.error(this.translate.instant('DICTATION.ERRORS.MIC_DENIED'));
    }
    this.cdr.markForCheck();
  }

  private async stopAndTranscribe(): Promise<void> {
    this.state = 'transcribing';
    this.cdr.markForCheck();

    let audioBlob: Blob;
    try {
      audioBlob = await this.audioRecorder.stopRecording();
    } catch {
      this.state = 'idle';
      this.cdr.markForCheck();
      return;
    }

    this.dictationService.transcreverAudio(audioBlob).subscribe({
      next: response => {
        const texto = response?.texto?.trim();
        if (texto) {
          this.textReceived.emit(texto);
        }
        this.state = 'idle';
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        const detail = typeof error.error?.detail === 'string' ? error.error.detail : null;
        this.toastr.error(detail ?? this.translate.instant('DICTATION.ERRORS.TRANSCRIPTION_FAILED'));
        this.state = 'idle';
        this.cdr.markForCheck();
      },
    });
  }
}
