// js/modules/loadings-history.js
// 📚 MÓDULO HISTORY - Cards por motorista/veículo + limpeza automática

const LoadingsHistory = {
  todayLoadings: [],
  autoCleanInterval: null,

  // 🚀 Inicialização do sistema de histórico
  init: function() {
    console.log('📚 Inicializando sistema de histórico...');
    this.setupHistoryEventListeners();
    this.startAutoCleanTimer();
    this.loadTodayHistory();
  },

  // 📋 Event listeners do histórico
  setupHistoryEventListeners: function() {
    // Listener para quando a aba histórico for clicada
    const historyTab = document.getElementById('history-tab');
    if (historyTab) {
      historyTab.addEventListener('click', () => {
        setTimeout(() => {
          this.displayHistoryCards();
        }, 100);
      });
    }

    // Botão de exportar histórico
    const exportBtn = document.getElementById('export-history');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportTodayHistory();
      });
    }
  },

  // ⏰ Iniciar timer de limpeza automática às 3h
  startAutoCleanTimer: function() {
    // Verificar a cada minuto se é 3h da manhã
    this.autoCleanInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 3 && now.getMinutes() === 0) {
        this.performAutoClean();
      }
    }, 60000); // Verificar a cada minuto

    console.log('⏰ Timer de limpeza automática iniciado (3h da manhã)');
  },

  // 🧹 Realizar limpeza automática às 3h
  performAutoClean: function() {
    console.log('🧹 Iniciando limpeza automática às 3h...');
    
    // Verificar se há carregamentos ativos
    const activeLoadings = LoadingsCore.allLoadings.filter(l => l.status === 'loading');
    
    if (activeLoadings.length > 0) {
      console.log(`⚠️ ${activeLoadings.length} carregamentos ainda ativos. Mantendo no histórico.`);
      
      // Limpar apenas os finalizados
      const completedToday = this.todayLoadings.filter(l => l.status === 'completed');
      console.log(`📦 Arquivando ${completedToday.length} carregamentos finalizados`);
      
      // Remover apenas os finalizados do histórico visual
      this.todayLoadings = this.todayLoadings.filter(l => l.status !== 'completed');
    } else {
      console.log('✅ Todos os carregamentos finalizados. Limpeza completa.');
      
      // Arquivar todos os carregamentos do dia
      console.log(`📦 Arquivando ${this.todayLoadings.length} carregamentos no banco de dados`);
      
      // Aqui seria o local para salvar no banco de dados
      // Por enquanto, apenas limpar o histórico visual
      this.todayLoadings = [];
    }

    // Reset dos contadores do dashboard
    this.resetDashboardCounters();
    
    // Atualizar display
    this.displayHistoryCards();
    
    console.log('✅ Limpeza automática concluída às 3h');
  },

  // 🔄 Reset dos contadores do dashboard
  resetDashboardCounters: function() {
    const completedEl = document.getElementById('completed-today');
    if (completedEl) completedEl.textContent = '0';
    
    console.log('🔄 Contadores do dashboard resetados');
  },

  // 📊 Carregar histórico do dia
  loadTodayHistory: function() {
    // Filtrar carregamentos de hoje
    const today = new Date().toDateString();
    this.todayLoadings = LoadingsCore.allLoadings.filter(loading => {
      const loadingDate = new Date(loading.created_at || loading.timestamp).toDateString();
      return loadingDate === today;
    });
    
    console.log(`📊 ${this.todayLoadings.length} carregamentos encontrados para hoje`);
  },

  // 🖥️ Exibir cards do histórico por motorista/veículo
  displayHistoryCards: function() {
    const container = document.getElementById('history-list');
    if (!container || !container.parentElement) return;

    // Substituir tabela por container de cards
    const historyContainer = container.parentElement.parentElement;
    historyContainer.innerHTML = `
      <div class="card-header">
        <div class="d-flex justify-content-between align-items-center">
          <h5 class="mb-0">
            <i class="fas fa-history"></i> Carregamentos de Hoje - ${new Date().toLocaleDateString('pt-BR')}
          </h5>
          <button class="btn btn-outline-success btn-sm" id="export-history">
            <i class="fas fa-download me-1"></i>
            Exportar
          </button>
        </div>
      </div>
      <div class="card-body">
        <div id="history-cards-container">
          ${this.generateHistoryCards()}
        </div>
      </div>
    `;

    // Re-adicionar event listener do botão exportar
    const exportBtn = document.getElementById('export-history');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportTodayHistory();
      });
    }
  },

  // 🏗️ Gerar cards do histórico
  generateHistoryCards: function() {
    this.loadTodayHistory(); // Atualizar dados

    if (this.todayLoadings.length === 0) {
      return `
        <div class="text-center py-5">
          <i class="fas fa-calendar-day text-muted fa-3x mb-3"></i>
          <h5 class="text-muted">Nenhum carregamento hoje</h5>
          <p class="text-muted">Os carregamentos do dia aparecerão aqui organizados por motorista/veículo</p>
        </div>
      `;
    }

    // Agrupar por motorista/veículo
    const groupedLoadings = this.groupLoadingsByDriver();
    
    let cardsHtml = '<div class="row">';
    
    Object.entries(groupedLoadings).forEach(([driverKey, loadings]) => {
      cardsHtml += this.generateDriverCard(driverKey, loadings);
    });
    
    cardsHtml += '</div>';
    
    return cardsHtml;
  },

  // 👥 Agrupar carregamentos por motorista/veículo
  groupLoadingsByDriver: function() {
    const grouped = {};
    
    this.todayLoadings.forEach(loading => {
      const isXmlImport = loading.imported || loading.xml_file || loading.xml_data;
      
      // Criar chave única para agrupar
      let driverKey;
      if (isXmlImport) {
        driverKey = `${loading.destinatario || loading.emitente || 'XML Import'} - NF:${loading.nota_fiscal || 'XML'}`;
      } else {
        driverKey = `${loading.driver_name} - ${loading.vehicle_plate}`;
      }
      
      if (!grouped[driverKey]) {
        grouped[driverKey] = [];
      }
      
      grouped[driverKey].push(loading);
    });
    
    return grouped;
  },

  // 🎴 Gerar card individual do motorista
  generateDriverCard: function(driverKey, loadings) {
    const isXmlGroup = loadings[0].imported || loadings[0].xml_file || loadings[0].xml_data;
    const firstLoading = loadings[0];
    
    // Determinar status geral do grupo
    const hasActive = loadings.some(l => l.status === 'loading');
    const allCompleted = loadings.every(l => l.status === 'completed');
    const cardStatusClass = hasActive ? 'warning' : allCompleted ? 'success' : 'info';
    const cardStatusText = hasActive ? '⏳ Carregando...' : allCompleted ? '✅ Finalizado' : '📋 Processando';
    
    // Doca atual (se houver carregamento ativo)
    const activeLoading = loadings.find(l => l.status === 'loading');
    const currentDock = activeLoading ? activeLoading.dock_id : null;
    
    return `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="card h-100 border-${cardStatusClass}">
          <div class="card-header bg-${cardStatusClass} bg-opacity-10">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="mb-1">
                  <i class="fas fa-${isXmlGroup ? 'file-alt' : 'user'} me-2"></i>
                  ${this.getDriverDisplayName(driverKey, isXmlGroup)}
                </h6>
                <small class="text-muted">${this.getVehicleDisplayInfo(driverKey, firstLoading, isXmlGroup)}</small>
              </div>
              <span class="badge bg-${cardStatusClass}">${cardStatusText}</span>
            </div>
          </div>
          
          <div class="card-body">
            <div class="mb-3">
              ${currentDock ? `
                <div class="alert alert-warning py-2 mb-2">
                  <small><strong>🏭 Doca ${currentDock} OCUPADA</strong></small>
                </div>
              ` : ''}
              
              ${loadings.map(loading => this.generateLoadingItem(loading)).join('')}
            </div>
            
            <div class="mt-auto">
              <small class="text-muted">
                📊 ${loadings.length} carregamento${loadings.length > 1 ? 's' : ''} hoje
              </small>
            </div>
          </div>
          
          <div class="card-footer bg-transparent">
            <div class="d-flex justify-content-between align-items-center">
              <small class="text-muted">
                ${this.getTimeRange(loadings)}
              </small>
              ${hasActive ? `
                <button class="btn btn-sm btn-outline-primary view-details-btn" data-driver="${driverKey}">
                  <i class="fas fa-eye"></i> Detalhes
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // 📋 Gerar item individual de carregamento
  generateLoadingItem: function(loading) {
    const isXmlImport = loading.imported || loading.xml_file || loading.xml_data;
    const statusIcon = this.getStatusIcon(loading.status);
    const statusClass = LoadingsCore.getStatusBadgeClass(loading.status);
    const statusText = LoadingsCore.getStatusText(loading.status);
    
    // Informações específicas para XML vs WhatsApp
    const mainInfo = isXmlImport ? 
      `NF ${loading.nota_fiscal}` : 
      `${loading.driver_name}`;
    
    const subInfo = isXmlImport ?
      `${loading.produtos_count || 0} produtos` :
      `${loading.vehicle_plate}`;
    
    const timeInfo = this.getLoadingTimeInfo(loading);
    
    return `
      <div class="border-start border-3 border-${statusClass} ps-3 mb-2">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="fw-bold small">${mainInfo}</div>
            <div class="text-muted small">${subInfo}</div>
            ${timeInfo ? `<div class="text-muted small">${timeInfo}</div>` : ''}
          </div>
          <div class="text-end">
            <span class="badge bg-${statusClass} badge-sm">${statusIcon}</span>
            ${isXmlImport && loading.status === 'completed' ? `
              <button class="btn btn-link btn-sm p-0 ms-2 view-products-btn" 
                      data-loading-id="${loading.id}" 
                      title="Ver produtos bipados">
                <i class="fas fa-eye text-info"></i>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  // 🎯 Obter nome de exibição do motorista
  getDriverDisplayName: function(driverKey, isXmlGroup) {
    if (isXmlGroup) {
      const parts = driverKey.split(' - NF:');
      return parts[0];
    } else {
      const parts = driverKey.split(' - ');
      return parts[0];
    }
  },

  // 🚛 Obter informações do veículo
  getVehicleDisplayInfo: function(driverKey, firstLoading, isXmlGroup) {
    if (isXmlGroup) {
      const parts = driverKey.split(' - NF:');
      return `NF: ${parts[1]}`;
    } else {
      const parts = driverKey.split(' - ');
      return parts[1] || firstLoading.vehicle_plate;
    }
  },

  // ⏰ Obter faixa de horário
  getTimeRange: function(loadings) {
    const times = loadings
      .map(l => new Date(l.created_at || l.timestamp))
      .sort((a, b) => a - b);
    
    const first = times[0];
    const last = times[times.length - 1];
    
    if (times.length === 1 || first.getTime() === last.getTime()) {
      return `${first.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `${first.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${last.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
  },

  // 🎯 Obter ícone do status
  getStatusIcon: function(status) {
    const icons = {
      'waiting': '⏳',
      'approved': '✅',
      'loading': '🔄',
      'completed': '✅',
      'cancelled': '❌'
    };
    return icons[status] || '❓';
  },

  // ⏰ Obter informações de tempo do carregamento
  getLoadingTimeInfo: function(loading) {
    if (loading.completed_at) {
      return `Finalizado: ${new Date(loading.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (loading.started_at) {
      return `Iniciado: ${new Date(loading.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `Criado: ${new Date(loading.created_at || loading.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
  },

  // 👁️ Visualizar produtos bipados
  viewScannedProducts: function(loadingId) {
    const loading = LoadingsCore.allLoadings.find(l => l.id == loadingId);
    if (!loading || !loading.produtos_status) {
      Utils.showErrorMessage('Produtos não encontrados');
      return;
    }

    let message = `📋 PRODUTOS BIPADOS - NF ${loading.nota_fiscal}\n\n`;
    
    loading.produtos_status.forEach((produto, index) => {
      const status = produto.concluido ? '✅' : produto.quantidade_carregada > 0 ? '⏳' : '⭕';
      message += `${index + 1}. ${status} ${produto.descricao}\n`;
      message += `   Código: ${produto.codigo}\n`;
      message += `   Bipado: ${produto.quantidade_carregada}/${produto.quantidade_nf} ${produto.unidade}\n\n`;
    });

    const totalItens = loading.produtos_status.reduce((sum, p) => sum + p.quantidade_nf, 0);
    const itensBipados = loading.produtos_status.reduce((sum, p) => sum + p.quantidade_carregada, 0);
    
    message += `📊 RESUMO:\n`;
    message += `Total de itens: ${totalItens}\n`;
    message += `Itens bipados: ${itensBipados}\n`;
    message += `Percentual: ${Math.round((itensBipados / totalItens) * 100)}%`;

    alert(message);
  },

  // 📤 Exportar histórico do dia
  exportTodayHistory: function() {
    this.loadTodayHistory();
    
    if (this.todayLoadings.length === 0) {
      Utils.showWarningMessage('Nenhum carregamento para exportar hoje');
      return;
    }

    const csvContent = this.generateCSVContent();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const today = new Date().toISOString().split('T')[0];
    const filename = `carregamentos_${today}.csv`;
    
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    Utils.showSuccessMessage(`Histórico exportado: ${filename}`);
  },

  // 📄 Gerar conteúdo CSV
  generateCSVContent: function() {
    let csv = 'Data,Hora,Tipo,Motorista/Destinatario,Veiculo/NF,Rota,Doca,Status,Inicio,Fim\n';
    
    this.todayLoadings.forEach(loading => {
      const isXmlImport = loading.imported || loading.xml_file || loading.xml_data;
      const date = new Date(loading.created_at || loading.timestamp);
      
      csv += `${date.toLocaleDateString('pt-BR')},`;
      csv += `${date.toLocaleTimeString('pt-BR')},`;
      csv += `${isXmlImport ? 'XML' : 'WhatsApp'},`;
      csv += `"${isXmlImport ? loading.destinatario : loading.driver_name}",`;
      csv += `"${isXmlImport ? `NF ${loading.nota_fiscal}` : loading.vehicle_plate}",`;
      csv += `"${loading.route_code}",`;
      csv += `${loading.dock_id || ''},`;
      csv += `${LoadingsCore.getStatusText(loading.status)},`;
      csv += `${loading.started_at ? new Date(loading.started_at).toLocaleTimeString('pt-BR') : ''},`;
      csv += `${loading.completed_at ? new Date(loading.completed_at).toLocaleTimeString('pt-BR') : ''}\n`;
    });
    
    return csv;
  },

  // 📊 Obter estatísticas do dia
  getTodayStats: function() {
    this.loadTodayHistory();
    
    const stats = {
      total: this.todayLoadings.length,
      completed: this.todayLoadings.filter(l => l.status === 'completed').length,
      active: this.todayLoadings.filter(l => l.status === 'loading').length,
      waiting: this.todayLoadings.filter(l => l.status === 'waiting').length,
      xmlImports: this.todayLoadings.filter(l => l.imported || l.xml_file).length,
      whatsappRequests: this.todayLoadings.filter(l => !l.imported && !l.xml_file).length
    };
    
    return stats;
  }
};

// 🌐 Expor globalmente
window.LoadingsHistory = LoadingsHistory;