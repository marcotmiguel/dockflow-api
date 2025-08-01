// js/modules/dashboard.js

// Objeto para gerenciar o dashboard
const Dashboard = {
  // Inicializar dashboard
  init: function() {
    this.loadDashboardStats();
    this.loadActiveDocks();
    this.loadTodayLoadings();
    this.loadRetornosStats();
  },

  // Obter conteúdo HTML do dashboard
  getDashboardContent: function() {
    return `
      <div class="dashboard-page">
        <!-- Cards de estatísticas -->
        <div class="row mb-4">
          <div class="col-md-6 col-lg-2 mb-3">
            <div class="card stat-card bg-light-subtle">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="card-title text-muted">Carregamentos Hoje</h6>
                    <h2 class="card-text fw-bold" id="total-loadings">0</h2>
                  </div>
                  <div class="bg-primary bg-opacity-10 p-3 rounded">
                    <i class="fas fa-truck-loading text-primary fa-2x"></i>
                  </div>
                </div>
                <div class="mt-3">
                  <span class="badge bg-success me-1" id="completed-loadings">0</span> Concluídos
                  <span class="badge bg-warning mx-1" id="in-progress-loadings">0</span> Em Andamento
                  <span class="badge bg-info ms-1" id="scheduled-loadings">0</span> Agendados
                </div>
              </div>
            </div>
          </div>
            
          <div class="col-md-6 col-lg-2 mb-3">
            <div class="card stat-card bg-light-subtle">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="card-title text-muted">Docas</h6>
                    <h2 class="card-text fw-bold" id="total-docks">0</h2>
                  </div>
                  <div class="bg-success bg-opacity-10 p-3 rounded">
                    <i class="fas fa-warehouse text-success fa-2x"></i>
                  </div>
                </div>
                <div class="mt-3">
                  <span class="badge bg-success me-1" id="available-docks">0</span> Disponíveis
                  <span class="badge bg-warning ms-1" id="occupied-docks">0</span> Ocupadas
                </div>
              </div>
            </div>
          </div>

          <!-- NOVO CARD: Retornos Pendentes -->
          <div class="col-md-6 col-lg-2 mb-3">
            <div class="card stat-card retornos-card" id="retornos-card" style="cursor: pointer; background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; border: none;">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="card-title text-white">Retornos Pendentes</h6>
                    <h2 class="card-text fw-bold text-white" id="retornos-pendentes">0</h2>
                  </div>
                  <div class="bg-white bg-opacity-20 p-3 rounded">
                    <i class="fas fa-undo text-white fa-2x"></i>
                  </div>
                </div>
                <div class="mt-3">
                  <span class="badge bg-white bg-opacity-25 text-white me-1" id="aguardando-chegada">0</span> Aguardando
                  <span class="badge bg-white bg-opacity-25 text-white ms-1" id="bipando">0</span> Bipando
                </div>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 col-lg-3 mb-3">
            <div class="card stat-card bg-light-subtle">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="card-title text-muted">Taxa de Ocupação</h6>
                    <h2 class="card-text fw-bold" id="occupancy-rate">0%</h2>
                  </div>
                  <div class="bg-warning bg-opacity-10 p-3 rounded">
                    <i class="fas fa-chart-pie text-warning fa-2x"></i>
                  </div>
                </div>
                <div class="mt-3">
                  <div class="progress">
                    <div class="progress-bar bg-warning" role="progressbar" style="width: 0%" id="occupancy-bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 col-lg-3 mb-3">
            <div class="card stat-card bg-light-subtle">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="card-title text-muted">Eficiência</h6>
                    <h2 class="card-text fw-bold" id="loading-efficiency">0%</h2>
                  </div>
                  <div class="bg-info bg-opacity-10 p-3 rounded">
                    <i class="fas fa-chart-line text-info fa-2x"></i>
                  </div>
                </div>
                <div class="mt-3">
                  <div class="progress">
                    <div class="progress-bar bg-info" role="progressbar" style="width: 0%" id="efficiency-bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Status das Docas -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="card shadow-sm">
              <div class="card-header bg-light">
                <div class="d-flex justify-content-between align-items-center">
                  <h5 class="mb-0">Status das Docas</h5>
                  <button class="btn btn-sm btn-primary" data-page="docks">
                    <i class="fas fa-warehouse me-1"></i> Gerenciar Docas
                  </button>
                </div>
              </div>
              <div class="card-body">
                <div class="row" id="active-docks">
                  <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">Carregando...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Carregamentos do Dia -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="card shadow-sm">
              <div class="card-header bg-light">
                <div class="d-flex justify-content-between align-items-center">
                  <h5 class="mb-0">Carregamentos de Hoje</h5>
                  <div>
                    <button class="btn btn-sm btn-success me-2" data-bs-toggle="modal" data-bs-target="#newLoadingModal">
                      <i class="fas fa-plus me-1"></i> Novo Carregamento
                    </button>
                    <button class="btn btn-sm btn-primary" data-page="loadings">
                      <i class="fas fa-list me-1"></i> Ver Todos
                    </button>
                  </div>
                </div>
              </div>
              <div class="card-body">
                <div id="today-loadings">
                  <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">Carregando...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>
          .retornos-card {
            transition: all 0.3s ease;
          }
          
          .retornos-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3) !important;
          }
          
          .retornos-card.pulse {
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        </style>
      </div>
    `;
  },

  // Carregar estatísticas de retornos
  loadRetornosStats: async function() {
    // Esta função não é mais necessária pois os dados são carregados pela função global
    // Mantida para compatibilidade, mas a função carregarEstatisticasRetornos() 
    // já faz o trabalho no HTML
  },

  // Adicionar click listener para o card de retornos
  addRetornosCardListener: function() {
    // O click listener já está definido no HTML via onclick="irParaRetornos()"
    // Mantida para compatibilidade
  },

  // Carregar estatísticas do dashboard
  loadDashboardStats: async function() {
    try {
      // Estatísticas de carregamentos do dia
      let loadingsData = [];
      try {
        const loadingsResponse = await Auth.fetchAuth(`${app.API_URL}/loadings/today`);
        // 🔧 CORREÇÃO: Verificar estrutura da resposta
        if (loadingsResponse && loadingsResponse.data && Array.isArray(loadingsResponse.data)) {
          loadingsData = loadingsResponse.data;
        } else if (Array.isArray(loadingsResponse)) {
          loadingsData = loadingsResponse;
        } else {
          console.warn('Resposta de loadings não é um array:', loadingsResponse);
          loadingsData = [];
        }
      } catch (error) {
        console.warn('Erro ao carregar carregamentos do dia, usando dados vazios:', error);
        loadingsData = [];
      }
      
      // Estatísticas de docas
      let docksData = [];
      try {
        const docksResponse = await Auth.fetchAuth(`${app.API_URL}/docks`);
        // 🔧 CORREÇÃO: Verificar estrutura da resposta
        if (docksResponse && docksResponse.data && Array.isArray(docksResponse.data)) {
          docksData = docksResponse.data;
        } else if (Array.isArray(docksResponse)) {
          docksData = docksResponse;
        } else {
          console.warn('Resposta de docas não é um array:', docksResponse);
          docksData = [];
        }
      } catch (error) {
        console.warn('Erro ao carregar docas, usando dados vazios:', error);
        docksData = [];
      }
      
      // Calcular estatísticas com dados seguros
      const totalLoadings = loadingsData.length;
      const completedLoadings = loadingsData.filter(loading => loading.status === 'completed').length;
      const inProgressLoadings = loadingsData.filter(loading => loading.status === 'in_progress').length;
      const scheduledLoadings = loadingsData.filter(loading => loading.status === 'scheduled').length;
      
      const totalDocks = docksData.length;
      const availableDocks = docksData.filter(dock => dock.status === 'available').length;
      const occupiedDocks = docksData.filter(dock => dock.status === 'occupied').length;
      
        // Atualizar números (usando os IDs corretos do HTML fixo)
        this.updateElement('carregamentos-hoje', totalLoadings);
        this.updateElement('docas-disponiveis', availableDocks);
        this.updateElement('taxa-ocupacao', `${occupancyRate}%`);
        this.updateElement('eficiencia', `${loadingEfficiency}%`);
      
      // Carregar estatísticas de retornos e configurar atualização automática
      this.setupRetornosAutoUpdate();
      
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  },

  // Configurar atualização automática das estatísticas de retornos
  setupRetornosAutoUpdate: function() {
    // Atualizar imediatamente
    if (typeof carregarEstatisticasRetornos === 'function') {
      carregarEstatisticasRetornos();
      
      // Configurar intervalo de atualização a cada 30 segundos
      if (!this.retornosUpdateInterval) {
        this.retornosUpdateInterval = setInterval(carregarEstatisticasRetornos, 30000);
      }
    }
  },

  // Limpar intervalo de atualização (para evitar múltiplos intervalos)
  clearRetornosAutoUpdate: function() {
    if (this.retornosUpdateInterval) {
      clearInterval(this.retornosUpdateInterval);
      this.retornosUpdateInterval = null;
    }
  },

  // Helper para atualizar elementos
  updateElement: function(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  },

  // Helper para atualizar barras de progresso
  updateProgressBar: function(id, value) {
    const bar = document.getElementById(id);
    if (bar) {
      bar.style.width = `${value}%`;
      bar.setAttribute('aria-valuenow', value);
    }
  },

  // Carregar docas ativas
  loadActiveDocks: async function() {
    try {
      const docksResponse = await Auth.fetchAuth(`${app.API_URL}/docks`);
      
      const docksContainer = document.getElementById('active-docks');
      
      if (!docksContainer) return;
      
      // 🔧 CORREÇÃO: Verificar estrutura da resposta e converter para array
      let docksData = [];
      if (docksResponse && docksResponse.data && Array.isArray(docksResponse.data)) {
        docksData = docksResponse.data;
      } else if (Array.isArray(docksResponse)) {
        docksData = docksResponse;
      } else {
        console.warn('Resposta de docas ativas não é um array:', docksResponse);
        docksData = [];
      }
      
      if (docksData.length === 0) {
        docksContainer.innerHTML = '<div class="col-12"><p class="text-center text-muted">Nenhuma doca cadastrada.</p></div>';
        return;
      }
      
      let html = '';
      
      docksData.forEach(dock => {
        const statusClass = dock.status === 'available' ? 'success' : dock.status === 'occupied' ? 'warning' : 'danger';
        const statusText = dock.status === 'available' ? 'Disponível' : dock.status === 'occupied' ? 'Ocupada' : 'Manutenção';
        
        html += `
          <div class="col-md-4 col-lg-3 mb-3">
            <div class="card dock-card ${dock.status}">
              <div class="card-body">
                <h5 class="card-title">${dock.name}</h5>
                <p class="card-text">
                  <span class="badge bg-${statusClass}">${statusText}</span>
                </p>
                <div class="d-flex justify-content-between mt-3">
                  <button class="btn btn-sm btn-outline-primary view-dock-btn" data-id="${dock.id}">
                    <i class="fas fa-eye"></i> Visualizar
                  </button>
                  <button class="btn btn-sm btn-outline-${statusClass} toggle-dock-btn" data-id="${dock.id}" data-status="${dock.status}">
                    ${dock.status === 'available' ? '<i class="fas fa-lock"></i> Bloquear' : '<i class="fas fa-lock-open"></i> Liberar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      });
      
      docksContainer.innerHTML = html;
      
      // Adicionar event listeners
      document.querySelectorAll('.toggle-dock-btn').forEach(btn => {
        btn.addEventListener('click', this.handleToggleDockStatus.bind(this));
      });
      
      document.querySelectorAll('.view-dock-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const dockId = btn.getAttribute('data-id');
          app.loadPage('docks');
        });
      });
      
    } catch (error) {
      console.error('Erro ao carregar docas ativas:', error);
      const docksContainer = document.getElementById('active-docks');
      if (docksContainer) {
        docksContainer.innerHTML = '<div class="col-12"><p class="text-center text-muted">Erro ao carregar docas. Tente recarregar a página.</p></div>';
      }
    }
  },

  // Alternar status da doca
  handleToggleDockStatus: async function(e) {
    const btn = e.currentTarget;
    const dockId = btn.getAttribute('data-id');
    const currentStatus = btn.getAttribute('data-status');
    
    // Definir novo status
    const newStatus = currentStatus === 'available' ? 'maintenance' : 'available';
    
    try {
      await Auth.fetchAuth(`${app.API_URL}/docks/${dockId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      
      // Recarregar dashboard
      this.loadDashboardStats();
      this.loadActiveDocks();
      
      Utils.showSuccessMessage('Status da doca alterado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao alternar status da doca:', error);
      Utils.showErrorMessage('Erro ao alternar status da doca. Tente novamente.');
    }
  },

  // Carregar carregamentos do dia
  loadTodayLoadings: async function() {
    try {
      const loadingsResponse = await Auth.fetchAuth(`${app.API_URL}/loadings/today`);
      
      const loadingsContainer = document.getElementById('today-loadings');
      
      if (!loadingsContainer) return;
      
      // 🔧 CORREÇÃO: Verificar estrutura da resposta e converter para array
      let loadingsData = [];
      if (loadingsResponse && loadingsResponse.data && Array.isArray(loadingsResponse.data)) {
        loadingsData = loadingsResponse.data;
      } else if (Array.isArray(loadingsResponse)) {
        loadingsData = loadingsResponse;
      } else {
        console.warn('Resposta de carregamentos de hoje não é um array:', loadingsResponse);
        loadingsData = [];
      }
      
      if (loadingsData.length === 0) {
        loadingsContainer.innerHTML = '<p class="text-center text-muted">Nenhum carregamento agendado para hoje.</p>';
        return;
      }
      
      let html = `
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Horário</th>
                <th>Motorista</th>
                <th>Doca</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      loadingsData.forEach(loading => {
        const scheduledTime = loading.scheduled_time ? Utils.formatTime(loading.scheduled_time) : '--';
        const statusClass = loading.status === 'scheduled' ? 'info' : loading.status === 'in_progress' ? 'warning' : loading.status === 'completed' ? 'success' : 'danger';
        const statusText = loading.status === 'scheduled' ? 'Agendado' : loading.status === 'in_progress' ? 'Em Andamento' : loading.status === 'completed' ? 'Concluído' : 'Cancelado';
        
        html += `
          <tr>
            <td>${scheduledTime}</td>
            <td>${loading.driver_name || 'Não definido'}</td>
            <td>${loading.dock_name || 'Não definida'}</td>
            <td><span class="badge bg-${statusClass}">${statusText}</span></td>
            <td>
              <button class="btn btn-sm btn-outline-primary view-loading-btn" data-id="${loading.id}">
                <i class="fas fa-eye"></i>
              </button>
              
              ${loading.status === 'scheduled' ? `
                <button class="btn btn-sm btn-outline-success checkin-loading-btn" data-id="${loading.id}">
                  <i class="fas fa-sign-in-alt"></i> Check-in
                </button>
              ` : ''}
              
              ${loading.status === 'in_progress' ? `
                <button class="btn btn-sm btn-outline-warning checkout-loading-btn" data-id="${loading.id}">
                  <i class="fas fa-sign-out-alt"></i> Check-out
                </button>
              ` : ''}
            </td>
          </tr>
        `;
      });
      
      html += `
            </tbody>
          </table>
        </div>
      `;
      
      loadingsContainer.innerHTML = html;
      
      // Adicionar event listeners
      this.addLoadingActionListeners();
      
    } catch (error) {
      console.error('Erro ao carregar carregamentos do dia:', error);
      const loadingsContainer = document.getElementById('today-loadings');
      if (loadingsContainer) {
        loadingsContainer.innerHTML = '<p class="text-center text-muted">Erro ao carregar carregamentos. Tente recarregar a página.</p>';
      }
    }
  },

  // Adicionar event listeners para ações de carregamentos
  addLoadingActionListeners: function() {
    document.querySelectorAll('.view-loading-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const loadingId = btn.getAttribute('data-id');
        if (typeof app !== 'undefined' && app.viewLoading) {
          app.viewLoading(loadingId);
        } else {
          console.warn('Função app.viewLoading não encontrada');
        }
      });
    });
    
    document.querySelectorAll('.checkin-loading-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const loadingId = btn.getAttribute('data-id');
        this.checkInLoading(loadingId);
      });
    });
    
    document.querySelectorAll('.checkout-loading-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const loadingId = btn.getAttribute('data-id');
        this.checkOutLoading(loadingId);
      });
    });
  },

  // Fazer check-in de carregamento
  checkInLoading: async function(loadingId) {
    try {
      // Obter docas disponíveis
      const docksResponse = await Auth.fetchAuth(`${app.API_URL}/docks`);
      
      // Verificar estrutura da resposta
      let docksData = [];
      if (docksResponse && docksResponse.data && Array.isArray(docksResponse.data)) {
        docksData = docksResponse.data;
      } else if (Array.isArray(docksResponse)) {
        docksData = docksResponse;
      } else {
        docksData = [];
      }
      
      const availableDocks = docksData.filter(dock => dock.status === 'available');
      
      if (availableDocks.length === 0) {
        Utils.showWarningMessage('Não há docas disponíveis para check-in.');
        return;
      }
      
      // Mostrar modal para selecionar doca
      const dockOptions = availableDocks.map(dock => `<option value="${dock.id}">${dock.name}</option>`).join('');
      
      const modalHtml = `
        <div class="modal fade" id="checkinModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Check-in de Carregamento</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
              </div>
              <div class="modal-body">
                <form id="checkin-form">
                  <div class="mb-3">
                    <label for="dock-select" class="form-label">Selecione a Doca</label>
                    <select class="form-select" id="dock-select" required>
                      <option value="">Selecione...</option>
                      ${dockOptions}
                    </select>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" id="confirm-checkin">Confirmar Check-in</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Adicionar modal ao corpo do documento
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHtml;
      document.body.appendChild(modalContainer);
      
      // Inicializar e mostrar modal
      const modal = new bootstrap.Modal(document.getElementById('checkinModal'));
      modal.show();
      
      // Adicionar event listener para o botão de confirmação
      document.getElementById('confirm-checkin').addEventListener('click', async () => {
        const dockId = document.getElementById('dock-select').value;
        
        if (!dockId) {
          Utils.showWarningMessage('Selecione uma doca para continuar.');
          return;
        }
        
        try {
          await Auth.fetchAuth(`${app.API_URL}/loadings/${loadingId}/checkin`, {
            method: 'POST',
            body: JSON.stringify({ dock_id: dockId })
          });
          
          // Fechar modal
          modal.hide();
          modalContainer.remove();
          
          // Recarregar dashboard
          this.loadDashboardStats();
          this.loadActiveDocks();
          this.loadTodayLoadings();
          
          Utils.showSuccessMessage('Check-in realizado com sucesso!');
          
        } catch (error) {
          console.error('Erro ao fazer check-in:', error);
          Utils.showErrorMessage('Erro ao fazer check-in. Tente novamente.');
        }
      });
      
    } catch (error) {
      console.error('Erro ao preparar check-in:', error);
      Utils.showErrorMessage('Erro ao preparar check-in. Tente novamente.');
    }
  },

  // Fazer check-out de carregamento
  checkOutLoading: async function(loadingId) {
    const confirmed = await Utils.confirmAction(
      'Confirmar Check-out',
      'Confirma o check-out deste carregamento?',
      'Confirmar',
      'Cancelar'
    );
    
    if (!confirmed) return;
    
    try {
      await Auth.fetchAuth(`${app.API_URL}/loadings/${loadingId}/checkout`, {
        method: 'POST'
      });
      
      // Recarregar dashboard
      this.loadDashboardStats();
      this.loadActiveDocks();
      this.loadTodayLoadings();
      
      Utils.showSuccessMessage('Check-out realizado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao fazer check-out:', error);
      Utils.showErrorMessage('Erro ao fazer check-out. Tente novamente.');
    }
  }
};