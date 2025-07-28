// js/auth.js - Sistema de Autenticação DockFlow (Versão Corrigida)

// 🔧 API URL definitiva
const API_URL = 'https://dockflow-api-production.up.railway.app/api';

// Log apenas em desenvolvimento
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('🔧 Auth.js carregado - API URL:', API_URL);
}

// Objeto para gerenciar a autenticação
const Auth = {
  // Verificar se o usuário está logado
  isAuthenticated: function() {
    return localStorage.getItem('token') !== null;
  },
  
  // Obter token
  getToken: function() {
    return localStorage.getItem('token');
  },
  
  // Obter dados do usuário
  getUser: function() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  },
  
  // Verificar se o usuário tem determinada função
  hasRole: function(role) {
    const user = this.getUser();
    return user && user.role === role;
  },
  
  // Fazer login
  login: async function(email, password) {
    try {
      // Log apenas em desenvolvimento
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🔐 Tentando login para:', email);
      }
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao fazer login');
      }
      
      // Verificar se a resposta tem a estrutura esperada
      if (!data.token || !data.user) {
        throw new Error('Resposta inválida do servidor');
      }
      
      // Salvar token e dados do usuário
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Log apenas em desenvolvimento
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('✅ Login bem-sucedido:', data.user.email);
      }
      
      return data;
    } catch (error) {
      // Log apenas em desenvolvimento
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.error('❌ Erro de login:', error);
      }
      throw error;
    }
  },
  
  // Fazer logout
  logout: function() {
    // Log apenas em desenvolvimento
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('🚪 Fazendo logout');
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  },
  
  // Obter cabeçalhos para requisições autenticadas
  getAuthHeaders: function() {
    const token = this.getToken();
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  },
  
  // Fazer requisição autenticada (VERSÃO CORRIGIDA)
  fetchAuth: async function(url, options = {}) {
    // Log para debug
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('🔄 fetchAuth chamado:', { url, method: options.method || 'GET' });
    }
    
    // Verificar se o token existe
    if (!this.isAuthenticated()) {
      throw new Error('Usuário não autenticado');
    }
    
    // Preparar headers corretamente
    const authHeaders = this.getAuthHeaders();
    const requestOptions = {
      ...options,
      headers: {
        ...authHeaders,
        ...(options.headers || {})
      }
    };
    
    // Log dos headers para debug
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('📋 Headers da requisição:', requestOptions.headers);
    }
    
    try {
      const response = await fetch(url, requestOptions);
      
      // Log da resposta
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('📨 Resposta recebida:', { status: response.status, ok: response.ok });
      }
      
      // Se a resposta for 401 (não autorizado), fazer logout
      if (response.status === 401) {
        console.warn('🔒 Sessão expirada, fazendo logout automático');
        this.logout();
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      // Se o status não for OK, tratar o erro
      if (!response.ok) {
        // Para erros do servidor, tentar obter mensagem de erro
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
        } catch (parseError) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
      }
      
      // Verificar o tipo de conteúdo e fazer parse
      const contentType = response.headers.get('content-type');
      
      try {
        // Se o conteúdo for JSON, fazer parse
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
        
        // Tentar fazer parse de JSON mesmo se o content-type não indicar JSON
        const text = await response.text();
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          return JSON.parse(text);
        }
        
        // Se não for JSON, retornar texto
        return text;
      } catch (parseError) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.warn('⚠️ Erro ao analisar resposta:', parseError);
        }
        throw new Error('Erro ao processar resposta do servidor');
      }
      
    } catch (error) {
      // Log apenas em desenvolvimento
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.error('❌ Erro na requisição autenticada:', error);
      }
      
      throw error;
    }
  }
};

// Inicializar formulário de login
document.addEventListener('DOMContentLoaded', function() {
  // Log apenas em desenvolvimento
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('📄 DOM carregado, inicializando formulário de login');
  }
  
  const loginForm = document.getElementById('login-form');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorElement = document.getElementById('login-error');
      const loginButton = document.getElementById('login-button');
      const loginSpinner = document.getElementById('login-spinner');
      const loginText = document.getElementById('login-text');
      
      // Validação básica
      if (!email || !password) {
        if (errorElement) {
          errorElement.textContent = 'Por favor, preencha email e senha';
          errorElement.classList.remove('d-none');
        }
        return;
      }
      
      // Mostrar spinner e desabilitar botão
      if (loginButton) {
        loginButton.disabled = true;
      }
      if (loginSpinner) {
        loginSpinner.classList.remove('d-none');
      }
      if (loginText) {
        loginText.textContent = 'Entrando...';
      }
      if (errorElement) {
        errorElement.classList.add('d-none');
      }
      
      try {
        await Auth.login(email, password);
        
        // Redirecionar para o dashboard
        window.location.href = '/pages/dashboard.html';
      } catch (error) {
        // Mostrar mensagem de erro
        if (errorElement) {
          errorElement.textContent = error.message || 'Erro ao fazer login. Verifique suas credenciais.';
          errorElement.classList.remove('d-none');
        }
        
        // Restaurar botão
        if (loginButton) {
          loginButton.disabled = false;
        }
        if (loginSpinner) {
          loginSpinner.classList.add('d-none');
        }
        if (loginText) {
          loginText.textContent = 'Entrar';
        }
      }
    });
    
    // Log apenas em desenvolvimento
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('✅ Event listener do formulário de login adicionado');
    }
  } else {
    // Log apenas em desenvolvimento
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.warn('⚠️ Formulário de login não encontrado');
    }
  }
  
  // Verificar se o usuário já está autenticado
  if (Auth.isAuthenticated() && window.location.pathname === '/') {
    // Log apenas em desenvolvimento
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('👤 Usuário já autenticado, redirecionando para dashboard');
    }
    window.location.href = '/pages/dashboard.html';
  }
});