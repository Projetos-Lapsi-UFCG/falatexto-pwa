import { environment } from '../../../environments/environment';

/**
 * Configuração resolvida em tempo de execução.
 *
 * O arquivo `/config.js` (servido de `public/config.js` no dev e regenerado pelo
 * container a partir de variáveis de ambiente em produção) define
 * `window.__APP_CONFIG__`. Aqui lemos esse objeto com fallback para `environment`,
 * de modo que segredos como o token do Vision e o PIN de admin não precisem ser
 * embutidos no bundle nem exigem rebuild para serem rotacionados.
 */
interface AppRuntimeConfig {
  visionApiToken?: string;
  adminPin?: string;
}

function readRuntimeConfig(): AppRuntimeConfig {
  const cfg = (globalThis as { __APP_CONFIG__?: AppRuntimeConfig }).__APP_CONFIG__;
  return cfg && typeof cfg === 'object' ? cfg : {};
}

/** Token compartilhado exigido pelos endpoints `/vision` do backend. */
export function getVisionApiToken(): string {
  return readRuntimeConfig().visionApiToken || environment.visionApiToken || '';
}

/**
 * PIN exigido para entrar como administrador. String vazia => login de admin
 * desabilitado (nenhum PIN é aceito).
 */
export function getAdminPin(): string {
  return readRuntimeConfig().adminPin ?? '';
}
