import { Injectable } from '@angular/core';

/** Grava áudio do microfone (MediaRecorder). Singleton: uma gravação por vez no app. */
@Injectable({ providedIn: 'root' })
export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  get isRecording(): boolean {
    return this.mediaRecorder !== null;
  }

  /** Lança erro se o microfone for negado/indisponível (ex.: fora de HTTPS/localhost). */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Já existe uma gravação em andamento.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Safari/iOS não suporta webm: cai no formato padrão do navegador (mp4)
    const options = MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : undefined;

    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(stream, options);
    this.mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    this.mediaRecorder.start();
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const recorder = this.mediaRecorder;
      if (!recorder) {
        reject(new Error('Nenhuma gravação em andamento.'));
        return;
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: recorder.mimeType || 'audio/webm' });
        // Libera o microfone (apaga o indicador de gravação do navegador)
        recorder.stream.getTracks().forEach(track => track.stop());
        this.mediaRecorder = null;
        this.audioChunks = [];
        resolve(audioBlob);
      };
      recorder.stop();
    });
  }
}
