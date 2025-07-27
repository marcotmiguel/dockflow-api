// js/modules/docks.js

// Objeto para gerenciar docas
const Docks = {
  allDocks: [],
  currentDockId: null,
  dockToDelete: null,

  // Inicializar módulo de docas
  init: function() {
    this.loadDocksList();
    this.setupDocksEventListeners();
  },

  // Configurar event listeners
  setupDocksEventListeners: function() {
    const searchInput = document.getElementById('dock-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchDocks(e.target.value);
      });
    }

    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filterDocksByStatus(e.target.value);
      });
    }
    
    const refreshBtn = document.getElementById('refresh-docks');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadDocksList();
      });
    }
    
    const exportBtn = document.getElementById('export-docks');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportDocks();
      });
    }
    
    const saveDockBtn = document.getElementById('save-dock-btn');
    if (saveDockBtn) {
      saveDockBtn.addEventListener('click', () => {
        this.saveDock();
      });
    }
    
    const confirmDeleteBtn = document.getElementById('confirm-delete-dock');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        this.deleteDock();
      });
    }
    
    const editDockBtn = document.getElementById('edit-dock-btn');
    if (editDockBtn) {
      editDockBtn.addEventListener('click', () => {
        this.editCurrentDock();
      });
    }

    const newLoadingBtn = document.getElementById('new-loading-for-dock-btn');
    if (newLoadingBtn) {
      newLoadingBtn.addEventListener('click', () => {
        this.createLoadingForDock();
      });
    }
    
    const dockModal = document.getElementById('dockModal');
    if (dockModal) {
      dockModal.addEventListener('hidden.bs.modal', () => {
        this.clearDockForm();
      });
    }
  },

  // Carregar lista de docas
  loadDocksList: async function() {
    try {
      const docksResponse = await Auth.fetchAuth(`${app.API_URL}/docks`);
      this.displayDocksList(docksResponse);
      this.updateStatusCounts(docksResponse);
      this.allDocks = docksResponse;
    } catch (error) {
      console.error('Erro ao carregar docas:', error);
      this.showDocksError('Erro ao carregar lista de docas');
    }
  },

  // Atualizar contadores de status
  updateStatusCounts: function(docks) {
    const available = docks.filter(d => d.status === 'available').length;
    const occupied = docks.filter(d => d.status === 'occupied').length;
    const maintenance = docks.filter(d => d.status === 'maintenance').length;
    const total = docks.length;

    document.getElementById('available-docks-count').textContent = available;
    document.getElementById('occupied-docks-count').textContent = occupied;
    document.getElementById('maintenance-docks-count').textContent = maintenance;
    document.getElementById('total-docks-count').textContent = total;
  },

  // Exibir lista de docas
  displayDocksList: function(docks) {
    const tbody = document.getElementById('docks-list');
    const totalCount = document.getElementById('docks-total-count');
    
    if (!tbody) return;
    
    if (totalCount) {
      totalCount.textContent = docks.length;
    }
    
    if (docks.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4">
            <i class="fas fa-warehouse text-muted fa-2x mb-2"></i>
            <p class="text-muted">Nenhuma doca cadastrada</p>
            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#dockModal">
              <i class="fas fa-plus me-1"></i> Cadastrar Primeira Doca
            </button>
          </td>
        </tr>
      `;
      return;
    }
    
    let html = '';
    docks.forEach((dock, index) => {
      const statusConfig = this.getStatusConfig(dock.status);
      const lastUpdate = dock.updated_at ? Utils.formatDate(dock.updated_at) : Utils.formatDate(dock.created_at);
      
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div class="d-flex align-items-center">
              <div class="${statusConfig.bgClass} rounded-circle p-2 me-2">
                <i class="${statusConfig.icon} ${statusConfig.textClass}"></i>
              </div>
              <div>
                <div class="fw-medium">${dock.name}</div>
                <small class="text-muted">ID: ${dock.id}</small>
              </div>
            </div>
          </td>
          <td>
            <span class="badge ${statusConfig.badgeClass}">${statusConfig.text}</span>
          </td>
          <td>
            <small class="text-muted">${lastUpdate}</small>
          </td>
          <td class="text-center">
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-primary view-dock-btn" data-id="${dock.id}" title="Visualizar">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-outline-secondary edit-dock-btn" data-id="${dock.id}" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-danger delete-dock-btn" data-id="${dock.id}" data-name="${dock.name}" title="Excluir">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });
    
    tbody.innerHTML = html;
    this.addDockActionListeners();
  },

  // Configuração de status
  getStatusConfig: function(status) {
    const configs = {
      'available': {
        text: 'Disponível',
        badgeClass: 'bg-success',
        bgClass: 'bg-success bg-opacity-10',
        textClass: 'text-success',
        icon: 'fas fa-check-circle'
      },
      'occupied': {
        text: 'Ocupada',
        badgeClass: 'bg-warning',
        bgClass: 'bg-warning bg-opacity-10',
        textClass: 'text-warning',
        icon: 'fas fa-truck'
      },
      'maintenance': {
        text: 'Manutenção',
        badgeClass: 'bg-danger',
        bgClass: 'bg-danger bg-opacity-10',
        textClass: 'text-danger',
        icon: 'fas fa-tools'
      }
    };
    
    return configs[status] || configs['available'];
  },

  // Adicionar event listeners para ações
  addDockActionListeners: function() {
    document.querySelectorAll('.view-dock-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dockId = e.currentTarget.getAttribute('data-id');
        this.viewDock(dockId);
      });
    });
    
    document.querySelectorAll('.edit-dock-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dockId = e.currentTarget.getAttribute('data-id');
        this.editDock(dockId);
      });
    });
    
    document.querySelectorAll('.delete-dock-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dockId = e.currentTarget.getAttribute('data-id');
        const dockName = e.currentTarget.getAttribute('data-name');
        this.confirmDeleteDock(dockId, dockName);
      });
    });
  },

  // Pesquisar docas
  searchDocks: function(searchTerm) {
    if (!this.allDocks) return;
    
    const filteredDocks = this.allDocks.filter(dock => 
      dock.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    this.displayDocksList(filteredDocks);
  },

  // Filtrar docas por status
  filterDocksByStatus: function(status) {
    if (!this.allDocks) return;
    
    let filteredDocks = this.allDocks;
    
    if (status) {
      filteredDocks = this.allDocks.filter(dock => dock.status === status);
    }
    
    this.displayDocksList(filteredDocks);
  },

  // Visualizar doca
  viewDock: async function(dockId) {
    try {
      const dock = await Auth.fetchAuth(`${app.API_URL}/docks/${dockId}`);
      const statusConfig = this.getStatusConfig(dock.status);
      
      document.getElementById('view-dock-name').textContent = dock.name;
      
      const statusBadge = document.getElementById('view-dock-status');
      statusBadge.textContent = statusConfig.text;
      statusBadge.className = `badge ${statusConfig.badgeClass}`;
      
      document.getElementById('view-dock-created').textContent = Utils.formatDate(dock.created_at);
      document.getElementById('view-dock-updated').textContent = Utils.formatDate(dock.updated_at);
      document.getElementById('view-dock-notes').textContent = dock.notes || 'Nenhuma observação registrada.';
      
      await this.loadDockLoadings(dockId);
      
      this.currentDockId = dockId;
      
      const modal = new bootstrap.Modal(document.getElementById('viewDockModal'));
      modal.show();
      
    } catch (error) {
      console.error('Erro ao carregar doca:', error);
      Utils.showErrorMessage('Erro ao carregar dados da doca');
    }
  },

  // Carregar carregamentos da doca
  loadDockLoadings: async function(dockId) {
    try {
      let loadings = [];
      try {
        loadings = await Auth.fetchAuth(`${app.API_URL}/loadings/dock/${dockId}`);
      } catch (error) {
        console.warn('Rota de carregamentos por doca não implementada:', error);
        loadings = [];
      }
      
      const totalLoadings = loadings.length;
      const completedLoadings = loadings.filter(l => l.status === 'completed').length;
      const lastLoading = loadings.length > 0 ? Utils.formatDate(loadings[0].scheduled_time) : '--';
      
      document.getElementById('view-dock-total-loadings').textContent = totalLoadings;
      document.getElementById('view-dock-completed-loadings').textContent = completedLoadings;
      document.getElementById('view-dock-last-loading').textContent = lastLoading;
      
      const tbody = document.getElementById('view-dock-loadings');
      if (loadings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">Nenhum carregamento encontrado.</td></tr>';
        return;
      }
      
      let html = '';
      loadings.slice(0, 5).forEach(loading => {
        const date = Utils.formatDate(loading.scheduled_time);
        const statusClass = loading.status === 'completed' ? 'success' : loading.status === 'in_progress' ? 'warning' : 'info';
        const statusText = loading.status === 'completed' ? 'Concluído' : loading.status === 'in_progress' ? 'Em andamento' : 'Agendado';
        
        html += `
          <tr>
            <td>${date}</td>
            <td>${loading.driver_name || 'N/A'}</td>
            <td>${loading.vehicle_plate || 'N/A'}</td>
            <td><span class="badge bg-${statusClass}">${statusText}</span></td>
            <td class="text-center">
              <button class="btn btn-sm btn-outline-primary" onclick="app.viewLoading(${loading.id})">
                <i class="fas fa-eye"></i>
              </button>
            </td>
          </tr>
        `;
      });
      
      tbody.innerHTML = html;
      
    } catch (error) {
      console.error('Erro ao carregar carregamentos da doca:', error);
    }
  },

  // Editar doca
  editDock: async function(dockId) {
    try {
      const dock = await Auth.fetchAuth(`${app.API_URL}/docks/${dockId}`);
      
      document.getElementById('dock-id').value = dock.id;
      document.getElementById('dock-name').value = dock.name;
      document.getElementById('dock-status').value = dock.status;
      document.getElementById('dock-notes').value = dock.notes || '';
      
      document.getElementById('dock-modal-title').textContent = 'Editar Doca';
      document.getElementById('save-dock-text').textContent = 'Atualizar';
      
      const modal = new bootstrap.Modal(document.getElementById('dockModal'));
      modal.show();
      
    } catch (error) {
      console.error('Erro ao carregar doca para edição:', error);
      Utils.showErrorMessage('Erro ao carregar dados da doca');
    }
  },

  // Salvar doca
  saveDock: async function() {
    const activeModal = document.querySelector('#dockModal.show') || 
                       document.querySelector('#dockModal[style*="display: block"]') ||
                       document.getElementById('dockModal');
    
    const form = activeModal.querySelector('#dock-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    const dockId = activeModal.querySelector('#dock-id').value;
    const dockData = {
      name: activeModal.querySelector('#dock-name').value.trim(),
      status: activeModal.querySelector('#dock-status').value,
      notes: activeModal.querySelector('#dock-notes').value.trim() || null
    };
    
    // Validar dados antes de enviar
    if (!dockData.name || !dockData.status) {
      Utils.showErrorMessage('Nome e status são obrigatórios');
      return;
    }
    
    const saveBtn = activeModal.querySelector('#save-dock-btn');
    const resetSpinner = Utils.showButtonSpinner(saveBtn, dockId ? 'Atualizando...' : 'Salvando...');
    
    try {
      if (dockId) {
        await Auth.fetchAuth(`${app.API_URL}/docks/${dockId}`, {
          method: 'PUT',
          body: JSON.stringify(dockData)
        });
      } else {
        await Auth.fetchAuth(`${app.API_URL}/docks`, {
          method: 'POST',
          body: JSON.stringify(dockData)
        });
      }
      
      const modal = bootstrap.Modal.getInstance(activeModal);
      modal.hide();
      
      this.loadDocksList();
      Utils.showSuccessMessage(dockId ? 'Doca atualizada com sucesso!' : 'Doca cadastrada com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar doca:', error);
      Utils.showErrorMessage('Erro ao salvar doca: ' + (error.message || 'Erro desconhecido'));
    } finally {
      resetSpinner();
    }
  },

  // Confirmar exclusão de doca
  confirmDeleteDock: function(dockId, dockName) {
    this.dockToDelete = dockId;
    document.getElementById('delete-dock-name').textContent = dockName;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteDockModal'));
    modal.show();
  },

  // Excluir doca
  deleteDock: async function() {
    if (!this.dockToDelete) return;
    
    try {
      await Auth.fetchAuth(`${app.API_URL}/docks/${this.dockToDelete}`, {
        method: 'DELETE'
      });
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('deleteDockModal'));
      modal.hide();
      
      this.loadDocksList();
      Utils.showSuccessMessage('Doca excluída com sucesso!');
      
      this.dockToDelete = null;
      
    } catch (error) {
      console.error('Erro ao excluir doca:', error);
      Utils.showErrorMessage('Erro ao excluir doca: ' + (error.message || 'Esta doca pode estar sendo usada em carregamentos'));
    }
  },

  // Limpar formulário de doca
  clearDockForm: function() {
    const form = document.getElementById('dock-form');
    if (form) {
      form.reset();
    }
    
    const idField = document.getElementById('dock-id');
    if (idField) {
      idField.value = '';
    }
    
    const title = document.getElementById('dock-modal-title');
    if (title) {
      title.textContent = 'Nova Doca';
    }
    
    const saveText = document.getElementById('save-dock-text');
    if (saveText) {
      saveText.textContent = 'Salvar';
    }
  },

  // Editar doca atual
  editCurrentDock: function() {
    if (!this.currentDockId) return;
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('viewDockModal'));
    modal.hide();
    
    this.editDock(this.currentDockId);
  },

  // Criar carregamento para doca
  createLoadingForDock: function() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('viewDockModal'));
    modal.hide();
    
    Utils.showWarningMessage('Funcionalidade será implementada no módulo de carregamentos');
  },

  // Exportar docas
  exportDocks: function() {
    if (!this.allDocks || this.allDocks.length === 0) {
      Utils.showWarningMessage('Não há docas para exportar');
      return;
    }
    
    const headers = ['ID', 'Nome', 'Status', 'Data de Criação'];
    const exportData = this.allDocks.map(dock => ({
      id: dock.id,
      nome: dock.name,
      status: this.getStatusConfig(dock.status).text,
      'data_de_criacao': Utils.formatDate(dock.created_at)
    }));
    
    Utils.exportToCSV(exportData, 'docas', headers);
  },

  // Mostrar erro na lista de docas
  showDocksError: function(message) {
    const tbody = document.getElementById('docks-list');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4">
            <i class="fas fa-exclamation-triangle text-warning fa-2x mb-2"></i>
            <p class="text-muted">${message}</p>
            <button class="btn btn-primary" onclick="Docks.loadDocksList()">
              <i class="fas fa-sync-alt me-1"></i> Tentar Novamente
            </button>
          </td>
        </tr>
      `;
    }
  }
};