import { environment } from '../../../environments/environment';
import { getVisionApiToken } from './runtime-config';

/** Base URL do backend FastAPI (backend/api), já incluindo o prefixo /api/v1. */
export const API_BASE_URL = environment.apiBaseUrl;

/**
 * Token compartilhado exigido pelos endpoints /vision (ver VISION_API_SECRET_TOKEN
 * no backend). Resolvido em tempo de execução a partir de /config.js.
 */
export const VISION_API_TOKEN = getVisionApiToken();
