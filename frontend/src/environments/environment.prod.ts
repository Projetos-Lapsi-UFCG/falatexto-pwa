export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  visionApiToken: '0000',
  // Roteado pelo nginx até o Vision Engine (/ws/transcrever)
  dictationWsUrl: '/api/v1/vision/transcrever-stream',
};
