// Configuração de runtime consumida por src/app/core/config/runtime-config.ts.
//
// Este arquivo contém apenas valores padrão para desenvolvimento (`ng serve`).
// Em produção, o container sobrescreve /config.js a partir das variáveis de
// ambiente VISION_API_SECRET_TOKEN e ADMIN_PIN (ver frontend/docker-entrypoint.sh).
window.__APP_CONFIG__ = {
  visionApiToken: '0000',
  adminPin: '0000',
};
