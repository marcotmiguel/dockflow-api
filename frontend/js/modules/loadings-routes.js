// js/modules/loadings-routes.js
// 🗺️ MÓDULO ROTAS - Sistema completo de gerenciamento de rotas com API

const LoadingsRoutes = {
  allRoutes: [],
  isInitialized: false,
  apiAvailable: false,

  // 🚀 Inicialização do sistema de rotas
  init: function() {
    console.log('🗺️ Inicializando sistema de rotas...');
    this.setupRouteEventListeners();
    this.addGlobalRouteFunctions();
    
    // Aguardar API estar disponível
    setTimeout(async () => {
      await this.checkAPIAndLoadRoutes();
    }, 1000);
  },

  // 📡 Verificar API e carregar rotas
  checkAPIAndLoadRoutes: async function() {
    try {
      // Verificar se RoutesAPI está disponível
      if (typeof window.RoutesAPI !== 'undefined') {
        this.apiAvailable = true;
        console.log('✅ API de rotas disponível');
        await this.loadRoutesFromAPI();
      } else {
        console.warn('⚠️ API de rotas não encontrada, usando dados locais');
        this.apiAvailable = false;
        this.loadRoutesLocal();
      }
      
      this.isInitialized = true;
      this.displayRoutes();
      
    } catch (error) {
      console.error('❌ Erro ao inicializar rotas:', error);
      this.loadRoutesLocal();
    }
  },

  // 📋 Carregar rotas via API
  loadRoutesFromAPI: async function() {
    try {
      console.log('📡 Carregando rotas via API...');
      this.allRoutes = await window.RoutesAPI.getAllRoutes();
      console.log(`✅ ${this.allRoutes.length} rotas carregadas via API`);
      
      // Salvar cache local
      localStorage.setItem('dockflow_routes_cache', JSON.stringify(this.allRoutes));
      
    } catch (error) {
      console.error('❌ Erro ao carregar rotas via API:', error);
      this.loadRoutesLocal();
    }
  },

  // 💾 Carregar rotas locais (fallback)
  loadRoutesLocal: function() {
    console.log('💾 Carregando rotas do armazenamento local...');
    
    try {
      // Tentar carregar do cache
      const cachedRoutes = localStorage.getItem('dockflow_routes_cache');
      if (cachedRoutes) {
        this.allRoutes = JSON.parse(cachedRoutes);
        console.log(`✅ ${this.allRoutes.length} rotas carregadas do cache local`);
        return;
      }
      
      // Rotas padrão se não houver cache
      this.allRoutes = [
        {
          id: 'RT001',
          code: 'SP-CENTRO',
          description: 'São Paulo Centro - Região Central',
          priority: 'high',
          active: true,
          created_at: new Date().toISOString(),
          region: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          loadings_count: 0
        },
        {
          id: 'RT002',
          code: 'SP-ZONA-SUL',
          description: 'São Paulo Zona Sul - Região Sul',
          priority: 'normal',
          active: true,
          created_at: new Date().toISOString(),
          region: 'Zona Sul',
          city: 'São Paulo',
          state: 'SP',
          loadings_count: 0
        },
        {
          id: 'RT003',
          code: 'RJ-CENTRO',
          description: 'Rio de Janeiro Centro',
          priority: 'normal',
          active: true,
          created_at: new Date().toISOString(),
          region: 'Centro',
          city: 'Rio de Janeiro',
          state: 'RJ',
          loadings_count: 0
        },
        {
          id: 'RT004',
          code: 'AUTO-GERAL',
          description: 'Rota Automática Geral',
          priority: 'normal',
          active: true,
          created_at: new Date().toISOString(),
          region: 'Automática',
          city: 'Múltiplas',
          state: 'ALL',
          loadings_count: 0
        }
      ];
      
      console.log(`✅ ${this.allRoutes.length} rotas padrão carregadas`);
      
      // Salvar rotas padrão no cache
      localStorage.setItem('dockflow_routes_cache', JSON.stringify(this.allRoutes));
      
    } catch (error) {
      console.error('❌ Erro ao carregar rotas locais:', error);
      this.allRoutes = [];
    }
  },

  // 📋 Event listeners para rotas
  setupRouteEventListeners: function() {
    setTimeout(() => {
      // Botão de criar rota
      const createRouteBtn = document.getElementById('save-route-btn');
      if (createRouteBtn) {
        createRouteBtn.addEventListener('click', () => this.handleCreateRoute());
      }

      // Formulário de rota
      const routeForm = document.getElementById('create-route-form');
      if (routeForm) {
        routeForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleCreateRoute();
        });
      }

      // Botão de refresh
      const refreshBtn = document.getElementById('refresh-routes');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => this.refreshRoutes());
      }

      console.log('✅ Event listeners de rotas configurados');
    }, 500);
  },

  // 🌐 Funções globais
  addGlobalRouteFunctions: function() {
    window.showRoutesTab = () => this.showRoutesTab();
    window.createNewRoute = (data) => this.createRoute(data);
    window.findRouteForXML = (xmlData) => this.findBestRouteForXML(xmlData);
    
    console.log('🌐 Funções globais de rotas adicionadas');
  },

  // 📂 Mostrar aba de rotas
  showRoutesTab: function() {
    document.querySelectorAll('.nav-link').forEach(tab => {
      tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('show', 'active');
    });
    
    const routesTab = document.getElementById('routes-tab');
    const routesPane = document.getElementById('routes');
    
    if (routesTab && routesPane) {
      routesTab.classList.add('active');
      routesPane.classList.add('show', 'active');
      this.displayRoutes();
    }
  },

  // ➕ Criar nova rota
  createRoute: async function(routeData) {
    try {
      console.log('➕ Criando nova rota:', routeData);
      
      let newRoute;
      
      if (this.apiAvailable && window.RoutesAPI) {
        // Usar API
        newRoute = await window.RoutesAPI.createRoute(routeData);
        console.log('✅ Rota criada via API:', newRoute.code);
      } else {
        // Criar localmente
        newRoute = {
          id: this.generateRouteId(),
          code: routeData.code.toUpperCase(),
          description: routeData.description,
          priority: routeData.priority || 'normal',
          active: true,
          created_at: new Date().toISOString(),
          region: this.extractRegion(routeData.description),
          city: this.extractCity(routeData.description),
          state: this.extractState(routeData.code),
          loadings_count: 0
        };
        
        this.allRoutes.push(newRoute);
        localStorage.setItem('dockflow_routes_cache', JSON.stringify(this.allRoutes));
        console.log('✅ Rota criada localmente:', newRoute.code);
      }
      
      // Atualizar display
      this.displayRoutes();
      
      if (typeof Utils !== 'undefined') {
        Utils.showSuccessMessage(`✅ Rota "${newRoute.code}" criada com sucesso!`);
      }
      
      return newRoute;
      
    } catch (error) {
      console.error('❌ Erro ao criar rota:', error);
      
      if (typeof Utils !== 'undefined') {
        Utils.showErrorMessage('❌ Erro ao criar rota: ' + error.message);
      }
      
      throw error;
    }
  },

  // 🔄 Atualizar rota
  updateRoute: async function(routeId, updateData) {
    try {
      if (this.apiAvailable && window.RoutesAPI) {
        // Usar API
        const updatedRoute = await window.RoutesAPI.updateRoute(routeId, updateData);
        
        // Atualizar array local
        const routeIndex = this.allRoutes.findIndex(r => r.id === routeId);
        if (routeIndex !== -1) {
          this.allRoutes[routeIndex] = updatedRoute;
        }
        
        console.log('✅ Rota atualizada via API:', updatedRoute.code);
        return updatedRoute;
        
      } else {
        // Atualizar localmente
        const routeIndex = this.allRoutes.findIndex(r => r.id === routeId);
        
        if (routeIndex !== -1) {
          this.allRoutes[routeIndex] = { ...this.allRoutes[routeIndex], ...updateData };
          localStorage.setItem('dockflow_routes_cache', JSON.stringify(this.allRoutes));
          console.log('✅ Rota atualizada localmente');
          return this.allRoutes[routeIndex];
        } else {
          throw new Error('Rota não encontrada');
        }
      }
      
    } catch (error) {
      console.error('❌ Erro ao atualizar rota:', error);
      throw error;
    }
  },

  // ❌ Deletar rota
  deleteRoute: async function(routeId) {
    try {
      if (this.apiAvailable && window.RoutesAPI) {
        // Usar API
        await window.RoutesAPI.deleteRoute(routeId);
      }
      
      // Remover do array local
      this.allRoutes = this.allRoutes.filter(r => r.id !== routeId);
      localStorage.setItem('dockflow_routes_cache', JSON.stringify(this.allRoutes));
      
      console.log('✅ Rota deletada:', routeId);
      this.displayRoutes();
      
      if (typeof Utils !== 'undefined') {
        Utils.showSuccessMessage('✅ Rota deletada com sucesso!');
      }
      
    } catch (error) {
      console.error('❌ Erro ao deletar rota:', error);
      
      if (typeof Utils !== 'undefined') {
        Utils.showErrorMessage('❌ Erro ao deletar rota: ' + error.message);
      }
    }
  },

  // 🔍 Buscar melhor rota para XML
  findBestRouteForXML: async function(xmlData) {
    try {
      console.log('🔍 Buscando melhor rota para XML...');
      
      if (this.apiAvailable && window.RoutesAPI) {
        // Usar API inteligente
        const bestRoute = await window.RoutesAPI.findBestRouteForXML(xmlData);
        if (bestRoute) {
          console.log(`✅ Melhor rota encontrada via API: ${bestRoute.code}`);
          return bestRoute;
        }
      }
      
      // Fallback: busca local
      const city = xmlData.endereco.cidade;
      const state = xmlData.endereco.uf;
      
      console.log(`🔍 Buscando rota local para: ${city}/${state}`);
      
      // Buscar rotas da mesma cidade/estado
      let candidateRoutes = this.allRoutes.filter(route => 
        route.active && (
          route.city === city || 
          route.state === state ||
          route.state === 'ALL'
        )
      );
      
      if (candidateRoutes.length === 0) {
        // Criar rota automática
        const autoRoute = await this.createAutomaticRoute(xmlData);
        return autoRoute;
      }
      
      // Ordenar por prioridade e menor carga
      candidateRoutes.sort((a, b) => {
        const priorityOrder = { 'urgent': 3, 'high': 2, 'normal': 1 };
        const aPriority = priorityOrder[a.priority] || 1;
        const bPriority = priorityOrder[b.priority] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return (a.loadings_count || 0) - (b.loadings_count || 0);
      });
      
      const bestRoute = candidateRoutes[0];
      console.log(`✅ Melhor rota local encontrada: ${bestRoute.code}`);
      return bestRoute;
      
    } catch (error) {
      console.error('❌ Erro ao buscar melhor rota:', error);
      
      // Retornar rota padrão
      return this.allRoutes.find(r => r.active) || this.allRoutes[0];
    }
  },

  // 🚀 Criar rota automática
  createAutomaticRoute: async function(xmlData) {
    try {
      const city = xmlData.endereco.cidade;
      const state = xmlData.endereco.uf;
      const timestamp = Date.now();
      
      const autoRouteData = {
        code: `AUTO-${state}-${timestamp}`,
        description: `Rota Automática - ${city}/${state}`,
        priority: 'normal'
      };
      
      console.log(`🤖 Criando rota automática para ${city}/${state}`);
      const newRoute = await this.createRoute(autoRouteData);
      
      console.log(`✅ Rota automática criada: ${newRoute.code}`);
      return newRoute;
      
    } catch (error) {
      console.error('❌ Erro ao criar rota automática:', error);
      
      // Retornar rota padrão se falhar
      return this.allRoutes.find(r => r.code === 'AUTO-GERAL') || this.allRoutes[0];
    }
  },

  // 📈 Incrementar contador de carregamentos
  incrementRouteLoadings: async function(routeId) {
    try {
      const route = this.allRoutes.find(r => r.id === routeId);
      if (route) {
        const newCount = (route.loadings_count || 0) + 1;
        await this.updateRoute(routeId, { loadings_count: newCount });
        console.log(`📈 Contador da rota ${route.code} incrementado para ${newCount}`);
      }
    } catch (error) {
      console.error('❌ Erro ao incrementar contador:', error);
    }
  },

  // 🖥️ Exibir rotas na interface
  displayRoutes: function() {
    const routesList = document.getElementById('routes-list');
    if (!routesList) return;

    if (this.allRoutes.length === 0) {
      routesList.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-muted">
            <i class="fas fa-route fa-2x mb-2"></i><br>
            Nenhuma rota encontrada
          </td>
        </tr>
      `;
      return;
    }

    routesList.innerHTML = this.allRoutes.map(route => `
      <tr class="${route.active ? '' : 'table-secondary'}">
        <td>
          <span class="badge bg-${this.getPriorityColor(route.priority)} me-2">${route.priority.toUpperCase()}</span>
          <strong>${route.code}</strong>
        </td>
        <td>
          ${route.description}
          ${route.city && route.city !== 'Não especificada' ? `<br><small class="text-muted">${route.city}/${route.state}</small>` : ''}
        </td>
        <td>
          <span class="badge bg-info">${route.loadings_count || 0}</span>
        </td>
        <td>
          <span class="badge bg-${route.active ? 'success' : 'secondary'}">
            ${route.active ? 'Ativa' : 'Inativa'}
          </span>
        </td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="LoadingsRoutes.editRoute('${route.id}')" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-${route.active ? 'warning' : 'success'}" 
                    onclick="LoadingsRoutes.toggleRouteStatus('${route.id}')" 
                    title="${route.active ? 'Desativar' : 'Ativar'}">
              <i class="fas fa-${route.active ? 'pause' : 'play'}"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="LoadingsRoutes.confirmDeleteRoute('${route.id}')" title="Deletar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    console.log(`✅ ${this.allRoutes.length} rotas exibidas na interface`);
  },

  // 🎨 Cor da prioridade
  getPriorityColor: function(priority) {
    const colors = {
      'urgent': 'danger',
      'high': 'warning',
      'normal': 'primary'
    };
    return colors[priority] || 'secondary';
  },

  // ✏️ Editar rota
  editRoute: function(routeId) {
    const route = this.allRoutes.find(r => r.id === routeId);
    if (!route) return;

    // Preencher modal com dados da rota
    document.getElementById('route-code').value = route.code;
    document.getElementById('route-description').value = route.description;
    document.getElementById('route-priority').value = route.priority;

    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('createRouteModal'));
    modal.show();

    // Alterar comportamento do botão para edição
    const saveBtn = document.getElementById('save-route-btn');
    saveBtn.onclick = () => this.handleUpdateRoute(routeId);
    document.getElementById('save-route-text').textContent = 'Atualizar Rota';
  },

  // 🔄 Alternar status da rota
  toggleRouteStatus: async function(routeId) {
    try {
      const route = this.allRoutes.find(r => r.id === routeId);
      if (route) {
        await this.updateRoute(routeId, { active: !route.active });
        this.displayRoutes();
      }
    } catch (error) {
      console.error('❌ Erro ao alterar status da rota:', error);
    }
  },

  // ❌ Confirmar deleção de rota
  confirmDeleteRoute: function(routeId) {
    const route = this.allRoutes.find(r => r.id === routeId);
    if (!route) return;

    if (confirm(`Tem certeza que deseja deletar a rota "${route.code}"?\n\nEsta ação não pode ser desfeita.`)) {
      this.deleteRoute(routeId);
    }
  },

  // 📋 Handler para criar rota
  handleCreateRoute: async function() {
    try {
      const routeData = {
        code: document.getElementById('route-code').value.trim(),
        description: document.getElementById('route-description').value.trim(),
        priority: document.getElementById('route-priority').value
      };

      // Validações
      if (!routeData.code) {
        throw new Error('Código da rota é obrigatório');
      }

      if (this.allRoutes.some(r => r.code === routeData.code.toUpperCase())) {
        throw new Error('Já existe uma rota com este código');
      }

      // Mostrar loading
      const saveBtn = document.getElementById('save-route-btn');
      const saveText = document.getElementById('save-route-text');
      const saveSpinner = document.getElementById('save-route-spinner');
      
      saveBtn.disabled = true;
      saveText.textContent = 'Criando...';
      saveSpinner.classList.remove('d-none');

      // Criar rota
      await this.createRoute(routeData);

      // Fechar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('createRouteModal'));
      modal.hide();

      // Reset form
      document.getElementById('create-route-form').reset();

    } catch (error) {
      console.error('❌ Erro ao criar rota:', error);
      
      if (typeof Utils !== 'undefined') {
        Utils.showErrorMessage('❌ ' + error.message);
      } else {
        alert('Erro: ' + error.message);
      }
    } finally {
      // Reset botão
      const saveBtn = document.getElementById('save-route-btn');
      const saveText = document.getElementById('save-route-text');
      const saveSpinner = document.getElementById('save-route-spinner');
      
      saveBtn.disabled = false;
      saveText.textContent = 'Criar Rota';
      saveSpinner.classList.add('d-none');
    }
  },

  // 🔄 Handler para atualizar rota
  handleUpdateRoute: async function(routeId) {
    try {
      const routeData = {
        code: document.getElementById('route-code').value.trim(),
        description: document.getElementById('route-description').value.trim(),
        priority: document.getElementById('route-priority').value
      };

      await this.updateRoute(routeId, routeData);

      // Fechar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('createRouteModal'));
      modal.hide();

      // Reset form
      document.getElementById('create-route-form').reset();

    } catch (error) {
      console.error('❌ Erro ao atualizar rota:', error);
      
      if (typeof Utils !== 'undefined') {
        Utils.showErrorMessage('❌ ' + error.message);
      } else {
        alert('Erro: ' + error.message);
      }
    }
  },

  // 🔄 Refresh das rotas
  refreshRoutes: async function() {
    try {
      console.log('🔄 Atualizando rotas...');
      
      if (this.apiAvailable && window.RoutesAPI) {
        await this.loadRoutesFromAPI();
      } else {
        this.loadRoutesLocal();
      }
      
      this.displayRoutes();
      
      if (typeof Utils !== 'undefined') {
        Utils.showSuccessMessage('✅ Rotas atualizadas!');
      }
      
    } catch (error) {
      console.error('❌ Erro ao atualizar rotas:', error);
      
      if (typeof Utils !== 'undefined') {
        Utils.showErrorMessage('❌ Erro ao atualizar rotas');
      }
    }
  },

  // 🔧 MÉTODOS AUXILIARES

  generateRouteId: function() {
    return 'RT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  },

  extractRegion: function(description) {
    const regionPatterns = [
      /centro/i,
      /zona sul/i,
      /zona norte/i,
      /zona leste/i,
      /zona oeste/i,
      /ABC/i
    ];
    
    for (const pattern of regionPatterns) {
      if (pattern.test(description)) {
        return description.match(pattern)[0];
      }
    }
    
    return 'Geral';
  },

  extractCity: function(description) {
    const cityPatterns = [
      /São Paulo/i,
      /Rio de Janeiro/i,
      /Belo Horizonte/i,
      /Salvador/i,
      /Brasília/i,
      /Curitiba/i,
      /Porto Alegre/i
    ];
    
    for (const pattern of cityPatterns) {
      if (pattern.test(description)) {
        return description.match(pattern)[0];
      }
    }
    
    return 'Não especificada';
  },

  extractState: function(code) {
    const statePattern = /^([A-Z]{2})/;
    const match = code.match(statePattern);
    return match ? match[1] : 'SP';
  }
};

// 🌐 Expor globalmente
window.LoadingsRoutes = LoadingsRoutes;