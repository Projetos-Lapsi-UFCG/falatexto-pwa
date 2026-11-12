import { environment } from '../../../environments/environment';

/** Base URL do backend FastAPI (backend/api), já incluindo o prefixo /api/v1. */
export const API_BASE_URL = environment.apiBaseUrl;

/** Token compartilhado exigido pelos endpoints /vision (ver VISION_API_SECRET_TOKEN no backend). */
export const VISION_API_TOKEN = environment.visionApiToken;

/** WebSocket do ditado em tempo real; caminho relativo vira ws(s):// no host atual. */
export const DICTATION_WS_URL = environment.dictationWsUrl.startsWith('/')
  ? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${environment.dictationWsUrl}`
  : environment.dictationWsUrl;
