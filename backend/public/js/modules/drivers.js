// js/modules/drivers.js

// Objeto para gerenciar motoristas
const Drivers = {
  allDrivers: [],
  currentDriverId: null,
  driverToDelete: null,

  // Inicializar módulo de motoristas
  init: function() {
    this.loadDriversList();
    this.setupDriversEventListeners();
  },

  // Configurar event listeners
  setupDriversEventListeners: function() {
    const searchInput = document.getElementById('driver-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchDrivers(e.target.value);
      });
    }
    
    const refreshBtn = document.getElementById('refresh-drivers');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadDriversList();
      });
    }
    
    const exportBtn = document.getElementById('export-drivers');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportDrivers();
      });
    }
    
    const saveDriverBtn = document.getElementById('save-driver-btn');
    if (saveDriverBtn) {
      saveDriverBtn.addEventListener('click', () => {
        this.saveDriver();
      });
    }
    
    const confirmDeleteBtn = document.getElementById('confirm-delete-driver');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        this.deleteDriver();
      });
    }
    
    const sendWhatsAppBtn = document.getElementById('send-whatsapp-btn');
    if (sendWhatsAppBtn) {
      sendWhatsAppBtn.addEventListener('click', () => {
        this.sendWhatsAppMessage();
      });
    }
    
    const newLoadingBtn = document.getElementById('new-loading-for-driver-btn');
    if (newLoadingBtn) {
      newLoadingBtn.addEventListener('click', () => {
        this.createLoadingForDriver();
      });
    }
    
    const editDriverBtn = document.getElementById('edit-driver-btn');
    if (editDriverBtn) {
      editDriverBtn.addEventListener('click', () => {
        this.editCurrentDriver();
      });
    }
    
    const driverModal = document.getElementById('driverModal');
    if (driverModal) {
      driverModal.addEventListener('hidden.bs.modal', () => {
        this.clearDriverForm();
      });
    }
  },

  // Carregar lista de motoristas
  loadDriversList: async function() {
    try {
      const driversResponse = await Auth.fetchAuth(`${app.API_URL}/drivers`);
      this.displayDriversList(driversResponse.data);
      this.allDrivers = driversResponse.data;
    } catch (error) {
      console.error('Erro ao carregar motoristas:', error);
      this.showDriversError('Erro ao carregar lista de motoristas');
    }
  },

  // Exibir lista de motoristas
  displayDriversList: function(drivers) {
    const tbody = document.getElementById('drivers-list');
    if (!tbody) return;
    
    if (drivers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4">
            <i class="fas fa-users text-muted fa-2x mb-2"></i>
            <p class="text-muted">Nenhum motorista cadastrado</p>
            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#driverModal">
              <i class="fas fa-plus me-1"></i> Cadastrar Primeiro Motorista
            </button>
          </td>
        </tr>
      `;
      return;
    }
    
    let html = '';
    drivers.forEach((driver, index) => {
      const lastLoading = driver.last_loading ? Utils.formatDate(driver.last_loading) : 'Nunca';
      const cpfFormatted = driver.cpf ? driver.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'Não informado';
      
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div class="d-flex align-items-center">
              <div class="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
                <i class="fas fa-user text-primary"></i>
              </div>
              <div>
                <div class="fw-medium">${driver.name}</div>
                <small class="text-muted">ID: ${driver.id}</small>
              </div>
            </div>
          </td>
          <td><span class="text-muted">${cpfFormatted}</span></td>
          <td>
            <a href="${Utils.generateWhatsAppURL(driver.phone)}" target="_blank" class="text-decoration-none">
              <i class="fab fa-whatsapp text-success me-1"></i>
              ${driver.phone}
            </a>
          </td>
          <td>
            <small class="text-muted">${lastLoading}</small>
          </td>
          <td class="text-end">
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-primary view-driver-btn" data-id="${driver.id}" title="Visualizar">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-outline-secondary edit-driver-btn" data-id="${driver.id}" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-danger delete-driver-btn" data-id="${driver.id}" data-name="${driver.name}" title="Excluir">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });
    
    tbody.innerHTML = html;
    this.addDriverActionListeners();
  },

  // Adicionar event listeners para ações
  addDriverActionListeners: function() {
    document.querySelectorAll('.view-driver-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const driverId = e.currentTarget.getAttribute('data-id');
        this.viewDriver(driverId);
      });
    });
    
    document.querySelectorAll('.edit-driver-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const driverId = e.currentTarget.getAttribute('data-id');
        this.editDriver(driverId);
      });
    });
    
    document.querySelectorAll('.delete-driver-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const driverId = e.currentTarget.getAttribute('data-id');
        const driverName = e.currentTarget.getAttribute('data-name');
        this.confirmDeleteDriver(driverId, driverName);
      });
    });
  },

  // Pesquisar motoristas
  searchDrivers: function(searchTerm) {
    if (!this.allDrivers) return;
    
    const filteredDrivers = this.allDrivers.filter(driver => 
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.includes(searchTerm)
    );
    
    this.displayDriversList(filteredDrivers);
  },

  // Visualizar motorista
  viewDriver: async function(driverId) {
    try {
      const driver = await Auth.fetchAuth(`${app.API_URL}/drivers/${driverId}`);
      
      document.getElementById('view-driver-name').textContent = driver.name;
      document.getElementById('view-driver-cpf').textContent = driver.cpf ? driver.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'Não informado';
      document.getElementById('view-driver-phone').textContent = driver.phone;
      document.getElementById('view-driver-created').textContent = Utils.formatDate(driver.created_at);
      document.getElementById('view-driver-notes').textContent = driver.notes || 'Nenhuma observação registrada.';
      
      await this.loadDriverLoadings(driverId);
      
      this.currentDriverId = driverId;
      
      const modal = new bootstrap.Modal(document.getElementById('viewDriverModal'));
      modal.show();
      
    } catch (error) {
      console.error('Erro ao carregar motorista:', error);
      Utils.showErrorMessage('Erro ao carregar dados do motorista');
    }
  },

  // Carregar carregamentos do motorista
  loadDriverLoadings: async function(driverId) {
    try {
      let loadings = [];
      try {
        loadings = await Auth.fetchAuth(`${app.API_URL}/loadings/driver/${driverId}`);
      } catch (error) {
        console.warn('Rota de carregamentos por motorista não implementada:', error);
        loadings = [];
      }
      
      const totalLoadings = loadings.length;
      const completedLoadings = loadings.filter(l => l.status === 'completed').length;
      const lastLoading = loadings.length > 0 ? Utils.formatDate(loadings[0].scheduled_time) : '--';
      
      document.getElementById('view-driver-total-loadings').textContent = totalLoadings;
      document.getElementById('view-driver-completed-loadings').textContent = completedLoadings;
      document.getElementById('view-driver-last-loading').textContent = lastLoading;
      
      const tbody = document.getElementById('view-driver-loadings');
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
            <td>${loading.vehicle_plate || 'N/A'}</td>
            <td>${loading.dock_name || 'N/A'}</td>
            <td><span class="badge bg-${statusClass}">${statusText}</span></td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary" onclick="app.viewLoading(${loading.id})">
                <i class="fas fa-eye"></i>
              </button>
            </td>
          </tr>
        `;
      });
      
      tbody.innerHTML = html;
      
    } catch (error) {
      console.error('Erro ao carregar carregamentos do motorista:', error);
    }
  },

  // Editar motorista
  editDriver: async function(driverId) {
    try {
      const driver = await Auth.fetchAuth(`${app.API_URL}/drivers/${driverId}`);
      
      document.getElementById('driver-id').value = driver.id;
      document.getElementById('driver-name').value = driver.name;
      document.getElementById('driver-phone').value = driver.phone;
      document.getElementById('driver-cpf').value = driver.cpf || '';
      document.getElementById('driver-notes').value = driver.notes || '';
      
      document.getElementById('driver-modal-title').textContent = 'Editar Motorista';
      document.getElementById('save-driver-text').textContent = 'Atualizar';
      
      const modal = new bootstrap.Modal(document.getElementById('driverModal'));
      modal.show();
      
    } catch (error) {
      console.error('Erro ao carregar motorista para edição:', error);
      Utils.showErrorMessage('Erro ao carregar dados do motorista');
    }
  },

  // Salvar motorista
  saveDriver: async function() {
    // Usar o modal visível especificamente
    const activeModal = document.querySelector('#driverModal.show') || 
                       document.querySelector('#driverModal[style*="display: block"]') ||
                       document.getElementById('driverModal');
    
    const form = activeModal.querySelector('#driver-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    const driverId = activeModal.querySelector('#driver-id').value;
    const driverData = {
      name: activeModal.querySelector('#driver-name').value.trim(),
      phone: activeModal.querySelector('#driver-phone').value.trim(),
      cpf: activeModal.querySelector('#driver-cpf').value.trim(),
      notes: activeModal.querySelector('#driver-notes').value.trim() || null
    };
    
    // Validar dados antes de enviar
    if (!driverData.name || !driverData.phone || !driverData.cpf) {
      Utils.showErrorMessage('Nome, telefone e CPF são obrigatórios');
      return;
    }
    
    const saveBtn = activeModal.querySelector('#save-driver-btn');
    const resetSpinner = Utils.showButtonSpinner(saveBtn, driverId ? 'Atualizando...' : 'Salvando...');
    
    try {
      if (driverId) {
        await Auth.fetchAuth(`${app.API_URL}/drivers/${driverId}`, {
          method: 'PUT',
          body: JSON.stringify(driverData)
        });
      } else {
        await Auth.fetchAuth(`${app.API_URL}/drivers`, {
          method: 'POST',
          body: JSON.stringify(driverData)
        });
      }
      
      const modal = bootstrap.Modal.getInstance(activeModal);
      modal.hide();
      
      this.loadDriversList();
      Utils.showSuccessMessage(driverId ? 'Motorista atualizado com sucesso!' : 'Motorista cadastrado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar motorista:', error);
      Utils.showErrorMessage('Erro ao salvar motorista: ' + (error.message || 'Erro desconhecido'));
    } finally {
      resetSpinner();
    }
  },

  // Confirmar exclusão de motorista
  confirmDeleteDriver: function(driverId, driverName) {
    this.driverToDelete = driverId;
    document.getElementById('delete-driver-name').textContent = driverName;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteDriverModal'));
    modal.show();
  },

  // Excluir motorista
  deleteDriver: async function() {
    if (!this.driverToDelete) return;
    
    try {
      await Auth.fetchAuth(`${app.API_URL}/drivers/${this.driverToDelete}`, {
        method: 'DELETE'
      });
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('deleteDriverModal'));
      modal.hide();
      
      this.loadDriversList();
      Utils.showSuccessMessage('Motorista excluído com sucesso!');
      
      this.driverToDelete = null;
      
    } catch (error) {
      console.error('Erro ao excluir motorista:', error);
      Utils.showErrorMessage('Erro ao excluir motorista: ' + (error.message || 'Este motorista pode estar associado a carregamentos'));
    }
  },

  // Limpar formulário de motorista
  clearDriverForm: function() {
    const form = document.getElementById('driver-form');
    if (form) {
      form.reset();
    }
    
    const idField = document.getElementById('driver-id');
    if (idField) {
      idField.value = '';
    }
    
    const title = document.getElementById('driver-modal-title');
    if (title) {
      title.textContent = 'Novo Motorista';
    }
    
    const saveText = document.getElementById('save-driver-text');
    if (saveText) {
      saveText.textContent = 'Salvar';
    }
  },

  // Enviar mensagem WhatsApp
  sendWhatsAppMessage: function() {
    if (!this.currentDriverId) return;
    
    const driver = this.allDrivers.find(d => d.id == this.currentDriverId);
    if (!driver) return;
    
    const message = `Olá ${driver.name}, como está? Aqui é da DockFlow.`;
    const whatsappUrl = Utils.generateWhatsAppURL(driver.phone, message);
    
    window.open(whatsappUrl, '_blank');
  },

  // Criar carregamento para motorista
  createLoadingForDriver: function() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('viewDriverModal'));
    modal.hide();
    
    Utils.showWarningMessage('Funcionalidade será implementada no módulo de carregamentos');
  },

  // Editar motorista atual
  editCurrentDriver: function() {
    if (!this.currentDriverId) return;
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('viewDriverModal'));
    modal.hide();
    
    this.editDriver(this.currentDriverId);
  },

  // Exportar motoristas
  exportDrivers: function() {
    if (!this.allDrivers || this.allDrivers.length === 0) {
      Utils.showWarningMessage('Não há motoristas para exportar');
      return;
    }
    
    const headers = ['ID', 'Nome', 'Telefone', 'Data de Cadastro'];
    const exportData = this.allDrivers.map(driver => ({
      id: driver.id,
      nome: driver.name,
      telefone: driver.phone,
      'data_de_cadastro': Utils.formatDate(driver.created_at)
    }));
    
    Utils.exportToCSV(exportData, 'motoristas', headers);
  },

  // Mostrar erro na lista de motoristas
  showDriversError: function(message) {
    const tbody = document.getElementById('drivers-list');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4">
            <i class="fas fa-exclamation-triangle text-warning fa-2x mb-2"></i>
            <p class="text-muted">${message}</p>
            <button class="btn btn-primary" onclick="Drivers.loadDriversList()">
              <i class="fas fa-sync-alt me-1"></i> Tentar Novamente
            </button>
          </td>
        </tr>
      `;
    }
  }
};