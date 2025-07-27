// js/config.js - Configuração centralizada da API

// Detectar automaticamente a URL base da API
const getApiUrl = () => {
  // Se estiver em produção (Railway), usar a URL de produção
  if (window.location.hostname.includes('railway.app')) {
    return window.location.origin + '/api';
  }
  
  // Se estiver em localhost, detectar a porta
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return window.location.origin + '/api';
  }
  
  // Fallback para desenvolvimento
  return 'http://localhost:3000/api';
};

// Configuração global
window.APP_CONFIG = {
  API_URL: getApiUrl(),
  VERSION: '2.1',
  ENVIRONMENT: window.location.hostname.includes('railway.app') ? 'production' : 'development'
};

// Para compatibilidade com arquivos existentes
window.API_URL = window.APP_CONFIG.API_URL;

console.log('🔧 Configuração carregada:', window.APP_CONFIG);