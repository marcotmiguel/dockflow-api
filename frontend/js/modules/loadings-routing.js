// js/modules/loadings-routing.js
// 🗺️ MÓDULO ROUTING - Sistema inteligente de roteirização

const LoadingsRouting = {
  pendingXMLs: [], // XMLs aguardando roteirização
  activeRoutes: [], // Rotas em montagem
  completedRoutes: [], // Rotas finalizadas e enviadas para carregamento
  autoRoutingInterval: null,

  // 🚀 Inicialização do sistema de roteirização
  init: function() {
    console.log('🗺️ Inicializando sistema de roteirização...');
    this.setupRoutingEventListeners();
    this.loadPendingXMLs();
    this.setupAutoRouting();
    this.loadStoredData();
  },

  // 📋 Event listeners de roteirização
  setupRoutingEventListeners: function() {
    // Listener para nova aba de roteirização (se existir)
    const routingTab = document.getElementById('routing-tab');
    if (routingTab) {
      routingTab.addEventListener('click', () => {
        setTimeout(() => {
          this.displayRoutingInterface();
        }, 100);
      });
    }

    // Event listeners para futuras funcionalidades
    console.log('📋 Event listeners de roteirização configurados');
  },

  // 📦 Receber XML do módulo XML (em vez de ir direto para fila)
  receiveXMLForRouting: function(xmlData, routeData) {
    console.log('📦 Recebendo XML para roteirização:', xmlData.notaFiscal.numero);
    
    const xmlItem = {
      id: Date.now(),
      xmlData: xmlData,
      routeData: routeData,
      received_at: new Date().toISOString(),
      status: 'pending', // pending, routed, loading
      destination: this.extractDestination(xmlData),
      priority: this.calculatePriority(xmlData),
      vehicleRequirement: this.calculateVehicleRequirement(xmlData),
      estimatedValue: this.calculateTotalValue(xmlData)
    };
    
    this.pendingXMLs.push(xmlItem);
    this.saveToStorage();
    
    console.log(`✅ XML ${xmlData.notaFiscal.numero} adicionado à roteirização`);
    console.log(`📍 Destino: ${xmlItem.destination.city}/${xmlItem.destination.uf}`);
    console.log(`⚡ Prioridade: ${xmlItem.priority}`);
    
    // Tentar roteirização automática
    setTimeout(() => {
      this.tryAutoRouting();
    }, 1000);
    
    return xmlItem.id;
  },

  // 📍 Extrair destino do XML
  extractDestination: function(xmlData) {
    const endereco = xmlData.enderecoEntrega || xmlData.endereco;
    
    return {
      city: endereco.cidade || 'Não definida',
      uf: endereco.uf || 'XX',
      neighborhood: endereco.bairro || '',
      zipCode: endereco.cep || '',
      fullAddress: endereco.endereco || `${endereco.logradouro}, ${endereco.numero} - ${endereco.bairro}, ${endereco.cidade}/${endereco.uf}`,
      coordinates: null, // Futuramente integrar com API de geocoding
      region: this.determineRegion(endereco.cidade, endereco.uf)
    };
  },

  // 🏙️ Determinar região
  determineRegion: function(city, uf) {
    // Lógica aprimorada de regionalização
    const regions = {
      'SP': 'São Paulo',
      'RJ': 'Rio de Janeiro',
      'MG': 'Minas Gerais',
      'PR': 'Paraná',
      'SC': 'Santa Catarina',
      'RS': 'Rio Grande do Sul',
      'ES': 'Espírito Santo',
      'BA': 'Bahia',
      'GO': 'Goiás',
      'DF': 'Distrito Federal'
    };
    
    // Capitais e regiões metropolitanas
    const capitals = {
      'São Paulo': 'SP-Capital',
      'Rio de Janeiro': 'RJ-Capital', 
      'Belo Horizonte': 'MG-Capital',
      'Curitiba': 'PR-Capital',
      'Florianópolis': 'SC-Capital',
      'Porto Alegre': 'RS-Capital',
      'Vitória': 'ES-Capital',
      'Salvador': 'BA-Capital',
      'Goiânia': 'GO-Capital',
      'Brasília': 'DF-Capital'
    };
    
    // Verificar se é capital
    if (city && capitals[city]) {
      return capitals[city];
    }
    
    // Região metropolitana (simplificado)
    const metropolitan = ['Guarulhos', 'Osasco', 'Santo André', 'São Bernardo', 'Niterói', 'Duque de Caxias', 'Nova Iguaçu'];
    if (city && metropolitan.some(metro => city.includes(metro))) {
      return `${regions[uf] || uf}-Metropolitana`;
    }
    
    return `${regions[uf] || uf}-Interior`;
  },

  // ⚡ Calcular prioridade
  calculatePriority: function(xmlData) {
    let priority = 'normal';
    let reasons = [];
    
    // Verificar agendamento
    if (xmlData.agendamento && xmlData.agendamento.temAgendamento) {
      const today = new Date();
      const scheduleDate = new Date(xmlData.agendamento.data);
      const diffDays = Math.ceil((scheduleDate - today) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        priority = 'urgent';
        reasons.push('Entrega hoje/amanhã');
      } else if (diffDays <= 3) {
        priority = priority === 'normal' ? 'high' : priority;
        reasons.push('Entrega em 3 dias');
      }
    }
    
    // Verificar valor da NF
    const totalValue = this.calculateTotalValue(xmlData);
    if (totalValue > 100000) {
      priority = 'urgent';
      reasons.push('Alto valor (>R$ 100k)');
    } else if (totalValue > 50000) {
      priority = priority === 'normal' ? 'high' : priority;
      reasons.push('Médio-alto valor (>R$ 50k)');
    }
    
    // Verificar quantidade de produtos
    if (xmlData.produtos.length > 50) {
      priority = priority === 'normal' ? 'high' : priority;
      reasons.push('Muitos produtos');
    }
    
    console.log(`⚡ Prioridade ${priority} para NF ${xmlData.notaFiscal.numero}: ${reasons.join(', ')}`);
    return priority;
  },

  // 💰 Calcular valor total
  calculateTotalValue: function(xmlData) {
    return xmlData.produtos.reduce((sum, p) => sum + p.valorTotal, 0);
  },

  // 🚛 Calcular requisitos do veículo
  calculateVehicleRequirement: function(xmlData) {
    // Estimativas baseadas nos produtos
    let totalWeight = 0;
    let totalVolume = 0;
    let specialRequirements = [];
    
    xmlData.produtos.forEach(produto => {
      // Estimativa de peso (seria melhor ter dados reais)
      let estimatedWeight = produto.quantidade * 0.5; // 500g por item em média
      
      // Ajustes por tipo de produto
      const description = produto.descricao.toLowerCase();
      if (description.includes('líquido') || description.includes('água') || description.includes('suco')) {
        estimatedWeight = produto.quantidade * 1.0; // Líquidos são mais pesados
      } else if (description.includes('papel') || description.includes('tecido')) {
        estimatedWeight = produto.quantidade * 0.2; // Papel/tecido são leves
      } else if (description.includes('metal') || description.includes('ferro')) {
        estimatedWeight = produto.quantidade * 2.0; // Metais são pesados
      }
      
      totalWeight += estimatedWeight;
      totalVolume += produto.quantidade * 0.01; // 10cm³ por item em média
      
      // Requisitos especiais
      if (description.includes('frágil') || description.includes('vidro')) {
        specialRequirements.push('Transporte cuidadoso');
      }
      if (description.includes('refrigerad') || description.includes('gelad')) {
        specialRequirements.push('Refrigeração');
      }
    });
    
    // Determinar tipo de veículo
    let vehicleType = 'Van';
    if (totalWeight > 1500 || totalVolume > 30) {
      vehicleType = 'Caminhão 3/4';
    }
    if (totalWeight > 5000 || totalVolume > 80) {
      vehicleType = 'Caminhão Toco';
    }
    if (totalWeight > 12000 || totalVolume > 150) {
      vehicleType = 'Caminhão Truck';
    }
    
    return {
      type: vehicleType,
      estimatedWeight: Math.round(totalWeight),
      estimatedVolume: Math.round(totalVolume),
      specialRequirements: [...new Set(specialRequirements)] // Remove duplicatas
    };
  },

  // 🤖 Tentar roteirização automática
  tryAutoRouting: function() {
    console.log('🤖 Tentando roteirização automática...');
    
    const pendingXMLs = this.pendingXMLs.filter(xml => xml.status === 'pending');
    if (pendingXMLs.length === 0) {
      console.log('📭 Nenhum XML pendente para roteirização');
      return;
    }
    
    console.log(`📦 ${pendingXMLs.length} XMLs pendentes para roteirização`);
    
    // Agrupar por região e destino próximo
    const groupedByRegion = this.groupByRegion(pendingXMLs);
    
    Object.entries(groupedByRegion).forEach(([region, xmls]) => {
      const minXMLs = this.getMinXMLsForRoute(region);
      console.log(`🏙️ Região ${region}: ${xmls.length} XMLs (min: ${minXMLs})`);
      
      if (xmls.length >= minXMLs) {
        this.createAutomaticRoute(region, xmls);
      } else {
        console.log(`⏳ Aguardando mais XMLs para região ${region}`);
      }
    });
  },

  // 🏗️ Agrupar por região
  groupByRegion: function(xmls) {
    const grouped = {};
    
    xmls.forEach(xml => {
      const region = xml.destination.region;
      if (!grouped[region]) {
        grouped[region] = [];
      }
      grouped[region].push(xml);
    });
    
    return grouped;
  },

  // 📊 Mínimo de XMLs para formar rota
  getMinXMLsForRoute: function(region) {
    // Lógica baseada na região e hora do dia
    const hour = new Date().getHours();
    
    if (region.includes('Capital')) {
      // Capitais: mais XMLs por eficiência
      return hour > 16 ? 2 : 3; // Menos exigente no final do dia
    } else if (region.includes('Metropolitana')) {
      return hour > 16 ? 2 : 3;
    } else {
      // Interior: menos XMLs por distância
      return hour > 16 ? 1 : 2;
    }
  },

  // ✨ Criar rota automática
  createAutomaticRoute: function(region, xmls) {
    console.log(`✨ Criando rota automática para ${region} com ${xmls.length} XMLs`);
    
    // Ordenar por prioridade e valor
    xmls.sort((a, b) => {
      const priorities = { 'urgent': 3, 'high': 2, 'normal': 1 };
      const priorityDiff = priorities[b.priority] - priorities[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Se mesma prioridade, ordenar por valor
      return b.estimatedValue - a.estimatedValue;
    });
    
    const routeCode = this.generateRouteCode(region);
    const route = {
      id: Date.now(),
      code: routeCode,
      name: `Rota Automática - ${region}`,
      region: region,
      xmls: xmls,
      status: 'pending', // pending, approved, loading, completed
      created_at: new Date().toISOString(),
      estimatedDeliveries: xmls.length,
      totalValue: xmls.reduce((sum, xml) => sum + xml.estimatedValue, 0),
      vehicleRequirement: this.determineRouteVehicleRequirement(xmls),
      deliverySequence: this.optimizeDeliverySequence(xmls),
      estimatedDuration: this.calculateRouteDuration(xmls),
      createdBy: 'Sistema Automático'
    };
    
    this.activeRoutes.push(route);
    
    // Atualizar status dos XMLs
    xmls.forEach(xml => {
      const index = this.pendingXMLs.findIndex(p => p.id === xml.id);
      if (index !== -1) {
        this.pendingXMLs[index].status = 'routed';
        this.pendingXMLs[index].route_id = route.id;
      }
    });
    
    this.saveToStorage();
    
    // Notificar usuário
    Utils.showSuccessMessage(`🗺️ Rota automática criada: ${route.code}<br>📦 ${route.estimatedDeliveries} entregas<br>💰 R$ ${route.totalValue.toLocaleString('pt-BR')}<br>🚛 Veículo: ${route.vehicleRequirement.type}`);
    
    // Auto-aprovar rotas automáticas após 5 segundos
    setTimeout(() => {
      this.approveRoute(route.id);
    }, 5000);
  },

  // 🏷️ Gerar código da rota
  generateRouteCode: function(region) {
    const regionCode = region.substring(0, 3).toUpperCase().replace('-', '');
    const date = new Date();
    const dateCode = `${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const timeCode = date.getHours().toString().padStart(2, '0');
    
    return `AUTO-${regionCode}-${dateCode}-${timeCode}`;
  },

  // 🚛 Determinar requisito de veículo para rota
  determineRouteVehicleRequirement: function(xmls) {
    const totalWeight = xmls.reduce((sum, xml) => sum + xml.vehicleRequirement.estimatedWeight, 0);
    const totalVolume = xmls.reduce((sum, xml) => sum + xml.vehicleRequirement.estimatedVolume, 0);
    
    // Coletar requisitos especiais
    const specialRequirements = [];
    xmls.forEach(xml => {
      specialRequirements.push(...xml.vehicleRequirement.specialRequirements);
    });
    const uniqueRequirements = [...new Set(specialRequirements)];
    
    let vehicleType = 'Van';
    if (totalWeight > 1500 || totalVolume > 30) {
      vehicleType = 'Caminhão 3/4';
    }
    if (totalWeight > 5000 || totalVolume > 80) {
      vehicleType = 'Caminhão Toco';
    }
    if (totalWeight > 12000 || totalVolume > 150) {
      vehicleType = 'Caminhão Truck';
    }
    
    return {
      type: vehicleType,
      totalWeight: totalWeight,
      totalVolume: totalVolume,
      capacity: this.getVehicleCapacity(vehicleType),
      specialRequirements: uniqueRequirements,
      utilizationPercent: this.calculateUtilization(totalWeight, totalVolume, vehicleType)
    };
  },

  // 📏 Capacidade do veículo
  getVehicleCapacity: function(vehicleType) {
    const capacities = {
      'Van': { weight: 1500, volume: 30 },
      'Caminhão 3/4': { weight: 5000, volume: 80 },
      'Caminhão Toco': { weight: 12000, volume: 150 },
      'Caminhão Truck': { weight: 20000, volume: 300 }
    };
    
    return capacities[vehicleType] || capacities['Van'];
  },

  // 📊 Calcular utilização
  calculateUtilization: function(weight, volume, vehicleType) {
    const capacity = this.getVehicleCapacity(vehicleType);
    const weightUtil = (weight / capacity.weight) * 100;
    const volumeUtil = (volume / capacity.volume) * 100;
    
    return Math.round(Math.max(weightUtil, volumeUtil));
  },

  // 🎯 Otimizar sequência de entrega
  optimizeDeliverySequence: function(xmls) {
    // Algoritmo de otimização simples
    return xmls
      .map((xml, index) => ({
        sequence: index + 1,
        xmlId: xml.id,
        nf: xml.xmlData.notaFiscal.numero,
        destination: xml.destination.fullAddress,
        city: xml.destination.city,
        priority: xml.priority,
        estimatedTime: this.estimateDeliveryTime(xml, index),
        value: xml.estimatedValue
      }))
      .sort((a, b) => {
        // Primeiro por prioridade
        const priorities = { 'urgent': 3, 'high': 2, 'normal': 1 };
        const priorityDiff = priorities[b.priority] - priorities[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Depois por cidade (agrupamento geográfico)
        return a.city.localeCompare(b.city);
      })
      .map((item, index) => ({ ...item, sequence: index + 1 }));
  },

  // ⏰ Estimar tempo de entrega
  estimateDeliveryTime: function(xml, sequenceIndex) {
    const baseTime = 45; // 45 min por entrega
    const travelTime = sequenceIndex * 25; // 25 min entre entregas
    const priorityAdjustment = xml.priority === 'urgent' ? -10 : xml.priority === 'high' ? -5 : 0;
    
    return Math.max(30, baseTime + travelTime + priorityAdjustment);
  },

  // ⏱️ Calcular duração da rota
  calculateRouteDuration: function(xmls) {
    const totalDeliveryTime = xmls.reduce((sum, xml, index) => 
      sum + this.estimateDeliveryTime(xml, index), 0);
    const setupTime = 30; // Tempo de preparação
    
    return totalDeliveryTime + setupTime;
  },

  // ✅ Aprovar rota
  approveRoute: function(routeId) {
    const routeIndex = this.activeRoutes.findIndex(r => r.id === routeId);
    if (routeIndex === -1) {
      console.warn('Rota não encontrada para aprovação:', routeId);
      return;
    }
    
    const route = this.activeRoutes[routeIndex];
    route.status = 'approved';
    route.approved_at = new Date().toISOString();
    
    console.log(`✅ Rota ${route.code} aprovada automaticamente`);
    
    // Criar carregamento consolidado
    this.createConsolidatedLoading(route);
  },

  // 🚚 Criar carregamento consolidado
  createConsolidatedLoading: function(route) {
    console.log(`🚚 Criando carregamento consolidado para rota ${route.code}`);
    
    const consolidatedLoading = {
      id: Date.now(),
      type: 'route', // Tipo especial para rotas
      route_id: route.id,
      route_code: route.code,
      route_name: route.name,
      
      // Informações consolidadas
      driver_name: `Rota ${route.code}`,
      vehicle_plate: 'AGUARDA-DEFINIÇÃO',
      vehicle_type: route.vehicleRequirement.type,
      phone_number: '11999999999',
      
      // Status e controle
      status: 'waiting',
      priority: this.getRoutePriority(route),
      created_at: new Date().toISOString(),
      
      // Dados da rota
      xmls_count: route.xmls.length,
      total_deliveries: route.estimatedDeliveries,
      total_value: route.totalValue,
      estimated_duration: route.estimatedDuration,
      utilization_percent: route.vehicleRequirement.utilizationPercent,
      
      // Para compatibilidade com sistema atual
      imported: true,
      route_loading: true,
      
      // Dados detalhados
      route_data: route,
      produtos_consolidados: this.consolidateProducts(route.xmls),
      
      // Informações para exibição
      destinatario: `${route.xmls.length} entregas - ${route.region}`,
      nota_fiscal: route.xmls.map(xml => xml.xmlData.notaFiscal.numero).join(', '),
      produtos_count: route.xmls.reduce((sum, xml) => sum + xml.xmlData.produtos.length, 0)
    };
    
    // Adicionar à fila de carregamentos
    if (!LoadingsCore.allLoadings) {
      LoadingsCore.allLoadings = [];
    }
    
    LoadingsCore.allLoadings.push(consolidatedLoading);
    
    // Mover rota para completadas
    this.completedRoutes.push(route);
    this.activeRoutes.splice(this.activeRoutes.findIndex(r => r.id === route.id), 1);
    
    this.saveToStorage();
    
    // Atualizar interface
    LoadingsCore.displayQueue(LoadingsCore.allLoadings);
    LoadingsCore.updateStats();
    
    Utils.showSuccessMessage(`🚚 Carregamento consolidado criado!<br><strong>Rota:</strong> ${route.code}<br><strong>Entregas:</strong> ${route.estimatedDeliveries}<br><strong>Veículo:</strong> ${route.vehicleRequirement.type}<br><strong>Utilização:</strong> ${route.vehicleRequirement.utilizationPercent}%`);
    
    console.log(`✅ Carregamento consolidado criado para rota ${route.code}`);
  },

  // ⚡ Prioridade da rota
  getRoutePriority: function(route) {
    const urgentCount = route.xmls.filter(xml => xml.priority === 'urgent').length;
    const highCount = route.xmls.filter(xml => xml.priority === 'high').length;
    
    if (urgentCount > 0) return 'urgent';
    if (highCount > route.xmls.length / 2) return 'high';
    return 'normal';
  },

  // 📦 Consolidar produtos
  consolidateProducts: function(xmls) {
    const consolidated = [];
    
    xmls.forEach(xml => {
      xml.xmlData.produtos.forEach(produto => {
        const existing = consolidated.find(p => p.codigo === produto.codigo);
        if (existing) {
          existing.quantidade += produto.quantidade;
          existing.valorTotal += produto.valorTotal;
          existing.nfs.push(xml.xmlData.notaFiscal.numero);
          existing.xmlIds.push(xml.id);
        } else {
          consolidated.push({
            codigo: produto.codigo,
            descricao: produto.descricao,
            quantidade: produto.quantidade,
            unidade: produto.unidade,
            valorUnitario: produto.valorUnitario,
            valorTotal: produto.valorTotal,
            nfs: [xml.xmlData.notaFiscal.numero],
            xmlIds: [xml.id]
          });
        }
      });
    });
    
    return consolidated.sort((a, b) => b.valorTotal - a.valorTotal);
  },

  // ⏰ Configurar roteirização automática
  setupAutoRouting: function() {
    // Verificar a cada 2 minutos se há XMLs para roteirizar
    this.autoRoutingInterval = setInterval(() => {
      const pendingCount = this.pendingXMLs.filter(xml => xml.status === 'pending').length;
      if (pendingCount > 0) {
        console.log(`⏰ Verificação automática: ${pendingCount} XMLs pendentes`);
        this.tryAutoRouting();
      }
    }, 120000); // 2 minutos
    
    console.log('⏰ Sistema de roteirização automática ativo (verifica a cada 2 min)');
  },

  // 📊 Carregar XMLs pendentes
  loadPendingXMLs: function() {
    // Carregar dados do localStorage se existirem
    this.loadStoredData();
    console.log(`📊 ${this.pendingXMLs.length} XMLs pendentes carregados`);
  },

  // 💾 Salvar dados no localStorage
  saveToStorage: function() {
    try {
      const data = {
        pendingXMLs: this.pendingXMLs,
        activeRoutes: this.activeRoutes,
        completedRoutes: this.completedRoutes,
        lastUpdate: new Date().toISOString()
      };
      localStorage.setItem('loadings_routing_data', JSON.stringify(data));
    } catch (error) {
      console.warn('Erro ao salvar dados de roteirização:', error);
    }
  },

  // 📂 Carregar dados do localStorage
  loadStoredData: function() {
    try {
      const data = localStorage.getItem('loadings_routing_data');
      if (data) {
        const parsed = JSON.parse(data);
        this.pendingXMLs = parsed.pendingXMLs || [];
        this.activeRoutes = parsed.activeRoutes || [];
        this.completedRoutes = parsed.completedRoutes || [];
        console.log('📂 Dados de roteirização carregados do storage');
      }
    } catch (error) {
      console.warn('Erro ao carregar dados de roteirização:', error);
      this.pendingXMLs = [];
      this.activeRoutes = [];
      this.completedRoutes = [];
    }
  },

  // 🖥️ Interface de roteirização
  displayRoutingInterface: function() {
    console.log('🖥️ Exibindo interface de roteirização...');
    
    // Esta função seria expandida para mostrar uma interface visual
    // com XMLs pendentes, rotas em formação, etc.
    const stats = this.getRoutingStats();
    console.log('📊 Estatísticas de roteirização:', stats);
  },

  // 📊 Estatísticas de roteirização
  getRoutingStats: function() {
    const pending = this.pendingXMLs.filter(xml => xml.status === 'pending');
    const totalValue = pending.reduce((sum, xml) => sum + xml.estimatedValue, 0);
    
    return {
      pendingXMLs: pending.length,
      activeRoutes: this.activeRoutes.length,
      completedRoutes: this.completedRoutes.length,
      totalPendingValue: totalValue,
      regions: this.getRegionStats(pending),
      priorities: this.getPriorityStats(pending)
    };
  },

  // 🏙️ Estatísticas por região
  getRegionStats: function(xmls) {
    const regions = {};
    xmls.forEach(xml => {
      const region = xml.destination.region;
      if (!regions[region]) {
        regions[region] = { count: 0, value: 0 };
      }
      regions[region].count++;
      regions[region].value += xml.estimatedValue;
    });
    return regions;
  },

  // ⚡ Estatísticas por prioridade
  getPriorityStats: function(xmls) {
    const priorities = { urgent: 0, high: 0, normal: 0 };
    xmls.forEach(xml => {
      priorities[xml.priority]++;
    });
    return priorities;
  },

  // 🔧 Utilitários
  utils: {
    // Forçar criação de rota manual
    forceCreateRoute: function(xmlIds, routeName) {
      const xmls = LoadingsRouting.pendingXMLs.filter(xml => xmlIds.includes(xml.id));
      if (xmls.length > 0) {
        LoadingsRouting.createManualRoute(routeName || 'Rota Manual', xmls);
      }
    },
    
    // Cancelar rota
    cancelRoute: function(routeId) {
      const routeIndex = LoadingsRouting.activeRoutes.findIndex(r => r.id === routeId);
      if (routeIndex !== -1) {
        const route = LoadingsRouting.activeRoutes[routeIndex];
        
        // Devolver XMLs para lista pendente
        route.xmls.forEach(xml => {
          const xmlIndex = LoadingsRouting.pendingXMLs.findIndex(p => p.id === xml.id);
          if (xmlIndex !== -1) {
            LoadingsRouting.pendingXMLs[xmlIndex].status = 'pending';
            delete LoadingsRouting.pendingXMLs[xmlIndex].route_id;
          }
        });
        
        LoadingsRouting.activeRoutes.splice(routeIndex, 1);
        LoadingsRouting.saveToStorage();
        Utils.showSuccessMessage(`Rota ${route.code} cancelada`);
      }
    },
    
    // Limpar dados antigos
    cleanOldData: function(daysOld = 7) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const initialCount = LoadingsRouting.completedRoutes.length;
      LoadingsRouting.completedRoutes = LoadingsRouting.completedRoutes.filter(route => 
        new Date(route.created_at) > cutoffDate
      );
      
      const removed = initialCount - LoadingsRouting.completedRoutes.length;
      if (removed > 0) {
        LoadingsRouting.saveToStorage();
        console.log(`🧹 ${removed} rotas antigas removidas`);
      }
    }
  }
};

// 🌐 Expor globalmente
window.LoadingsRouting = LoadingsRouting;

// 🔧 Debug - verificar se foi carregado corretamente
console.log('🗺️ LoadingsRouting carregado e exposto globalmente:', typeof window.LoadingsRouting);