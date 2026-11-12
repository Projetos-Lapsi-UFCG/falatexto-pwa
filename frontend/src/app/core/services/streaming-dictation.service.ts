import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { DICTATION_WS_URL, VISION_API_TOKEN } from '../config/api.config';

const CONNECT_TIMEOUT_MS = 3000;
const FLUSH_TIMEOUT_MS = 500;
const FINAL_TIMEOUT_MS = 20000;

/** O WebSocket não abriu: quem chama pode cair no ditado em lote (DictationService). */
export class DictationConnectionError extends Error {}

/** Erro enviado pelo Vision Engine (ex.: falha na transcrição). */
export class DictationServerError extends Error {}

/** Restrições do microfone usadas pelo ditado em tempo real e pelo gravador em lote. */
export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
};

/** Uma sessão de ditado em andamento: texto provisório em `partial$`, texto final em `stop()`. */
export class DictationStream {
  private readonly partialSubject = new Subject<string>();
  readonly partial$: Observable<string> = this.partialSubject.asObservable();

  private resolveFinal!: (text: string) => void;
  private rejectFinal!: (error: Error) => void;
  private readonly final = new Promise<string>((resolve, reject) => {
    this.resolveFinal = resolve;
    this.rejectFinal = reject;
  });
  private onFlushed: (() => void) | null = null;
  private released = false;

  constructor(
    private readonly ws: WebSocket,
    private readonly mic: MediaStream,
    private readonly audioContext: AudioContext,
    private readonly worklet: AudioWorkletNode,
    private readonly onEnd: () => void
  ) {
    // Evita "unhandled rejection" se a conexão cair antes de alguém chamar stop()
    this.final.catch(() => undefined);

    worklet.port.onmessage = event => {
      if (event.data === 'flushed') {
        this.onFlushed?.();
      } else if (ws.readyState === WebSocket.OPEN) {
        ws.send(event.data as ArrayBuffer);
      }
    };

    ws.onmessage = event => {
      const message = JSON.parse(event.data as string);
      if (message.type === 'partial') {
        this.partialSubject.next(message.text);
      } else if (message.type === 'final') {
        this.resolveFinal(message.text);
      } else if (message.type === 'error') {
        this.rejectFinal(new DictationServerError(message.detail));
      }
    };
    ws.onclose = () => {
      this.rejectFinal(new DictationServerError('Conexão de ditado encerrada.'));
      this.release();
    };
  }

  /** Encerra a captura e espera o texto final (passada completa no servidor). */
  async stop(): Promise<string> {
    await new Promise<void>(resolve => {
      this.onFlushed = resolve;
      this.worklet.port.postMessage('flush');
      setTimeout(resolve, FLUSH_TIMEOUT_MS);
    });
    this.releaseMic();
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'stop' }));
    }

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new DictationServerError('Tempo esgotado aguardando a transcrição.')), FINAL_TIMEOUT_MS)
    );
    try {
      return await Promise.race([this.final, timeout]);
    } finally {
      this.release();
    }
  }

  /** Descarta a sessão (ex.: componente destruído durante a gravação). */
  cancel(): void {
    this.release();
  }

  private releaseMic(): void {
    // Libera o microfone (apaga o indicador de gravação do navegador)
    this.mic.getTracks().forEach(track => track.stop());
    this.worklet.disconnect();
    void this.audioContext.close().catch(() => undefined);
  }

  private release(): void {
    if (this.released) {
      return;
    }
    this.released = true;
    this.releaseMic();
    this.partialSubject.complete();
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close();
    }
    this.onEnd();
  }
}

/** Ditado em tempo real: microfone → PCM16 16 kHz (AudioWorklet) → WebSocket do Vision Engine. */
@Injectable({ providedIn: 'root' })
export class StreamingDictationService {
  private active = false;

  get isActive(): boolean {
    return this.active;
  }

  /**
   * Lança `DictationConnectionError` se o servidor estiver inacessível e repassa o erro de
   * `getUserMedia` se o microfone for negado (ex.: fora de HTTPS/localhost).
   */
  async start(contexto?: string): Promise<DictationStream> {
    if (this.active) {
      throw new Error('Já existe um ditado em andamento.');
    }
    this.active = true;

    let ws: WebSocket | null = null;
    let mic: MediaStream | null = null;
    try {
      ws = await this.connect();
      ws.send(JSON.stringify({ type: 'start', token: VISION_API_TOKEN, contexto }));

      mic = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      const audioContext = new AudioContext();
      await audioContext.audioWorklet.addModule(new URL('pcm-worklet.js', document.baseURI).href);
      await audioContext.resume();

      const source = audioContext.createMediaStreamSource(mic);
      const worklet = new AudioWorkletNode(audioContext, 'pcm-capture');
      // Saída muda até o destino: garante que o grafo seja processado em todos os navegadores
      const mute = audioContext.createGain();
      mute.gain.value = 0;
      source.connect(worklet).connect(mute).connect(audioContext.destination);

      return new DictationStream(ws, mic, audioContext, worklet, () => (this.active = false));
    } catch (error) {
      mic?.getTracks().forEach(track => track.stop());
      ws?.close();
      this.active = false;
      throw error;
    }
  }

  private connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(DICTATION_WS_URL);
      ws.binaryType = 'arraybuffer';
      const timer = setTimeout(() => {
        ws.close();
        reject(new DictationConnectionError('Tempo esgotado ao conectar ao ditado.'));
      }, CONNECT_TIMEOUT_MS);
      ws.onopen = () => {
        clearTimeout(timer);
        resolve(ws);
      };
      ws.onerror = () => {
        clearTimeout(timer);
        reject(new DictationConnectionError('Não foi possível conectar ao ditado.'));
      };
    });
  }
}
