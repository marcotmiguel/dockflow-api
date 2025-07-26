// js/modules/loadings-docks.js
// 🏭 MÓDULO DOCAS - Controle inteligente das docas

const LoadingsDocks = {
  docks: [],

  // 🚀 Inicialização das docas
  init: function() {
    console.log('🏭 Inicializando sistema de docas...');
    this.initializeDocksData();
    this.updateDocksDisplay();
  },

  // 📋 Inicialização dos dados das docas
  initializeDocksData: function() {
    this.docks = [
      { id: 1, occupied: false, loading_id: null, start_time: null },
      { id: 2, occupied: false, loading_id: null, start_time: null },
      { id: 3, occupied: false, loading_id: null, start_time: null },
      { id: 4, occupied: false, loading_id: null, start_time: null },
      { id: 5, occupied: false, loading_id: null, start_time: null },
      { id: 6, occupied: false, loading_id: null, start_time: null },
      { id: 7, occupied: false, loading_id: null, start_time: null },
      { id: 8, occupied: false, loading_id: null, start_time: null },
      { id: 9, occupied: false, loading_id: null, start_time: null },
      { id: 10, occupied: false, loading_id: null, start_time: null }
    ];
    
    console.log('✅ 10 docas inicializadas');
  },

  // 🚀 Iniciar carregamento em doca
  startLoading: function(loadingId) {
    const loadingIndex = LoadingsCore.allLoadings.findIndex(loading => loading.id == loadingId);
    if (loadingIndex === -1) {
      Utils.showErrorMessage('Carregamento não encontrado');
      return;
    }
    
    // Mostrar docas disponíveis
    const docasDisponiveis = this.docks.filter(dock => !dock.occupied);
    const docasOcupadas = this.docks.filter(dock => dock.occupied);
    
    let mensagem = 'Selecione a doca para este carregamento:\n\n';
    mensagem += '🟢 DOCAS LIVRES:\n';
    docasDisponiveis.forEach(dock => {
      mensagem += `${dock.id} - Doca ${dock.id} (Livre)\n`;
    });
    
    if (docasOcupadas.length > 0) {
      mensagem += '\n🔴 DOCAS OCUPADAS:\n';
      docasOcupadas.forEach(dock => {
        const loading = LoadingsCore.allLoadings.find(l => l.id === dock.loading_id);
        const motorista = loading ? loading.driver_name : 'Desconhecido';
        mensagem += `${dock.id} - Doca ${dock.id} (${motorista})\n`;
      });
    }
    
    mensagem += '\nDigite o número da doca:';
    
    const docaEscolhida = prompt(mensagem);
    
    if (!docaEscolhida || isNaN(docaEscolhida) || docaEscolhida < 1 || docaEscolhida > 10) {
      Utils.showWarningMessage('Doca inválida. Operação cancelada.');
      return;
    }
    
    const dockIndex = this.docks.findIndex(dock => dock.id == docaEscolhida);
    const docaInfo = this.docks[dockIndex];
    
    // Verificar se a doca está ocupada
    if (docaInfo.occupied) {
      const loadingOcupando = LoadingsCore.allLoadings.find(l => l.id === docaInfo.loading_id);
      const confirmar = confirm(`A Doca ${docaEscolhida} está ocupada por: ${loadingOcupando.driver_name}\n\nDeseja usar mesmo assim?`);
      if (!confirmar) {
        return;
      }
    }
    
    // Atualizar status do carregamento
    LoadingsCore.allLoadings[loadingIndex].status = 'loading';
    LoadingsCore.allLoadings[loadingIndex].started_at = new Date().toISOString();
    LoadingsCore.allLoadings[loadingIndex].dock_id = parseInt(docaEscolhida);
    
    // Inicializar contadores de produtos se for XML
    if (LoadingsCore.allLoadings[loadingIndex].xml_data && LoadingsCore.allLoadings[loadingIndex].xml_data.produtos) {
      LoadingsCore.allLoadings[loadingIndex].produtos_status = LoadingsCore.allLoadings[loadingIndex].xml_data.produtos.map(produto => ({
        codigo: produto.codigo,
        descricao: produto.descricao,
        quantidade_nf: produto.quantidade,
        quantidade_carregada: 0,
        unidade: produto.unidade,
        concluido: false
      }));
    }
    
    // Ocupar a doca
    this.docks[dockIndex].occupied = true;
    this.docks[dockIndex].loading_id = loadingId;
    this.docks[dockIndex].start_time = new Date().toISOString();
    
    Utils.showSuccessMessage(`✅ Carregamento iniciado na Doca ${docaEscolhida}! Doca agora está OCUPADA. Clique em "Bipar" para iniciar a conferência.`);
    LoadingsCore.displayQueue(LoadingsCore.allLoadings);
    LoadingsCore.updateStats();
    this.updateDocksDisplay();
  },

  // 🔓 Liberar doca
  releaseDock: function(loadingId) {
    const dockIndex = this.docks.findIndex(dock => dock.loading_id == loadingId);
    if (dockIndex !== -1) {
      this.docks[dockIndex].occupied = false;
      this.docks[dockIndex].loading_id = null;
      this.docks[dockIndex].start_time = null;
      
      console.log(`✅ Doca ${this.docks[dockIndex].id} liberada`);
      this.updateDocksDisplay();
    }
  },

  // 🏭 Obter doca de um carregamento
  getDockByLoadingId: function(loadingId) {
    return this.docks.find(dock => dock.loading_id == loadingId);
  },

  // 📊 Status das docas
  getDocksStatus: function() {
    const livre = this.docks.filter(dock => !dock.occupied).length;
    const ocupada = this.docks.filter(dock => dock.occupied).length;
    
    return {
      total: this.docks.length,
      livre: livre,
      ocupada: ocupada,
      docas: this.docks
    };
  },

  // 🖥️ Atualizar display das docas
  updateDocksDisplay: function() {
    console.log('🏭 Status das Docas:');
    this.docks.forEach(dock => {
      if (dock.occupied) {
        const loading = LoadingsCore.allLoadings.find(l => l.id === dock.loading_id);
        const motorista = loading ? (loading.driver_name || loading.destinatario) : 'Desconhecido';
        console.log(`Doca ${dock.id}: 🔴 OCUPADA (${motorista})`);
      } else {
        console.log(`Doca ${dock.id}: 🟢 LIVRE`);
      }
    });
    
    // Atualizar indicadores visuais se existirem
    this.updateDockIndicators();
  },

  // 📍 Atualizar indicadores visuais
  updateDockIndicators: function() {
    // Esta função pode ser expandida para atualizar elementos visuais das docas
    // Por exemplo, em um dashboard ou painel de controle
    
    const status = this.getDocksStatus();
    
    // Atualizar contadores se existirem no DOM
    const docasLivresEl = document.getElementById('docas-livres-count');
    const docasOcupadasEl = document.getElementById('docas-ocupadas-count');
    
    if (docasLivresEl) docasLivresEl.textContent = status.livre;
    if (docasOcupadasEl) docasOcupadasEl.textContent = status.ocupada;
    
    // Log para debug
    console.log(`📊 Docas: ${status.livre} livres, ${status.ocupada} ocupadas de ${status.total} total`);
  },

  // 🔍 Verificar disponibilidade
  isDocAvailable: function(dockId) {
    const dock = this.docks.find(d => d.id === dockId);
    return dock && !dock.occupied;
  },

  // 📋 Listar docas livres
  getAvailableDocks: function() {
    return this.docks.filter(dock => !dock.occupied);
  },

  // 📋 Listar docas ocupadas
  getOccupiedDocks: function() {
    return this.docks.filter(dock => dock.occupied);
  },

  // ⏱️ Tempo de ocupação da doca
  getDockOccupationTime: function(dockId) {
    const dock = this.docks.find(d => d.id === dockId);
    if (!dock || !dock.occupied || !dock.start_time) {
      return null;
    }
    
    const now = new Date();
    const start = new Date(dock.start_time);
    const diffMinutes = Math.floor((now - start) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}min`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}min`;
    }
  },

  // 🚨 Verificar docas com muito tempo ocupadas
  checkLongOccupiedDocks: function() {
    const longOccupiedDocks = [];
    const LONG_OCCUPATION_HOURS = 4; // 4 horas
    
    this.docks.forEach(dock => {
      if (dock.occupied && dock.start_time) {
        const now = new Date();
        const start = new Date(dock.start_time);
        const diffHours = (now - start) / (1000 * 60 * 60);
        
        if (diffHours > LONG_OCCUPATION_HOURS) {
          const loading = LoadingsCore.allLoadings.find(l => l.id === dock.loading_id);
          longOccupiedDocks.push({
            dock: dock,
            loading: loading,
            occupationTime: this.getDockOccupationTime(dock.id),
            hours: Math.floor(diffHours)
          });
        }
      }
    });
    
    return longOccupiedDocks;
  },

  // 📊 Relatório de utilização das docas
  getDockUtilizationReport: function() {
    const availableDocks = this.getAvailableDocks();
    const occupiedDocks = this.getOccupiedDocks();
    const longOccupiedDocks = this.checkLongOccupiedDocks();
    
    return {
      total: this.docks.length,
      available: availableDocks.length,
      occupied: occupiedDocks.length,
      utilizationPercentage: Math.round((occupiedDocks.length / this.docks.length) * 100),
      longOccupied: longOccupiedDocks.length,
      details: {
        availableDocks: availableDocks,
        occupiedDocks: occupiedDocks,
        longOccupiedDocks: longOccupiedDocks
      }
    };
  },

  // 🔄 Reset de todas as docas (para manutenção)
  resetAllDocks: function() {
    if (!confirm('Tem certeza que deseja liberar TODAS as docas? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    this.docks.forEach(dock => {
      dock.occupied = false;
      dock.loading_id = null;
      dock.start_time = null;
    });
    
    console.log('🔄 Todas as docas foram liberadas');
    this.updateDocksDisplay();
    Utils.showWarningMessage('⚠️ Todas as docas foram liberadas!');
  }
};

// 🌐 Expor globalmente
window.LoadingsDocks = LoadingsDocks;