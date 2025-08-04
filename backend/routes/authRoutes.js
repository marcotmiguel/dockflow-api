// js/auth.js - Sistema de Autenticação Frontend DockFlow
// VERSÃO CORRIGIDA com suporte a roles e JWT

/**
 * Sistema de Autenticação Frontend
 * Compatível com o novo sistema de roles (operador, analista, admin, desenvolvedor)
 * Suporte a JWT e middleware de autenticação
 */

// Configuração da API
const API_CONFIG = {
  BASE_URL: window.location.origin,
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
    CHECK_DEVELOPER: '/api/auth/check-developer',
    CHANGE_PASSWORD: '/api/auth/change-password'
  }
};

// Estado da autenticação
let authState = {
  token: null,
  user: null,
  isAuthenticated: false,
  role: null,
  permissions: []
};

// Classe principal de autenticação
class DockFlowAuth {
  constructor() {
    this.init();
  }

  // Inicializar sistema de autenticação
  init() {
    console.log('🔐 Inicializando sistema de autenticação...');
    
    // Carregar token do localStorage
    this.loadAuthFromStorage();
    
    // Configurar interceptadores de requisição
    this.setupRequestInterceptors();
    
    // Verificar autenticação na inicialização
    if (authState.token) {
      this.validateToken();
    }
    
    console.log('✅ Sistema de autenticação inicializado');
  }

  // Carregar autenticação do localStorage
  loadAuthFromStorage() {
    try {
      const token = localStorage.getItem('dockflow_token');
      const userData = localStorage.getItem('dockflow_user');
      
      if (token && userData) {
        authState.token = token;
        authState.user = JSON.parse(userData);
        authState.isAuthenticated = true;
        authState.role = authState.user.role;
        authState.permissions = authState.user.permissions || [];
        
        console.log(`✅ Autenticação carregada: ${authState.user.name} (${authState.role})`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar autenticação:', error);
      this.clearAuth();
    }
  }

  // Salvar autenticação no localStorage
  saveAuthToStorage(token, user) {
    try {
      localStorage.setItem('dockflow_token', token);
      localStorage.setItem('dockflow_user', JSON.stringify(user));
      
      authState.token = token;
      authState.user = user;
      authState.isAuthenticated = true;
      authState.role = user.role;
      authState.permissions = user.permissions || [];
      
      console.log(`✅ Autenticação salva: ${user.name} (${user.role})`);
    } catch (error) {
      console.error('❌ Erro ao salvar autenticação:', error);
    }
  }

  // Limpar autenticação
  clearAuth() {
    localStorage.removeItem('dockflow_token');
    localStorage.removeItem('dockflow_user');
    
    authState.token = null;
    authState.user = null;
    authState.isAuthenticated = false;
    authState.role = null;
    authState.permissions = [];
    
    console.log('🧹 Autenticação limpa');
  }

  // Fazer login
  async login(email, password) {
    console.log(`🔐 Tentando login: ${email}`);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Login realizado com sucesso');
        
        // Salvar dados de autenticação
        this.saveAuthToStorage(data.data.token, data.data.user);
        
        // Disparar evento de login
        this.dispatchAuthEvent('login', authState.user);
        
        return { 
          success: true, 
          user: authState.user,
          role: authState.role,
          permissions: authState.permissions
        };
        
      } else {
        console.log('❌ Falha no login:', data.message);
        return { 
          success: false, 
          message: data.message || 'Credenciais inválidas' 
        };
      }
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      return { 
        success: false, 
        message: 'Erro de conexão. Verifique sua internet.' 
      };
    }
  }

  // Fazer logout
  async logout() {
    console.log('🚪 Fazendo logout...');
    
    try {
      // Tentar notificar o servidor (opcional)
      if (authState.token) {
        await this.fetchAuth(API_CONFIG.ENDPOINTS.LOGOUT, {
          method: 'POST'
        });
      }
    } catch (error) {
      console.warn('⚠️ Erro ao notificar logout no servidor:', error);
    }
    
    // Limpar dados locais
    this.clearAuth();
    
    // Disparar evento de logout
    this.dispatchAuthEvent('logout', null);
    
    // Redirecionar para login se não estiver lá
    if (window.location.pathname !== '/' && !window.location.pathname.includes('login')) {
      window.location.href = '/';
    }
  }

  // Validar token atual
  async validateToken() {
    if (!authState.token) {
      return false;
    }

    try {
      const response = await this.fetchAuth(API_CONFIG.ENDPOINTS.ME);
      
      if (response && response.ok) {
        const data = await response.json();
        
        if (data.success) {
          // Atualizar dados do usuário
          authState.user = data.data;
          authState.role = data.data.role;
          authState.permissions = data.data.permissions || [];
          
          localStorage.setItem('dockflow_user', JSON.stringify(authState.user));
          
          return true;
        }
      }
      
      // Token inválido
      this.clearAuth();
      return false;
      
    } catch (error) {
      console.error('❌ Erro ao validar token:', error);
      this.clearAuth();
      return false;
    }
  }

  // Fazer requisições autenticadas
  async fetchAuth(endpoint, options = {}) {
    if (!authState.token) {
      throw new Error('Token de autenticação não encontrado');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_CONFIG.BASE_URL}${endpoint}`;
    
    const config = {
      ...options,
      headers: {
        'Authorization': `Bearer ${authState.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, config);

      // Token expirado ou inválido
      if (response.status === 401 || response.status === 403) {
        console.log('❌ Token expirado ou acesso negado');
        this.clearAuth();
        this.dispatchAuthEvent('tokenExpired', null);
        
        // Redirecionar para login se não estiver lá
        if (window.location.pathname !== '/' && !window.location.pathname.includes('login')) {
          window.location.href = '/';
        }
        
        throw new Error('Token expirado. Faça login novamente.');
      }

      return response;
      
    } catch (error) {
      console.error('❌ Erro na requisição autenticada:', error);
      throw error;
    }
  }

  // Verificar se usuário está logado
  isAuthenticated() {
    return authState.isAuthenticated && authState.token && authState.user;
  }

  // Obter dados do usuário
  getUser() {
    return authState.user;
  }

  // Obter role do usuário
  getRole() {
    return authState.role;
  }

  // Obter permissões do usuário
  getPermissions() {
    return authState.permissions;
  }

  // Verificar se usuário tem permissão específica
  hasPermission(permission) {
    if (!authState.permissions) return false;
    
    // Desenvolvedor tem todas as permissões
    if (authState.role === 'desenvolvedor' || authState.permissions.includes('*')) {
      return true;
    }
    
    return authState.permissions.includes(permission);
  }

  // Verificar se usuário tem role específica ou superior
  hasRole(requiredRole) {
    const roleHierarchy = {
      'operator': 1,
      'analyst': 2, 
      'admin': 3,
      'desenvolvedor': 4
    };
    
    const userLevel = roleHierarchy[authState.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 999;
    
    return userLevel >= requiredLevel;
  }

  // Verificar se é desenvolvedor
  async isDeveloper() {
    if (authState.role === 'desenvolvedor') {
      return true;
    }

    try {
      const response = await this.fetchAuth(API_CONFIG.ENDPOINTS.CHECK_DEVELOPER);
      
      if (response && response.ok) {
        const data = await response.json();
        return data.success && data.data.isDeveloper;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Erro ao verificar role de desenvolvedor:', error);
      return false;
    }
  }

  // Alterar senha
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await this.fetchAuth(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD, {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Senha alterada com sucesso');
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Erro ao alterar senha' };
      }
      
    } catch (error) {
      console.error('❌ Erro ao alterar senha:', error);
      return { success: false, message: 'Erro de conexão' };
    }
  }

  // Configurar interceptadores de requisição
  setupRequestInterceptors() {
    // Interceptar erros globais de autenticação
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message && event.reason.message.includes('Token expirado')) {
        console.log('🔄 Token expirado detectado globalmente');
        // Não mostrar erro para o usuário, já foi tratado
        event.preventDefault();
      }
    });
  }

  // Disparar eventos de autenticação
  dispatchAuthEvent(type, data) {
    const event = new CustomEvent(`dockflow:${type}`, {
      detail: data
    });
    
    window.dispatchEvent(event);
    console.log(`📡 Evento disparado: dockflow:${type}`);
  }

  // Proteger página (usar em páginas que precisam de autenticação)
  requireAuth(requiredRole = null) {
    if (!this.isAuthenticated()) {
      console.log('❌ Usuário não autenticado, redirecionando...');
      window.location.href = '/';
      return false;
    }

    if (requiredRole && !this.hasRole(requiredRole)) {
      console.log(`❌ Usuário não tem role ${requiredRole}, acesso negado`);
      this.showAlert('Acesso negado. Você não tem permissão para acessar esta página.', 'danger');
      return false;
    }

    return true;
  }

  // Mostrar alerta (utility)
  showAlert(message, type = 'info') {
    // Tentar usar o sistema de alertas se disponível
    if (window.Utils && window.Utils.showAlert) {
      window.Utils.showAlert(message, type);
      return;
    }

    // Fallback simples
    const alertClass = {
      'success': 'alert-success',
      'danger': 'alert-danger', 
      'warning': 'alert-warning',
      'info': 'alert-info'
    }[type] || 'alert-info';

    const alertHTML = `
      <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;

    // Procurar container de alertas
    let container = document.getElementById('alertContainer') || 
                   document.getElementById('alert-container') ||
                   document.querySelector('.alert-container');

    if (!container) {
      // Criar container se não existir
      container = document.createElement('div');
      container.id = 'alertContainer';
      container.className = 'position-fixed';
      container.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
      document.body.appendChild(container);
    }

    container.insertAdjacentHTML('beforeend', alertHTML);

    // Auto-remover após 5 segundos
    setTimeout(() => {
      const alert = container.querySelector('.alert:last-child');
      if (alert) {
        alert.remove();
      }
    }, 5000);
  }
}

// Instanciar sistema de autenticação
const Auth = new DockFlowAuth();

// Event listeners globais
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 DOM carregado - configurando autenticação');

  // Configurar formulário de login se existir
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    setupLoginForm(loginForm);
  }

  // Configurar botões de logout
  document.querySelectorAll('[data-action="logout"], #logoutButton, #logout-button').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  });

  // Verificar se página requer autenticação
  const pageAuth = document.querySelector('[data-require-auth]');
  if (pageAuth) {
    const requiredRole = pageAuth.getAttribute('data-require-role');
    Auth.requireAuth(requiredRole);
  }
});

// Configurar formulário de login
function setupLoginForm(form) {
  console.log('🔐 Configurando formulário de login');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = form.querySelector('#email, [name="email"]')?.value;
    const password = form.querySelector('#password, [name="password"]')?.value;
    const submitButton = form.querySelector('[type="submit"], .login-btn');
    const errorContainer = form.querySelector('.error-message, #errorMessage');
    
    if (!email || !password) {
      showFormError(errorContainer, 'Preencha email e senha');
      return;
    }

    // Estado de loading
    if (submitButton) {
      submitButton.disabled = true;
      const originalText = submitButton.textContent;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
      
      // Restaurar botão após login
      const restoreButton = () => {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      };

      try {
        const result = await Auth.login(email, password);
        
        if (result.success) {
          // Sucesso - redirecionar baseado na role
          showFormSuccess(errorContainer, 'Login realizado com sucesso!');
          
          setTimeout(() => {
            const redirectUrl = getRedirectUrl(result.role);
            window.location.href = redirectUrl;
          }, 1000);
          
        } else {
          showFormError(errorContainer, result.message);
          restoreButton();
        }
        
      } catch (error) {
        showFormError(errorContainer, 'Erro de conexão. Tente novamente.');
        restoreButton();
      }
    }
  });
}

// Determinar URL de redirecionamento baseado na role
function getRedirectUrl(role) {
  // Verificar se há URL de redirecionamento específica
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTo = urlParams.get('redirect');
  
  if (redirectTo) {
    return decodeURIComponent(redirectTo);
  }

  // Redirecionamento padrão por role
  switch (role) {
    case 'desenvolvedor':
      return '/pages/admin.html';
    case 'admin':
      return '/pages/dashboard.html';
    default:
      return '/pages/dashboard.html';
  }
}

// Mostrar erro no formulário
function showFormError(container, message) {
  if (container) {
    container.textContent = message;
    container.className = 'alert alert-danger';
    container.style.display = 'block';
  } else {
    Auth.showAlert(message, 'danger');
  }
}

// Mostrar sucesso no formulário
function showFormSuccess(container, message) {
  if (container) {
    container.textContent = message;
    container.className = 'alert alert-success';
    container.style.display = 'block';
  } else {
    Auth.showAlert(message, 'success');
  }
}

// Eventos de autenticação
window.addEventListener('dockflow:login', (event) => {
  console.log('✅ Usuário logado:', event.detail);
});

window.addEventListener('dockflow:logout', () => {
  console.log('🚪 Usuário deslogado');
});

window.addEventListener('dockflow:tokenExpired', () => {
  console.log('⏰ Token expirado');
  Auth.showAlert('Sua sessão expirou. Faça login novamente.', 'warning');
});

// Exportar para uso global
window.Auth = Auth;
window.DockFlowAuth = DockFlowAuth;

// Para compatibilidade com código existente
window.getAuthToken = () => Auth.authState?.token;
window.isLoggedIn = () => Auth.isAuthenticated();
window.apiRequest = (endpoint, options) => Auth.fetchAuth(endpoint, options);

console.log('✅ Sistema de autenticação DockFlow carregado');