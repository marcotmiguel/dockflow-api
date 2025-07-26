// js/api/carregamentos-api.js
// 🚛 API DE CARREGAMENTOS - FRONTEND

class CarregamentosAPI {
  constructor() {
    this.baseURL = 'http://localhost:8080';
    this.apiPrefix = '/api/carregamentos';
    this.timeout = 10000;
    
    this.isOnline = navigator.onLine;
    console.log('🚛 Inicializando API de Carregamentos...');
    this.checkAPIAvailability();
  }

  // 📡 Verificar se a API está disponível
  async checkAPIAvailability() {
    try {
      console.log(`📡 Testando API de carregamentos: ${this.baseURL}/health`);
      
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (response.ok) {
        console.log('✅ API de carregamentos disponível');
        this.isOnline = true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ API de carregamentos não disponível:', error.message);
      this.isOnline = false;
    }
  }

  // 📊 Buscar estatísticas
  async getStats() {
    try {
      if (!this.isOnline) {
        return this.getLocalStats();
      }

      console.log('📊 Buscando estatísticas de carregamentos...');
      
      const response = await fetch(`${this.baseURL}${this.apiPrefix}/stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Estatísticas recebidas:', result.stats);
        return result.success ? result.stats : result;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      return this.getLocalStats();
    }
  }

  // 📋 Buscar fila de carregamento
  async getQueue() {
    try {
      if (!this.isOnline) {
        return this.getLocalQueue();
      }

      console.log('📋 Buscando fila de carregamento...');
      
      const response = await fetch(`${this.baseURL}${this.apiPrefix}/queue`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${result.data.length} itens na fila`);
        return result.success ? result.data : result;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar fila:', error);
      return this.getLocalQueue();
    }
  }

  // ➕ Adicionar à fila via WhatsApp
  async addToQueue(queueData) {
    try {
      console.log('➕ Adicionando à fila:', queueData);
      
      const response = await fetch(`${this.baseURL}${this.apiPrefix}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queueData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Adicionado à fila:', result);
        return result;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar à fila:', error);
      throw error;
    }
  }

  // 🔄 Atualizar status na fila
  async updateQueueStatus(queueId, status, notes = null) {
    try {
      console.log(`🔄 Atualizando status ${queueId} para: ${status}`);
      
      const response = await fetch(`${this.baseURL}${this.apiPrefix}/queue/${queueId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Status atualizado:', result.message);
        return result;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      throw error;
    }
  }

  // 📦 Buscar carregamentos
  async getCarregamentos(filters = {}) {
    try {
      console.log('📦 Buscando carregamentos...');
      
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const response = await fetch(`${this.baseURL}${this.apiPrefix}?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${result.data.length} carregamentos encontrados`);
        return result;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar carregamentos:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  // ➕ Criar carregamento
  async createCarregamento(carregamentoData) {
    try {
      console.log('➕ Criando carregamento:', carregamentoData);
      
      const response = await fetch(`${this.baseURL}${this.apiPrefix}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carregamentoData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Carregamento criado:', result);
        return result;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erro ao criar carregamento:', error);
      throw error;
    }
  }

  // 📁 Importar XML
  async importXML(xmlData, routeId) {
    try {
      console.log('📁 Importando XML...');
      
      const response = await fetch(`${this.baseURL}${this.apiPrefix}/import-xml`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlData, routeId })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ XML importado:', result);
        return result;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erro ao importar XML:', error);
      throw error;
    }
  }

  // 💾 DADOS LOCAIS (FALLBACK)

  getLocalStats() {
    console.log('💾 Usando estatísticas locais');
    return {
      aguardando: 3,
      em_rota: 2,
      entregue: 1,
      entregue_hoje: 1,
      volumes_em_armazem: 35
    };
  }

  getLocalQueue() {
    console.log('💾 Usando fila local');
    return [
      {
        id: 1,
        driver_name: 'João Silva',
        driver_cpf: '12345678901',
        vehicle_plate: 'ABC1234',
        vehicle_type: 'Caminhão',
        route_code: 'SP-CENTRO',
        route_description: 'São Paulo Centro',
        status: 'waiting',
        requested_at: new Date().toISOString()
      },
      {
        id: 2,
        driver_name: 'Maria Santos',
        driver_cpf: '98765432100',
        vehicle_plate: 'XYZ5678',
        vehicle_type: 'Van',
        route_code: 'SP-ZONA-SUL',
        route_description: 'São Paulo Zona Sul',
        status: 'approved',
        requested_at: new Date(Date.now() - 3600000).toISOString()
      }
    ];
  }
}

// 🌐 Instância global
window.CarregamentosAPI = new CarregamentosAPI();

console.log('✅ CarregamentosAPI inicializada');