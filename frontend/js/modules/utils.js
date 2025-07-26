// js/modules/utils.js

// Objeto para utilitários gerais do sistema
const Utils = {
  // Mostrar mensagem de sucesso
  showSuccessMessage: function(message) {
    const toastHtml = `
      <div class="toast align-items-center text-bg-success border-0 position-fixed top-0 end-0 m-3" role="alert" style="z-index: 1055;">
        <div class="d-flex">
          <div class="toast-body">
            <i class="fas fa-check-circle me-2"></i>
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    `;
    
    const toastContainer = document.createElement('div');
    toastContainer.innerHTML = toastHtml;
    document.body.appendChild(toastContainer);
    
    const toast = new bootstrap.Toast(toastContainer.querySelector('.toast'));
    toast.show();
    
    setTimeout(() => {
      toastContainer.remove();
    }, 5000);
  },

  // Mostrar mensagem de erro
  showErrorMessage: function(message) {
    const toastHtml = `
      <div class="toast align-items-center text-bg-danger border-0 position-fixed top-0 end-0 m-3" role="alert" style="z-index: 1055;">
        <div class="d-flex">
          <div class="toast-body">
            <i class="fas fa-exclamation-circle me-2"></i>
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    `;
    
    const toastContainer = document.createElement('div');
    toastContainer.innerHTML = toastHtml;
    document.body.appendChild(toastContainer);
    
    const toast = new bootstrap.Toast(toastContainer.querySelector('.toast'));
    toast.show();
    
    setTimeout(() => {
      toastContainer.remove();
    }, 5000);
  },

  // Mostrar mensagem de aviso
  showWarningMessage: function(message) {
    const toastHtml = `
      <div class="toast align-items-center text-bg-warning border-0 position-fixed top-0 end-0 m-3" role="alert" style="z-index: 1055;">
        <div class="d-flex">
          <div class="toast-body">
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    `;
    
    const toastContainer = document.createElement('div');
    toastContainer.innerHTML = toastHtml;
    document.body.appendChild(toastContainer);
    
    const toast = new bootstrap.Toast(toastContainer.querySelector('.toast'));
    toast.show();
    
    setTimeout(() => {
      toastContainer.remove();
    }, 5000);
  },

  // Exportar dados para CSV
  exportToCSV: function(data, filename, headers) {
    if (!data || data.length === 0) {
      this.showWarningMessage('Não há dados para exportar');
      return;
    }
    
    const csv = [headers.join(',')];
    
    data.forEach(item => {
      const row = headers.map(header => {
        const value = item[header.toLowerCase().replace(/\s+/g, '_')] || '';
        // Escapar aspas e envolver strings com aspas se necessário
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv.push(row.join(','));
    });
    
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  },

  // Formatar data para exibição
  formatDate: function(dateString) {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('pt-BR');
  },

  // Formatar data e hora para exibição
  formatDateTime: function(dateString) {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleString('pt-BR');
  },

  // Formatar apenas hora
  formatTime: function(dateString) {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },

  // Formatar telefone para WhatsApp
  formatPhoneForWhatsApp: function(phone) {
    return phone.replace(/\D/g, '');
  },

  // Gerar URL do WhatsApp
  generateWhatsAppURL: function(phone, message = '') {
    const cleanPhone = this.formatPhoneForWhatsApp(phone);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/55${cleanPhone}${message ? `?text=${encodedMessage}` : ''}`;
  },

  // Validar placa de veículo (formato brasileiro)
  validateLicensePlate: function(plate) {
    // Remover espaços e converter para maiúscula
    const cleanPlate = plate.replace(/\s+/g, '').toUpperCase();
    
    // Formato antigo: ABC-1234
    const oldFormat = /^[A-Z]{3}-?\d{4}$/;
    
    // Formato Mercosul: ABC1D23
    const mercosulFormat = /^[A-Z]{3}\d[A-Z]\d{2}$/;
    
    return oldFormat.test(cleanPlate) || mercosulFormat.test(cleanPlate);
  },

  // Formatar placa de veículo
  formatLicensePlate: function(plate) {
    const cleanPlate = plate.replace(/\s+/g, '').toUpperCase();
    
    // Se for formato antigo (7 caracteres), adicionar hífen
    if (cleanPlate.length === 7 && /^[A-Z]{3}\d{4}$/.test(cleanPlate)) {
      return cleanPlate.substring(0, 3) + '-' + cleanPlate.substring(3);
    }
    
    return cleanPlate;
  },

  // Debounce para otimizar pesquisas
  debounce: function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Confirmar ação com modal
  confirmAction: function(title, message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
    return new Promise((resolve) => {
      const modalHtml = `
        <div class="modal fade" id="confirmModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">${title}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
              </div>
              <div class="modal-body">
                <p>${message}</p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${cancelText}</button>
                <button type="button" class="btn btn-danger" id="confirm-action">${confirmText}</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Remover modal existente se houver
      const existingModal = document.getElementById('confirmModal');
      if (existingModal) {
        existingModal.remove();
      }
      
      // Adicionar modal ao DOM
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHtml;
      document.body.appendChild(modalContainer);
      
      // Inicializar modal
      const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
      modal.show();
      
      // Event listeners
      document.getElementById('confirm-action').addEventListener('click', () => {
        modal.hide();
        modalContainer.remove();
        resolve(true);
      });
      
      // Listener para cancelar (tanto pelo X quanto pelo botão)
      const cancelElements = modalContainer.querySelectorAll('[data-bs-dismiss="modal"], .btn-close');
      cancelElements.forEach(el => {
        el.addEventListener('click', () => {
          modal.hide();
          modalContainer.remove();
          resolve(false);
        });
      });
    });
  },

  // Validar email
  validateEmail: function(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Sanitizar entrada de texto
  sanitizeText: function(text) {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
  },

  // Gerar ID único simples
  generateId: function() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // Capitalizar primeira letra
  capitalize: function(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  },

  // Mostrar spinner em botão
  showButtonSpinner: function(button, text = 'Carregando...') {
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      ${text}
    `;
    
    return () => {
      button.disabled = false;
      button.innerHTML = originalText;
    };
  },

  // Esconder spinner em botão
  hideButtonSpinner: function(button, originalText) {
    button.disabled = false;
    button.innerHTML = originalText;
  }
};