// js/modules/users.js - VERSÃO CORRIGIDA COM MAPEAMENTO DE ROLES E FERRAMENTAS DE DESENVOLVEDOR

// ✅ FUNÇÃO PARA MAPEAR ROLES CORRETAMENTE
function getRoleDisplayName(role) {
  const roleMap = {
    'admin': 'Administrador',
    'analista': 'Analista', 
    'operador': 'Operador',
    'desenvolvedor': 'Desenvolvedor',  // ✅ ROLE QUE FALTAVA!
    // Para compatibilidade com roles antigas
    'analyst': 'Analista',
    'operator': 'Operador'
  };
  
  return roleMap[role] || role; // fallback para mostrar a role original
}

// ✅ FUNÇÃO PARA OBTER CLASSE CSS DA ROLE
function getRoleClass(role) {
  const classMap = {
    'admin': 'danger',
    'analista': 'warning',
    'operador': 'info',
    'desenvolvedor': 'success',  // ✅ CLASSE PARA DESENVOLVEDOR
    // Para compatibilidade
    'analyst': 'warning',
    'operator': 'info'
  };
  
  return classMap[role] || 'secondary';
}

// Objeto para gerenciar usuários
const Users = {
  allUsers: [],
  currentUserId: null,
  userToDelete: null,

  // Inicializar módulo de usuários
  init: function() {
    this.loadUsersList();
    this.setupUsersEventListeners();
    // ✅ INICIALIZAR FERRAMENTAS DE DESENVOLVEDOR
    this.initDeveloperTools();
  },

  // Configurar event listeners
  setupUsersEventListeners: function() {
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchUsers(e.target.value);
      });
    }
    
    const roleFilter = document.getElementById('role-filter');
    if (roleFilter) {
      roleFilter.addEventListener('change', (e) => {
        this.filterUsersByRole(e.target.value);
      });
    }
    
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filterUsersByStatus(e.target.value);
      });
    }
    
    const refreshBtn = document.getElementById('refresh-users');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadUsersList();
      });
    }
    
    const exportBtn = document.getElementById('export-users');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportUsers();
      });
    }
    
    const saveUserBtn = document.getElementById('save-user-btn');
    if (saveUserBtn) {
      saveUserBtn.addEventListener('click', () => {
        this.saveUser();
      });
    }
    
    const confirmDeleteBtn = document.getElementById('confirm-delete-user');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        this.deleteUser();
      });
    }
    
    const resetPasswordBtn = document.getElementById('reset-password-btn');
    if (resetPasswordBtn) {
      resetPasswordBtn.addEventListener('click', () => {
        this.resetUserPassword();
      });
    }
    
    const editUserBtn = document.getElementById('edit-user-btn');
    if (editUserBtn) {
      editUserBtn.addEventListener('click', () => {
        this.editCurrentUser();
      });
    }
    
    const userModal = document.getElementById('userModal');
    if (userModal) {
      userModal.addEventListener('hidden.bs.modal', () => {
        this.clearUserForm();
      });
    }
  },

  // Carregar lista de usuários
  loadUsersList: async function() {
    try {
      const usersResponse = await Auth.fetchAuth(`${app.API_URL}/users`);
      
      // 🔧 CORREÇÃO: Extrair dados da resposta
      let users = [];
      if (usersResponse && usersResponse.data && Array.isArray(usersResponse.data)) {
        users = usersResponse.data;
      } else if (Array.isArray(usersResponse)) {
        users = usersResponse;
      } else {
        console.warn('Resposta da API de usuários não é um array:', usersResponse);
        users = [];
      }
      
      this.displayUsersList(users);
      this.updateStatusCounts(users);
      this.allUsers = users;
      
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      this.showUsersError('Erro ao carregar lista de usuários');
    }
  },

  // ✅ ATUALIZAR CONTADORES DE STATUS (CORRIGIDO)
  updateStatusCounts: function(users) {
    // 🔧 CORREÇÃO: Verificar se users é array
    if (!Array.isArray(users)) {
      console.warn('updateStatusCounts: users não é um array:', users);
      users = [];
    }
    
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.status === 'active').length;
    const inactiveUsers = users.filter(user => user.status === 'inactive').length;
    
    // ✅ CORREÇÃO: Incluir todas as variações de roles
    const adminUsers = users.filter(user => user.role === 'admin').length;
    const analystUsers = users.filter(user => user.role === 'analista' || user.role === 'analyst').length;
    const operatorUsers = users.filter(user => user.role === 'operador' || user.role === 'operator').length;
    const developerUsers = users.filter(user => user.role === 'desenvolvedor').length;
    
    // Atualizar elementos na tela se existirem
    const totalElement = document.getElementById('total-users-count');
    if (totalElement) totalElement.textContent = totalUsers;
    
    const activeElement = document.getElementById('active-users-count');
    if (activeElement) activeElement.textContent = activeUsers;
    
    const inactiveElement = document.getElementById('inactive-users-count');
    if (inactiveElement) inactiveElement.textContent = inactiveUsers;
    
    const adminElement = document.getElementById('admin-users-count');
    if (adminElement) adminElement.textContent = adminUsers;
    
    const operatorElement = document.getElementById('operator-users-count');
    if (operatorElement) operatorElement.textContent = operatorUsers;
    
    const analystElement = document.getElementById('analyst-users-count');
    if (analystElement) analystElement.textContent = analystUsers;
    
    // ✅ NOVO: Contador para desenvolvedor
    const developerElement = document.getElementById('developer-users-count');
    if (developerElement) developerElement.textContent = developerUsers;
    
    console.log('📊 Contadores atualizados:', {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      admin: adminUsers,
      analyst: analystUsers,
      operator: operatorUsers,
      developer: developerUsers
    });
  },

  // ✅ EXIBIR LISTA DE USUÁRIOS (CORRIGIDO)
  displayUsersList: function(users) {
    const tbody = document.getElementById('users-list');
    if (!tbody) return;
    
    // 🔧 CORREÇÃO: Verificar se users é array
    if (!Array.isArray(users)) {
      console.warn('displayUsersList: users não é um array:', users);
      users = [];
    }
    
    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4">
            <i class="fas fa-users text-muted fa-2x mb-2"></i>
            <p class="text-muted">Nenhum usuário cadastrado</p>
            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#userModal">
              <i class="fas fa-plus me-1"></i> Cadastrar Primeiro Usuário
            </button>
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    users.forEach((user, index) => {
      const statusClass = user.status === 'active' ? 'success' : 'danger';
      const statusText = user.status === 'active' ? 'Ativo' : 'Inativo';
      
      // ✅ CORREÇÃO PRINCIPAL: Usar função para mapear roles
      const roleClass = getRoleClass(user.role);
      const roleText = getRoleDisplayName(user.role);
      
      const lastLogin = user.last_login ? Utils.formatDate(user.last_login) : 'Nunca';
      
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div class="d-flex align-items-center">
              <div class="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
                <i class="fas fa-user text-primary"></i>
              </div>
              <div>
                <div class="fw-medium">${user.name}</div>
                <small class="text-muted">ID: ${user.id}</small>
              </div>
            </div>
          </td>
          <td>
            <a href="mailto:${user.email}" class="text-decoration-none">
              ${user.email}
            </a>
          </td>
          <td>
            <span class="badge bg-${roleClass}">${roleText}</span>
          </td>
          <td>
            <span class="badge bg-${statusClass}">${statusText}</span>
          </td>
          <td>
            <small class="text-muted">${lastLogin}</small>
          </td>
          <td class="text-end">
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-primary view-user-btn" data-id="${user.id}" title="Visualizar">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-outline-secondary edit-user-btn" data-id="${user.id}" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-danger delete-user-btn" data-id="${user.id}" data-name="${user.name}" title="Excluir">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });
    
    tbody.innerHTML = html;
    this.addUserActionListeners();
  },

  // Adicionar event listeners para ações
  addUserActionListeners: function() {
    document.querySelectorAll('.view-user-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = e.currentTarget.getAttribute('data-id');
        this.viewUser(userId);
      });
    });
    
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = e.currentTarget.getAttribute('data-id');
        this.editUser(userId);
      });
    });
    
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = e.currentTarget.getAttribute('data-id');
        const userName = e.currentTarget.getAttribute('data-name');
        this.confirmDeleteUser(userId, userName);
      });
    });
  },

  // Pesquisar usuários
  searchUsers: function(searchTerm) {
    if (!this.allUsers || !Array.isArray(this.allUsers)) return;
    
    const filteredUsers = this.allUsers.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    this.displayUsersList(filteredUsers);
    this.updateStatusCounts(filteredUsers);
  },

  // Filtrar usuários por role
  filterUsersByRole: function(role) {
    if (!this.allUsers || !Array.isArray(this.allUsers)) return;
    
    let filteredUsers = this.allUsers;
    if (role) {
      filteredUsers = this.allUsers.filter(user => user.role === role);
    }
    
    this.displayUsersList(filteredUsers);
    this.updateStatusCounts(filteredUsers);
  },

  // Filtrar usuários por status
  filterUsersByStatus: function(status) {
    if (!this.allUsers || !Array.isArray(this.allUsers)) return;
    
    let filteredUsers = this.allUsers;
    if (status) {
      filteredUsers = this.allUsers.filter(user => user.status === status);
    }
    
    this.displayUsersList(filteredUsers);
    this.updateStatusCounts(filteredUsers);
  },

  // ✅ VISUALIZAR USUÁRIO (CORRIGIDO)
  viewUser: async function(userId) {
    try {
      const userResponse = await Auth.fetchAuth(`${app.API_URL}/users/${userId}`);
      
      // Extrair dados da resposta
      const user = userResponse.data || userResponse;
      
      document.getElementById('view-user-name').textContent = user.name;
      document.getElementById('view-user-email').textContent = user.email;
      
      // ✅ CORREÇÃO: Usar função para mapear role
      document.getElementById('view-user-role').textContent = getRoleDisplayName(user.role);
      
      document.getElementById('view-user-status').textContent = user.status === 'active' ? 'Ativo' : 'Inativo';
      document.getElementById('view-user-created').textContent = Utils.formatDate(user.created_at);
      document.getElementById('view-user-last-login').textContent = user.last_login ? Utils.formatDate(user.last_login) : 'Nunca';
      document.getElementById('view-user-notes').textContent = user.notes || 'Nenhuma observação registrada.';
      
      this.currentUserId = userId;
      
      const modal = new bootstrap.Modal(document.getElementById('viewUserModal'));
      modal.show();
      
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      Utils.showErrorMessage('Erro ao carregar dados do usuário');
    }
  },

  // Editar usuário
  editUser: async function(userId) {
    try {
      const userResponse = await Auth.fetchAuth(`${app.API_URL}/users/${userId}`);
      const user = userResponse.data || userResponse;
      
      document.getElementById('user-id').value = user.id;
      document.getElementById('user-name').value = user.name;
      document.getElementById('user-email').value = user.email;
      document.getElementById('user-password').value = ''; // Limpar senha
      document.getElementById('user-role').value = user.role;
      document.getElementById('user-status').value = user.status;
      document.getElementById('user-notes').value = user.notes || '';
      
      document.getElementById('user-modal-title').textContent = 'Editar Usuário';
      document.getElementById('save-user-text').textContent = 'Atualizar';
      
      const modal = new bootstrap.Modal(document.getElementById('userModal'));
      modal.show();
      
    } catch (error) {
      console.error('Erro ao carregar usuário para edição:', error);
      Utils.showErrorMessage('Erro ao carregar dados do usuário');
    }
  },

  // Salvar usuário
  saveUser: async function() {
    const activeModal = document.querySelector('#userModal.show') || 
                       document.querySelector('#userModal[style*="display: block"]') ||
                       document.getElementById('userModal');
    
    const form = activeModal.querySelector('#user-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    const userId = activeModal.querySelector('#user-id').value;
    const userData = {
      name: activeModal.querySelector('#user-name').value.trim(),
      email: activeModal.querySelector('#user-email').value.trim(),
      password: activeModal.querySelector('#user-password').value.trim(),
      role: activeModal.querySelector('#user-role').value,
      status: activeModal.querySelector('#user-status').value,
      notes: activeModal.querySelector('#user-notes').value.trim() || null
    };
    
    // Validar dados antes de enviar
    if (!userData.name || !userData.email) {
      Utils.showErrorMessage('Nome e email são obrigatórios');
      return;
    }
    
    // Se for criação, senha é obrigatória
    if (!userId && !userData.password) {
      Utils.showErrorMessage('Senha é obrigatória para novos usuários');
      return;
    }
    
    // Se não há senha na edição, remover do objeto
    if (userId && !userData.password) {
      delete userData.password;
    }
    
    const saveBtn = activeModal.querySelector('#save-user-btn');
    const resetSpinner = Utils.showButtonSpinner(saveBtn, userId ? 'Atualizando...' : 'Salvando...');
    
    try {
      if (userId) {
        await Auth.fetchAuth(`${app.API_URL}/users/${userId}`, {
          method: 'PUT',
          body: JSON.stringify(userData)
        });
      } else {
        await Auth.fetchAuth(`${app.API_URL}/users`, {
          method: 'POST',
          body: JSON.stringify(userData)
        });
      }
      
      const modal = bootstrap.Modal.getInstance(activeModal);
      modal.hide();
      
      this.loadUsersList();
      Utils.showSuccessMessage(userId ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      Utils.showErrorMessage('Erro ao salvar usuário: ' + (error.message || 'Erro desconhecido'));
    } finally {
      resetSpinner();
    }
  },

  // Confirmar exclusão de usuário
  confirmDeleteUser: function(userId, userName) {
    this.userToDelete = userId;
    document.getElementById('delete-user-name').textContent = userName;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    modal.show();
  },

  // Excluir usuário
  deleteUser: async function() {
    if (!this.userToDelete) return;
    
    try {
      await Auth.fetchAuth(`${app.API_URL}/users/${this.userToDelete}`, {
        method: 'DELETE'
      });
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('deleteUserModal'));
      modal.hide();
      
      this.loadUsersList();
      Utils.showSuccessMessage('Usuário excluído com sucesso!');
      
      this.userToDelete = null;
      
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      Utils.showErrorMessage('Erro ao excluir usuário: ' + (error.message || 'Este pode ser o último administrador do sistema'));
    }
  },

  // Resetar senha do usuário
  resetUserPassword: async function() {
    if (!this.currentUserId) return;
    
    const newPassword = prompt('Digite a nova senha (mínimo 6 caracteres):');
    
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
      Utils.showErrorMessage('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    try {
      await Auth.fetchAuth(`${app.API_URL}/users/${this.currentUserId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword })
      });
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('viewUserModal'));
      modal.hide();
      
      Utils.showSuccessMessage('Senha resetada com sucesso!');
      
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      Utils.showErrorMessage('Erro ao resetar senha do usuário');
    }
  },

  // Limpar formulário de usuário
  clearUserForm: function() {
    const form = document.getElementById('user-form');
    if (form) {
      form.reset();
    }
    
    const idField = document.getElementById('user-id');
    if (idField) {
      idField.value = '';
    }
    
    const title = document.getElementById('user-modal-title');
    if (title) {
      title.textContent = 'Novo Usuário';
    }
    
    const saveText = document.getElementById('save-user-text');
    if (saveText) {
      saveText.textContent = 'Salvar';
    }
  },

  // Editar usuário atual
  editCurrentUser: function() {
    if (!this.currentUserId) return;
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('viewUserModal'));
    modal.hide();
    
    this.editUser(this.currentUserId);
  },

  // Exportar usuários
  exportUsers: function() {
    if (!this.allUsers || !Array.isArray(this.allUsers) || this.allUsers.length === 0) {
      Utils.showWarningMessage('Não há usuários para exportar');
      return;
    }
    
    const headers = ['ID', 'Nome', 'Email', 'Role', 'Status', 'Data de Cadastro'];
    const exportData = this.allUsers.map(user => ({
      id: user.id,
      nome: user.name,
      email: user.email,
      role: getRoleDisplayName(user.role), // ✅ USAR FUNÇÃO DE MAPEAMENTO
      status: user.status,
      'data_de_cadastro': Utils.formatDate(user.created_at)
    }));
    
    Utils.exportToCSV(exportData, 'usuarios', headers);
  },

  // Mostrar erro na lista de usuários
  showUsersError: function(message) {
    const tbody = document.getElementById('users-list');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4">
            <i class="fas fa-exclamation-triangle text-warning fa-2x mb-2"></i>
            <p class="text-muted">${message}</p>
            <button class="btn btn-primary" onclick="Users.loadUsersList()">
              <i class="fas fa-sync-alt me-1"></i> Tentar Novamente
            </button>
          </td>
        </tr>
      `;
    }
  },

  // ============================================
  // ✅ FERRAMENTAS DE DESENVOLVEDOR
  // ============================================

  // Inicializar ferramentas de desenvolvedor
  initDeveloperTools: function() {
    // Verificar se o usuário logado é desenvolvedor
    const currentUser = Auth.getUser();
    if (currentUser?.role === 'desenvolvedor') {
      this.showDeveloperTools();
      this.setupDeveloperEvents();
      console.log('🛠️ Ferramentas de desenvolvedor ativadas para:', currentUser.name);
    }
  },

  // Mostrar ferramentas de desenvolvedor
  showDeveloperTools: function() {
    const devTools = document.getElementById('developer-tools');
    if (devTools) {
      devTools.style.display = 'block';
      console.log('🔧 Painel de ferramentas de desenvolvedor habilitado');
    }
  },

  // Configurar eventos das ferramentas de desenvolvedor
  setupDeveloperEvents: function() {
    // Reset do sistema
    const resetSystemBtn = document.getElementById('reset-system-btn');
    if (resetSystemBtn) {
      resetSystemBtn.addEventListener('click', () => {
        this.confirmSystemReset();
      });
    }

    // Backup do banco de dados
    const backupBtn = document.getElementById('backup-database-btn');
    if (backupBtn) {
      backupBtn.addEventListener('click', () => {
        this.createDatabaseBackup();
      });
    }

    // Gerar dados de teste
    const generateTestDataBtn = document.getElementById('generate-test-data-btn');
    if (generateTestDataBtn) {
      generateTestDataBtn.addEventListener('click', () => {
        this.generateTestData();
      });
    }

    // Limpar logs do sistema
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    if (clearLogsBtn) {
      clearLogsBtn.addEventListener('click', () => {
        this.clearSystemLogs();
      });
    }

    // Verificar integridade do sistema
    const checkIntegrityBtn = document.getElementById('check-integrity-btn');
    if (checkIntegrityBtn) {
      checkIntegrityBtn.addEventListener('click', () => {
        this.checkSystemIntegrity();
      });
    }

    // Executar manutenção do banco
    const maintenanceBtn = document.getElementById('maintenance-btn');
    if (maintenanceBtn) {
      maintenanceBtn.addEventListener('click', () => {
        this.runDatabaseMaintenance();
      });
    }

    console.log('⚙️ Event listeners das ferramentas de desenvolvedor configurados');
  },

  // Confirmar reset do sistema
  confirmSystemReset: function() {
    const confirmation = confirm(
      '⚠️ ATENÇÃO: Esta ação irá APAGAR TODOS OS DADOS do sistema!\n\n' +
      'Isso inclui:\n' +
      '• Todos os usuários (exceto admin padrão)\n' +
      '• Todas as configurações\n' +
      '• Todos os logs\n' +
      '• Todos os dados de aplicação\n\n' +
      'Esta ação é IRREVERSÍVEL!\n\n' +
      'Tem certeza que deseja continuar?'
    );

    if (confirmation) {
      const doubleConfirmation = prompt(
        'Para confirmar o reset, digite "RESET TOTAL" (sem as aspas):'
      );

      if (doubleConfirmation === 'RESET TOTAL') {
        this.executeSystemReset();
      } else {
        Utils.showWarningMessage('Reset cancelado - texto de confirmação incorreto');
      }
    }
  },

  // Executar reset do sistema
  executeSystemReset: async function() {
    try {
      const resetBtn = document.getElementById('reset-system-btn');
      const resetSpinner = Utils.showButtonSpinner(resetBtn, 'Resetando sistema...');

      const response = await Auth.fetchAuth(`${app.API_URL}/admin/reset-system`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      resetSpinner();

      if (response.success !== false) {
        Utils.showSuccessMessage(
          'Sistema resetado com sucesso! Você será redirecionado para o login em 3 segundos...'
        );
        
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 3000);
      } else {
        Utils.showErrorMessage('Erro ao resetar sistema: ' + (response.message || 'Erro desconhecido'));
      }

    } catch (error) {
      console.error('Erro ao resetar sistema:', error);
      Utils.showErrorMessage('Erro ao resetar sistema: ' + error.message);
    }
  },

  // Criar backup do banco de dados
  createDatabaseBackup: async function() {
    try {
      const backupBtn = document.getElementById('backup-database-btn');
      const resetSpinner = Utils.showButtonSpinner(backupBtn, 'Criando backup...');

      const response = await Auth.fetchAuth(`${app.API_URL}/admin/backup-database`, {
        method: 'POST'
      });

      resetSpinner();

      if (response.success !== false) {
        Utils.showSuccessMessage('Backup criado com sucesso!');
        
        // Se a resposta contém um link de download
        if (response.download_url) {
          const link = document.createElement('a');
          link.href = response.download_url;
          link.download = `backup_${new Date().toISOString().slice(0, 10)}.sql`;
          link.click();
        }
      } else {
        Utils.showErrorMessage('Erro ao criar backup: ' + (response.message || 'Erro desconhecido'));
      }

    } catch (error) {
      console.error('Erro ao criar backup:', error);
      Utils.showErrorMessage('Erro ao criar backup: ' + error.message);
    }
  },

  // Gerar dados de teste
  generateTestData: async function() {
    const confirmation = confirm(
      'Isso irá gerar dados de teste no sistema.\n' +
      'Continuar?'
    );

    if (!confirmation) return;

    try {
      const generateBtn = document.getElementById('generate-test-data-btn');
      const resetSpinner = Utils.showButtonSpinner(generateBtn, 'Gerando dados...');

      const response = await Auth.fetchAuth(`${app.API_URL}/admin/generate-test-data`, {
        method: 'POST'
      });

      resetSpinner();

      if (response.success !== false) {
        Utils.showSuccessMessage('Dados de teste gerados com sucesso!');
        this.loadUsersList(); // Recarregar a lista de usuários
      } else {
        Utils.showErrorMessage('Erro ao gerar dados de teste: ' + (response.message || 'Erro desconhecido'));
      }

    } catch (error) {
      console.error('Erro ao gerar dados de teste:', error);
      Utils.showErrorMessage('Erro ao gerar dados de teste: ' + error.message);
    }
  },

  // Limpar logs do sistema
  clearSystemLogs: async function() {
    const confirmation = confirm(
      'Isso irá apagar todos os logs do sistema.\n' +
      'Continuar?'
    );

    if (!confirmation) return;

    try {
      const clearBtn = document.getElementById('clear-logs-btn');
      const resetSpinner = Utils.showButtonSpinner(clearBtn, 'Limpando logs...');

      const response = await Auth.fetchAuth(`${app.API_URL}/admin/clear-logs`, {
        method: 'POST'
      });

      resetSpinner();

      if (response.success !== false) {
        Utils.showSuccessMessage('Logs do sistema limpos com sucesso!');
      } else {
        Utils.showErrorMessage('Erro ao limpar logs: ' + (response.message || 'Erro desconhecido'));
      }

    } catch (error) {
      console.error('Erro ao limpar logs:', error);
      Utils.showErrorMessage('Erro ao limpar logs: ' + error.message);
    }
  },

  // Verificar integridade do sistema
  checkSystemIntegrity: async function() {
    try {
      const checkBtn = document.getElementById('check-integrity-btn');
      const resetSpinner = Utils.showButtonSpinner(checkBtn, 'Verificando...');

      const response = await Auth.fetchAuth(`${app.API_URL}/admin/check-integrity`, {
        method: 'GET'
      });

      resetSpinner();

      if (response.success !== false) {
        const issues = response.issues || [];
        if (issues.length === 0) {
          Utils.showSuccessMessage('Sistema íntegro - nenhum problema encontrado!');
        } else {
          let message = 'Problemas encontrados:\n\n';
          issues.forEach((issue, index) => {
            message += `${index + 1}. ${issue}\n`;
          });
          Utils.showWarningMessage(message);
        }
      } else {
        Utils.showErrorMessage('Erro ao verificar integridade: ' + (response.message || 'Erro desconhecido'));
      }

    } catch (error) {
      console.error('Erro ao verificar integridade:', error);
      Utils.showErrorMessage('Erro ao verificar integridade: ' + error.message);
    }
  },

  // Executar manutenção do banco de dados
  runDatabaseMaintenance: async function() {
    const confirmation = confirm(
      'Isso irá executar rotinas de manutenção no banco de dados:\n' +
      '• Otimização de tabelas\n' +
      '• Limpeza de dados orfãos\n' +
      '• Reorganização de índices\n\n' +
      'O processo pode demorar alguns minutos.\n' +
      'Continuar?'
    );

    if (!confirmation) return;

    try {
      const maintenanceBtn = document.getElementById('maintenance-btn');
      const resetSpinner = Utils.showButtonSpinner(maintenanceBtn, 'Executando manutenção...');

      const response = await Auth.fetchAuth(`${app.API_URL}/admin/database-maintenance`, {
        method: 'POST'
      });

      resetSpinner();

      if (response.success !== false) {
        Utils.showSuccessMessage(
          'Manutenção do banco concluída com sucesso!\n' +
          `Tempo decorrido: ${response.duration || 'N/A'}\n` +
          `Operações realizadas: ${response.operations_count || 'N/A'}`
        );
      } else {
        Utils.showErrorMessage('Erro na manutenção: ' + (response.message || 'Erro desconhecido'));
      }

    } catch (error) {
      console.error('Erro na manutenção do banco:', error);
      Utils.showErrorMessage('Erro na manutenção do banco: ' + error.message);
    }
  }
};

// ✅ EXPORTAR FUNÇÕES GLOBALMENTE PARA USO EM OUTROS MÓDULOS
window.getRoleDisplayName = getRoleDisplayName;
window.getRoleClass = getRoleClass;

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  // Aguardar um pouco para garantir que Auth e outros módulos estejam prontos
  setTimeout(() => {
    if (typeof Users !== 'undefined') {
      Users.init();
    }
  }, 1000);
});