import { Component, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AudioRecorderService } from '../../../core/services/audio-recorder.service';
import { DictationService } from '../../../core/services/dictation.service';

export type VoiceState = 'idle' | 'recording' | 'transcribing';

@Component({
  selector: 'app-voice-input',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './voice-input.html',
  styleUrl: './voice-input.css'
})
export class VoiceInputComponent {
  @Output() textReceived = new EventEmitter<string>();

  currentState: VoiceState = 'idle';

  constructor(
    private audioRecorder: AudioRecorderService,
    private dictationService: DictationService,
    private cd: ChangeDetectorRef
  ) {}

  async toggleDitado(): Promise<void> {
    if (this.currentState === 'idle') {
      await this.iniciarGravacao();
    } else if (this.currentState === 'recording') {
      await this.pararETranscrever();
    }
  }

  private async iniciarGravacao(): Promise<void> {
    try {
      await this.audioRecorder.startRecording();
      this.currentState = 'recording';
      this.cd.detectChanges();
    } catch (error) {
      console.error('Erro ao acessar o microfone:', error);
      this.currentState = 'idle';
      this.cd.detectChanges();
    }
  }

  private async pararETranscrever(): Promise<void> {
    try {
      this.currentState = 'transcribing';
      this.cd.detectChanges();

      const audioBlob = await this.audioRecorder.stopRecording();
      
      this.dictationService.transcreverAudio(audioBlob).subscribe({
        next: (response: any) => {
          const texto = response?.texto || response?.text || '';
          if (texto) {
            this.textReceived.emit(texto);
          }
          this.currentState = 'idle';
          this.cd.detectChanges();
        },
        error: (err) => {
          console.error('Erro ao transcrever áudio:', err);
          this.currentState = 'idle';
          this.cd.detectChanges();
        }
      });
    } catch (error) {
      console.error('Erro ao parar gravação:', error);
      this.currentState = 'idle';
      this.cd.detectChanges();
    }
  }
}