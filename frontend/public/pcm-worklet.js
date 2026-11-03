// Captura do microfone para o ditado em tempo real: converte o áudio do navegador
// (44,1/48 kHz float) em PCM16 mono 16 kHz e envia blocos de ~250 ms à thread principal.
const TARGET_RATE = 16000;
const CHUNK_SAMPLES = 4000;

class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / TARGET_RATE;
    this.position = 0;
    this.sum = 0;
    this.count = 0;
    this.chunk = new Int16Array(CHUNK_SAMPLES);
    this.length = 0;
    this.port.onmessage = event => {
      if (event.data === 'flush') {
        this.post();
        this.port.postMessage('flushed');
      }
    };
  }

  post() {
    if (this.length === 0) return;
    const out = this.chunk.slice(0, this.length);
    this.port.postMessage(out.buffer, [out.buffer]);
    this.length = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;

    // Média das amostras de cada intervalo de saída (decimação com filtro passa-baixa simples)
    for (let i = 0; i < channel.length; i++) {
      this.sum += channel[i];
      this.count++;
      this.position++;
      if (this.position >= this.ratio) {
        this.position -= this.ratio;
        const sample = Math.max(-1, Math.min(1, this.sum / this.count));
        this.chunk[this.length++] = sample * 0x7fff;
        this.sum = 0;
        this.count = 0;
        if (this.length === CHUNK_SAMPLES) this.post();
      }
    }
    return true;
  }
}

registerProcessor('pcm-capture', PcmCaptureProcessor);
