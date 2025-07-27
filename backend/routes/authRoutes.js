// Configuração da API
const API_URL = 'https://dockflow-api-production.up.railway.app';

// Função para obter o token armazenado
function getAuthToken() {
  return localStorage.getItem('authToken');
}

// Função para configurar headers com autenticação
function getAuthHeaders() {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// Função para fazer requisições autenticadas
async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  };
  
  console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, config);
    
    if (response.status === 401) {
      console.log('❌ Token expirado ou inválido, redirecionando para login...');
      logout();
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    throw error;
  }
}

// Função de login
async function login(email, password) {
  console.log('🔐 Tentando fazer login...');
  
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      console.log('✅ Login realizado com sucesso');
      
      // Armazenar token
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify({
        id: data.user.id,
        username: data.user.username,
        email: data.user.email
      }));
      
      return { success: true, data };
    } else {
      console.log('❌ Falha no login:', data.message);
      return { success: false, message: data.message || 'Erro no login' };
    }
  } catch (error) {
    console.error('❌ Erro no login:', error);
    return { success: false, message: 'Erro de conexão' };
  }
}

// Função de logout
function logout() {
  console.log('🚪 Fazendo logout...');
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
  window.location.href = '/';
}

// Verificar se está logado
function isLoggedIn() {
  return !!getAuthToken();
}

// Função para carregar dados do dashboard
async function loadDashboardData() {
  console.log('📊 Carregando dados do dashboard...');
  
  try {
    // Carregar docas
    const docksResponse = await apiRequest('/api/docks');
    if (docksResponse && docksResponse.ok) {
      const docksData = await docksResponse.json();
      updateDocksDisplay(docksData.data || []);
    } else {
      console.error('❌ Erro ao carregar docas');
      updateDocksDisplay([]);
    }

    // Carregar carregamentos de hoje
    const loadingsResponse = await apiRequest('/api/loadings/today');
    if (loadingsResponse && loadingsResponse.ok) {
      const loadingsData = await loadingsResponse.json();
      updateLoadingsDisplay(loadingsData.data || []);
    } else {
      console.error('❌ Erro ao carregar carregamentos de hoje');
      updateLoadingsDisplay([]);
    }
    
  } catch (error) {
    console.error('❌ Erro ao carregar dados do dashboard:', error);
  }
}

// Atualizar exibição das docas
function updateDocksDisplay(docks) {
  console.log(`📋 Atualizando exibição de ${docks.length} docas`);
  
  const docksContainer = document.querySelector('#docks-list');
  if (!docksContainer) return;
  
  if (docks.length === 0) {
    docksContainer.innerHTML = '<p class="text-gray-500">Nenhuma doca encontrada</p>';
    return;
  }
  
  docksContainer.innerHTML = docks.map(dock => `
    <div class="bg-white p-4 rounded-lg shadow border-l-4 ${dock.status === 'available' ? 'border-green-500' : 'border-red-500'}">
      <div class="flex justify-between items-center">
        <h3 class="font-semibold text-gray-800">${dock.name}</h3>
        <span class="px-2 py-1 rounded text-sm ${dock.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
          ${dock.status === 'available' ? 'Disponível' : 'Ocupada'}
        </span>
      </div>
      <p class="text-sm text-gray-600 mt-1">ID: ${dock.id}</p>
    </div>
  `).join('');
}

// Atualizar exibição dos carregamentos
function updateLoadingsDisplay(loadings) {
  console.log(`📋 Atualizando exibição de ${loadings.length} carregamentos`);
  
  const loadingsContainer = document.querySelector('#loadings-list');
  if (!loadingsContainer) return;
  
  if (loadings.length === 0) {
    loadingsContainer.innerHTML = '<p class="text-gray-500">Nenhum carregamento encontrado para hoje</p>';
    return;
  }
  
  loadingsContainer.innerHTML = loadings.map(loading => `
    <div class="bg-white p-4 rounded-lg shadow">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-semibold text-gray-800">${loading.truck_plate}</h3>
          <p class="text-sm text-gray-600">Motorista: ${loading.driver_name}</p>
          <p class="text-sm text-gray-600">Tipo: ${loading.cargo_type}</p>
          ${loading.weight ? `<p class="text-sm text-gray-600">Peso: ${loading.weight}kg</p>` : ''}
          ${loading.dock_name ? `<p class="text-sm text-gray-600">Doca: ${loading.dock_name}</p>` : ''}
        </div>
        <span class="px-2 py-1 rounded text-sm bg-blue-100 text-blue-800">
          ${getStatusText(loading.status)}
        </span>
      </div>
      <div class="mt-2 text-xs text-gray-500">
        ${loading.origin ? `De: ${loading.origin}` : ''} 
        ${loading.destination ? `Para: ${loading.destination}` : ''}
      </div>
    </div>
  `).join('');
}

// Converter status para texto
function getStatusText(status) {
  const statusMap = {
    'scheduled': 'Agendado',
    'loading': 'Carregando',
    'completed': 'Concluído',
    'cancelled': 'Cancelado'
  };
  return statusMap[status] || status;
}

// Event listeners quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 DOM carregado');
  
  // Se estiver na página de login
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    console.log('🔐 Página de login detectada');
    
    // Verificar se já está logado
    if (isLoggedIn()) {
      console.log('✅ Usuário já logado, redirecionando...');
      window.location.href = '/dashboard.html';
      return;
    }
    
    // Configurar formulário de login
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const loginButton = document.getElementById('loginButton');
      const errorMessage = document.getElementById('errorMessage');
      
      // Desabilitar botão e mostrar loading
      loginButton.disabled = true;
      loginButton.textContent = 'Entrando...';
      errorMessage.classList.add('hidden');
      
      try {
        const result = await login(email, password);
        
        if (result.success) {
          window.location.href = '/dashboard.html';
        } else {
          errorMessage.textContent = result.message;
          errorMessage.classList.remove('hidden');
        }
      } catch (error) {
        errorMessage.textContent = 'Erro de conexão. Tente novamente.';
        errorMessage.classList.remove('hidden');
      } finally {
        // Reabilitar botão
        loginButton.disabled = false;
        loginButton.textContent = 'Entrar';
      }
    });
  }
  
  // Se estiver no dashboard
  if (window.location.pathname.includes('dashboard') || window.location.pathname === '/') {
    console.log('📊 Dashboard detectado');
    
    // Verificar se está logado
    if (!isLoggedIn()) {
      console.log('❌ Usuário não logado, redirecionando...');
      window.location.href = '/';
      return;
    }
    
    // Configurar botão de logout
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
      logoutButton.addEventListener('click', logout);
    }
    
    // Carregar dados do dashboard
    loadDashboardData();
    
    // Recarregar dados a cada 30 segundos
    setInterval(loadDashboardData, 30000);
  }
});

// Exportar funções globalmente se necessário
window.DockFlowAuth = {
  login,
  logout,
  isLoggedIn,
  loadDashboardData,
  apiRequest
};