
// Mapeamento de tipos de veículo (frontend → backend)
const mapVehicleType = (frontendType) => {
  const mapping = {
    'Caminhão 3/4': 'truck',
    'Caminhão Toco': 'truck',
    'Caminhão Truck': 'truck', 
    'Caminhão Bi-Truck': 'bitruck',
    'Carreta': 'trailer',
    'Van': 'van',
    'Utilitário': 'utility',
    'Pickup': 'pickup',
    'Moto': 'motorcycle'
  };
  
  return mapping[frontendType] || frontendType.toLowerCase();
};

// Mapeamento reverso (backend → frontend)
const mapVehicleTypeDisplay = (backendType) => {
  const mapping = {
    'truck': 'Caminhão',
    'bitruck': 'Bi-Truck',
    'trailer': 'Carreta',
    'van': 'Van',
    'utility': 'Utilitário',
    'pickup': 'Pickup',
    'motorcycle': 'Moto'
  };
  
  return mapping[backendType] || backendType;
};

// Objeto para gerenciar veículos
const Vehicles = {
  allVehicles: [],
  currentVehicleId: null,
  vehicleToDelete: null,

  // Inicializar módulo de veículos
  init: function() {
    this.loadVehiclesList();
    this.setupVehiclesEventListeners();
  },

  // Configurar event listeners
  setupVehiclesEventListeners: function() {
    const searchInput = document.getElementById('vehicle-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchVehicles(e.target.value);
      });
    }
    
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filterVehiclesByStatus(e.target.value);
      });
    }
    
    const refreshBtn = document.getElementById('refresh-vehicles');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadVehiclesList();
      });
    }
    
    const exportBtn = document.getElementById('export-vehicles');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportVehicles();
      });
    }
    
    const saveVehicleBtn = document.getElementById('save-vehicle-btn');
    if (saveVehicleBtn) {
      saveVehicleBtn.addEventListener('click', () => {
        this.saveVehicle();
      });
    }
    
    const confirmDeleteBtn = document.getElementById('confirm-delete-vehicle');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        this.deleteVehicle();
      });
    }
    
    const newLoadingBtn = document.getElementById('new-loading-for-vehicle-btn');
    if (newLoadingBtn) {
      newLoadingBtn.addEventListener('click', () => {
        this.createLoadingForVehicle();
      });
    }
    
    const toggleStatusBtn = document.getElementById('toggle-vehicle-status-btn');
    if (toggleStatusBtn) {
      toggleStatusBtn.addEventListener('click', () => {
        this.toggleVehicleStatus();
      });
    }
    
    const editVehicleBtn = document.getElementById('edit-vehicle-btn');
    if (editVehicleBtn) {
      editVehicleBtn.addEventListener('click', () => {
        this.editCurrentVehicle();
      });
    }
    
    const vehicleModal = document.getElementById('vehicleModal');
    if (vehicleModal) {
      vehicleModal.addEventListener('hidden.bs.modal', () => {
        this.clearVehicleForm();
      });
    }
  },

  // Carregar lista de veículos
  loadVehiclesList: async function() {
    try {
      const vehiclesResponse = await Auth.fetchAuth(`${app.API_URL}/vehicles`);
      
      // 🔧 CORREÇÃO: Verificar estrutura da resposta
      let vehicles = [];
      if (vehiclesResponse && vehiclesResponse.data && Array.isArray(vehiclesResponse.data)) {
        vehicles = vehiclesResponse.data;
      } else if (Array.isArray(vehiclesResponse)) {
        vehicles = vehiclesResponse;
      } else {
        console.warn('Resposta da API de veículos não é um array:', vehiclesResponse);
        vehicles = [];
      }
      
      this.displayVehiclesList(vehicles);
      this.allVehicles = vehicles;
    } catch (error) {
      console.error('Erro ao carregar veículos:', error);
      this.showVehiclesError('Erro ao carregar lista de veículos');
    }
  },

  // Exibir lista de veículos
  displayVehiclesList: function(vehicles) {
    const tbody = document.getElementById('vehicles-list');
    if (!tbody) return;
    
    // 🔧 CORREÇÃO: Verificar se vehicles é array
    if (!Array.isArray(vehicles)) {
      console.warn('displayVehiclesList: vehicles não é um array:', vehicles);
      vehicles = [];
    }
    
    if (vehicles.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4">
            <i class="fas fa-truck text-muted fa-2x mb-2"></i>
            <p class="text-muted">Nenhum veículo cadastrado</p>
            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#vehicleModal">
              <i class="fas fa-plus me-1"></i> Cadastrar Primeiro Veículo
            </button>
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    vehicles.forEach((vehicle, index) => {
      const statusClass = vehicle.status === 'available' ? 'success' : vehicle.status === 'in_use' ? 'warning' : 'danger';
      const statusText = vehicle.status === 'available' ? 'Disponível' : vehicle.status === 'in_use' ? 'Em uso' : 'Manutenção';
      const brandModel = [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Não informado';
      const lastLoading = vehicle.last_loading ? Utils.formatDate(vehicle.last_loading) : 'Nunca';
      
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div class="d-flex align-items-center">
              <div class="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
                <i class="fas fa-truck text-primary"></i>
              </div>
              <div>
                <div class="fw-bold">${vehicle.license_plate}</div>
                <small class="text-muted">ID: ${vehicle.id}</small>
              </div>
            </div>
          </td>
          <td>
            <span class="badge bg-secondary">${mapVehicleTypeDisplay(vehicle.vehicle_type)}</span>
          </td>
          <td>${brandModel}</td>
          <td>${vehicle.year || '--'}</td>
          <td>
            <span class="badge bg-${statusClass}">${statusText}</span>
          </td>
          <td>
            <small class="text-muted">${lastLoading}</small>
          </td>
          <td class="text-end">
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-primary view-vehicle-btn" data-id="${vehicle.id}" title="Visualizar">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-outline-secondary edit-vehicle-btn" data-id="${vehicle.id}" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-danger delete-vehicle-btn" data-id="${vehicle.id}" data-plate="${vehicle.license_plate}" title="Excluir">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });
    
    tbody.innerHTML = html;
    this.addVehicleActionListeners();
  },

  // Adicionar event listeners para ações
  addVehicleActionListeners: function() {
    document.querySelectorAll('.view-vehicle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const vehicleId = e.currentTarget.getAttribute('data-id');
        this.viewVehicle(vehicleId);
      });
    });
    
    document.querySelectorAll('.edit-vehicle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const vehicleId = e.currentTarget.getAttribute('data-id');
        this.editVehicle(vehicleId);
      });
    });
    
    document.querySelectorAll('.delete-vehicle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const vehicleId = e.currentTarget.getAttribute('data-id');
        const vehiclePlate = e.currentTarget.getAttribute('data-plate');
        this.confirmDeleteVehicle(vehicleId, vehiclePlate);
      });
    });
  },

  // Pesquisar veículos
  searchVehicles: function(searchTerm) {
    if (!this.allVehicles || !Array.isArray(this.allVehicles)) return;
    
    const filteredVehicles = this.allVehicles.filter(vehicle => 
      vehicle.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.vehicle_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vehicle.brand && vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vehicle.model && vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    this.displayVehiclesList(filteredVehicles);
  },

  // Filtrar veículos por status
  filterVehiclesByStatus: function(status) {
    if (!this.allVehicles || !Array.isArray(this.allVehicles)) return;
    
    let filteredVehicles = this.allVehicles;
    if (status) {
      filteredVehicles = this.allVehicles.filter(vehicle => vehicle.status === status);
    }
    
    this.displayVehiclesList(filteredVehicles);
  },

  // Visualizar veículo
  viewVehicle: async function(vehicleId) {
    try {
      const vehicleResponse = await Auth.fetchAuth(`${app.API_URL}/vehicles/${vehicleId}`);
      
      // Extrair dados da resposta
      const vehicle = vehicleResponse.data || vehicleResponse;
      
      document.getElementById('view-vehicle-plate').textContent = vehicle.license_plate;
      document.getElementById('view-vehicle-type').textContent = vehicle.vehicle_type;
      document.getElementById('view-vehicle-brand').textContent = vehicle.brand || 'Não informado';
      document.getElementById('view-vehicle-model').textContent = vehicle.model || 'Não informado';
      document.getElementById('view-vehicle-year').textContent = vehicle.year || 'Não informado';
      
      const statusClass = vehicle.status === 'available' ? 'success' : vehicle.status === 'in_use' ? 'warning' : 'danger';
      const statusText = vehicle.status === 'available' ? 'Disponível' : vehicle.status === 'in_use' ? 'Em uso' : 'Manutenção';
      document.getElementById('view-vehicle-status').innerHTML = `<span class="badge bg-${statusClass}">${statusText}</span>`;
      
      document.getElementById('view-vehicle-created').textContent = Utils.formatDate(vehicle.created_at);
      document.getElementById('view-vehicle-notes').textContent = vehicle.notes || 'Nenhuma observação registrada.';
      
      await this.loadVehicleLoadings(vehicleId);
      
      this.currentVehicleId = vehicleId;
      
      const modal = new bootstrap.Modal(document.getElementById('viewVehicleModal'));
      modal.show();
      
    } catch (error) {
      console.error('Erro ao carregar veículo:', error);
      Utils.showErrorMessage('Erro ao carregar dados do veículo');
    }
  },

  // Carregar carregamentos do veículo
  loadVehicleLoadings: async function(vehicleId) {
    try {
      const loadingsResponse = await Auth.fetchAuth(`${app.API_URL}/vehicles/${vehicleId}/loadings`);
      
      // Verificar estrutura da resposta
      let loadings = [];
      if (loadingsResponse && loadingsResponse.data && Array.isArray(loadingsResponse.data)) {
        loadings = loadingsResponse.data;
      } else if (Array.isArray(loadingsResponse)) {
        loadings = loadingsResponse;
      } else {
        loadings = [];
      }
      
      const totalLoadings = loadings.length;
      const completedLoadings = loadings.filter(l => l.status === 'completed').length;
      const lastLoading = loadings.length > 0 ? Utils.formatDate(loadings[0].scheduled_time) : '--';
      
      document.getElementById('view-vehicle-total-loadings').textContent = totalLoadings;
      document.getElementById('view-vehicle-completed-loadings').textContent = completedLoadings;
      document.getElementById('view-vehicle-last-loading').textContent = lastLoading;
      
      const tbody = document.getElementById('view-vehicle-loadings');
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
      console.error('Erro ao carregar carregamentos do veículo:', error);
    }
  },

  // Editar veículo
  editVehicle: async function(vehicleId) {
    try {
      const vehicleResponse = await Auth.fetchAuth(`${app.API_URL}/vehicles/${vehicleId}`);
      const vehicle = vehicleResponse.data || vehicleResponse;
      
      document.getElementById('vehicle-id').value = vehicle.id;
      document.getElementById('license-plate').value = vehicle.license_plate;
      document.getElementById('vehicle-type').value = vehicle.vehicle_type;
      document.getElementById('vehicle-brand').value = vehicle.brand || '';
      document.getElementById('vehicle-model').value = vehicle.model || '';
      document.getElementById('vehicle-year').value = vehicle.year || '';
      document.getElementById('vehicle-status').value = vehicle.status;
      document.getElementById('vehicle-notes').value = vehicle.notes || '';
      
      document.getElementById('vehicle-modal-title').textContent = 'Editar Veículo';
      document.getElementById('save-vehicle-text').textContent = 'Atualizar';
      
      const modal = new bootstrap.Modal(document.getElementById('vehicleModal'));
      modal.show();
      
    } catch (error) {
      console.error('Erro ao carregar veículo para edição:', error);
      Utils.showErrorMessage('Erro ao carregar dados do veículo');
    }
  },

  // Salvar veículo
  saveVehicle: async function() {
    // Usar o modal visível especificamente
    const activeModal = document.querySelector('#vehicleModal.show') || 
                       document.querySelector('#vehicleModal[style*="display: block"]') ||
                       document.getElementById('vehicleModal');
    
    const form = activeModal.querySelector('#vehicle-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    const vehicleId = activeModal.querySelector('#vehicle-id').value;
    const licensePlateInput = activeModal.querySelector('#license-plate');
    const licensePlate = licensePlateInput ? licensePlateInput.value.trim().toUpperCase() : '';
    
    // Validar placa básica
    if (!licensePlate) {
      Utils.showErrorMessage('Placa é obrigatória');
      return;
    }
    
 const vehicleData = {
  license_plate: licensePlate,
  vehicle_type: mapVehicleType(activeModal.querySelector('#vehicle-type').value), // ← CORREÇÃO AQUI
  brand: activeModal.querySelector('#vehicle-brand').value.trim() || null,
  model: activeModal.querySelector('#vehicle-model').value.trim() || null,
  year: activeModal.querySelector('#vehicle-year').value || null,
  status: activeModal.querySelector('#vehicle-status').value,
  notes: activeModal.querySelector('#vehicle-notes').value.trim() || null
};
    
    // Validar dados obrigatórios
    if (!vehicleData.license_plate || !vehicleData.vehicle_type) {
      Utils.showErrorMessage('Placa e tipo de veículo são obrigatórios');
      return;
    }
    
    const saveBtn = activeModal.querySelector('#save-vehicle-btn');
    const resetSpinner = Utils.showButtonSpinner(saveBtn, vehicleId ? 'Atualizando...' : 'Salvando...');
    
    try {
      if (vehicleId) {
        await Auth.fetchAuth(`${app.API_URL}/vehicles/${vehicleId}`, {
          method: 'PUT',
          body: JSON.stringify(vehicleData)
        });
      } else {
        await Auth.fetchAuth(`${app.API_URL}/vehicles`, {
          method: 'POST',
          body: JSON.stringify(vehicleData)
        });
      }
      
      const modal = bootstrap.Modal.getInstance(activeModal);
      modal.hide();
      
      this.loadVehiclesList();
      Utils.showSuccessMessage(vehicleId ? 'Veículo atualizado com sucesso!' : 'Veículo cadastrado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar veículo:', error);
      Utils.showErrorMessage('Erro ao salvar veículo: ' + (error.message || 'Erro desconhecido'));
    } finally {
      resetSpinner();
    }
  },

  // Confirmar exclusão de veículo
  confirmDeleteVehicle: function(vehicleId, vehiclePlate) {
    this.vehicleToDelete = vehicleId;
    document.getElementById('delete-vehicle-plate').textContent = vehiclePlate;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteVehicleModal'));
    modal.show();
  },

  // Excluir veículo
  deleteVehicle: async function() {
    if (!this.vehicleToDelete) return;
    
    try {
      await Auth.fetchAuth(`${app.API_URL}/vehicles/${this.vehicleToDelete}`, {
        method: 'DELETE'
      });
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('deleteVehicleModal'));
      modal.hide();
      
      this.loadVehiclesList();
      Utils.showSuccessMessage('Veículo excluído com sucesso!');
      
      this.vehicleToDelete = null;
      
    } catch (error) {
      console.error('Erro ao excluir veículo:', error);
      Utils.showErrorMessage('Erro ao excluir veículo: ' + (error.message || 'Este veículo pode estar associado a carregamentos'));
    }
  },

  // Limpar formulário de veículo
  clearVehicleForm: function() {
    const form = document.getElementById('vehicle-form');
    if (form) {
      form.reset();
    }
    
    const idField = document.getElementById('vehicle-id');
    if (idField) {
      idField.value = '';
    }
    
    const title = document.getElementById('vehicle-modal-title');
    if (title) {
      title.textContent = 'Novo Veículo';
    }
    
    const saveText = document.getElementById('save-vehicle-text');
    if (saveText) {
      saveText.textContent = 'Salvar';
    }
  },

  // Criar carregamento para veículo
  createLoadingForVehicle: function() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('viewVehicleModal'));
    modal.hide();
    
    Utils.showWarningMessage('Funcionalidade será implementada no módulo de carregamentos');
  },

  // Alternar status do veículo
  toggleVehicleStatus: async function() {
    if (!this.currentVehicleId) return;
    
    try {
      const vehicle = this.allVehicles.find(v => v.id == this.currentVehicleId);
      if (!vehicle) return;
      
      let newStatus;
      switch (vehicle.status) {
        case 'available':
          newStatus = 'maintenance';
          break;
        case 'maintenance':
          newStatus = 'available';
          break;
        case 'in_use':
          Utils.showWarningMessage('Veículo está em uso e não pode ter o status alterado manualmente');
          return;
      }
      
      await Auth.fetchAuth(`${app.API_URL}/vehicles/${this.currentVehicleId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('viewVehicleModal'));
      modal.hide();
      
      this.loadVehiclesList();
      Utils.showSuccessMessage('Status do veículo alterado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao alterar status do veículo:', error);
      Utils.showErrorMessage('Erro ao alterar status do veículo');
    }
  },

  // Editar veículo atual
  editCurrentVehicle: function() {
    if (!this.currentVehicleId) return;
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('viewVehicleModal'));
    modal.hide();
    
    this.editVehicle(this.currentVehicleId);
  },

  // Exportar veículos
  exportVehicles: function() {
    if (!this.allVehicles || !Array.isArray(this.allVehicles) || this.allVehicles.length === 0) {
      Utils.showWarningMessage('Não há veículos para exportar');
      return;
    }
    
    const headers = ['ID', 'Placa', 'Tipo', 'Marca', 'Modelo', 'Ano', 'Status', 'Data de Cadastro'];
    const exportData = this.allVehicles.map(vehicle => ({
      id: vehicle.id,
      placa: vehicle.license_plate,
      tipo: vehicle.vehicle_type,
      marca: vehicle.brand || '',
      modelo: vehicle.model || '',
      ano: vehicle.year || '',
      status: vehicle.status,
      'data_de_cadastro': Utils.formatDate(vehicle.created_at)
    }));
    
    Utils.exportToCSV(exportData, 'veiculos', headers);
  },

  // Mostrar erro na lista de veículos
  showVehiclesError: function(message) {
    const tbody = document.getElementById('vehicles-list');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4">
            <i class="fas fa-exclamation-triangle text-warning fa-2x mb-2"></i>
            <p class="text-muted">${message}</p>
            <button class="btn btn-primary" onclick="Vehicles.loadVehiclesList()">
              <i class="fas fa-sync-alt me-1"></i> Tentar Novamente
            </button>
          </td>
        </tr>
      `;
    }
  }
};