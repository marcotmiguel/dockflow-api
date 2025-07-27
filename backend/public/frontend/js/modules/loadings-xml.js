// js/modules/loadings-xml.js
// 📁 MÓDULO XML - Sistema completo de importação XML MÚLTIPLO com consolidação corrigida

const LoadingsXML = {
  xmlData: null,
  extractedData: null,
  multipleFiles: [],
  processedFiles: [],
  currentFileIndex: 0,

  // 🚀 Inicialização do sistema XML
  init: function() {
    console.log('📁 Inicializando sistema XML Import MÚLTIPLO...');
    this.setupXmlEventListeners();
    this.addGlobalXmlFunctions();
  },

  // 📋 Event listeners XML (CORRIGIDO PARA MÚLTIPLOS)
  setupXmlEventListeners: function() {
    setTimeout(() => {
      const fileInput = document.getElementById('xml-file-input');
      if (fileInput) {
        fileInput.setAttribute('multiple', 'true');
        fileInput.setAttribute('accept', '.xml');
        
        fileInput.addEventListener('change', (e) => this.handleMultipleFileUpload(e));
        console.log('✅ Event listener configurado para múltiplos arquivos');
      }

      const uploadArea = document.querySelector('.upload-zone');
      if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadArea.addEventListener('drop', (e) => this.handleMultipleDrop(e));
      }

      const useExisting = document.getElementById('useExistingRoute');
      const createNew = document.getElementById('createNewRoute');
      
      if (useExisting) {
        useExisting.addEventListener('change', function() {
          if (this.checked) {
            document.getElementById('existing-route-section').style.display = 'block';
            document.getElementById('new-route-section').style.display = 'none';
          }
        });
      }
      
      if (createNew) {
        createNew.addEventListener('change', function() {
          if (this.checked) {
            document.getElementById('existing-route-section').style.display = 'none';
            document.getElementById('new-route-section').style.display = 'block';
          }
        });
      }

      const importBtn = document.getElementById('import-xml-final-btn');
      if (importBtn) {
        importBtn.addEventListener('click', () => this.processXmlImport());
      }
    }, 1000);
  },

  // 🌐 Funções globais
  addGlobalXmlFunctions: function() {
    window.abrirAbaXml = () => this.showXmlTab();
    window.showXmlImportTab = () => this.showXmlTab();
    console.log('🌐 Funções globais XML adicionadas');
  },

  // 📂 Mostrar aba XML
  showXmlTab: function() {
    console.log('📂 Abrindo aba XML...');
    
    document.querySelectorAll('.nav-link').forEach(tab => {
      tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('show', 'active');
    });
    
    const xmlTab = document.getElementById('xml-import-tab');
    const xmlPane = document.getElementById('xml-import');
    
    if (xmlTab && xmlPane) {
      xmlTab.classList.add('active');
      xmlPane.classList.add('show', 'active');
      this.addXmlLog('📂 Aba XML aberta');
      if (typeof Utils !== 'undefined') {
        Utils.showSuccessMessage('✅ Sistema XML ativo!');
      }
    } else {
      console.error('❌ Elementos da aba XML não encontrados');
      if (typeof Utils !== 'undefined') {
        Utils.showErrorMessage('❌ Erro ao abrir aba XML');
      }
    }
  },

  // 📁 Upload de múltiplos arquivos (NOVO)
  handleMultipleFileUpload: function(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    this.addXmlLog(`📁 ${files.length} arquivo(s) selecionado(s)`);
    
    // Verificar se todos são XMLs
    const invalidFiles = files.filter(file => !file.name.toLowerCase().endsWith('.xml'));
    if (invalidFiles.length > 0) {
      this.addXmlLog(`❌ Erro: ${invalidFiles.length} arquivo(s) inválido(s) detectado(s)`);
      if (typeof Utils !== 'undefined') {
        Utils.showErrorMessage('❌ Todos os arquivos devem ter extensão .xml');
      }
      return;
    }

    this.addXmlLog('✅ Todos os arquivos XML são válidos');
    this.multipleFiles = files;
    this.processedFiles = [];
    this.currentFileIndex = 0;
    
    // Iniciar processamento em lote
    this.processMultipleXmlFiles();
  },

  // 🔄 Processamento de múltiplos arquivos (CORRIGIDO)
  processMultipleXmlFiles: function() {
    this.addXmlLog(`🔄 Iniciando processamento de ${this.multipleFiles.length} arquivo(s)...`);
    this.addXmlLog(`🎯 Modo: Consolidação inteligente por região`);
    
    document.getElementById('xml-upload-section').style.display = 'none';
    document.getElementById('xml-processing').style.display = 'block';
    
    // Reset da barra de progresso
    const progressBar = document.getElementById('xml-progress-bar');
    const progressText = document.getElementById('xml-progress-text');
    
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = 'Iniciando processamento em lote...';
    
    // Processar cada arquivo sequencialmente
    this.processNextFile();
  },

  // 📄 Processar próximo arquivo (CORRIGIDO)
  processNextFile: function() {
    if (this.currentFileIndex >= this.multipleFiles.length) {
      // Todos os arquivos processados - AGORA CONSOLIDAR
      this.finishMultipleProcessingWithConsolidation();
      return;
    }

    const currentFile = this.multipleFiles[this.currentFileIndex];
    const progress = ((this.currentFileIndex + 1) / this.multipleFiles.length) * 100;
    
    this.addXmlLog(`📄 Processando ${this.currentFileIndex + 1}/${this.multipleFiles.length}: ${currentFile.name}`);
    
    // Atualizar progresso
    const progressBar = document.getElementById('xml-progress-bar');
    const progressText = document.getElementById('xml-progress-text');
    
    if (progressBar) progressBar.style.width = progress + '%';
    if (progressText) progressText.textContent = `Processando ${currentFile.name} (${this.currentFileIndex + 1}/${this.multipleFiles.length})`;

    // Processar arquivo atual
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlContent = e.target.result;
        const xmlDoc = new DOMParser().parseFromString(xmlContent, 'text/xml');
        
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
          throw new Error('XML inválido ou mal formado');
        }
        
        const extractedData = this.extractRealXmlData(xmlDoc);
        extractedData.fileName = currentFile.name;
        
        this.processedFiles.push(extractedData);
        this.addXmlLog(`✅ ${currentFile.name} processado - Destino: ${extractedData.endereco.cidade}/${extractedData.endereco.uf}`);
        
        // NÃO ENVIAR PARA ROTEIRIZAÇÃO AINDA - apenas processar
        
      } catch (error) {
        this.addXmlLog(`❌ Erro ao processar ${currentFile.name}: ${error.message}`);
      }
      
      // Próximo arquivo
      this.currentFileIndex++;
      setTimeout(() => this.processNextFile(), 500);
    };
    
    reader.readAsText(currentFile);
  },

  // ✅ Finalizar processamento múltiplo COM CONSOLIDAÇÃO (NOVO)
  finishMultipleProcessingWithConsolidation: function() {
    this.addXmlLog(`🎉 Processamento individual completo! ${this.processedFiles.length}/${this.multipleFiles.length} arquivo(s) processado(s)`);
    this.addXmlLog(`🏙️ Iniciando consolidação por região...`);

    document.getElementById('xml-processing').style.display = 'none';
    
    if (this.processedFiles.length > 0) {
      // 🏙️ AGRUPAR POR CIDADE/ESTADO
      const groupedByRegion = this.groupXMLsByRegion(this.processedFiles);
      this.addXmlLog(`📊 XMLs agrupados em ${Object.keys(groupedByRegion).length} região(ões)`);
      
      // 🗺️ ENVIAR GRUPOS CONSOLIDADOS PARA ROTEIRIZAÇÃO
      this.sendConsolidatedGroups(groupedByRegion);
      
      // Mostrar resumo do último arquivo
      this.extractedData = this.processedFiles[this.processedFiles.length - 1];
      this.displayConsolidatedResults(groupedByRegion);
      
      if (typeof Utils !== 'undefined') {
        const regions = Object.keys(groupedByRegion).length;
        const totalXmls = this.processedFiles.length;
        
        Utils.showSuccessMessage(`🎉 ${totalXmls} XML(s) consolidado(s) em ${regions} região(ões)!<br>
          <strong>Sistema otimizou automaticamente as entregas!</strong><br>
          <small>Regiões: ${Object.keys(groupedByRegion).join(', ')}</small>`);
      }
      
      // Reset para próxima importação
      setTimeout(() => {
        this.resetXmlImport();
        this.addXmlLog('🔄 Sistema pronto para próximos XMLs');
        this.addXmlLog('💡 Importe mais XMLs para ampliar a consolidação!');
      }, 8000);
      
    } else {
      if (typeof Utils !== 'undefined') {
        Utils.showErrorMessage('❌ Nenhum arquivo foi processado com sucesso');
      }
      this.resetXmlImport();
    }
  },

  // 🏙️ NOVA FUNÇÃO: Agrupar XMLs por região
  groupXMLsByRegion: function(xmls) {
    const grouped = {};
    
    xmls.forEach(xml => {
      const city = xml.endereco.cidade || 'Não definida';
      const state = xml.endereco.uf || 'XX';
      const regionKey = `${city}-${state}`;
      
      if (!grouped[regionKey]) {
        grouped[regionKey] = {
          city: city,
          state: state,
          xmls: [],
          totalProducts: 0,
          companies: new Set()
        };
      }
      
      grouped[regionKey].xmls.push(xml);
      grouped[regionKey].totalProducts += xml.produtos.length;
      grouped[regionKey].companies.add(xml.destinatario.nome);
      
      this.addXmlLog(`📍 NF ${xml.notaFiscal.numero} → Região ${regionKey}`);
    });
    
    // Log do agrupamento
    Object.keys(grouped).forEach(region => {
      const group = grouped[region];
      this.addXmlLog(`🏙️ ${region}: ${group.xmls.length} NFs, ${group.totalProducts} produtos, ${group.companies.size} empresa(s)`);
    });
    
    return grouped;
  },

  // 🚚 NOVA FUNÇÃO: Enviar grupos consolidados
  sendConsolidatedGroups: function(groupedRegions) {
    Object.keys(groupedRegions).forEach(regionKey => {
      const group = groupedRegions[regionKey];
      
      this.addXmlLog(`🚚 Enviando grupo ${regionKey} (${group.xmls.length} NFs) para roteirização...`);
      
      if (typeof LoadingsRouting !== 'undefined') {
        // Criar dados consolidados da rota
        const routeData = {
          type: 'consolidated',
          name: `Consolidado ${group.city}/${group.state}`,
          destination: group.city !== 'Não definida' ? `${group.city}/${group.state}` : 'Múltiplas localidades',
          date: new Date().toISOString().split('T')[0],
          time: '',
          code: `CONSOL-${group.state}-${Date.now()}`
        };
        
        // Enviar primeiro XML com flag de consolidação
        const firstXml = group.xmls[0];
        firstXml.consolidatedGroup = {
          totalXmls: group.xmls.length,
          totalProducts: group.totalProducts,
          companies: Array.from(group.companies),
          region: regionKey
        };
        
        const xmlId = LoadingsRouting.receiveXMLForRouting(firstXml, routeData);
        this.addXmlLog(`✅ Grupo ${regionKey} enviado como consolidado: ${xmlId}`);
        
        // Adicionar XMLs restantes ao mesmo grupo (se houver)
        if (group.xmls.length > 1) {
          group.xmls.slice(1).forEach((xml, index) => {
            setTimeout(() => {
              xml.consolidatedGroup = firstXml.consolidatedGroup;
              LoadingsRouting.receiveXMLForRouting(xml, routeData);
              this.addXmlLog(`➕ XML adicional ${xml.notaFiscal.numero} adicionado ao grupo ${regionKey}`);
            }, (index + 1) * 200);
          });
        }
      } else {
        this.addXmlLog(`⚠️ LoadingsRouting não disponível para grupo ${regionKey}`);
      }
    });
  },

  // 🖥️ Exibição dos resultados consolidados (NOVA)
  displayConsolidatedResults: function(groupedRegions) {
    document.getElementById('xml-results').style.display = 'block';

    // Resumo geral da consolidação
    const summaryCard = document.createElement('div');
    summaryCard.className = 'card mb-4 border-success';
    summaryCard.innerHTML = `
      <div class="card-header bg-success text-white">
        <h6 class="mb-0"><i class="fas fa-layer-group"></i> Consolidação Inteligente por Região</h6>
      </div>
      <div class="card-body">
        <div class="row text-center">
          <div class="col-md-3">
            <h4 class="text-success">${this.processedFiles.length}</h4>
            <small>XMLs Processados</small>
          </div>
          <div class="col-md-3">
            <h4 class="text-info">${Object.keys(groupedRegions).length}</h4>
            <small>Regiões Consolidadas</small>
          </div>
          <div class="col-md-3">
            <h4 class="text-warning">${this.processedFiles.reduce((total, file) => total + file.produtos.length, 0)}</h4>
            <small>Total de Produtos</small>
          </div>
          <div class="col-md-3">
            <h4 class="text-primary">${new Set(this.processedFiles.map(f => f.destinatario.nome)).size}</h4>
            <small>Empresas Diferentes</small>
          </div>
        </div>
        <hr>
        <h6>Consolidação por Região:</h6>
        <div class="row">
          ${Object.keys(groupedRegions).map(region => {
            const group = groupedRegions[region];
            return `
              <div class="col-md-6 mb-3">
                <div class="card border-primary">
                  <div class="card-header bg-primary text-white">
                    <strong>${region}</strong>
                  </div>
                  <div class="card-body">
                    <div class="d-flex justify-content-between">
                      <span>NFs:</span>
                      <strong>${group.xmls.length}</strong>
                    </div>
                    <div class="d-flex justify-content-between">
                      <span>Produtos:</span>
                      <strong>${group.totalProducts}</strong>
                    </div>
                    <div class="d-flex justify-content-between">
                      <span>Empresas:</span>
                      <strong>${group.companies.size}</strong>
                    </div>
                    <small class="text-muted">
                      NFs: ${group.xmls.map(x => x.notaFiscal.numero).join(', ')}
                    </small>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    const resultsSection = document.getElementById('xml-results');
    resultsSection.insertBefore(summaryCard, resultsSection.firstChild);

    // Mostrar detalhes do último arquivo (como exemplo)
    if (this.extractedData) {
      // Informações da NF
      const nfInfo = document.getElementById('nf-info');
      nfInfo.innerHTML = `
        <div class="info-item">
          <span class="info-label">Último processado:</span>
          <span class="info-value">${this.extractedData.notaFiscal.numero}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Emitente:</span>
          <span class="info-value">${this.extractedData.emitente.nome}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Destinatário:</span>
          <span class="info-value">${this.extractedData.destinatario.nome}</span>
        </div>
        <div class="alert alert-success mt-2">
          <small><i class="fas fa-layer-group me-1"></i>Processamento consolidado por região concluído</small>
        </div>
      `;

      // Informações de entrega
      const deliveryInfo = document.getElementById('delivery-info');
      const endereco = this.extractedData.enderecoEntrega || this.extractedData.endereco;
      if (endereco) {
        deliveryInfo.innerHTML = `
          <div class="info-item">
            <span class="info-label">Última região:</span>
            <span class="info-value">${endereco.endereco || `${endereco.cidade}/${endereco.uf}`}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Otimização:</span>
            <span class="info-value text-success">Ativa</span>
          </div>
        `;
      }
    }

    // 🗺️ Seção de roteirização automática consolidada
    this.displayConsolidatedRoutingSection(groupedRegions);

    this.addXmlLog('✅ Consolidação concluída e exibida');
  },

  // 🤖 Exibir seção de roteirização consolidada
  displayConsolidatedRoutingSection: function(groupedRegions) {
    const routeSection = document.querySelector('.card.mb-4:has(.card-header.bg-info)');
    if (routeSection) {
      routeSection.innerHTML = `
        <div class="card-header bg-success text-white">
          <h6 class="mb-0"><i class="fas fa-layer-group me-1"></i> Consolidação Inteligente Concluída</h6>
        </div>
        <div class="card-body">
          <div class="alert alert-success mb-3">
            <h6 class="alert-heading">🎯 Otimização Automática Realizada</h6>
            <p class="mb-2">Os XMLs foram automaticamente consolidados por região para máxima eficiência logística.</p>
            <hr>
            <p class="mb-0">
              <strong>📊 Resultado:</strong> ${Object.keys(groupedRegions).length} carregamento(s) consolidado(s)<br>
              <strong>💰 Economia:</strong> Redução significativa de viagens<br>
              <strong>🚛 Otimização:</strong> Maximização da capacidade por veículo
            </p>
          </div>
          
          <div class="row">
            <div class="col-md-6">
              <div class="card bg-light">
                <div class="card-body text-center">
                  <i class="fas fa-layer-group fa-2x text-success mb-2"></i>
                  <h6>Consolidação Ativa</h6>
                  <p class="small mb-0">XMLs agrupados automaticamente por proximidade geográfica</p>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card bg-light">
                <div class="card-body text-center">
                  <i class="fas fa-truck fa-2x text-primary mb-2"></i>
                  <h6>Carregamentos Otimizados</h6>
                  <p class="small mb-0">Rotas consolidadas criadas para máxima eficiência</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Atualizar botão de importação
    const importBtn = document.getElementById('import-xml-final-btn');
    if (importBtn) {
      importBtn.innerHTML = '<i class="fas fa-layer-group me-2"></i>Processar Mais XMLs (Consolidação Ativa)';
      importBtn.className = 'btn btn-success btn-lg me-2';
    }
  },

  // 🔍 Extração de dados do XML (MELHORADA para endereços)
  extractRealXmlData: function(xmlDoc) {
    const dados = {};
    
    // Informações da Nota Fiscal
    const ide = xmlDoc.querySelector('ide');
    if (ide) {
      dados.notaFiscal = {
        numero: this.getXmlText(ide, 'nNF'),
        serie: this.getXmlText(ide, 'serie'),
        dataEmissao: this.formatXmlDate(this.getXmlText(ide, 'dhEmi')),
        natureza: this.getXmlText(ide, 'natOp')
      };
      this.addXmlLog(`📋 NF: ${dados.notaFiscal.numero}`);
    }
    
    // Emitente
    const emit = xmlDoc.querySelector('emit');
    if (emit) {
      dados.emitente = {
        nome: this.getXmlText(emit, 'xNome'),
        cnpj: this.getXmlText(emit, 'CNPJ')
      };
      this.addXmlLog(`🏢 Emitente: ${dados.emitente.nome}`);
    }
    
    // Destinatário
    const dest = xmlDoc.querySelector('dest');
    if (dest) {
      dados.destinatario = {
        nome: this.getXmlText(dest, 'xNome'),
        cnpj: this.getXmlText(dest, 'CNPJ')
      };
      
      const enderDest = dest.querySelector('enderDest');
      if (enderDest) {
        dados.endereco = {
          logradouro: this.getXmlText(enderDest, 'xLgr'),
          numero: this.getXmlText(enderDest, 'nro'),
          bairro: this.getXmlText(enderDest, 'xBairro'),
          cidade: this.getXmlText(enderDest, 'xMun'),
          uf: this.getXmlText(enderDest, 'UF'),
          cep: this.getXmlText(enderDest, 'CEP')
        };
        this.addXmlLog(`📍 Endereço: ${dados.endereco.cidade}/${dados.endereco.uf}`);
      } else {
        // Fallback se não encontrar enderDest
        dados.endereco = {
          logradouro: 'Não informado',
          numero: '',
          bairro: 'Não informado',
          cidade: 'Não definida',
          uf: 'XX',
          cep: ''
        };
        this.addXmlLog(`⚠️ Endereço não encontrado no XML`);
      }
      
      this.addXmlLog(`📍 Destinatário: ${dados.destinatario.nome}`);
    }
    
    // Produtos
    dados.produtos = [];
    const produtos = xmlDoc.querySelectorAll('det');
    produtos.forEach((det, index) => {
      const prod = det.querySelector('prod');
      if (prod) {
        const produto = {
          codigo: this.getXmlText(prod, 'cProd'),
          descricao: this.getXmlText(prod, 'xProd'),
          quantidade: parseFloat(this.getXmlText(prod, 'qCom')) || 0,
          unidade: this.getXmlText(prod, 'uCom'),
          valorUnitario: parseFloat(this.getXmlText(prod, 'vUnCom')) || 0,
          valorTotal: parseFloat(this.getXmlText(prod, 'vProd')) || 0
        };
        dados.produtos.push(produto);
        this.addXmlLog(`📦 Produto ${index + 1}: ${produto.descricao}`);
      }
    });
    
    // Observações e agendamento
    const infAdFisco = this.getXmlText(xmlDoc, 'infAdFisco');
    const infCpl = this.getXmlText(xmlDoc, 'infCpl');
    dados.observacoes = infAdFisco + ' ' + infCpl;
    
    if (dados.observacoes.trim()) {
      this.addXmlLog(`📝 Observações encontradas`);
      dados.agendamento = this.extractScheduleInfo(dados.observacoes);
      dados.enderecoEntrega = this.extractDeliveryAddress(dados.observacoes, dados.endereco);
    }
    
    return dados;
  },

  // 📅 Extração de informações de agendamento
  extractScheduleInfo: function(text) {
    const info = {
      temAgendamento: false,
      data: '',
      horario: '',
      instrucoes: ''
    };

    const dataPattern = /Entrega\s+(\d{2}\/\d{2})/i;
    const dataMatch = text.match(dataPattern);
    if (dataMatch) {
      info.temAgendamento = true;
      info.data = dataMatch[1];
    }

    const horarioPatterns = [
      /(\d{1,2}[hH]\s*[àas]*\s*\d{1,2}[hH:\d]*)/g,
      /(\d{1,2}:\d{2}\s*[àas]*\s*\d{1,2}:\d{2})/g,
      /(das\s+\d+[hH].*?às\s+\d+[hH])/gi
    ];

    for (const pattern of horarioPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        info.horario = matches[0];
        info.temAgendamento = true;
        break;
      }
    }

    return info;
  },

  // 📍 Extração de endereço de entrega
  extractDeliveryAddress: function(text, defaultAddress) {
    const patterns = [
      /Local de entrega:\s*([^|]+)/i,
      /XENTX-([^|]+)/i,
      /ENDERECO DE ENTREGA:\s*([^-]+)/i,
      /Entrega[^-]+-\s*([^|]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          encontrado: true,
          tipo: 'Extraído das observações',
          endereco: match[1].trim(),
          original: defaultAddress
        };
      }
    }

    const enderecoCompleto = `${defaultAddress.logradouro}, ${defaultAddress.numero} - ${defaultAddress.bairro}, ${defaultAddress.cidade}/${defaultAddress.uf}`;
    return {
      encontrado: false,
      tipo: 'Endereço padrão do destinatário',
      endereco: enderecoCompleto,
      original: defaultAddress
    };
  },

  // 🔄 Reset da importação
  resetXmlImport: function() {
    document.getElementById('xml-results').style.display = 'none';
    document.getElementById('xml-processing').style.display = 'none';
    document.getElementById('xml-upload-section').style.display = 'block';
    
    const fileInput = document.getElementById('xml-file-input');
    if (fileInput) {
      fileInput.value = '';
    }
    
    // Reset das variáveis
    this.xmlData = null;
    this.extractedData = null;
    this.multipleFiles = [];
    this.processedFiles = [];
    this.currentFileIndex = 0;
    
    // Reset da barra de progresso
    const progressBar = document.getElementById('xml-progress-bar');
    const progressText = document.getElementById('xml-progress-text');
    
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = 'Pronto para novos arquivos...';
    
    this.addXmlLog('🔄 Sistema resetado - pronto para novos XMLs');
  },

  // 🎯 Handlers de drag & drop (ADAPTADO PARA MÚLTIPLOS)
  handleDragOver: function(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#28a745';
    e.currentTarget.style.backgroundColor = '#e8f5e8';
  },

  handleDragLeave: function(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#3498db';
    e.currentTarget.style.backgroundColor = '#f8f9ff';
  },

  handleMultipleDrop: function(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#3498db';
    e.currentTarget.style.backgroundColor = '#f8f9ff';
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      this.addXmlLog(`📁 ${files.length} arquivo(s) arrastado(s)`);
      
      // Simular seleção de arquivos
      const fileInput = document.getElementById('xml-file-input');
      if (fileInput) {
        // Criar evento simulado
        const event = { target: { files: files } };
        this.handleMultipleFileUpload(event);
      }
    }
  },

  // 🚀 Processamento da importação (ADAPTADO PARA MÚLTIPLOS)
  processXmlImport: function() {
    this.addXmlLog('🚀 Reiniciando sistema para novos XMLs...');
    
    // Reset completo para nova importação
    setTimeout(() => {
      this.resetXmlImport();
      this.addXmlLog('🔄 Sistema pronto para próximos XMLs');
      this.addXmlLog('💡 Selecione múltiplos arquivos XML para consolidação automática!');
    }, 1000);
  },

  // 📄 Log de atividades
  addXmlLog: function(message) {
    const logDiv = document.getElementById('xml-log');
    if (logDiv) {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = document.createElement('div');
      logEntry.innerHTML = `<span class="text-muted">[${timestamp}]</span> ${message}`;
      logDiv.appendChild(logEntry);
      logDiv.scrollTop = logDiv.scrollHeight;
    }
    console.log('XML Log:', message);
  },

  // 🔧 Utilitários XML
  getXmlText: function(parent, tagName) {
    const element = parent.querySelector(tagName);
    return element ? element.textContent.trim() : '';
  },

  formatXmlDate: function(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  },

  // Mantém funções antigas para compatibilidade
  handleFileUpload: function(event) {
    this.handleMultipleFileUpload(event);
  },

  processXmlFile: function(file) {
    this.multipleFiles = [file];
    this.processedFiles = [];
    this.currentFileIndex = 0;
    this.processMultipleXmlFiles();
  },

  analyzeXmlContent: function(xmlContent) {
    this.addXmlLog('🤖 Analisando conteúdo XML...');
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('XML inválido ou mal formado');
      }
      
      this.addXmlLog('✅ XML válido e bem formado');
      
      this.extractedData = this.extractRealXmlData(xmlDoc);
      this.displayXmlResults();
      
    } catch (error) {
      this.addXmlLog('❌ Erro na análise: ' + error.message);
      if (typeof Utils !== 'undefined') {
        Utils.showErrorMessage('❌ Erro ao analisar XML: ' + error.message);
      }
      this.resetXmlImport();
    }
  },

  displayXmlResults: function() {
    this.displayConsolidatedResults({});
  }
};

// 🌐 Expor globalmente
window.LoadingsXML = LoadingsXML;