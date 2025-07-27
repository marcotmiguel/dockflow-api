// js/auth.js - Sistema de Autenticação DockFlow (Railway Compatible)

// 🔧 Configuração dinâmica da API baseada no ambiente
const getApiUrl = () => {
  // Se window.API_URL foi definido no HTML, usar ele
  if (window.API_URL) {
    return window.API_URL;
  }
  
  // Detectar ambiente automaticamente
  const hostname = window.location.hostname;
  const origin = window.location.origin;
  
  // Railway production
  if (hostname.includes('railway.app')) {
    return origin + '/api';
  }
  
  // Desenvolvimento local
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return origin + '/api';
  }
  
  // Fallback para outros ambientes
  return origin + '/api';
};

const API_URL = getApiUrl();

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
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  },
  
  // Fazer requisição autenticada
  fetchAuth: async function(url, options = {}) {
    // Verificar se o token existe
    if (!this.isAuthenticated()) {
      throw new Error('Usuário não autenticado');
    }
    
    // Adicionar cabeçalhos de autenticação
    const headers = options.headers || {};
    
    const authOptions = {
      ...options,
      headers: {
        ...headers,
        ...this.getAuthHeaders()
      }
    };
    
    try {
      const response = await fetch(url, authOptions);
      
      // Se a resposta for 401 (não autorizado), fazer logout
      if (response.status === 401) {
        // Log apenas em desenvolvimento
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.warn('🔒 Sessão expirada, fazendo logout automático');
        }
        this.logout();
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      // Verificar o tipo de conteúdo
      const contentType = response.headers.get('content-type');
      
      // Se o status não for OK, tratar o erro
      if (!response.ok) {
        // Para erros do servidor, retornar um array vazio em vez de falhar
        if (response.status >= 500) {
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.warn(`⚠️ Erro do servidor (${response.status}) ao acessar ${url}. Retornando array vazio.`);
          }
          return [];
        }
        
        // Para outros erros, tentar obter a mensagem de erro
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
        } catch (parseError) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
      }
      
      // Verificar se é possível fazer parse de JSON (mesmo se content-type estiver incorreto)
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
        
        // Se não for JSON e a resposta for HTML, retornar um array vazio
        if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.warn('⚠️ Resposta HTML recebida em vez de JSON. Retornando array vazio.');
          }
          return [];
        }
        
        // Outros tipos de resposta
        return text;
      } catch (parseError) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.warn('⚠️ Erro ao analisar resposta:', parseError);
        }
        return []; // Retornar array vazio em vez de falhar
      }
    } catch (error) {
      // Log apenas em desenvolvimento
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.error('❌ Erro na requisição autenticada:', error);
      }
      
      // Para erros de rede, retornar um array vazio em vez de falhar
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.warn('⚠️ Erro de rede ao fazer requisição. Retornando array vazio.');
        }
        return [];
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