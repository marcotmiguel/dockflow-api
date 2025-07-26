// js/auth.js

// Configuração do sistema
const API_URL = 'http://localhost:8080/api';

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
      
      // Salvar token e dados do usuário
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return data;
    } catch (error) {
      console.error('Erro de login:', error);
      throw error;
    }
  },
  
  // Fazer logout
  logout: function() {
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
      this.logout();
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }
    
    // Verificar o tipo de conteúdo
    const contentType = response.headers.get('content-type');
    
    // Se o status não for OK, tratar o erro
    if (!response.ok) {
      // Para erros do servidor, retornar um array vazio em vez de falhar
      if (response.status >= 500) {
        console.warn(`Erro do servidor (${response.status}) ao acessar ${url}. Retornando array vazio.`);
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
        console.warn('Resposta HTML recebida em vez de JSON. Retornando array vazio.');
        return [];
      }
      
      // Outros tipos de resposta
      return text;
    } catch (parseError) {
      console.warn('Erro ao analisar resposta:', parseError);
      return []; // Retornar array vazio em vez de falhar
    }
  } catch (error) {
    console.error('Erro na requisição autenticada:', error);
    
    // Para erros de rede, retornar um array vazio em vez de falhar
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.warn('Erro de rede ao fazer requisição. Retornando array vazio.');
      return [];
    }
    
    throw error;
  }
}
};

// Inicializar formulário de login
document.addEventListener('DOMContentLoaded', function() {
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
      
      // Mostrar spinner e desabilitar botão
      loginButton.disabled = true;
      loginSpinner.classList.remove('d-none');
      loginText.textContent = 'Entrando...';
      errorElement.classList.add('d-none');
      
      try {
        await Auth.login(email, password);
        
        // Redirecionar para o dashboard
        window.location.href = '/pages/dashboard.html';
      } catch (error) {
        // Mostrar mensagem de erro
        errorElement.textContent = error.message || 'Erro ao fazer login. Verifique suas credenciais.';
        errorElement.classList.remove('d-none');
        
        // Restaurar botão
        loginButton.disabled = false;
        loginSpinner.classList.add('d-none');
        loginText.textContent = 'Entrar';
      }
    });
  }
  
  // Verificar se o usuário já está autenticado
  if (Auth.isAuthenticated() && window.location.pathname === '/') {
    window.location.href = '/pages/dashboard.html';
  }
});