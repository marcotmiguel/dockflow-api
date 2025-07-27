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

  // Substitua a função extractDestination (linhas ~72-117) por:
extractDestination: function(xmlData) {
    console.log('📍 Extraindo destino do XML...');
    
    // 🎯 PRIMEIRO: Verificar se já existe endereço de entrega processado
    if (xmlData.enderecoEntrega && xmlData.enderecoEntrega.encontrado && xmlData.enderecoEntrega.endereco) {
        console.log('✅ Endereço de entrega já processado encontrado:', xmlData.enderecoEntrega.endereco);
        
        // Extrair cidade/UF das observações que tem dados completos
        if (xmlData.observacoes && typeof xmlData.observacoes === 'string') {
            const cityUfMatch = xmlData.observacoes.match(/\|([^|/]+)\/(SP|RJ|MG|PR|SC|RS|ES|BA|GO|DF|[A-Z]{2})/i);
            if (cityUfMatch) {
                const city = cityUfMatch[1].trim();
                const uf = cityUfMatch[2].toUpperCase();
                
                return {
                    city: city,
                    uf: uf,
                    neighborhood: '',
                    zipCode: '',
                    fullAddress: `${xmlData.enderecoEntrega.endereco} - ${city}/${uf}`,
                    street: xmlData.enderecoEntrega.endereco,
                    number: '',
                    complement: '',
                    coordinates: null,
                    region: this.determineRegion(city, uf),
                    source: 'endereco_entrega'
                };
            }
        }
    }
    
    // 🔄 FALLBACK: Usar endereço estruturado
    const endereco = xmlData.endereco;
    if (endereco) {
        return {
            city: endereco.cidade || 'Não definida',
            uf: endereco.uf || 'XX',
            neighborhood: endereco.bairro || '',
            zipCode: endereco.cep || '',
            fullAddress: `${endereco.logradouro || ''}, ${endereco.numero || ''} - ${endereco.cidade || ''}/${endereco.uf || ''}`,
            street: endereco.logradouro || '',
            number: endereco.numero || '',
            complement: endereco.complemento || '',
            coordinates: null,
            region: this.determineRegion(endereco.cidade, endereco.uf),
            source: 'endereco_estruturado'
        };
    }
    
    return {
        city: 'Não definida',
        uf: 'XX',
        neighborhood: '',
        zipCode: '',
        fullAddress: 'Endereço não encontrado',
        street: '',
        number: '',
        complement: '',
        coordinates: null,
        region: 'Indefinida',
        source: 'nao_encontrado'
    };
},

  // 🆕 NOVA FUNÇÃO: Extrair endereço de entrega do campo infAdFisco
  extractDeliveryAddressFromInfo: function(infAdFisco) {
    if (!infAdFisco || typeof infAdFisco !== 'string') {
      return null;
    }
    
    console.log('🔍 Analisando infAdFisco:', infAdFisco.substring(0, 200) + '...');
    
    let deliveryText = null;
    
    // 🎯 Padrão 1: "Local de entrega: [endereço]"
    let match = infAdFisco.match(/Local de entrega:\s*([^/]+)/i);
    if (match) {
      deliveryText = match[1].trim();
      console.log('✅ Padrão "Local de entrega:" encontrado');
    }
    
    // 🎯 Padrão 2: "XENTX-[endereço]" (até o próximo | ou final)
    if (!deliveryText) {
      match = infAdFisco.match(/XENTX-([^|]+)/i);
      if (match) {
        deliveryText = match[1].trim();
        console.log('✅ Padrão "XENTX-" encontrado');
      }
    }
    
    // 🎯 Padrão 3: Buscar endereço após horário com XENTX
    if (!deliveryText) {
      match = infAdFisco.match(/\d+h?\s+as?\s+\d+h?.*?XENTX-([^|]+)/i);
      if (match) {
        deliveryText = match[1].trim();
        console.log('✅ Padrão "horário + XENTX-" encontrado');
      }
    }
    
    if (!deliveryText) {
      console.log('❌ Nenhum padrão de endereço de entrega encontrado');
      return null;
    }
    
    // 🧹 Limpar e processar o texto do endereço
    return this.parseDeliveryAddress(deliveryText);
  },

  // 🧹 NOVA FUNÇÃO: Processar texto do endereço de entrega
  parseDeliveryAddress: function(addressText) {
    console.log('🧹 Processando endereço:', addressText);
    
    // Remover informações extras no final
    addressText = addressText.replace(/\s+Merc\..*$/i, '').trim();
    
    // Extrair informações do endereço
    // Formato comum: "Logradouro, numero-bairro|cidade/uf-cep"
    let city = 'Não definida';
    let uf = 'XX';
    let neighborhood = '';
    let zipCode = '';
    let fullAddress = addressText;
    
    // 🏙️ Extrair cidade/UF - padrões: "cidade/SP" ou "|cidade/SP-"
    const cityUfMatch = addressText.match(/[|\s]([^|]+)\/(SP|RJ|MG|PR|SC|RS|ES|BA|GO|DF|[A-Z]{2})/i);
    if (cityUfMatch) {
      city = cityUfMatch[1].trim();
      uf = cityUfMatch[2].toUpperCase();
      console.log(`🏙️ Cidade/UF extraídos: ${city}/${uf}`);
    }
    
    // 📮 Extrair CEP - padrões: "CEP 12345-678" ou "12345-678"
    const cepMatch = addressText.match(/CEP\s*(\d{5}-?\d{3})|(\d{5}-?\d{3})/i);
    if (cepMatch) {
      zipCode = (cepMatch[1] || cepMatch[2]).replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
      console.log(`📮 CEP extraído: ${zipCode}`);
    }
    
    // 🏘️ Extrair bairro - texto entre "-" e "|"
    const bairroMatch = addressText.match(/-([^|]+)\|/);
    if (bairroMatch) {
      neighborhood = bairroMatch[1].trim();
      console.log(`🏘️ Bairro extraído: ${neighborhood}`);
    }
    
    // 📍 Criar endereço limpo
    const cleanAddress = addressText
      .replace(/\|.*$/, '') // Remove tudo após |
      .replace(/CEP\s*\d{5}-?\d{3}/i, '') // Remove CEP
      .trim();
    
    const result = {
      city: city,
      uf: uf,
      neighborhood: neighborhood,
      zipCode: zipCode,
      fullAddress: cleanAddress || addressText,
      coordinates: null,
      region: this.determineRegion(city, uf),
      source: 'endereco_entrega' // Indicar que é endereço de entrega real
    };
    
    console.log('✅ Endereço de entrega processado:', result);
    return result;
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
        // ⚠️ AQUI FOI A MUDANÇA PRINCIPAL - Em vez de criar direto, mostra para aprovação
        this.showRouteApprovalDialog(region, xmls);
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

  // 📋 NOVA FUNÇÃO - Mostrar tela de aprovação
  showRouteApprovalDialog: function(region, xmls) {
    console.log(`📋 Mostrando tela de aprovação para rota ${region} com ${xmls.length} XMLs`);
    
    // Remover modal existente se houver
    const existingModal = document.getElementById('route-approval-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Criar o modal de aprovação
    const modal = document.createElement('div');
    modal.id = 'route-approval-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Calcular totais
    const totalValue = xmls.reduce((sum, xml) => sum + xml.estimatedValue, 0);
    const totalProducts = xmls.reduce((sum, xml) => sum + xml.xmlData.produtos.length, 0);
    
    // Conteúdo do modal
    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 15px;
        max-width: 80%;
        max-height: 80%;
        overflow-y: auto;
        padding: 25px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      ">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2196F3; margin: 0;">🚚 Aprovação de Rota</h2>
          <p style="color: #666; margin: 5px 0;">Região: <strong>${region}</strong></p>
          <p style="color: #666; margin: 0;">
            📦 <strong>${xmls.length}</strong> entregas | 
            💰 <strong>R$ ${totalValue.toLocaleString('pt-BR')}</strong> | 
            📋 <strong>${totalProducts}</strong> produtos
          </p>
        </div>
        
        <div style="
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #ddd;
          border-radius: 8px;
          margin-bottom: 20px;
        ">
          <table style="width: 100%; border-collapse: collapse;">
            <thead style="background: #f5f5f5; position: sticky; top: 0;">
              <tr>
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">NF</th>
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Destinatário</th>
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Endereço</th>
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Valor</th>
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Prioridade</th>
              </tr>
            </thead>
            <tbody>
              ${xmls.map(xml => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px; font-weight: bold; color: #2196F3;">${xml.xmlData.notaFiscal.numero}</td>
                  <td style="padding: 10px;">
                    <div style="font-weight: bold;">${xml.xmlData.destinatario.nome}</div>
                    <div style="font-size: 11px; color: #666;">CNPJ: ${xml.xmlData.destinatario.cnpj}</div>
                  </td>
                  <td style="padding: 10px; max-width: 200px;">
                    <div style="font-size: 12px; line-height: 1.3;">
                      ${xml.destination.fullAddress}
                    </div>
                    <div style="font-size: 11px; color: #666; margin-top: 3px;">
                      📍 ${xml.destination.city}/${xml.destination.uf}
                      ${xml.destination.zipCode ? ` • CEP: ${xml.destination.zipCode}` : ''}
                      ${xml.destination.source === 'endereco_entrega' ? ' • ✅ Endereço de Entrega' : ' • ⚠️ Endereço de Faturamento'}
                    </div>
                  </td>
                  <td style="padding: 10px; text-align: right;">
                    <div style="font-weight: bold; color: #4CAF50;">
                      R$ ${xml.estimatedValue.toLocaleString('pt-BR')}
                    </div>
                    <div style="font-size: 11px; color: #666;">
                      ${xml.xmlData.produtos.length} produtos
                    </div>
                  </td>
                  <td style="padding: 10px; text-align: center;">
                    <span style="
                      padding: 4px 8px;
                      border-radius: 12px;
                      font-size: 11px;
                      font-weight: bold;
                      background: ${xml.priority === 'urgent' ? '#ffebee' : xml.priority === 'high' ? '#fff3e0' : '#f1f8e9'};
                      color: ${xml.priority === 'urgent' ? '#c62828' : xml.priority === 'high' ? '#ef6c00' : '#388e3c'};
                    ">
                      ${xml.priority === 'urgent' ? '🔴 URGENTE' : xml.priority === 'high' ? '🟡 ALTA' : '🟢 NORMAL'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="text-align: center;">
          <button id="approve-route-btn" style="
            background: #4CAF50;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            margin-right: 10px;
            transition: background 0.3s;
          " onmouseover="this.style.background='#45a049'" onmouseout="this.style.background='#4CAF50'">
            ✅ Aprovar e Criar Rota
          </button>
          
          <button id="cancel-route-btn" style="
            background: #f44336;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.3s;
          " onmouseover="this.style.background='#da190b'" onmouseout="this.style.background='#f44336'">
            ❌ Cancelar
          </button>
        </div>
      </div>
    `;
    
    // Adicionar ao body
    document.body.appendChild(modal);
    
    // Event listeners dos botões
    document.getElementById('approve-route-btn').addEventListener('click', () => {
      this.approveAndCreateRoute(region, xmls);
      modal.remove();
    });
    
    document.getElementById('cancel-route-btn').addEventListener('click', () => {
      console.log('❌ Criação de rota cancelada pelo usuário');
      modal.remove();
    });
    
    // Fechar com ESC
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.getElementById('route-approval-modal')) {
        document.getElementById('route-approval-modal').remove();
      }
    });
    
    console.log('📋 Tela de aprovação exibida');
  },

  // ✅ NOVA FUNÇÃO - Aprovar e criar rota (só executa após aprovação)
  approveAndCreateRoute: function(region, xmls) {
    console.log(`✅ Rota aprovada pelo usuário! Criando rota para ${region} com ${xmls.length} XMLs`);
    
    // Agora executa a criação que antes era automática
    this.createAutomaticRoute(region, xmls);
  },

  // ✨ Criar rota automática (modificada para ser executada só após aprovação)
  createAutomaticRoute: function(region, xmls) {
    console.log(`✨ Criando rota aprovada para ${region} com ${xmls.length} XMLs`);
    
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
      name: `Rota Aprovada - ${region}`,
      region: region,
      xmls: xmls,
      status: 'approved', // Já aprovada pelo usuário
      created_at: new Date().toISOString(),
      approved_at: new Date().toISOString(), // Marcando como aprovada agora
      estimatedDeliveries: xmls.length,
      totalValue: xmls.reduce((sum, xml) => sum + xml.estimatedValue, 0),
      vehicleRequirement: this.determineRouteVehicleRequirement(xmls),
      deliverySequence: this.optimizeDeliverySequence(xmls),
      estimatedDuration: this.calculateRouteDuration(xmls),
      createdBy: 'Sistema Aprovado'
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
    Utils.showSuccessMessage(`🗺️ Rota criada e aprovada: ${route.code}<br>📦 ${route.estimatedDeliveries} entregas<br>💰 R$ ${route.totalValue.toLocaleString('pt-BR')}<br>🚛 Veículo: ${route.vehicleRequirement.type}`);
    
    // Criar carregamento imediatamente pois já foi aprovada
    console.log(`✅ Rota ${route.code} aprovada automaticamente`);
    this.createConsolidatedLoading(route);
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