import { Injectable } from '@angular/core';

<<<<<<< HEAD
@Injectable({
  providedIn: 'root'
})
export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;

  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      
      const options = MediaRecorder.isTypeSupported('audio/webm') 
        ? { mimeType: 'audio/webm' } 
        : undefined;

      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (error) {
      console.error('Erro ao acessar o microfone:', error);
      throw new Error('Permissão de microfone negada ou não suportada.');
    }
=======
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
>>>>>>> origin/main
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
<<<<<<< HEAD
      if (!this.mediaRecorder || !this.isRecording) {
        return reject('Nenhuma gravação em andamento.');
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        
        // Libera o hardware do microfone
        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
        
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  get recordingState(): boolean {
    return this.isRecording;
  }
}
=======
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
>>>>>>> origin/main
