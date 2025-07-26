// js/modules/loadings-core.js
// 🏗️ MÓDULO CORE - Funções principais e gerenciamento central

const LoadingsCore = {
  allLoadings: [],
  currentLoadingId: null,

  // 🚀 Inicialização principal
  init: function() {
    console.log('🏗️ Inicializando LoadingsCore...');
    this.loadQueue();
    this.setupCoreEventListeners();
    this.updateStats();
  },

// 📋 Event listeners principais
  setupCoreEventListeners: function() {
    const searchInput = document.getElementById('loading-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchLoadings(e.target.value);
      });
    }
    
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filterByStatus(e.target.value);
      });
    }
    
    const refreshBtn = document.getElementById('refresh-loadings');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadQueue();
      });
    }
    
    const completeLoadingBtn = document.getElementById('complete-loading-btn');
    if (completeLoadingBtn) {
      completeLoadingBtn.addEventListener('click', () => {
        this.completeLoading();
      });
    }
    
    const pauseLoadingBtn = document.getElementById('pause-loading-btn');
    if (pauseLoadingBtn) {
      pauseLoadingBtn.addEventListener('click', () => {
        this.pauseLoading();
      });
    }
  },

  // 📊 Carregamento da fila
  loadQueue: async function() {
    try {
      console.log('🔄 Carregando fila de carregamentos...');
      
      // Verificar se a API de carregamentos está disponível
      if (window.CarregamentosAPI) {
        console.log('📡 Usando API de carregamentos...');
        
        // Carregar fila da API
        const queue = await window.CarregamentosAPI.getQueue();
        this.allLoadings = queue || [];
        
        console.log(`✅ ${this.allLoadings.length} itens carregados da API`);
        
        // Carregar estatísticas também
        const stats = await window.CarregamentosAPI.getStats();
        if (stats) {
          this.updateStatsFromAPI(stats);
        }
        
      } else {
        console.warn('⚠️ API de carregamentos não disponível, usando dados locais');
        
        // Fallback para dados locais
        if (!this.allLoadings) {
          this.allLoadings = this.getLocalQueueData();
        }
      }
      
      // Exibir dados
      this.displayQueue(this.allLoadings);
      this.updateStats();
      
    } catch (error) {
      console.error('❌ Erro ao carregar fila:', error);
      
      // Em caso de erro, usar dados locais
      this.allLoadings = this.getLocalQueueData();
      this.displayQueue(this.allLoadings);
      this.updateStats();
    }
  },

  // 📊 Atualizar estatísticas da API
  updateStatsFromAPI: function(stats) {
    try {
      console.log('📊 Atualizando estatísticas da API:', stats);
      
      // Atualizar contadores na interface
      const waitingCount = document.getElementById('waiting-count');
      const approvedCount = document.getElementById('approved-count');
      const loadingCount = document.getElementById('loading-count');
      const completedToday = document.getElementById('completed-today');
      
      if (waitingCount) waitingCount.textContent = stats.aguardando || 0;
      if (approvedCount) approvedCount.textContent = stats.em_rota || 0;
      if (loadingCount) loadingCount.textContent = stats.volumes_em_armazem || 0;
      if (completedToday) completedToday.textContent = stats.entregue_hoje || 0;
      
      // Atualizar total da fila
      const totalQueue = document.getElementById('total-queue');
      if (totalQueue) {
        const total = (stats.aguardando || 0) + (stats.em_rota || 0);
        totalQueue.textContent = total;
      }
      
    } catch (error) {
      console.error('❌ Erro ao atualizar estatísticas:', error);
    }
  },

  // 💾 Dados locais de fallback
  getLocalQueueData: function() {
    return [
      {
        id: 1,
        driver_name: 'João Silva',
        driver_cpf: '123.456.789-01',
        vehicle_plate: 'ABC1234',
        vehicle_type: 'Caminhão',
        route_code: 'SP-CENTRO',
        route_description: 'São Paulo Centro',
        status: 'waiting',
        requested_at: new Date().toISOString(),
        phone_number: '11999999999'
      },
      {
        id: 2,
        driver_name: 'Maria Santos',
        driver_cpf: '987.654.321-00',
        vehicle_plate: 'XYZ5678',
        vehicle_type: 'Van',
        route_code: 'SP-ZONA-SUL',
        route_description: 'São Paulo Zona Sul',
        status: 'approved',
        requested_at: new Date(Date.now() - 3600000).toISOString(),
        phone_number: '11888888888'
      },
      {
        id: 3,
        driver_name: 'Pedro Costa',
        driver_cpf: '111.222.333-44',
        vehicle_plate: 'DEF9012',
        vehicle_type: 'Caminhão',
        route_code: 'RJ-CENTRO',
        route_description: 'Rio de Janeiro Centro',
        status: 'loading',
        requested_at: new Date(Date.now() - 7200000).toISOString(),
        phone_number: '21777777777'
      }
    ];
  },
  // 🖥️ Exibição da fila
  displayQueue: function(loadings) {
    const container = document.getElementById('queue-container');
    if (!container) return;
    
    if (!loadings || loadings.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="fas fa-truck text-muted fa-3x mb-3"></i>
          <h5 class="text-muted">Nenhum carregamento na fila</h5>
          <p class="text-muted">Use o simulador WhatsApp ou importe XML para adicionar carregamentos</p>
          <button class="btn btn-success me-2" onclick="LoadingsXML.showXmlTab()">
            <i class="fas fa-file-upload me-2"></i>
            Importar XML
          </button>
        </div>
      `;
      return;
    }
    
    let html = '';
    loadings.forEach((loading, index) => {
      const statusClass = this.getStatusClass(loading.status);
      const statusText = this.getStatusText(loading.status);
      const timeInQueue = this.calculateTimeInQueue(loading.created_at || loading.timestamp);
      const priority = loading.priority || 'normal';
      const priorityClass = priority === 'urgent' ? 'danger' : priority === 'high' ? 'warning' : 'info';
      
      const isXmlImport = loading.imported || loading.xml_file || loading.xml_data;
      const driverDisplay = isXmlImport ? 
        `XML: ${loading.destinatario || loading.emitente || 'Importado'}` : 
        loading.driver_name;
      const plateDisplay = isXmlImport ? 
        `NF: ${loading.nota_fiscal || 'XML'}` : 
        loading.vehicle_plate;
      
      html += `
        <div class="card mb-3 queue-item ${statusClass}" data-loading-id="${loading.id}">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-md-1 text-center">
                <h5 class="mb-0 text-muted">#${index + 1}</h5>
              </div>
              
              <div class="col-md-3">
                <div class="d-flex align-items-center">
                  <div class="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                    <i class="fas fa-${isXmlImport ? 'file-alt' : 'user'} text-primary"></i>
                  </div>
                  <div>
                    <h6 class="mb-1">${driverDisplay}</h6>
                    <small class="text-muted">${isXmlImport ? 'Importado via XML' : `CPF: ${loading.driver_cpf || 'N/A'}`}</small>
                    ${isXmlImport ? '<span class="badge bg-success ms-1">XML</span>' : ''}
                  </div>
                </div>
              </div>
              
              <div class="col-md-2">
                <div class="text-center">
                  <i class="fas fa-${isXmlImport ? 'file-invoice' : 'truck'} text-muted"></i>
                  <div class="fw-bold">${plateDisplay}</div>
                  <small class="text-muted">${isXmlImport ? `${loading.produtos_count || 0} produtos` : (loading.vehicle_type || 'N/A')}</small>
                </div>
              </div>
              
              <div class="col-md-2">
                <div class="text-center">
                  <i class="fas fa-route text-muted"></i>
                  <div class="fw-bold">${loading.route_code || loading.route?.name || 'N/A'}</div>
                  <span class="badge bg-${priorityClass}">${priority.toUpperCase()}</span>
                </div>
              </div>
              
              <div class="col-md-2">
                <div class="text-center">
                  <span class="badge bg-${this.getStatusBadgeClass(loading.status)}">${statusText}</span>
                  <div class="small text-muted mt-1">${timeInQueue}</div>
                  ${loading.dock_id ? `<div class="small text-info">Doca ${loading.dock_id}</div>` : ''}
                  ${isXmlImport ? '<div class="small text-success">Aguarda motorista</div>' : ''}
                </div>
              </div>
              
              <div class="col-md-2 text-end">
                <div class="btn-group-vertical btn-group-sm" role="group">
                  ${this.generateActionButtons(loading)}
                </div>
              </div>
            </div>
            
            ${isXmlImport ? `
            <div class="row mt-2">
              <div class="col-12">
                <div class="alert alert-info mb-0 py-2">
                  <small>
                    <strong>📋 NF ${loading.nota_fiscal}:</strong> ${loading.emitente} → ${loading.destinatario}
                    ${loading.xml_data && loading.xml_data.agendamento && loading.xml_data.agendamento.temAgendamento ? 
                      ` | <strong>📅 Agendado:</strong> ${loading.xml_data.agendamento.data} ${loading.xml_data.agendamento.horario}` : ''}
                  </small>
                </div>
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
    this.addQueueActionListeners();
  },

  // 🎯 Geração de botões de ação
  generateActionButtons: function(loading) {
    const user = Auth.getUser();
    let buttons = '';
    
    switch (loading.status) {
      case 'waiting':
        if (user.role === 'admin' || user.role === 'manager') {
          buttons += `
            <button class="btn btn-success approve-loading-btn" data-id="${loading.id}" title="Aprovar">
              <i class="fas fa-check"></i>
            </button>
          `;
        }
        buttons += `
          <button class="btn btn-info view-loading-btn" data-id="${loading.id}" title="Visualizar">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-warning send-whatsapp-btn" data-phone="${loading.phone_number}" title="WhatsApp">
            <i class="fab fa-whatsapp"></i>
          </button>
        `;
        break;
        
      case 'approved':
        buttons += `
          <button class="btn btn-primary start-loading-btn" data-id="${loading.id}" title="Iniciar Carregamento">
            <i class="fas fa-play"></i> Iniciar
          </button>
          <button class="btn btn-info view-loading-btn" data-id="${loading.id}" title="Visualizar">
            <i class="fas fa-eye"></i>
          </button>
        `;
        break;
        
      case 'loading':
        buttons += `
          <button class="btn btn-success manage-loading-btn" data-id="${loading.id}" title="Gerenciar Bipagem">
            <i class="fas fa-barcode"></i> Bipar
          </button>
          <button class="btn btn-warning pause-loading-btn" data-id="${loading.id}" title="Pausar">
            <i class="fas fa-pause"></i>
          </button>
          <button class="btn btn-info view-loading-btn" data-id="${loading.id}" title="Visualizar">
            <i class="fas fa-eye"></i>
          </button>
        `;
        break;
        
      case 'completed':
        buttons += `
          <button class="btn btn-info view-loading-btn" data-id="${loading.id}" title="Visualizar">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-success generate-route-btn" data-id="${loading.id}" title="Gerar Rota">
            <i class="fas fa-route"></i>
          </button>
        `;
        break;
    }
    
    if (user.role === 'admin' && loading.status !== 'completed' && loading.status !== 'cancelled') {
      buttons += `
        <button class="btn btn-danger cancel-loading-btn" data-id="${loading.id}" title="Cancelar">
          <i class="fas fa-times"></i>
        </button>
      `;
    }
    
    return buttons;
  },

  // 🔗 Event listeners das ações
  addQueueActionListeners: function() {
    document.querySelectorAll('.approve-loading-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const loadingId = e.currentTarget.getAttribute('data-id');
        this.approveLoading(loadingId);
      });
    });
    
    document.querySelectorAll('.start-loading-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const loadingId = e.currentTarget.getAttribute('data-id');
        LoadingsDocks.startLoading(loadingId);
      });
    });
    
    document.querySelectorAll('.manage-loading-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const loadingId = e.currentTarget.getAttribute('data-id');
        LoadingsScanning.manageLoading(loadingId);
      });
    });
    
    document.querySelectorAll('.view-loading-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const loadingId = e.currentTarget.getAttribute('data-id');
        this.viewLoading(loadingId);
      });
    });
    
    document.querySelectorAll('.send-whatsapp-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const phone = e.currentTarget.getAttribute('data-phone');
        this.sendWhatsAppMessage(phone);
      });
    });
    
    document.querySelectorAll('.cancel-loading-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const loadingId = e.currentTarget.getAttribute('data-id');
        this.cancelLoading(loadingId);
      });
    });
  },

  // ✅ Aprovar carregamento
  approveLoading: function(loadingId) {
    const loadingIndex = this.allLoadings.findIndex(loading => loading.id == loadingId);
    if (loadingIndex === -1) {
      Utils.showErrorMessage('Carregamento não encontrado');
      return;
    }
    
    this.allLoadings[loadingIndex].status = 'approved';
    this.allLoadings[loadingIndex].approved_at = new Date().toISOString();
    
    Utils.showSuccessMessage('Carregamento aprovado com sucesso!');
    this.displayQueue(this.allLoadings);
    this.updateStats();
  },

  // ✅ Finalizar carregamento
  completeLoading: function() {
    if (!this.currentLoadingId) return;
    
    const loadingIndex = this.allLoadings.findIndex(loading => loading.id == this.currentLoadingId);
    if (loadingIndex === -1) {
      Utils.showErrorMessage('Carregamento não encontrado');
      return;
    }
    
    const loading = this.allLoadings[loadingIndex];
    
    // Liberar a doca
    LoadingsDocks.releaseDock(this.currentLoadingId);
    
    // Atualizar status
    this.allLoadings[loadingIndex].status = 'completed';
    this.allLoadings[loadingIndex].completed_at = new Date().toISOString();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('manageLoadingModal'));
    if (modal) modal.hide();
    
    Utils.showSuccessMessage(`✅ Carregamento finalizado com sucesso! Doca ${loading.dock_id} liberada.`);
    this.displayQueue(this.allLoadings);
    this.updateStats();
  },

  // ⏸️ Pausar carregamento
  pauseLoading: function() {
    if (!this.currentLoadingId) return;
    
    const loadingIndex = this.allLoadings.findIndex(loading => loading.id == this.currentLoadingId);
    if (loadingIndex === -1) {
      Utils.showErrorMessage('Carregamento não encontrado');
      return;
    }
    
    const loading = this.allLoadings[loadingIndex];
    
    // Liberar a doca
    LoadingsDocks.releaseDock(this.currentLoadingId);
    
    // Atualizar status
    this.allLoadings[loadingIndex].status = 'approved';
    this.allLoadings[loadingIndex].paused_at = new Date().toISOString();
    this.allLoadings[loadingIndex].dock_id = null;
    
    Utils.showWarningMessage(`⏸️ Carregamento pausado. Doca ${loading.dock_id} liberada.`);
    this.displayQueue(this.allLoadings);
    this.updateStats();
  },

  // 📊 Atualização de estatísticas
  updateStats: function() {
    if (!this.allLoadings) return;
    
    const waiting = this.allLoadings.filter(item => item.status === 'waiting').length;
    const approved = this.allLoadings.filter(item => item.status === 'approved').length;
    const loading = this.allLoadings.filter(item => item.status === 'loading').length;
    const completed = this.allLoadings.filter(item => 
      item.status === 'completed' && 
      new Date(item.completed_at || item.timestamp).toDateString() === new Date().toDateString()
    ).length;
    
    const waitingEl = document.getElementById('waiting-count');
    const approvedEl = document.getElementById('approved-count');
    const loadingEl = document.getElementById('loading-count');
    const completedEl = document.getElementById('completed-today');
    const totalEl = document.getElementById('total-queue');
    
    if (waitingEl) waitingEl.textContent = waiting;
    if (approvedEl) approvedEl.textContent = approved;
    if (loadingEl) loadingEl.textContent = loading;
    if (completedEl) completedEl.textContent = completed;
    if (totalEl) totalEl.textContent = this.allLoadings.length;
  },

  // 🔍 Buscar carregamentos
  searchLoadings: function(searchTerm) {
    if (!this.allLoadings) return;
    
    const filteredLoadings = this.allLoadings.filter(loading => 
      loading.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loading.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loading.route_code && loading.route_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (loading.route && loading.route.name && loading.route.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    this.displayQueue(filteredLoadings);
  },

  // 🎯 Filtrar por status
  filterByStatus: function(status) {
    if (!this.allLoadings) return;
    
    if (!status) {
      this.displayQueue(this.allLoadings);
      return;
    }
    
    const filteredLoadings = this.allLoadings.filter(loading => loading.status === status);
    this.displayQueue(filteredLoadings);
  },

  // 👁️ Visualizar carregamento
  viewLoading: function(loadingId) {
    const loading = this.allLoadings.find(l => l.id == loadingId);
    if (loading) {
      if (loading.xml_data) {
        Utils.showSuccessMessage(`📋 NF: ${loading.nota_fiscal} | ${loading.emitente} → ${loading.destinatario} | ${loading.produtos_count} produtos`);
      } else {
        Utils.showSuccessMessage(`🚛 Carregamento #${loadingId} - ${loading.driver_name} - ${loading.vehicle_plate}`);
      }
    } else {
      Utils.showErrorMessage('Carregamento não encontrado');
    }
  },

  // ❌ Cancelar carregamento
  cancelLoading: function(loadingId) {
    if (!confirm('Tem certeza que deseja cancelar este carregamento?')) return;
    
    const loadingIndex = this.allLoadings.findIndex(loading => loading.id == loadingId);
    if (loadingIndex === -1) {
      Utils.showErrorMessage('Carregamento não encontrado');
      return;
    }
    
    this.allLoadings[loadingIndex].status = 'cancelled';
    this.allLoadings[loadingIndex].cancelled_at = new Date().toISOString();
    
    Utils.showSuccessMessage('Carregamento cancelado');
    this.displayQueue(this.allLoadings);
    this.updateStats();
  },

  // 📱 Enviar mensagem WhatsApp
  sendWhatsAppMessage: function(phone) {
    const message = `Olá! Aqui é da DockFlow. Seu carregamento está sendo processado.`;
    const whatsappUrl = Utils.generateWhatsAppURL(phone, message);
    window.open(whatsappUrl, '_blank');
  },

  // 🛠️ Utilitários
  getStatusClass: function(status) {
    const classes = {
      'waiting': 'status-waiting',
      'approved': 'status-approved',
      'loading': 'status-loading',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return classes[status] || '';
  },

  getStatusBadgeClass: function(status) {
    const classes = {
      'waiting': 'warning',
      'approved': 'info',
      'loading': 'primary',
      'completed': 'success',
      'cancelled': 'danger'
    };
    return classes[status] || 'secondary';
  },

  getStatusText: function(status) {
    const texts = {
      'waiting': 'Aguardando',
      'approved': 'Aprovado',
      'loading': 'Carregando',
      'completed': 'Concluído',
      'cancelled': 'Cancelado'
    };
    return texts[status] || 'Desconhecido';
  },

  calculateTimeInQueue: function(createdAt) {
    if (!createdAt) return 'N/A';
    
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now - created) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}min`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}min`;
    }
  }
};

// 🌐 Expor globalmente
window.LoadingsCore = LoadingsCore;