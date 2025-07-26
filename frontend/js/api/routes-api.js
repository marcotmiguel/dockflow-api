// js/api/routes-api.js
// 🌐 API DE ROTAS - CONFIGURADA PARA BACKEND LOCAL

class RoutesAPI {
  constructor() {
    // 🎯 CONFIGURAÇÃO PARA SEU BACKEND LOCAL
    this.baseURL = 'http://localhost:8080'; // ← SEU BACKEND LOCAL
    this.apiPrefix = '/api/routes';          // ← ENDPOINT DE ROTAS
    this.timeout = 10000;                    // 10 segundos timeout
    
    this.storage = {
      routes: 'dockflow_routes_cache',
      lastSync: 'dockflow_routes_last_sync'
    };
    
    this.isOnline = navigator.onLine;
    this.init();
  }

  // 🚀 Inicialização
  init() {
    console.log('🌐 Inicializando API de Rotas (Backend Local)...');
    this.setupOfflineHandling();
    this.checkAPIAvailability();
  }

  // 📡 Verificar disponibilidade da API
  async checkAPIAvailability() {
    try {
      console.log(`📡 Testando conexão com: ${this.baseURL}/health`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const healthData = await response.json();
        console.log('✅ API local disponível:', healthData);
        this.isOnline = true;
        await this.syncLocalData();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('⏰ Timeout na conexão com API local, usando dados locais');
      } else {
        console.warn('⚠️ API local offline, usando armazenamento local:', error.message);
      }
      this.isOnline = false;
      this.initializeLocalStorage();
    }
  }

  // 💾 Inicializar armazenamento local
  initializeLocalStorage() {
    console.log('💾 Inicializando armazenamento local...');
    
    // Rotas padrão se não existirem
    if (!localStorage.getItem(this.storage.routes)) {
      const defaultRoutes = [
        {
          id: 1,
          code: 'SP-CENTRO',
          description: 'São Paulo Centro',
          priority: 'high',
          active: true,
          created_at: new Date().toISOString(),
          region: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          loadings_count: 0
        },
        {
          id: 2, 
          code: 'SP-ZONA-SUL',
          description: 'São Paulo Zona Sul',
          priority: 'normal',
          active: true,
          created_at: new Date().toISOString(),
          region: 'Zona Sul',
          city: 'São Paulo',
          state: 'SP',
          loadings_count: 0
        },
        {
          id: 3,
          code: 'RJ-CENTRO',
          description: 'Rio de Janeiro Centro',
          priority: 'normal',
          active: true,
          created_at: new Date().toISOString(),
          region: 'Centro',
          city: 'Rio de Janeiro',
          state: 'RJ',
          loadings_count: 0
        }
      ];
      
      localStorage.setItem(this.storage.routes, JSON.stringify(defaultRoutes));
      console.log('✅ Rotas padrão criadas no armazenamento local');
    }
  }

  // 🔄 Sincronizar dados locais com API
  async syncLocalData() {
    try {
      console.log('🔄 Sincronizando dados locais com API...');
      
      // Buscar rotas da API
      const routes = await this.getAllRoutes();
      localStorage.setItem(this.storage.routes, JSON.stringify(routes));
      localStorage.setItem(this.storage.lastSync, new Date().toISOString());
      
      console.log('✅ Dados sincronizados com sucesso');
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
    }
  }

  // 📋 CRUD DE ROTAS

  // ✅ Buscar todas as rotas
  async getAllRoutes() {
    try {
      if (this.isOnline) {
        console.log('📡 Buscando rotas do backend local...');
        
        const response = await fetch(`${this.baseURL}${this.apiPrefix}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          // Adaptar para a estrutura do seu backend
          const routes = result.success ? result.data : result;
          console.log(`✅ ${routes.length} rotas recebidas do backend local`);
          localStorage.setItem(this.storage.routes, JSON.stringify(routes));
          return routes;
        } else {
          throw new Error(`Erro HTTP: ${response.status}`);
        }
      } else {
        // Usar dados locais
        const localRoutes = localStorage.getItem(this.storage.routes);
        const routes = localRoutes ? JSON.parse(localRoutes) : [];
        console.log(`💾 ${routes.length} rotas carregadas do cache local`);
        return routes;
      }
    } catch (error) {
      console.warn('⚠️ Usando dados locais devido ao erro:', error.message);
      const localRoutes = localStorage.getItem(this.storage.routes);
      return localRoutes ? JSON.parse(localRoutes) : [];
    }
  }

  // ➕ Criar nova rota
  async createRoute(routeData) {
    try {
      console.log('➕ Criando nova rota:', routeData);

      if (this.isOnline) {
        const response = await fetch(`${this.baseURL}${this.apiPrefix}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(routeData)
        });

        if (response.ok) {
          const result = await response.json();
          const newRoute = result.success ? result.data : result;
          console.log(`✅ Rota criada no backend local: ${newRoute.code}`);
          this.updateLocalRoute(newRoute);
          return newRoute;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
        }
      } else {
        // Salvar localmente
        const newRoute = {
          id: Date.now(),
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
        
        this.updateLocalRoute(newRoute);
        console.log('💾 Rota salva localmente (modo offline)');
        return newRoute;
      }
    } catch (error) {
      console.error('❌ Erro ao criar rota:', error);
      throw error;
    }
  }

  // 🔄 Atualizar rota
  async updateRoute(routeId, updateData) {
    try {
      if (this.isOnline) {
        const response = await fetch(`${this.baseURL}${this.apiPrefix}/${routeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          const result = await response.json();
          const updatedRoute = result.success ? result.data : result;
          console.log(`✅ Rota atualizada no backend local: ${updatedRoute.code}`);
          this.updateLocalRoute(updatedRoute);
          return updatedRoute;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
        }
      } else {
        // Atualizar localmente
        const routes = await this.getAllRoutes();
        const routeIndex = routes.findIndex(r => r.id == routeId);
        
        if (routeIndex !== -1) {
          routes[routeIndex] = { ...routes[routeIndex], ...updateData };
          localStorage.setItem(this.storage.routes, JSON.stringify(routes));
          console.log('💾 Rota atualizada localmente (modo offline)');
          return routes[routeIndex];
        } else {
          throw new Error('Rota não encontrada');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar rota:', error);
      throw error;
    }
  }

  // ❌ Deletar rota
  async deleteRoute(routeId) {
    try {
      if (this.isOnline) {
        const response = await fetch(`${this.baseURL}${this.apiPrefix}/${routeId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          console.log(`✅ Rota deletada no backend local: ${routeId}`);
          this.removeLocalRoute(routeId);
          return true;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
        }
      } else {
        // Remover localmente
        this.removeLocalRoute(routeId);
        console.log('💾 Rota removida localmente (modo offline)');
        return true;
      }
    } catch (error) {
      console.error('❌ Erro ao deletar rota:', error);
      throw error;
    }
  }

  // 🔍 Buscar rota por ID
  async getRouteById(routeId) {
    try {
      if (this.isOnline) {
        const response = await fetch(`${this.baseURL}${this.apiPrefix}/${routeId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          return result.success ? result.data : result;
        } else if (response.status === 404) {
          return null;
        } else {
          throw new Error(`Erro HTTP: ${response.status}`);
        }
      } else {
        const routes = await this.getAllRoutes();
        return routes.find(route => route.id == routeId) || null;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar rota:', error);
      return null;
    }
  }

  // 🤖 Encontrar melhor rota para XML
  async findBestRouteForXML(xmlData) {
    try {
      const city = xmlData.endereco?.cidade || 'São Paulo';
      const state = xmlData.endereco?.uf || 'SP';
      
      console.log(`🔍 Buscando melhor rota para: ${city}/${state}`);
      
      // Busca local (mesmo se API estiver online, para simplicidade)
      const routes = await this.getAllRoutes();
      
      // Buscar rotas da mesma cidade/estado
      let candidateRoutes = routes.filter(route => 
        route.active && (
          route.city === city || 
          route.state === state ||
          route.state === 'ALL'
        )
      );
      
      if (candidateRoutes.length === 0) {
        // Usar primeira rota disponível ou criar automática
        candidateRoutes = routes.filter(route => route.active);
        if (candidateRoutes.length === 0) {
          console.warn('⚠️ Nenhuma rota ativa encontrada');
          return null;
        }
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
      console.log(`✅ Melhor rota encontrada: ${bestRoute.code}`);
      return bestRoute;
      
    } catch (error) {
      console.error('❌ Erro ao encontrar melhor rota:', error);
      return null;
    }
  }

  // 🚀 Criar rota automática para XML
  async createAutomaticRoute(xmlData) {
    try {
      const city = xmlData.endereco?.cidade || 'São Paulo';
      const state = xmlData.endereco?.uf || 'SP';
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
      return null;
    }
  }

  // 📈 Incrementar contador de carregamentos da rota
  async incrementRouteLoadings(routeId) {
    try {
      // Incrementar localmente
      const routes = await this.getAllRoutes();
      const routeIndex = routes.findIndex(r => r.id == routeId);
      
      if (routeIndex !== -1) {
        routes[routeIndex].loadings_count = (routes[routeIndex].loadings_count || 0) + 1;
        localStorage.setItem(this.storage.routes, JSON.stringify(routes));
        console.log(`📈 Contador incrementado para rota: ${routeId}`);
      }
    } catch (error) {
      console.error('❌ Erro ao incrementar contador:', error);
    }
  }

  // 📊 Estatísticas das rotas
  async getRoutesStats() {
    try {
      const routes = await this.getAllRoutes();
      
      return {
        total: routes.length,
        active: routes.filter(r => r.active).length,
        by_priority: {
          urgent: routes.filter(r => r.priority === 'urgent').length,
          high: routes.filter(r => r.priority === 'high').length,
          normal: routes.filter(r => r.priority === 'normal').length
        },
        by_state: routes.reduce((acc, route) => {
          const state = route.state || 'Indefinido';
          acc[state] = (acc[state] || 0) + 1;
          return acc;
        }, {}),
        total_loadings: routes.reduce((sum, route) => sum + (route.loadings_count || 0), 0)
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return null;
    }
  }

  // 🔧 MÉTODOS AUXILIARES

  // 💾 Atualizar rota local
  updateLocalRoute(route) {
    try {
      const routes = JSON.parse(localStorage.getItem(this.storage.routes) || '[]');
      const existingIndex = routes.findIndex(r => r.id == route.id);
      
      if (existingIndex !== -1) {
        routes[existingIndex] = route;
      } else {
        routes.push(route);
      }
      
      localStorage.setItem(this.storage.routes, JSON.stringify(routes));
    } catch (error) {
      console.error('❌ Erro ao atualizar rota local:', error);
    }
  }

  // 🗑️ Remover rota local
  removeLocalRoute(routeId) {
    try {
      const routes = JSON.parse(localStorage.getItem(this.storage.routes) || '[]');
      const filteredRoutes = routes.filter(r => r.id != routeId);
      localStorage.setItem(this.storage.routes, JSON.stringify(filteredRoutes));
    } catch (error) {
      console.error('❌ Erro ao remover rota local:', error);
    }
  }

  // 🌎 Extrair região da descrição
  extractRegion(description) {
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
  }

  // 🏙️ Extrair cidade da descrição
  extractCity(description) {
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
  }

  // 🗺️ Extrair estado do código
  extractState(code) {
    const statePattern = /^([A-Z]{2})/;
    const match = code.match(statePattern);
    return match ? match[1] : 'SP';
  }

  // 📱 Configurar handling offline
  setupOfflineHandling() {
    window.addEventListener('online', () => {
      console.log('🌐 Conectado à internet - tentando reconectar à API...');
      this.isOnline = true;
      this.checkAPIAvailability();
    });

    window.addEventListener('offline', () => {
      console.log('📱 Modo offline ativado');
      this.isOnline = false;
    });
  }
}

// 🌐 Instância global da API
window.RoutesAPI = new RoutesAPI();

console.log('✅ RoutesAPI inicializada para backend local');