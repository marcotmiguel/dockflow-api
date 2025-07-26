// js/modules/restrictions-ui-enhancer.js
// 🎨 Aprimorador de Interface para Restrições Inteligentes

const RestrictionsUIEnhancer = {
  
  // 🚀 Inicialização
  init: function() {
    console.log('🎨 Inicializando aprimorador de interface para restrições...');
    this.addCustomStyles();
    this.setupGlobalFunctions();
  },

  // 🎨 Adicionar estilos personalizados
  addCustomStyles: function() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      /* 🎨 Estilos para Restrições Inteligentes */
      .restrictions-analysis {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 15px;
        margin: 10px 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .restrictions-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #dee2e6;
      }
      
      .confidence-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        color: white;
      }
      
      .confidence-high { background-color: #28a745; }
      .confidence-medium { background-color: #ffc107; color: #212529; }
      .confidence-low { background-color: #dc3545; }
      
      .priority-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .priority-high { background-color: #dc3545; color: white; }
      .priority-medium { background-color: #fd7e14; color: white; }
      .priority-low { background-color: #6c757d; color: white; }
      
      .restrictions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 12px;
        margin: 12px 0;
      }
      
      .restriction-card {
        background: white;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        padding: 12px;
        position: relative;
        overflow: hidden;
      }
      
      .restriction-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: var(--accent-color, #007bff);
      }
      
      .restriction-card.time-window::before { --accent-color: #28a745; }
      .restriction-card.delivery-date::before { --accent-color: #17a2b8; }
      .restriction-card.alternative-address::before { --accent-color: #ffc107; }
      .restriction-card.vehicle-restriction::before { --accent-color: #dc3545; }
      
      .restriction-title {
        font-weight: 600;
        color: #495057;
        font-size: 13px;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .restriction-content {
        color: #6c757d;
        font-size: 12px;
        line-height: 1.4;
      }
      
      .restriction-icon {
        width: 14px;
        height: 14px;
        opacity: 0.7;
      }
      
      .conflicts-section {
        background: #fff5f5;
        border: 1px solid #fed7d7;
        border-radius: 6px;
        padding: 10px;
        margin-top: 10px;
      }
      
      .warnings-section {
        background: #fffbf0;
        border: 1px solid #feebc8;
        border-radius: 6px;
        padding: 10px;
        margin-top: 10px;
      }
      
      .suggestions-section {
        background: #f0f8ff;
        border: 1px solid #bee5eb;
        border-radius: 6px;
        padding: 10px;
        margin-top: 10px;
      }
      
      .issue-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 6px;
        font-size: 12px;
      }
      
      .issue-item:last-child {
        margin-bottom: 0;
      }
      
      .issue-icon {
        width: 16px;
        height: 16px;
        margin-top: 1px;
        flex-shrink: 0;
      }
      
      .expandable-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
      }
      
      .expandable-content.expanded {
        max-height: 500px;
      }
      
      .toggle-details {
        background: none;
        border: none;
        color: #007bff;
        font-size: 12px;
        cursor: pointer;
        padding: 4px 0;
        text-decoration: underline;
      }
      
      .toggle-details:hover {
        color: #0056b3;
      }
    `;
    
    document.head.appendChild(styleSheet);
    console.log('✅ Estilos personalizados adicionados');
  },

  // 🌐 Configurar funções globais
  setupGlobalFunctions: function() {
    window.showRestrictionsDetails = (elementId) => {
      this.toggleRestrictionsDetails(elementId);
    };
  },

  // 🎨 Renderizar análise de restrições
  renderRestrictionsAnalysis: function(restrictions, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`⚠️ Container ${containerId} não encontrado`);
      return;
    }

    const html = this.generateRestrictionsHTML(restrictions);
    container.innerHTML = html;
    
    // Adicionar event listeners
    this.attachEventListeners(containerId);
  },

  // 🏗️ Gerar HTML da análise
  generateRestrictionsHTML: function(restrictions) {
    if (!restrictions || !restrictions.processed) {
      return this.generateEmptyState();
    }

    const confidenceLevel = this.getConfidenceLevel(restrictions.confidence);
    const priorityClass = `priority-${restrictions.priority}`;
    const confidenceClass = `confidence-${confidenceLevel}`;
    
    return `
      <div class="restrictions-analysis">
        <div class="restrictions-header">
          <div>
            <h6 class="mb-0">
              <i class="fas fa-brain me-2"></i>
              Análise Inteligente de Restrições
            </h6>
          </div>
          <div class="d-flex gap-2">
            <span class="confidence-badge ${confidenceClass}">
              ${(restrictions.confidence * 100).toFixed(0)}% confiança
            </span>
            <span class="priority-badge ${priorityClass}">
              ${restrictions.priority}
            </span>
          </div>
        </div>

        ${this.generateRestrictionsGrid(restrictions)}
        ${this.generateIssuesSection(restrictions)}
        
        <div class="mt-2">
          <button class="toggle-details" onclick="showRestrictionsDetails('restrictions-details-${Date.now()}')">
            <i class="fas fa-chevron-down me-1"></i>
            Ver detalhes técnicos
          </button>
          
          <div class="expandable-content" id="restrictions-details-${Date.now()}">
            <div class="mt-2 p-2 bg-light rounded">
              <small class="text-muted">
                <strong>Categoria:</strong> ${restrictions.category}<br>
                <strong>Texto original:</strong> ${restrictions.originalText.substring(0, 200)}${restrictions.originalText.length > 200 ? '...' : ''}
              </small>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // 📋 Gerar grid de restrições
  generateRestrictionsGrid: function(restrictions) {
    const cards = [];

    // Janelas de tempo
    if (restrictions.timeWindows.length > 0) {
      restrictions.timeWindows.forEach(window => {
        cards.push(this.generateTimeWindowCard(window));
      });
    }

    // Datas de entrega
    if (restrictions.deliveryDates.length > 0) {
      restrictions.deliveryDates.forEach(date => {
        cards.push(this.generateDeliveryDateCard(date));
      });
    }

    // Endereço alternativo
    if (restrictions.alternativeAddress) {
      cards.push(this.generateAlternativeAddressCard(restrictions.alternativeAddress));
    }

    // Restrições de veículo
    if (restrictions.vehicleRestrictions.length > 0) {
      restrictions.vehicleRestrictions.forEach(vehicle => {
        cards.push(this.generateVehicleRestrictionCard(vehicle));
      });
    }

    // Contato obrigatório
    if (restrictions.contactRequired.required) {
      cards.push(this.generateContactRequiredCard(restrictions.contactRequired));
    }

    if (cards.length === 0) {
      return '<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>Nenhuma restrição específica detectada</div>';
    }

    return `<div class="restrictions-grid">${cards.join('')}</div>`;
  },

  // 🕐 Card de janela de tempo
  generateTimeWindowCard: function(window) {
    const icon = '<i class="fas fa-clock restriction-icon"></i>';
    
    let content = '';
    if (window.type === 'multiple_windows') {
      content = `${window.windows.length} janelas de tempo detectadas`;
    } else {
      content = `${window.startTime} às ${window.endTime}`;
    }
    
    return `
      <div class="restriction-card time-window">
        <div class="restriction-title">
          ${icon}
          Horário de Entrega
        </div>
        <div class="restriction-content">
          <strong>${content}</strong><br>
          <small class="text-muted">${window.description}</small>
        </div>
      </div>
    `;
  },

  // 📅 Card de data de entrega
  generateDeliveryDateCard: function(date) {
    const icon = '<i class="fas fa-calendar-alt restriction-icon"></i>';
    
    return `
      <div class="restriction-card delivery-date">
        <div class="restriction-title">
          ${icon}
          Data de Entrega
        </div>
        <div class="restriction-content">
          <strong>${date.formatted}</strong><br>
          <small class="text-muted">${date.description}</small>
        </div>
      </div>
    `;
  },

  // 🏢 Card de endereço alternativo
  generateAlternativeAddressCard: function(address) {
    const icon = '<i class="fas fa-map-marker-alt restriction-icon"></i>';
    
    return `
      <div class="restriction-card alternative-address">
        <div class="restriction-title">
          ${icon}
          Endereço Alternativo
        </div>
        <div class="restriction-content">
          <strong>${address.type.replace('_', ' ')}</strong><br>
          <small class="text-muted">${address.address}</small>
        </div>
      </div>
    `;
  },

  // 🚛 Card de restrição de veículo
  generateVehicleRestrictionCard: function(vehicle) {
    const icon = '<i class="fas fa-truck restriction-icon"></i>';
    
    return `
      <div class="restriction-card vehicle-restriction">
        <div class="restriction-title">
          ${icon}
          Restrição de Veículo
        </div>
        <div class="restriction-content">
          <strong>${vehicle.detail || 'Restrição detectada'}</strong><br>
          <small class="text-muted">${vehicle.description}</small>
        </div>
      </div>
    `;
  },

  // 📞 Card de contato obrigatório
  generateContactRequiredCard: function(contact) {
    const icon = '<i class="fas fa-phone restriction-icon"></i>';
    
    return `
      <div class="restriction-card contact-required">
        <div class="restriction-title">
          ${icon}
          Contato Obrigatório
        </div>
        <div class="restriction-content">
          <strong>Agendamento necessário</strong><br>
          <small class="text-muted">Contatar antes da entrega</small>
        </div>
      </div>
    `;
  },

  // ⚠️ Seção de issues (conflitos, avisos, sugestões)
  generateIssuesSection: function(restrictions) {
    let html = '';

    // Conflitos
    if (restrictions.conflicts.length > 0) {
      html += `
        <div class="conflicts-section">
          <div class="fw-bold text-danger mb-2">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Conflitos Detectados
          </div>
          ${restrictions.conflicts.map(conflict => `
            <div class="issue-item">
              <i class="fas fa-times-circle issue-icon text-danger"></i>
              <div>
                <strong>${conflict.description}</strong>
                ${conflict.severity ? `<span class="badge bg-${conflict.severity === 'high' ? 'danger' : 'warning'} ms-2">${conflict.severity}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Avisos
    if (restrictions.warnings.length > 0) {
      html += `
        <div class="warnings-section">
          <div class="fw-bold text-warning mb-2">
            <i class="fas fa-exclamation-circle me-2"></i>
            Avisos
          </div>
          ${restrictions.warnings.map(warning => `
            <div class="issue-item">
              <i class="fas fa-info-circle issue-icon text-warning"></i>
              <div>
                <div>${warning.message}</div>
                ${warning.suggestion ? `<small class="text-muted">${warning.suggestion}</small>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Sugestões
    if (restrictions.suggestions.length > 0) {
      html += `
        <div class="suggestions-section">
          <div class="fw-bold text-info mb-2">
            <i class="fas fa-lightbulb me-2"></i>
            Sugestões
          </div>
          ${restrictions.suggestions.map(suggestion => `
            <div class="issue-item">
              <i class="fas fa-arrow-right issue-icon text-info"></i>
              <div>
                <div>${suggestion.message}</div>
                ${suggestion.action ? `<small class="text-muted"><strong>Ação:</strong> ${suggestion.action}</small>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    return html;
  },

  // 📭 Estado vazio
  generateEmptyState: function() {
    return `
      <div class="restrictions-analysis">
        <div class="text-center py-3">
          <i class="fas fa-search fa-2x text-muted mb-2"></i>
          <h6 class="text-muted">Nenhuma restrição analisada</h6>
          <small class="text-muted">As restrições serão detectadas automaticamente quando XMLs forem processados</small>
        </div>
      </div>
    `;
  },

  // 🎚️ Níveis de confiança
  getConfidenceLevel: function(confidence) {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  },

  // 🎛️ Toggle detalhes
  toggleRestrictionsDetails: function(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.toggle('expanded');
      
      const button = element.previousElementSibling;
      if (button) {
        const icon = button.querySelector('i');
        if (element.classList.contains('expanded')) {
          icon.className = 'fas fa-chevron-up me-1';
          button.innerHTML = icon.outerHTML + 'Ocultar detalhes';
        } else {
          icon.className = 'fas fa-chevron-down me-1';
          button.innerHTML = icon.outerHTML + 'Ver detalhes técnicos';
        }
      }
    }
  },

  // 🔗 Event listeners
  attachEventListeners: function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Event listeners específicos podem ser adicionados aqui
    console.log(`✅ Event listeners configurados para ${containerId}`);
  },

  // 🔗 Integração com LoadingsXML para auto-exibição
  integrateWithLoadingsXML: function() {
    if (typeof LoadingsXML !== 'undefined' && LoadingsXML.displayConsolidatedResults) {
      // Verificar se já foi integrado
      if (LoadingsXML._uiIntegrated) {
        console.log('✅ Interface já integrada com LoadingsXML');
        return true;
      }
      
      // Backup da função original de exibição de resultados
      const originalDisplayConsolidatedResults = LoadingsXML.displayConsolidatedResults;
      
      // Sobrescrever com versão aprimorada
      LoadingsXML.displayConsolidatedResults = function(groupedRegions) {
        // Chamar função original
        originalDisplayConsolidatedResults.call(this, groupedRegions);
        
        // 🎨 ADICIONAR SEÇÃO DE RESTRIÇÕES INTELIGENTES
        setTimeout(() => {
          RestrictionsUIEnhancer.addRestrictionsToResults();
        }, 500);
      };
      
      // Marcar como integrado
      LoadingsXML._uiIntegrated = true;
      console.log('✅ Interface integrada com LoadingsXML');
      return true;
    } else {
      console.warn('⚠️ LoadingsXML não encontrado para integração da interface');
      return false;
    }
  },

  // 🎨 Adicionar seção de restrições aos resultados
  addRestrictionsToResults: function() {
    const resultsSection = document.getElementById('xml-results');
    if (!resultsSection) return;

    // Verificar se já existe seção de restrições
    if (document.getElementById('restrictions-analysis-section')) return;

    // Obter dados das restrições do último arquivo processado
    const lastProcessedFile = LoadingsXML?.processedFiles?.[LoadingsXML.processedFiles.length - 1];
    if (!lastProcessedFile?.restrictionsAnalysis) return;

    // Criar seção de restrições
    const restrictionsSection = document.createElement('div');
    restrictionsSection.id = 'restrictions-analysis-section';
    restrictionsSection.className = 'mt-4';
    
    restrictionsSection.innerHTML = `
      <div class="card border-primary">
        <div class="card-header bg-primary text-white">
          <h6 class="mb-0">
            <i class="fas fa-brain me-2"></i>
            Análise Inteligente de Restrições
          </h6>
        </div>
        <div class="card-body" id="restrictions-display-container">
          <!-- Conteúdo será inserido aqui -->
        </div>
      </div>
    `;

    // Inserir antes da seção de resumo
    const summaryCard = resultsSection.querySelector('.card.mb-4.border-success');
    if (summaryCard) {
      resultsSection.insertBefore(restrictionsSection, summaryCard);
    } else {
      resultsSection.appendChild(restrictionsSection);
    }

    // Renderizar análise
    this.renderRestrictionsAnalysis(
      lastProcessedFile.restrictionsAnalysis, 
      'restrictions-display-container'
    );

    console.log('✅ Seção de restrições adicionada aos resultados XML');
  }
};

// 🌐 Expor globalmente
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RestrictionsUIEnhancer;
} else {
  window.RestrictionsUIEnhancer = RestrictionsUIEnhancer;
}

// 🚀 Auto-inicialização
if (typeof window !== 'undefined') {
  RestrictionsUIEnhancer.init();
  
  // 🔗 Função global para integração manual
  window.integrarUIRestrictions = function() {
    return RestrictionsUIEnhancer.integrateWithLoadingsXML();
  };
  
  // 🔗 Auto-integração robusta  
  function setupUIIntegration() {
    let attempts = 0;
    const maxAttempts = 10;
    
    function tryIntegrateUI() {
      attempts++;
      console.log(`🔄 Tentativa ${attempts}/${maxAttempts} de integração da interface...`);
      
      // Verificar se tudo está disponível
      if (typeof window.RestrictionsUIEnhancer === 'object' && 
          typeof window.LoadingsXML === 'object' &&
          typeof window.LoadingsXML.displayConsolidatedResults === 'function') {
        
        console.log('✅ Dependências UI encontradas, iniciando integração...');
        
        try {
          const success = window.RestrictionsUIEnhancer.integrateWithLoadingsXML();
          if (success) {
            console.log('🎉 Interface integrada com sucesso!');
            return true;
          }
        } catch (error) {
          console.error('❌ Erro na integração UI:', error);
        }
      }
      
      // Tentar novamente se não conseguiu
      if (attempts < maxAttempts) {
        setTimeout(tryIntegrateUI, 2000);
      } else {
        console.warn('⚠️ Falha na integração UI automática. Use integrarUIRestrictions() manualmente.');
      }
      
      return false;
    }
    
    // Esperar um pouco antes da primeira tentativa
    setTimeout(tryIntegrateUI, 4000); // UI depois do parser
  }
  
  // Iniciar processo de integração
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupUIIntegration);
  } else {
    setupUIIntegration();
  }
}