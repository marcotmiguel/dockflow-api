// js/modules/smart-restrictions-parser.js
// 🧠 Parser Inteligente de Restrições - VERSÃO CORRIGIDA

const SmartRestrictionsParser = {
  
  // 📊 Configurações
  config: {
    confidence: {
      minimum: 0.3,
      timeKeywords: 0.8,
      datePatterns: 0.9,
      addressKeywords: 0.7,
      vehicleKeywords: 0.8,
      contactKeywords: 0.6
    },
    
    // 🔤 Palavras-chave para detecção
    keywords: {
      time: ['horário', 'hora', 'às', 'das', 'até', 'entre', 'manhã', 'tarde', 'noite', 'comercial', 'funcionamento'],
      delivery: ['entrega', 'entregar', 'receber', 'recebimento', 'agendamento', 'agendar'],
      days: ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo', 'útil', 'úteis', 'fim de semana'],
      address: ['endereço', 'rua', 'avenida', 'travessa', 'alameda', 'praça', 'estrada', 'rodovia'],
      vehicle: ['caminhão', 'truck', 'carreta', 'veículo', 'toco', '3/4', 'bitruck', 'reboque'],
      contact: ['contato', 'telefone', 'ligar', 'avisar', 'comunicar', 'informar', 'agendar'],
      restrictions: ['não', 'proibido', 'vedado', 'restrito', 'impedido', 'bloqueado', 'limitado']
    },
    
    // 📅 Padrões de data
    datePatterns: [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,        // dd/mm/yyyy
      /(\d{1,2})-(\d{1,2})-(\d{4})/g,         // dd-mm-yyyy
      /(\d{4})-(\d{2})-(\d{2})/g,             // yyyy-mm-dd
      /(\d{1,2}) de (\w+) de (\d{4})/gi,      // dd de mês de yyyy
    ],
    
    // ⏰ Padrões de horário
    timePatterns: [
      /(\d{1,2}):(\d{2})\s*(?:às|até|-)?\s*(\d{1,2}):(\d{2})/g,     // HH:MM às HH:MM
      /(\d{1,2})h\s*(?:às|até|-)?\s*(\d{1,2})h/g,                   // Xh às Yh
      /das\s+(\d{1,2}):?(\d{2})?\s*às\s+(\d{1,2}):?(\d{2})?/gi,    // das X às Y
      /entre\s+(\d{1,2}):?(\d{2})?\s*e\s+(\d{1,2}):?(\d{2})?/gi,   // entre X e Y
      /(\d{1,2}):(\d{2})/g                                          // HH:MM simples
    ]
  },

  // 🎯 Função principal de análise
  analyzeRestrictions: function(text) {
    console.log('🧠 Iniciando análise inteligente de restrições...');
    console.log('📝 Texto para análise:', text?.substring(0, 200) + '...');
    
    if (!text || typeof text !== 'string') {
      console.warn('⚠️ Texto inválido para análise');
      return this.createEmptyResult(text);
    }

    const cleanText = this.cleanText(text);
    const analysis = {
      originalText: text,
      cleanText: cleanText,
      processed: true,
      confidence: 0,
      category: 'general',
      priority: 'medium',
      
      // Tipos de restrições
      timeWindows: [],
      deliveryDates: [],
      alternativeAddress: null,
      vehicleRestrictions: [],
      contactRequired: { required: false, details: '' },
      
      // Issues
      conflicts: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Análises específicas
      this.analyzeTimeWindows(cleanText, analysis);
      this.analyzeDeliveryDates(cleanText, analysis);
      this.analyzeAlternativeAddress(cleanText, analysis);
      this.analyzeVehicleRestrictions(cleanText, analysis);
      this.analyzeContactRequirements(cleanText, analysis);
      
      // Classificar e calcular confiança
      this.calculateConfidence(analysis);
      this.categorizeRestrictions(analysis);
      this.detectConflicts(analysis);
      this.generateSuggestions(analysis);
      
      console.log('✅ Análise concluída:', analysis);
      return analysis;
      
    } catch (error) {
      console.error('❌ Erro na análise de restrições:', error);
      return this.createEmptyResult(text, error);
    }
  },

  // 🧹 Limpar texto
  cleanText: function(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\sàáâãäèéêëìíîïòóôõöùúûüç:\/\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  // ⏰ Analisar janelas de tempo
  analyzeTimeWindows: function(text, analysis) {
    const timeMatches = [];
    
    // Buscar padrões de horário
    this.config.timePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        timeMatches.push({
          match: match[0],
          groups: match.slice(1),
          confidence: this.config.confidence.timeKeywords
        });
      }
    });

    // Processar matches encontrados
    timeMatches.forEach(timeMatch => {
      const window = this.parseTimeWindow(timeMatch);
      if (window) {
        analysis.timeWindows.push(window);
      }
    });

    // Detectar horário comercial
    if (text.includes('comercial') || text.includes('funcionamento')) {
      analysis.timeWindows.push({
        type: 'commercial',
        startTime: '08:00',
        endTime: '17:00',
        description: 'Horário comercial detectado',
        confidence: this.config.confidence.timeKeywords
      });
    }
  },

  // 📅 Analisar datas de entrega
  analyzeDeliveryDates: function(text, analysis) {
    this.config.datePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const date = this.parseDate(match);
        if (date) {
          analysis.deliveryDates.push(date);
        }
      }
    });
  },

  // 🏢 Analisar endereço alternativo
  analyzeAlternativeAddress: function(text, analysis) {
    const addressKeywords = this.config.keywords.address;
    const hasAddressKeywords = addressKeywords.some(keyword => text.includes(keyword));
    
    if (hasAddressKeywords) {
      // Extrair possível endereço
      const addressMatch = text.match(/(rua|avenida|travessa|alameda|praça|estrada)[^.]+/i);
      if (addressMatch) {
        analysis.alternativeAddress = {
          type: 'alternative_delivery',
          address: addressMatch[0],
          confidence: this.config.confidence.addressKeywords
        };
      }
    }
  },

  // 🚛 Analisar restrições de veículo
  analyzeVehicleRestrictions: function(text, analysis) {
    const vehicleKeywords = this.config.keywords.vehicle;
    const restrictionKeywords = this.config.keywords.restrictions;
    
    vehicleKeywords.forEach(vehicle => {
      if (text.includes(vehicle)) {
        const hasRestriction = restrictionKeywords.some(restriction => 
          text.includes(restriction + ' ' + vehicle) || 
          text.includes(vehicle + ' ' + restriction)
        );
        
        if (hasRestriction) {
          analysis.vehicleRestrictions.push({
            type: vehicle,
            detail: `Restrição para ${vehicle}`,
            description: 'Restrição de veículo detectada no texto',
            confidence: this.config.confidence.vehicleKeywords
          });
        }
      }
    });
  },

  // 📞 Analisar requisitos de contato
  analyzeContactRequirements: function(text, analysis) {
    const contactKeywords = this.config.keywords.contact;
    const deliveryKeywords = this.config.keywords.delivery;
    
    const hasContactKeywords = contactKeywords.some(keyword => text.includes(keyword));
    const hasDeliveryKeywords = deliveryKeywords.some(keyword => text.includes(keyword));
    
    if (hasContactKeywords && hasDeliveryKeywords) {
      analysis.contactRequired = {
        required: true,
        details: 'Contato necessário antes da entrega',
        confidence: this.config.confidence.contactKeywords
      };
    }
  },

  // 🎯 Calcular confiança
  calculateConfidence: function(analysis) {
    let totalConfidence = 0;
    let itemCount = 0;

    // Somar confiança de todos os itens detectados
    if (analysis.timeWindows.length > 0) {
      totalConfidence += analysis.timeWindows.reduce((sum, window) => sum + (window.confidence || 0.5), 0);
      itemCount += analysis.timeWindows.length;
    }

    if (analysis.deliveryDates.length > 0) {
      totalConfidence += analysis.deliveryDates.reduce((sum, date) => sum + (date.confidence || 0.5), 0);
      itemCount += analysis.deliveryDates.length;
    }

    if (analysis.alternativeAddress) {
      totalConfidence += analysis.alternativeAddress.confidence || 0.5;
      itemCount++;
    }

    if (analysis.vehicleRestrictions.length > 0) {
      totalConfidence += analysis.vehicleRestrictions.reduce((sum, vehicle) => sum + (vehicle.confidence || 0.5), 0);
      itemCount += analysis.vehicleRestrictions.length;
    }

    if (analysis.contactRequired.required) {
      totalConfidence += analysis.contactRequired.confidence || 0.5;
      itemCount++;
    }

    // Calcular média
    analysis.confidence = itemCount > 0 ? totalConfidence / itemCount : 0;
  },

  // 🏷️ Categorizar restrições
  categorizeRestrictions: function(analysis) {
    if (analysis.timeWindows.length > 0 || analysis.deliveryDates.length > 0) {
      analysis.category = 'temporal';
      analysis.priority = 'high';
    } else if (analysis.vehicleRestrictions.length > 0) {
      analysis.category = 'vehicle';
      analysis.priority = 'high';
    } else if (analysis.alternativeAddress) {
      analysis.category = 'address';
      analysis.priority = 'medium';
    } else if (analysis.contactRequired.required) {
      analysis.category = 'contact';
      analysis.priority = 'medium';
    } else {
      analysis.category = 'general';
      analysis.priority = 'low';
    }
  },

  // ⚠️ Detectar conflitos
  detectConflicts: function(analysis) {
    // Conflito: múltiplas janelas de tempo sobrepostas
    if (analysis.timeWindows.length > 1) {
      analysis.conflicts.push({
        type: 'time_overlap',
        description: 'Múltiplas janelas de tempo detectadas',
        severity: 'medium'
      });
    }

    // Conflito: data muito próxima ou passada
    analysis.deliveryDates.forEach(date => {
      if (date.parsed && date.parsed < new Date()) {
        analysis.conflicts.push({
          type: 'past_date',
          description: `Data de entrega no passado: ${date.formatted}`,
          severity: 'high'
        });
      }
    });
  },

  // 💡 Gerar sugestões
  generateSuggestions: function(analysis) {
    if (analysis.timeWindows.length === 0 && analysis.deliveryDates.length === 0) {
      analysis.suggestions.push({
        type: 'timing',
        message: 'Considere definir horários específicos de entrega',
        action: 'Adicionar janela de tempo'
      });
    }

    if (!analysis.contactRequired.required && (analysis.alternativeAddress || analysis.vehicleRestrictions.length > 0)) {
      analysis.suggestions.push({
        type: 'contact',
        message: 'Recomendado contato prévio devido às restrições',
        action: 'Ativar contato obrigatório'
      });
    }
  },

  // 🔧 Funções auxiliares
  parseTimeWindow: function(timeMatch) {
    try {
      const groups = timeMatch.groups;
      
      if (groups.length >= 4) {
        return {
          type: 'time_range',
          startTime: `${groups[0].padStart(2, '0')}:${(groups[1] || '00').padStart(2, '0')}`,
          endTime: `${groups[2].padStart(2, '0')}:${(groups[3] || '00').padStart(2, '0')}`,
          description: `Horário: ${timeMatch.match}`,
          confidence: timeMatch.confidence
        };
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Erro ao processar janela de tempo:', error);
      return null;
    }
  },

  parseDate: function(dateMatch) {
    try {
      const groups = dateMatch.slice(1);
      let date;
      
      if (groups.length >= 3) {
        // dd/mm/yyyy ou variações
        date = new Date(groups[2], groups[1] - 1, groups[0]);
      }
      
      if (date && !isNaN(date.getTime())) {
        return {
          type: 'specific_date',
          formatted: date.toLocaleDateString('pt-BR'),
          parsed: date,
          description: `Data específica: ${dateMatch[0]}`,
          confidence: this.config.confidence.datePatterns
        };
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Erro ao processar data:', error);
      return null;
    }
  },

  createEmptyResult: function(originalText, error = null) {
    return {
      originalText: originalText || '',
      cleanText: '',
      processed: false,
      confidence: 0,
      category: 'unknown',
      priority: 'low',
      timeWindows: [],
      deliveryDates: [],
      alternativeAddress: null,
      vehicleRestrictions: [],
      contactRequired: { required: false, details: '' },
      conflicts: [],
      warnings: error ? [{ message: `Erro na análise: ${error.message}`, suggestion: 'Verifique o formato do texto' }] : [],
      suggestions: []
    };
  },

  // 📊 Função para análise de múltiplos textos
  analyzeMultipleTexts: function(textsArray) {
    console.log('📊 Analisando múltiplos textos de restrições...');
    
    if (!Array.isArray(textsArray) || textsArray.length === 0) {
      console.warn('⚠️ Array de textos inválido ou vazio');
      return this.createEmptyResult('');
    }
    
    // Combinar todos os textos
    const combinedText = textsArray
      .filter(text => text && typeof text === 'string')
      .join(' ');
    
    if (!combinedText.trim()) {
      console.warn('⚠️ Nenhum texto válido encontrado');
      return this.createEmptyResult('');
    }
    
    console.log(`📝 Analisando ${textsArray.length} textos combinados (${combinedText.length} caracteres)`);
    return this.analyzeRestrictions(combinedText);
  },

  // 🔗 FUNÇÃO DE INTEGRAÇÃO CORRIGIDA
  integrateWithLoadingsXML: function() {
    console.log('🔗 Iniciando integração com LoadingsXML...');
    
    if (typeof LoadingsXML === 'undefined') {
      console.warn('⚠️ LoadingsXML não encontrado');
      return false;
    }

    // Verificar se já foi integrado
    if (LoadingsXML._restrictionsIntegrated) {
      console.log('✅ Parser já integrado com LoadingsXML');
      return true;
    }

    try {
      // Backup da função original de processamento
      const originalProcessXMLFile = LoadingsXML.processXMLFile;
      
      // Sobrescrever com versão que inclui análise de restrições
      LoadingsXML.processXMLFile = function(file, fileName) {
        console.log('🔄 Processando XML com análise de restrições...');
        
        // Chamar função original
        const result = originalProcessXMLFile.call(this, file, fileName);
        
        // Adicionar análise de restrições
        if (this.processedFiles && this.processedFiles.length > 0) {
          const lastFile = this.processedFiles[this.processedFiles.length - 1];
          
          // Coletar textos de observações de forma mais robusta
          let allObservations = [];
          if (lastFile.data && lastFile.data.length > 0) {
            lastFile.data.forEach((row, index) => {
              // Verificar múltiplos campos possíveis para observações
              const possibleFields = ['observacoes', 'observacao', 'obs', 'restricoes', 'restricao', 'comentarios', 'comentario'];
              
              possibleFields.forEach(field => {
                if (row[field] && typeof row[field] === 'string' && row[field].trim()) {
                  allObservations.push(row[field].trim());
                }
              });
            });
          }
          
          // Analisar restrições se houver observações
          if (allObservations.length > 0) {
            console.log(`🧠 Analisando restrições em ${allObservations.length} observações...`);
            lastFile.restrictionsAnalysis = SmartRestrictionsParser.analyzeMultipleTexts(allObservations);
            console.log('✅ Análise de restrições concluída para arquivo real');
          } else {
            console.log('ℹ️ Nenhuma observação encontrada para análise de restrições');
            lastFile.restrictionsAnalysis = SmartRestrictionsParser.createEmptyResult('');
          }
        }
        
        return result;
      };
      
      // Marcar como integrado
      LoadingsXML._restrictionsIntegrated = true;
      console.log('✅ SmartRestrictionsParser integrado com LoadingsXML');
      return true;
      
    } catch (error) {
      console.error('❌ Erro na integração:', error);
      return false;
    }
  }
};

// 🌐 Expor globalmente
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartRestrictionsParser;
} else {
  window.SmartRestrictionsParser = SmartRestrictionsParser;
}

// 🚀 Auto-inicialização quando carregado
if (typeof window !== 'undefined') {
  
  // 🔗 Função global para integração manual  
  window.integrarParserRestrictions = function() {
    console.log('🔧 Executando integração manual do parser...');
    return SmartRestrictionsParser.integrateWithLoadingsXML();
  };
  
  // 📊 Função global para análise manual
  window.analisarRestrictions = function(texto) {
    console.log('🧠 Executando análise manual de restrições...');
    return SmartRestrictionsParser.analyzeRestrictions(texto);
  };
  
  // 🔗 Auto-integração robusta
  function setupParserIntegration() {
    let attempts = 0;
    const maxAttempts = 10;
    
    function tryIntegrateParser() {
      attempts++;
      console.log(`🔄 Tentativa ${attempts}/${maxAttempts} de integração do parser...`);
      
      // Verificar se LoadingsXML está disponível
      if (typeof window.LoadingsXML === 'object' && 
          typeof window.LoadingsXML.processXMLFile === 'function') {
        
        console.log('✅ LoadingsXML encontrado, iniciando integração...');
        
        try {
          const success = SmartRestrictionsParser.integrateWithLoadingsXML();
          if (success) {
            console.log('🎉 Parser integrado com sucesso!');
            return true;
          }
        } catch (error) {
          console.error('❌ Erro na integração:', error);
        }
      }
      
      // Tentar novamente se não conseguiu
      if (attempts < maxAttempts) {
        setTimeout(tryIntegrateParser, 1000);
      } else {
        console.warn('⚠️ Falha na integração automática. Use integrarParserRestrictions() manualmente.');
      }
      
      return false;
    }
    
    // Esperar um pouco antes da primeira tentativa
    setTimeout(tryIntegrateParser, 2000);
  }
  
  // Iniciar processo de integração
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupParserIntegration);
  } else {
    setupParserIntegration();
  }
}