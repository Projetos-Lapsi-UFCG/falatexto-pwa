import { ChangeDetectorRef, Component, EventEmitter, OnDestroy, Output, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle, lucideMic, lucideMicOff } from '@ng-icons/lucide';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { AudioRecorderService } from '../../../core/services/audio-recorder.service';
import { DictationService } from '../../../core/services/dictation.service';
import {
  DictationConnectionError,
  DictationServerError,
  DictationStream,
  StreamingDictationService,
} from '../../../core/services/streaming-dictation.service';

export type VoiceState = 'idle' | 'connecting' | 'recording' | 'transcribing';

/** Botão de microfone: grava, transcreve e emite o texto. Não sabe nada do
 *  formulário — quem usa decide onde o texto entra (ex.: matSuffix de um input).
 *  Usa o ditado em tempo real (WebSocket) e cai no envio em lote se ele não conectar. */
@Component({
  selector: 'app-voice-input',
  standalone: true,
  imports: [MatButtonModule, MatTooltipModule, NgIcon, TranslateModule],
  providers: [provideIcons({ lucideMic, lucideMicOff, lucideLoaderCircle })],
  templateUrl: './voice-input.component.html',
  styleUrl: './voice-input.component.css',
})
export class VoiceInputComponent implements OnDestroy {
  private readonly audioRecorder = inject(AudioRecorderService);
  private readonly dictationService = inject(DictationService);
  private readonly streamingDictation = inject(StreamingDictationService);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Texto final da transcrição. */
  @Output() textReceived = new EventEmitter<string>();
  /** Texto provisório enquanto o usuário fala ('' ao terminar). */
  @Output() partialText = new EventEmitter<string>();

  state: VoiceState = 'idle';
  private stream: DictationStream | null = null;

  get tooltipKey(): string {
    switch (this.state) {
      case 'connecting':
        return 'DICTATION.CONNECTING';
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

  ngOnDestroy(): void {
    this.stream?.cancel();
    if (this.state === 'recording' && !this.stream) {
      void this.audioRecorder.stopRecording().catch(() => undefined);
    }
  }

  private async startRecording(): Promise<void> {
    // Outro botão já está gravando (microfone compartilhado no app)
    if (this.audioRecorder.isRecording || this.streamingDictation.isActive) {
      return;
    }

    this.setState('connecting');
    try {
      this.stream = await this.streamingDictation.start();
      this.stream.partial$.subscribe(text => this.partialText.emit(text));
      this.setState('recording');
      return;
    } catch (error) {
      this.stream = null;
      if (!(error instanceof DictationConnectionError)) {
        this.failMicrophone();
        return;
      }
    }

    // Sem WebSocket: grava tudo e envia em lote ao parar
    try {
      await this.audioRecorder.startRecording();
      this.setState('recording');
    } catch {
      this.failMicrophone();
    }
  }

  private async stopAndTranscribe(): Promise<void> {
    this.setState('transcribing');
    if (this.stream) {
      await this.finishStream(this.stream);
    } else {
      await this.finishBatch();
    }
  }

  private async finishStream(stream: DictationStream): Promise<void> {
    try {
      this.emitText(await stream.stop());
    } catch (error) {
      const detail = error instanceof DictationServerError ? error.message : null;
      this.toastr.error(detail ?? this.translate.instant('DICTATION.ERRORS.TRANSCRIPTION_FAILED'));
    } finally {
      this.stream = null;
      this.partialText.emit('');
      this.setState('idle');
    }
  }

  private async finishBatch(): Promise<void> {
    let audioBlob: Blob;
    try {
      audioBlob = await this.audioRecorder.stopRecording();
    } catch {
      this.setState('idle');
      return;
    }

    this.dictationService.transcreverAudio(audioBlob).subscribe({
      next: response => {
        this.emitText(response?.texto ?? '');
        this.setState('idle');
      },
      error: (error: HttpErrorResponse) => {
        const detail = typeof error.error?.detail === 'string' ? error.error.detail : null;
        this.toastr.error(detail ?? this.translate.instant('DICTATION.ERRORS.TRANSCRIPTION_FAILED'));
        this.setState('idle');
      },
    });
  }

  private emitText(text: string): void {
    const texto = text.trim();
    if (texto) {
      this.textReceived.emit(texto);
    } else {
      this.toastr.warning(this.translate.instant('DICTATION.ERRORS.NO_SPEECH'));
    }
  }

  private failMicrophone(): void {
    this.setState('idle');
    this.toastr.error(this.translate.instant('DICTATION.ERRORS.MIC_DENIED'));
  }

  private setState(state: VoiceState): void {
    this.state = state;
    this.cdr.markForCheck();
  }
}
