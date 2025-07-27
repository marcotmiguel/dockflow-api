// js/modules/users.js

// Objeto para gerenciar usuários
const Users = {
  allUsers: [],
  currentUserId: null,
  userToDelete: null,

  // Inicializar módulo de usuários
  init: function() {
    this.loadUsersList();
    this.setupUsersEventListeners();
    this.setupFormValidation();
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
        this.filterUsers();
      });
    }

    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filterUsers();
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

    const auditBtn = document.getElementById('audit-log');
    if (auditBtn) {
      auditBtn.addEventListener('click', () => {
        this.showAuditLog();
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
        this.showResetPasswordModal();
      });
    }

    const confirmResetBtn = document.getElementById('confirm-reset-password');
    if (confirmResetBtn) {
      confirmResetBtn.addEventListener('click', () => {
        this.resetUserPassword();
      });
    }

    const generatePasswordBtn = document.getElementById('generate-password');
    if (generatePasswordBtn) {
      generatePasswordBtn.addEventListener('click', () => {
        this.generateRandomPassword();
      });
    }
    
    const editUserBtn = document.getElementById('edit-user-btn');
    if (editUserBtn) {
      editUserBtn.addEventListener('click', () => {
        this.editCurrentUser();
      });
    }

    // Toggle de senha
    const togglePassword = document.getElementById('toggle-password');
    if (togglePassword) {
      togglePassword.addEventListener('click', () => {
        this.togglePasswordVisibility('user-password', 'toggle-password');
      });
    }

    const toggleNewPassword = document.getElementById('toggle-new-password');
    if (toggleNewPassword) {
      toggleNewPassword.addEventListener('click', () => {
        this.togglePasswordVisibility('new-password', 'toggle-new-password');
      });
    }
    
    const userModal = document.getElementById('userModal');
    if (userModal) {
      userModal.addEventListener('hidden.bs.modal', () => {
        this.clearUserForm();
      });
    }

    // Máscara para CPF
    const cpfInput = document.getElementById('user-cpf');
    if (cpfInput) {
      cpfInput.addEventListener('input', this.formatCPF);
      cpfInput.addEventListener('blur', this.validateCPF);
    }
  },

  // Configurar validação do formulário
  setupFormValidation: function() {
    const form = document.getElementById('user-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveUser();
    });

    // Validação em tempo real
    const emailInput = document.getElementById('user-email');
    if (emailInput) {
      emailInput.addEventListener('blur', () => {
        this.validateEmail(emailInput.value);
      });
    }

    const passwordInput = document.getElementById('user-password');
    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        this.validatePassword(passwordInput.value);
      });
    }
  },

  // Carregar lista de usuários
  loadUsersList: async function() {
    try {
      const usersResponse = await Auth.fetchAuth(`${app.API_URL}/users`);
      this.displayUsersList(usersResponse);
      this.updateStatusCounts(usersResponse);
      this.allUsers = usersResponse;
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      this.showUsersError('Erro ao carregar lista de usuários');
    }
  },

  // Atualizar contadores de status
  updateStatusCounts: function(users) {
    const active = users.filter(u => u.status === 'active').length;
    const inactive = users.filter(u => u.status === 'inactive').length;
    const admins = users.filter(u => u.role === 'admin').length;
    const total = users.length;

    document.getElementById('active-users-count').textContent = active;
    document.getElementById('inactive-users-count').textContent = inactive;
    document.getElementById('admin-users-count').textContent = admins;
    document.getElementById('total-users-count').textContent = total;
  },

  // Exibir lista de usuários
  displayUsersList: function(users) {
    const tbody = document.getElementById('users-list');
    const totalCount = document.getElementById('users-total-count');
    
    if (!tbody) return;
    
    if (totalCount) {
      totalCount.textContent = users.length;
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
      const roleConfig = this.getRoleConfig(user.role);
      const statusConfig = this.getStatusConfig(user.status);
      const lastLogin = user.last_login ? Utils.formatDateTime(user.last_login) : 'Nunca';
      const cpfFormatted = this.formatCPFDisplay(user.cpf);
      
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div class="d-flex align-items-center">
              <div class="${statusConfig.bgClass} rounded-circle p-2 me-2">
                <i class="${statusConfig.icon} ${statusConfig.textClass}"></i>
              </div>
              <div>
                <div class="fw-medium">${user.name}</div>
                <small class="text-muted">${user.email}</small>
              </div>
            </div>
          </td>
          <td><span class="text-muted">${cpfFormatted}</span></td>
          <td>
            <span class="badge ${roleConfig.badgeClass}">${roleConfig.text}</span>
          </td>
          <td>
            <span class="badge ${statusConfig.badgeClass}">${statusConfig.text}</span>
          </td>
          <td>
            <small class="text-muted">${lastLogin}</small>
          </td>
          <td class="text-center">
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-primary view-user-btn" data-id="${user.id}" title="Visualizar">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-outline-secondary edit-user-btn" data-id="${user.id}" title="Editar" data-role="admin">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-danger delete-user-btn" data-id="${user.id}" data-name="${user.name}" title="Excluir" data-role="admin">
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

  // Configuração de papéis
  getRoleConfig: function(role) {
    const configs = {
      'admin': {
        text: 'Administrador',
        badgeClass: 'bg-danger',
        icon: 'fas fa-user-shield'
      },
      'manager': {
        text: 'Gerente',
        badgeClass: 'bg-warning',
        icon: 'fas fa-user-tie'
      },
      'operator': {
        text: 'Operador',
        badgeClass: 'bg-info',
        icon: 'fas fa-user'
      }
    };
    
    return configs[role] || configs['operator'];
  },

  // Configuração de status
  getStatusConfig: function(status) {
    const configs = {
      'active': {
        text: 'Ativo',
        badgeClass: 'bg-success',
        bgClass: 'bg-success bg-opacity-10',
        textClass: 'text-success',
        icon: 'fas fa-user-check'
      },
      'inactive': {
        text: 'Inativo',
        badgeClass: 'bg-secondary',
        bgClass: 'bg-secondary bg-opacity-10',
        textClass: 'text-secondary',
        icon: 'fas fa-user-slash'
      }
    };
    
    return configs[status] || configs['active'];
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
    this.filterUsers();
  },

  // Filtrar usuários
  filterUsers: function() {
    if (!this.allUsers) return;
    
    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    const roleFilter = document.getElementById('role-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    
    let filteredUsers = this.allUsers.filter(user => {
      const matchesSearch = !searchTerm || 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.cpf.includes(searchTerm.replace(/\D/g, ''));
      
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || user.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
    
    this.displayUsersList(filteredUsers);
  },

  // Visualizar usuário
  viewUser: async function(userId) {
    try {
      const user = await Auth.fetchAuth(`${app.API_URL}/users/${userId}`);
      const roleConfig = this.getRoleConfig(user.role);
      const statusConfig = this.getStatusConfig(user.status);
      
      document.getElementById('view-user-name').textContent = user.name;
      document.getElementById('view-user-cpf').textContent = this.formatCPFDisplay(user.cpf);
      document.getElementById('view-user-email').textContent = user.email;
      document.getElementById('view-user-phone').textContent = user.phone || 'Não informado';
      
      const roleBadge = document.getElementById('view-user-role');
      roleBadge.textContent = roleConfig.text;
      roleBadge.className = `badge ${roleConfig.badgeClass}`;
      
      const statusBadge = document.getElementById('view-user-status');
      statusBadge.textContent = statusConfig.text;
      statusBadge.className = `badge ${statusConfig.badgeClass}`;
      
      document.getElementById('view-user-created').textContent = Utils.formatDateTime(user.created_at);
      document.getElementById('view-user-last-login').textContent = user.last_login ? Utils.formatDateTime(user.last_login) : 'Nunca';
      document.getElementById('view-user-notes').textContent = user.notes || 'Nenhuma observação registrada.';
      
      await this.loadUserActions(userId);
      
      this.currentUserId = userId;
      
      const modal = new bootstrap.Modal(document.getElementById('viewUserModal'));
      modal.show();
      
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      Utils.showErrorMessage('Erro ao carregar dados do usuário');
    }
  },

  // Carregar ações do usuário
  loadUserActions: async function(userId) {
    try {
      let actions = [];
      try {
        actions = await Auth.fetchAuth(`${app.API_URL}/users/${userId}/actions`);
      } catch (error) {
        console.warn('Rota de ações de usuário não implementada:', error);
        actions = [];
      }
      
      const tbody = document.getElementById('view-user-actions');
      if (actions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3 text-muted">Nenhuma ação registrada.</td></tr>';
        return;
      }
      
      let html = '';
      actions.slice(0, 10).forEach(action => {
        const datetime = Utils.formatDateTime(action.created_at);
        
        html += `
          <tr>
            <td>${datetime}</td>
            <td>${action.action}</td>
            <td>${action.module}</td>
            <td><small class="text-muted">${action.ip_address || 'N/A'}</small></td>
          </tr>
        `;
      });
      
      tbody.innerHTML = html;
      
    } catch (error) {
      console.error('Erro ao carregar ações do usuário:', error);
    }
  },

  // Editar usuário
  editUser: async function(userId) {
    try {
      const user = await Auth.fetchAuth(`${app.API_URL}/users/${userId}`);
      
      document.getElementById('user-id').value = user.id;
      document.getElementById('user-name').value = user.name;
      document.getElementById('user-cpf').value = this.formatCPFDisplay(user.cpf);
      document.getElementById('user-email').value = user.email;
      document.getElementById('user-phone').value = user.phone || '';
      document.getElementById('user-role').value = user.role;
      document.getElementById('user-status').value = user.status;
      document.getElementById('user-notes').value = user.notes || '';
      
      // Ajustar campos para edição
      document.getElementById('user-modal-title').textContent = 'Editar Usuário';
      document.getElementById('save-user-text').textContent = 'Atualizar';
      document.getElementById('password-required').style.display = 'none';
      document.getElementById('password-help').style.display = 'block';
      document.getElementById('user-password').required = false;
      
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
    if (!this.validateForm(form)) {
      return;
    }
    
    const userId = activeModal.querySelector('#user-id').value;
    const userData = {
      name: activeModal.querySelector('#user-name').value.trim(),
      cpf: activeModal.querySelector('#user-cpf').value.replace(/\D/g, ''),
      email: activeModal.querySelector('#user-email').value.trim().toLowerCase(),
      phone: activeModal.querySelector('#user-phone').value.trim() || null,
      role: activeModal.querySelector('#user-role').value,
      status: activeModal.querySelector('#user-status').value,
      notes: activeModal.querySelector('#user-notes').value.trim() || null
    };

    const password = activeModal.querySelector('#user-password').value.trim();
    if (password) {
      userData.password = password;
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
      let errorMessage = 'Erro ao salvar usuário';
      
      if (error.message.includes('email')) {
        errorMessage = 'Este email já está em uso';
      } else if (error.message.includes('cpf')) {
        errorMessage = 'Este CPF já está cadastrado';
      }
      
      Utils.showErrorMessage(errorMessage);
    } finally {
      resetSpinner();
    }
  },

  // Validar formulário
  validateForm: function(form) {
    let isValid = true;
    
    // Validar campos obrigatórios
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        field.classList.add('is-invalid');
        isValid = false;
      } else {
        field.classList.remove('is-invalid');
      }
    });
    
    // Validar CPF
    const cpfField = form.querySelector('#user-cpf');
    if (cpfField && !this.isValidCPF(cpfField.value)) {
      cpfField.classList.add('is-invalid');
      isValid = false;
    }
    
    // Validar email
    const emailField = form.querySelector('#user-email');
    if (emailField && !Utils.validateEmail(emailField.value)) {
      emailField.classList.add('is-invalid');
      isValid = false;
    }
    
    // Validar senha (apenas para novos usuários ou se foi preenchida)
    const passwordField = form.querySelector('#user-password');
    const userId = form.querySelector('#user-id').value;
    if (passwordField && (!userId || passwordField.value.trim())) {
      if (passwordField.value.length < 6) {
        passwordField.classList.add('is-invalid');
        isValid = false;
      } else {
        passwordField.classList.remove('is-invalid');
      }
    }
    
    return isValid;
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
      Utils.showErrorMessage('Erro ao excluir usuário: Este usuário pode ter ações registradas no sistema');
    }
  },

  // Mostrar modal de reset de senha
  showResetPasswordModal: function() {
    if (!this.currentUserId) return;
    
    const user = this.allUsers.find(u => u.id == this.currentUserId);
    if (!user) return;
    
    document.getElementById('reset-user-name').textContent = user.name;
    document.getElementById('new-password').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
    modal.show();
  },

  // Resetar senha do usuário
  resetUserPassword: async function() {
    const newPassword = document.getElementById('new-password').value.trim();
    
    if (!newPassword || newPassword.length < 6) {
      Utils.showErrorMessage('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    try {
      await Auth.fetchAuth(`${app.API_URL}/users/${this.currentUserId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword })
      });
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('resetPasswordModal'));
      modal.hide();
      
      Utils.showSuccessMessage('Senha resetada com sucesso!');
      
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      Utils.showErrorMessage('Erro ao resetar senha');
    }
  },

  // Gerar senha aleatória
  generateRandomPassword: function() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    document.getElementById('new-password').value = password;
  },

  // Toggle visibilidade da senha
  togglePasswordVisibility: function(passwordFieldId, toggleButtonId) {
    const passwordField = document.getElementById(passwordFieldId);
    const toggleButton = document.getElementById(toggleButtonId);
    const icon = toggleButton.querySelector('i');
    
    if (passwordField.type === 'password') {
      passwordField.type = 'text';
      icon.className = 'fas fa-eye-slash';
    } else {
      passwordField.type = 'password';
      icon.className = 'fas fa-eye';
    }
  },

  // Limpar formulário de usuário
  clearUserForm: function() {
    const form = document.getElementById('user-form');
    if (form) {
      form.reset();
    }
    
    // Resetar validações
    form.querySelectorAll('.is-invalid').forEach(field => {
      field.classList.remove('is-invalid');
    });
    
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

    // Resetar campos de senha
    document.getElementById('password-required').style.display = 'inline';
    document.getElementById('password-help').style.display = 'none';
    document.getElementById('user-password').required = true;
  },

  // Editar usuário atual
  editCurrentUser: function() {
    if (!this.currentUserId) return;
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('viewUserModal'));
    modal.hide();
    
    this.editUser(this.currentUserId);
  },

  // Mostrar log de auditoria
  showAuditLog: function() {
    Utils.showWarningMessage('Funcionalidade de auditoria será implementada em breve');
  },

  // Exportar usuários
  exportUsers: function() {
    if (!this.allUsers || this.allUsers.length === 0) {
      Utils.showWarningMessage('Não há usuários para exportar');
      return;
    }
    
    const headers = ['ID', 'Nome', 'Email', 'CPF', 'Nível', 'Status', 'Data de Criação'];
    const exportData = this.allUsers.map(user => ({
      id: user.id,
      nome: user.name,
      email: user.email,
      cpf: this.formatCPFDisplay(user.cpf),
      nivel: this.getRoleConfig(user.role).text,
      status: this.getStatusConfig(user.status).text,
      'data_de_criacao': Utils.formatDate(user.created_at)
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

  // Formatação e validação de CPF
  formatCPF: function(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    e.target.value = value;
  },

  formatCPFDisplay: function(cpf) {
    if (!cpf) return 'Não informado';
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  },

  isValidCPF: function(cpf) {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
      return false;
    }
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    
    return remainder === parseInt(cpf.charAt(10));
  },

  validateCPF: function(e) {
    const isValid = Users.isValidCPF(e.target.value);
    if (!isValid && e.target.value.trim()) {
      e.target.classList.add('is-invalid');
    } else {
      e.target.classList.remove('is-invalid');
    }
  },

  validateEmail: function(email) {
    const isValid = Utils.validateEmail(email);
    const emailField = document.getElementById('user-email');
    
    if (!isValid && email.trim()) {
      emailField.classList.add('is-invalid');
    } else {
      emailField.classList.remove('is-invalid');
    }
    
    return isValid;
  },

  validatePassword: function(password) {
    const passwordField = document.getElementById('user-password');
    const userId = document.getElementById('user-id').value;
    
    // Se é edição e campo está vazio, não validar
    if (userId && !password.trim()) {
      passwordField.classList.remove('is-invalid');
      return true;
    }
    
    const isValid = password.length >= 6;
    if (!isValid) {
      passwordField.classList.add('is-invalid');
    } else {
      passwordField.classList.remove('is-invalid');
    }
    
    return isValid;
  }
};