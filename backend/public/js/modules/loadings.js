// js/modules/loadings.js
// 🎯 ARQUIVO PRINCIPAL - Orquestra todos os módulos

const Loadings = {
  // 🚀 Inicialização principal do sistema
  init: function() {
    console.log('🎯 Inicializando sistema DockFlow...');
    
    // Verificar dependências
    if (!this.checkDependencies()) {
      console.error('❌ Dependências não encontradas');
      return;
    }
    
    // Inicializar todos os módulos
    this.initializeModules();
    
    // Configurar event listeners principais
    this.setupMainEventListeners();
    
    // Simulador WhatsApp
    this.initializeWhatsAppSimulator();
    
    console.log('✅ Sistema DockFlow inicializado com sucesso!');
  },

  // 🔍 Verificar dependências
  checkDependencies: function() {
    const dependencies = ['LoadingsCore', 'LoadingsXML', 'LoadingsDocks', 'LoadingsScanning', 'LoadingsRoutes', 'LoadingsRouting', 'LoadingsHistory'];
    const missing = [];
    
    dependencies.forEach(dep => {
      if (typeof window[dep] === 'undefined') {
        missing.push(dep);
      }
    });
    
    if (missing.length > 0) {
      console.error('❌ Módulos não carregados:', missing);
      Utils.showErrorMessage(`Módulos não carregados: ${missing.join(', ')}`);
      return false;
    }
    
    console.log('✅ Todos os módulos carregados');
    return true;
  },

  // 🏗️ Inicializar módulos
  initializeModules: function() {
    console.log('🏗️ Inicializando módulos...');
    
    // Ordem de inicialização é importante
    LoadingsCore.init();
    LoadingsDocks.init();
    LoadingsRoutes.init();
    LoadingsScanning.init();
    LoadingsXML.init();
    LoadingsRouting.init();
    LoadingsHistory.init();
    
    console.log('✅ Todos os módulos inicializados');
  },

  // 📋 Event listeners principais
  setupMainEventListeners: function() {
    // Botão Simulador WhatsApp
    const toggleSimulatorBtn = document.getElementById('toggle-whatsapp-simulator');
    if (toggleSimulatorBtn) {
      toggleSimulatorBtn.addEventListener('click', () => {
        this.toggleWhatsAppSimulator();
      });
    }
    
    const simulateRequestBtn = document.getElementById('simulate-request-btn');
    if (simulateRequestBtn) {
      simulateRequestBtn.addEventListener('click', () => {
        this.simulateWhatsAppRequest();
      });
    }
    
    // Event listeners para abas
    this.setupTabListeners();
  },

  // 📱 Inicializar simulador WhatsApp
  initializeWhatsAppSimulator: function() {
    console.log('📱 Inicializando simulador WhatsApp...');
    
    // Verificar se elementos existem
    const simulator = document.getElementById('whatsapp-simulator');
    const toggleBtn = document.getElementById('toggle-whatsapp-simulator');
    
    if (!simulator || !toggleBtn) {
      console.warn('⚠️ Elementos do simulador WhatsApp não encontrados');
      return;
    }
    
    // Inicialmente oculto
    simulator.style.display = 'none';
    
    console.log('✅ Simulador WhatsApp inicializado');
  },

  // 🔄 Alternar simulador WhatsApp
  toggleWhatsAppSimulator: function() {
    const simulator = document.getElementById('whatsapp-simulator');
    if (!simulator) return;
    
    const isVisible = simulator.style.display !== 'none';
    simulator.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
      // Focar no primeiro campo quando abrir
      const firstInput = simulator.querySelector('input');
      if (firstInput) firstInput.focus();
    }
  },

  // 📱 Simular solicitação WhatsApp
  simulateWhatsAppRequest: function() {
    const cpf = document.getElementById('sim-cpf').value.trim();
    const name = document.getElementById('sim-name').value.trim();
    const plate = document.getElementById('sim-plate').value.trim();
    const route = document.getElementById('sim-route').value.trim();
    
    if (!cpf || !name || !plate || !route) {
      Utils.showErrorMessage('Preencha todos os campos do simulador');
      return;
    }
    
    const novoCarregamento = {
      id: Date.now(),
      driver_cpf: cpf,
      driver_name: name,
      vehicle_plate: plate,
      vehicle_type: 'Caminhão',
      phone_number: '11999999999',
      route_code: route,
      status: 'waiting',
      priority: 'normal',
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };
    
    LoadingsCore.allLoadings.push(novoCarregamento);
    
    Utils.showSuccessMessage(`Solicitação enviada! Posição na fila: ${LoadingsCore.allLoadings.length}`);
    
    // Limpar campos
    document.getElementById('sim-cpf').value = '';
    document.getElementById('sim-name').value = '';
    document.getElementById('sim-plate').value = '';
    document.getElementById('sim-route').value = '';
    
    // Ocultar simulador
    document.getElementById('whatsapp-simulator').style.display = 'none';
    
    // Atualizar displays
    LoadingsCore.displayQueue(LoadingsCore.allLoadings);
    LoadingsCore.updateStats();
  },

  // 📂 Event listeners das abas
  setupTabListeners: function() {
    // Aba rotas
    const routesTab = document.getElementById('routes-tab');
    if (routesTab) {
      routesTab.addEventListener('click', () => {
        setTimeout(() => {
          LoadingsRoutes.loadRoutes();
        }, 100);
      });
    }
  },

  // 🎯 Funções de conveniência para compatibilidade
  showXmlTab: function() {
    LoadingsXML.showXmlTab();
  },

  resetXmlImport: function() {
    LoadingsXML.resetXmlImport();
  },

  // 📊 Obter estatísticas gerais
  getSystemStats: function() {
    return {
      loadings: LoadingsCore.allLoadings.length,
      docks: LoadingsDocks.getDocksStatus(),
      routes: LoadingsRoutes.getRoutesReport(),
      history: LoadingsHistory.getTodayStats()
    };
  },

  // 🛠️ Utilitários do sistema
  utils: {
    // 🔄 Recarregar sistema completo
    reloadSystem: function() {
      console.log('🔄 Recarregando sistema...');
      LoadingsCore.loadQueue();
      LoadingsRoutes.loadRoutes();
      LoadingsHistory.loadTodayHistory();
      LoadingsDocks.updateDocksDisplay();
      Utils.showSuccessMessage('Sistema recarregado!');
    },

    // 📊 Diagnóstico do sistema
    diagnostics: function() {
      const stats = Loadings.getSystemStats();
      console.log('📊 Diagnóstico do Sistema:', stats);
      
      const report = `
📊 DIAGNÓSTICO DO SISTEMA DOCKFLOW

🏗️ LOADINGS:
- Total: ${stats.loadings}
- Aguardando: ${LoadingsCore.allLoadings.filter(l => l.status === 'waiting').length}
- Aprovados: ${LoadingsCore.allLoadings.filter(l => l.status === 'approved').length}
- Carregando: ${LoadingsCore.allLoadings.filter(l => l.status === 'loading').length}
- Finalizados: ${LoadingsCore.allLoadings.filter(l => l.status === 'completed').length}

🏭 DOCAS:
- Total: ${stats.docks.total}
- Livres: ${stats.docks.livre}
- Ocupadas: ${stats.docks.ocupada}
- Utilização: ${stats.docks.ocupada > 0 ? Math.round((stats.docks.ocupada / stats.docks.total) * 100) : 0}%

🛣️ ROTAS:
- Total: ${stats.routes.total}
- Ativas: ${stats.routes.active}
- Inativas: ${stats.routes.inactive}

📚 HISTÓRICO HOJE:
- Total: ${stats.history.total}
- Finalizados: ${stats.history.completed}
- Ativos: ${stats.history.active}
- XML: ${stats.history.xmlImports}
- WhatsApp: ${stats.history.whatsappRequests}
      `;
      
      alert(report);
    },

    // 🧹 Limpeza manual
    manualCleanup: function() {
      if (!confirm('Deseja executar limpeza manual do histórico?\n\nEsta ação irá arquivar carregamentos finalizados.')) {
        return;
      }
      
      LoadingsHistory.performAutoClean();
      Utils.showSuccessMessage('Limpeza manual executada!');
    }
  },

  // 🆘 Sistema de emergência
  emergency: {
    // 🚨 Liberar todas as docas
    releaseAllDocks: function() {
      LoadingsDocks.resetAllDocks();
    },

    // 🔄 Reset completo do sistema
    fullReset: function() {
      if (!confirm('ATENÇÃO: Reset completo do sistema!\n\nEsta ação irá:\n- Limpar todos os carregamentos\n- Liberar todas as docas\n- Resetar contadores\n\nTem certeza?')) {
        return;
      }
      
      LoadingsCore.allLoadings = [];
      LoadingsDocks.resetAllDocks();
      LoadingsHistory.todayLoadings = [];
      
      LoadingsCore.displayQueue([]);
      LoadingsCore.updateStats();
      LoadingsDocks.updateDocksDisplay();
      LoadingsHistory.displayHistoryCards();
      
      Utils.showWarningMessage('⚠️ Sistema resetado completamente!');
    }
  }
};

// 🌐 Expor globalmente para compatibilidade
window.Loadings = Loadings;

// 🚀 Auto-inicialização quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  // Aguardar um pouco para garantir que todos os módulos foram carregados
  setTimeout(() => {
    if (typeof Loadings !== 'undefined') {
      Loadings.init();
    } else {
      console.error('❌ Objeto Loadings não encontrado');
    }
  }, 500);
});