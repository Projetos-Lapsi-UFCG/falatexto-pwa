export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000/api/v1',
  // Fallback apenas: o valor real vem de /config.js (window.__APP_CONFIG__),
  // injetado no runtime pelo container. Ver core/config/runtime-config.ts.
  visionApiToken: '',
};
