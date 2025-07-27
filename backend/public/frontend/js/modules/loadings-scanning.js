// js/modules/loadings-scanning.js
// 📱 MÓDULO SCANNING - Sistema avançado de bipagem

const LoadingsScanning = {
  currentLoadingId: null,

  // 🚀 Inicialização do sistema de bipagem
  init: function() {
    console.log('📱 Inicializando sistema de bipagem...');
    this.setupScanningEventListeners();
  },

  // 📋 Event listeners do sistema de bipagem
  setupScanningEventListeners: function() {
    const barcodeInput = document.getElementById('barcode-input');
    if (barcodeInput) {
      barcodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.processBarcodeScann(e.target.value);
          e.target.value = '';
        }
      });
    }
  },

  // 🎯 Gerenciar carregamento (abrir modal de bipagem)
  manageLoading: function(loadingId) {
    const loading = LoadingsCore.allLoadings.find(l => l.id == loadingId);
    if (!loading) {
      Utils.showErrorMessage('Carregamento não encontrado');
      return;
    }
    
    this.currentLoadingId = loadingId;
    LoadingsCore.currentLoadingId = loadingId;
    this.displayLoadingInfo(loading);
    
    const modal = new bootstrap.Modal(document.getElementById('manageLoadingModal'));
    modal.show();
    
    setTimeout(() => {
      const barcodeInput = document.getElementById('barcode-input');
      if (barcodeInput) barcodeInput.focus();
    }, 500);
  },

  // 🖥️ Exibir informações do carregamento
  displayLoadingInfo: function(loading) {
    const infoContainer = document.getElementById('loading-info');
    if (!infoContainer) return;
    
    // Determinar se é carregamento XML
    const isXmlImport = loading.imported || loading.xml_file || loading.xml_data;
    
    // Calcular estatísticas de carregamento
    let totalItens = 0;
    let itensCarregados = 0;
    let itensFaltando = 0;
    
    if (isXmlImport && loading.produtos_status) {
      totalItens = loading.produtos_status.reduce((sum, item) => sum + item.quantidade_nf, 0);
      itensCarregados = loading.produtos_status.reduce((sum, item) => sum + item.quantidade_carregada, 0);
      itensFaltando = totalItens - itensCarregados;
    }
    
    infoContainer.innerHTML = `
      <div class="mb-3">
        <h6 class="border-bottom pb-2">📋 Dados do Carregamento</h6>
        <div class="row mb-2">
          <div class="col-4 text-muted">ID:</div>
          <div class="col-8">#${loading.id}</div>
        </div>
        <div class="row mb-2">
          <div class="col-4 text-muted">Tipo:</div>
          <div class="col-8">
            ${isXmlImport ? '<span class="badge bg-success">XML Import</span>' : '<span class="badge bg-primary">WhatsApp</span>'}
          </div>
        </div>
        <div class="row mb-2">
          <div class="col-4 text-muted">${isXmlImport ? 'Destinatário:' : 'Motorista:'}</div>
          <div class="col-8">${isXmlImport ? loading.destinatario : loading.driver_name}</div>
        </div>
        <div class="row mb-2">
          <div class="col-4 text-muted">${isXmlImport ? 'Nota Fiscal:' : 'Veículo:'}</div>
          <div class="col-8">${isXmlImport ? `NF ${loading.nota_fiscal}` : loading.vehicle_plate}</div>
        </div>
        <div class="row mb-2">
          <div class="col-4 text-muted">Rota:</div>
          <div class="col-8">${loading.route_code}</div>
        </div>
        <div class="row mb-2">
          <div class="col-4 text-muted">Doca:</div>
          <div class="col-8">
            ${loading.dock_id ? `<span class="badge bg-danger">🔴 Doca ${loading.dock_id} OCUPADA</span>` : '<span class="text-muted">Não definida</span>'}
          </div>
        </div>
        <div class="row mb-2">
          <div class="col-4 text-muted">Status:</div>
          <div class="col-8">
            <span class="badge bg-${LoadingsCore.getStatusBadgeClass(loading.status)}">
              ${LoadingsCore.getStatusText(loading.status)}
            </span>
          </div>
        </div>
        
        ${isXmlImport && loading.status === 'loading' ? `
        <div class="alert alert-info mt-3">
          <h6 class="alert-heading">📊 Progresso do Carregamento</h6>
          <div class="row text-center">
            <div class="col-4">
              <div class="h4 text-primary">${itensCarregados}</div>
              <small>Carregados</small>
            </div>
            <div class="col-4">
              <div class="h4 text-warning">${itensFaltando}</div>
              <small>Faltando</small>
            </div>
            <div class="col-4">
              <div class="h4 text-info">${totalItens}</div>
              <small>Total</small>
            </div>
          </div>
          <div class="progress mt-2">
            <div class="progress-bar ${itensFaltando === 0 ? 'bg-success' : 'bg-primary'}" 
                 style="width: ${totalItens > 0 ? (itensCarregados / totalItens) * 100 : 0}%">
              ${totalItens > 0 ? Math.round((itensCarregados / totalItens) * 100) : 0}%
            </div>
          </div>
        </div>
        ` : ''}
        
        ${loading.xml_data && loading.xml_data.agendamento && loading.xml_data.agendamento.temAgendamento ? `
        <div class="row mb-2">
          <div class="col-4 text-muted">Agendamento:</div>
          <div class="col-8"><small class="text-info">📅 ${loading.xml_data.agendamento.data} ${loading.xml_data.agendamento.horario}</small></div>
        </div>
        ` : ''}
      </div>
      
      ${loading.status === 'loading' ? `
      <div class="alert alert-success">
        <h6 class="alert-heading">✅ Carregamento em Andamento</h6>
        <p class="mb-0">Use o leitor de código de barras no campo abaixo para bipar os produtos.</p>
      </div>
      ` : ''}
    `;
    
    // Exibir lista de produtos para conferência
    if (isXmlImport && loading.produtos_status && loading.status === 'loading') {
      this.displayProductsList(loading.produtos_status);
    }
  },

  // 📦 Exibir lista de produtos para conferência
  displayProductsList: function(produtosStatus) {
    const scanHistory = document.getElementById('scan-history');
    if (!scanHistory) return;
    
    // Criar container para lista de produtos se não existir
    let productsList = document.getElementById('products-checklist');
    if (!productsList) {
      productsList = document.createElement('div');
      productsList.id = 'products-checklist';
      productsList.className = 'mt-3';
      scanHistory.parentNode.insertBefore(productsList, scanHistory);
    }
    
    productsList.innerHTML = `
      <h6 class="mb-3">📦 Lista de Produtos para Conferência</h6>
      <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
        <table class="table table-sm table-striped">
          <thead class="table-dark sticky-top">
            <tr>
              <th>Produto</th>
              <th>NF</th>
              <th>Carregado</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${produtosStatus.map(produto => {
              const percentual = (produto.quantidade_carregada / produto.quantidade_nf) * 100;
              const statusClass = produto.concluido ? 'success' : 
                                 produto.quantidade_carregada > 0 ? 'warning' : 'secondary';
              const statusText = produto.concluido ? '✅ Completo' : 
                                produto.quantidade_carregada > 0 ? '⏳ Parcial' : '⭕ Pendente';
              
              return `
                <tr class="table-${produto.concluido ? 'success' : produto.quantidade_carregada > 0 ? 'warning' : ''}">
                  <td>
                    <small><strong>${produto.descricao}</strong></small><br>
                    <tiny class="text-muted">${produto.codigo}</tiny>
                  </td>
                  <td class="text-center">
                    <span class="badge bg-info">${produto.quantidade_nf} ${produto.unidade}</span>
                  </td>
                  <td class="text-center">
                    <span class="badge bg-${statusClass}">${produto.quantidade_carregada} ${produto.unidade}</span>
                    ${percentual > 0 ? `<br><small>${Math.round(percentual)}%</small>` : ''}
                  </td>
                  <td class="text-center">
                    <small class="text-${statusClass}">${statusText}</small>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // 🔍 Processar código de barras bipado
  processBarcodeScann: function(barcode) {
    if (!barcode || !this.currentLoadingId) return;
    
    const loadingIndex = LoadingsCore.allLoadings.findIndex(l => l.id == this.currentLoadingId);
    if (loadingIndex === -1) return;
    
    const loading = LoadingsCore.allLoadings[loadingIndex];
    let productName = 'Produto não identificado';
    let produtoEncontrado = false;
    
    // Verificar se é carregamento XML com lista de produtos
    if (loading.xml_data && loading.produtos_status) {
      // Tentar encontrar o produto pelo código
      const produtoIndex = loading.produtos_status.findIndex(p => 
        p.codigo === barcode || 
        p.codigo.includes(barcode) || 
        barcode.includes(p.codigo)
      );
      
      if (produtoIndex !== -1) {
        const produto = loading.produtos_status[produtoIndex];
        produtoEncontrado = true;
        
        // Verificar se ainda há quantidade para carregar
        if (produto.quantidade_carregada < produto.quantidade_nf) {
          // Incrementar quantidade carregada
          LoadingsCore.allLoadings[loadingIndex].produtos_status[produtoIndex].quantidade_carregada++;
          
          // Verificar se o produto foi completamente carregado
          if (produto.quantidade_carregada + 1 >= produto.quantidade_nf) {
            LoadingsCore.allLoadings[loadingIndex].produtos_status[produtoIndex].concluido = true;
            
            // Mostrar popup de conclusão do item
            setTimeout(() => {
              alert(`🎉 ITEM COMPLETO!\n\n` +
                    `📦 ${produto.descricao}\n` +
                    `✅ Carregado: ${produto.quantidade_nf} ${produto.unidade}\n` +
                    `📋 Status: FINALIZADO`);
            }, 500);
          }
          
          productName = `${produto.descricao} (${produto.quantidade_carregada + 1}/${produto.quantidade_nf} ${produto.unidade})`;
          
          // Verificar se todos os produtos foram carregados
          const todosCompletos = LoadingsCore.allLoadings[loadingIndex].produtos_status.every(p => p.concluido);
          if (todosCompletos) {
            setTimeout(() => {
              const confirmar = confirm(`🎉 CARREGAMENTO COMPLETO!\n\n` +
                                       `Todos os produtos da NF ${loading.nota_fiscal} foram carregados.\n\n` +
                                       `Deseja finalizar o carregamento automaticamente?`);
              if (confirmar) {
                LoadingsCore.completeLoading();
              }
            }, 1000);
          }
          
        } else {
          // Produto já foi completamente carregado
          productName = `⚠️ ${produto.descricao} - JÁ COMPLETO (${produto.quantidade_nf}/${produto.quantidade_nf})`;
          Utils.showWarningMessage(`⚠️ Este produto já foi completamente carregado!\n\n📦 ${produto.descricao}\n✅ Quantidade: ${produto.quantidade_nf} ${produto.unidade}`);
          return;
        }
        
      } else {
        // Produto não encontrado na lista da NF
        productName = `❌ Código ${barcode} - NÃO ENCONTRADO na NF ${loading.nota_fiscal}`;
        Utils.showErrorMessage(`❌ Produto não encontrado!\n\nCódigo: ${barcode}\nEste código não consta na NF ${loading.nota_fiscal}`);
        return;
      }
    } else {
      // Para carregamentos normais, simular identificação
      const produtos = [
        'Arroz Branco 5kg',
        'Feijão Carioca 1kg', 
        'Óleo de Soja 900ml',
        'Açúcar Cristal 1kg',
        'Macarrão Espaguete 500g',
        'Farinha de Trigo 1kg',
        'Leite Integral 1L',
        'Café Torrado 500g'
      ];
      productName = produtos[Math.floor(Math.random() * produtos.length)];
      produtoEncontrado = true;
    }
    
    if (produtoEncontrado) {
      this.addScanToHistory(barcode, productName);
      Utils.showSuccessMessage('✅ Item bipado com sucesso!');
      
      // Atualizar informações no modal
      this.displayLoadingInfo(LoadingsCore.allLoadings[loadingIndex]);
    }
  },

  // 📋 Adicionar item ao histórico de bipagem
  addScanToHistory: function(barcode, productName) {
    const historyContainer = document.getElementById('scan-history');
    if (!historyContainer) return;
    
    const now = new Date().toLocaleTimeString();
    const scanItem = document.createElement('div');
    scanItem.className = 'card mb-2 scan-item';
    scanItem.innerHTML = `
      <div class="card-body py-2">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-bold">${productName}</div>
            <small class="text-muted">${barcode}</small>
          </div>
          <small class="text-muted">${now}</small>
        </div>
      </div>
    `;
    
    historyContainer.insertBefore(scanItem, historyContainer.firstChild);
  },

  // 📊 Obter estatísticas de bipagem
  getScanningStats: function(loadingId) {
    const loading = LoadingsCore.allLoadings.find(l => l.id == loadingId);
    if (!loading || !loading.produtos_status) return null;
    
    const totalItens = loading.produtos_status.reduce((sum, item) => sum + item.quantidade_nf, 0);
    const itensCarregados = loading.produtos_status.reduce((sum, item) => sum + item.quantidade_carregada, 0);
    const produtosConcluidos = loading.produtos_status.filter(p => p.concluido).length;
    const totalProdutos = loading.produtos_status.length;
    
    return {
      totalItens,
      itensCarregados,
      itensFaltando: totalItens - itensCarregados,
      produtosConcluidos,
      totalProdutos,
      produtosPendentes: totalProdutos - produtosConcluidos,
      percentualItens: totalItens > 0 ? Math.round((itensCarregados / totalItens) * 100) : 0,
      percentualProdutos: totalProdutos > 0 ? Math.round((produtosConcluidos / totalProdutos) * 100) : 0,
      carregamentoCompleto: produtosConcluidos === totalProdutos
    };
  },

  // 📋 Validar código de barras
  validateBarcode: function(barcode, loadingId) {
    const loading = LoadingsCore.allLoadings.find(l => l.id == loadingId);
    if (!loading || !loading.produtos_status) return { valid: false, reason: 'Carregamento não encontrado' };
    
    const produto = loading.produtos_status.find(p => 
      p.codigo === barcode || 
      p.codigo.includes(barcode) || 
      barcode.includes(p.codigo)
    );
    
    if (!produto) {
      return { valid: false, reason: 'Produto não encontrado na NF' };
    }
    
    if (produto.concluido) {
      return { valid: false, reason: 'Produto já foi completamente carregado' };
    }
    
    return { valid: true, produto: produto };
  },

  // 🔄 Reset do histórico de bipagem
  clearScanHistory: function() {
    const historyContainer = document.getElementById('scan-history');
    if (historyContainer) {
      historyContainer.innerHTML = '';
    }
  },

  // 📱 Configurar leitor de código de barras
  setupBarcodeReader: function() {
    const barcodeInput = document.getElementById('barcode-input');
    if (barcodeInput) {
      // Configurações específicas para leitores de código de barras
      barcodeInput.style.fontFamily = "'Courier New', monospace";
      barcodeInput.style.fontSize = '1.1em';
      
      // Auto-focus quando modal é aberto
      barcodeInput.addEventListener('focus', () => {
        console.log('📱 Leitor de código ativo');
      });
      
      // Limpar campo após processamento
      barcodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          setTimeout(() => {
            e.target.value = '';
            e.target.focus();
          }, 100);
        }
      });
    }
  }
};

// 🌐 Expor globalmente
window.LoadingsScanning = LoadingsScanning;