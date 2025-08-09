// === PATCH 1: Garantir existência do container de retornos ===
(function ensureRetornosContainerOnLoad() {
    function ensureRetornosContainer() {
        let el = document.getElementById('retornos-container');
        if (!el) {
            const card = document.createElement('section');
            card.className = 'card';
            card.id = 'retornos-card';

            const h3 = document.createElement('h3');
            h3.textContent = 'Retornos';
            card.appendChild(h3);

            el = document.createElement('div');
            el.id = 'retornos-container';
            card.appendChild(el);

            // tenta inserir no container principal; se não existir, vai no body
            (document.getElementById('content-container') ||
             document.getElementById('dashboard-cards') ||
             document.body).appendChild(card);

            console.info('🧩 Criado dinamicamente #retornos-container');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureRetornosContainer);
    } else {
        ensureRetornosContainer();
    }
})();

// js/modules/retornos-dashboard.js - Módulo de Retornos VERSÃO CORRIGIDA COMPLETA
class RetornosDashboard {
    constructor() {
        this.retornos = [];
        this.stats = {};
        this.retornoAtual = null;
        this.apiBaseUrl = '/api'; // Base URL da API
        this.isLoading = false;
        this.lastUpdate = null;
        
        console.log('🔄 Inicializando módulo de retornos (VERSÃO CORRIGIDA)...');
    }
    
    // Inicializar módulo
    async init() {
        try {
            console.log('🔄 Carregando dados de retornos...');
            
            // Carregar dados iniciais
            await Promise.all([
                this.loadRetornos(),
                this.loadStats()
            ]);
            
            this.bindEvents();
            this.setupAutoRefresh();
            
            console.log('✅ Módulo de retornos inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar retornos:', error);
            this.handleInitError(error);
        }
    }
    
    // Configurar atualização automática
    setupAutoRefresh() {
        // Atualizar a cada 30 segundos
        setInterval(() => {
            if (!this.isLoading) {
                this.refreshData();
            }
        }, 30000);
        
        console.log('⏰ Auto-refresh configurado (30s)');
    }
    
    // Refrescar dados
    async refreshData() {
        try {
            console.log('🔄 Atualizando dados automaticamente...');
            await Promise.all([
                this.loadRetornos(),
                this.loadStats()
            ]);
            this.lastUpdate = new Date();
            console.log('✅ Dados atualizados automaticamente');
        } catch (error) {
            console.warn('⚠️ Erro na atualização automática:', error);
        }
    }
    
    // Tratar erro de inicialização
    handleInitError(error) {
        console.log('📭 Sistema com problemas - exibindo estado de erro...');
        
        // Arrays e stats vazios
        this.retornos = [];
        this.stats = {
            aguardando_chegada: 0,
            pendentes: 0,
            concluidos: 0,
            concluidos_hoje: 0,
            total: 0,
            itens_total: 0,
            itens_processados: 0
        };
        
        this.updateStatsDisplay();
        this.renderRetornos();
        
        // Mostrar mensagem de erro
        this.showAlert(`Erro de conexão: ${error.message}`, 'danger');
        
        // Tentar reconectar em 10 segundos
        setTimeout(() => {
            console.log('🔄 Tentando reconectar...');
            this.init();
        }, 10000);
    }
    
    // Carregar lista de retornos - VERSÃO CORRIGIDA
    async loadRetornos() {
        if (this.isLoading) {
            console.log('⏳ Carregamento já em andamento, ignorando...');
            return;
        }
        
        this.isLoading = true;
        
        try {
            console.log('🔄 Fazendo requisição para /api/retornos...');
            
            const response = await fetch(`${this.apiBaseUrl}/retornos`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            console.log('📡 Status da resposta:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📋 Resposta completa da API:', result);
            
            // VALIDAÇÃO ROBUSTA DOS DADOS
            if (result && typeof result === 'object') {
                if (result.success === true && Array.isArray(result.data)) {
                    // Resposta de sucesso com dados
                    this.retornos = result.data;
                    console.log(`📋 ${this.retornos.length} retornos carregados com sucesso`);
                    
                    this.renderRetornos();
                    
                    // Se há uma mensagem da API, logar
                    if (result.message) {
                        console.log('📭 Mensagem da API:', result.message);
                    }
                    
                } else if (result.success === false) {
                    // Resposta de erro da API
                    console.warn('⚠️ API retornou erro:', result.message);
                    this.showAlert(`Erro da API: ${result.message}`, 'warning');
                    
                    // Manter dados existentes se houver
                    if (this.retornos.length === 0) {
                        this.renderRetornos(); // Renderizar estado vazio
                    }
                    
                } else {
                    // Resposta inválida
                    console.warn('⚠️ Resposta da API inválida:', result);
                    throw new Error('Formato de resposta inválido da API');
                }
            } else {
                throw new Error('Resposta da API não é um objeto JSON válido');
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar retornos:', error);
            
            // Se não há retornos ainda, mostrar estado vazio
            if (this.retornos.length === 0) {
                this.renderRetornos();
            }
            
            // Mostrar alerta apenas se for erro novo
            if (error.message.includes('fetch')) {
                this.showAlert('Erro de conectividade - verificando conexão...', 'warning');
            } else {
                this.showAlert(`Erro: ${error.message}`, 'danger');
            }
            
        } finally {
            this.isLoading = false;
        }
    }
    
    // Carregar estatísticas - VERSÃO TOTALMENTE CORRIGIDA
    async loadStats() {
        try {
            console.log('📊 Fazendo requisição para /api/retornos/stats...');
            
            const response = await fetch(`${this.apiBaseUrl}/retornos/stats`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            console.log('📡 Status da resposta stats:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📊 Resposta completa da API stats:', result);
            
            // VALIDAÇÃO ULTRA ROBUSTA DOS DADOS
            if (result && typeof result === 'object') {
                if (result.success === true && result.data && typeof result.data === 'object') {
                    // Garantir que TODOS os campos existem com valores padrão seguros
                    this.stats = {
                        aguardando_chegada: this.safeNumber(result.data.aguardando_chegada),
                        pendentes: this.safeNumber(result.data.pendentes),
                        concluidos: this.safeNumber(result.data.concluidos),
                        concluidos_hoje: this.safeNumber(result.data.concluidos_hoje),
                        total: this.safeNumber(result.data.total),
                        itens_total: this.safeNumber(result.data.itens_total),
                        itens_processados: this.safeNumber(result.data.itens_processados)
                    };
                    
                    console.log('✅ Stats processadas com segurança:', this.stats);
                    this.updateStatsDisplay();
                    console.log('📊 Estatísticas de retornos carregadas e exibidas');
                    
                } else if (result.success === false) {
                    // Erro da API, usar dados padrão
                    console.warn('⚠️ API de stats retornou erro:', result.message);
                    this.useDefaultStats();
                    
                } else {
                    // Resposta inválida, usar dados padrão
                    console.warn('⚠️ Resposta de stats inválida:', result);
                    this.useDefaultStats();
                }
            } else {
                throw new Error('Resposta de stats não é um objeto JSON válido');
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas:', error);
            this.useDefaultStats();
            this.showAlert(`Erro ao carregar estatísticas: ${error.message}`, 'warning');
        }
    }
    
    // Usar estatísticas padrão em caso de erro
    useDefaultStats() {
        console.log('🔄 Usando estatísticas padrão devido a erro...');
        
        this.stats = {
            aguardando_chegada: 0,
            pendentes: 0,
            concluidos: 0,
            concluidos_hoje: 0,
            total: 0,
            itens_total: 0,
            itens_processados: 0
        };
        
        this.updateStatsDisplay();
    }
    
    // Garantir que um valor é um número válido
    safeNumber(value) {
        const num = parseInt(value);
        return isNaN(num) ? 0 : Math.max(0, num);
    }
    
    // Atualizar display das estatísticas - VERSÃO ULTRA CORRIGIDA
    updateStatsDisplay() {
        try {
            console.log('🔄 Atualizando display das estatísticas:', this.stats);
            
            // VALIDAÇÃO FINAL - garantir que stats existe e tem as propriedades corretas
            if (!this.stats || typeof this.stats !== 'object') {
                console.warn('⚠️ Stats inválidas recebidas, usando padrão:', this.stats);
                this.useDefaultStats();
                return;
            }
            
            // Mapear elementos específicos conhecidos
            const elementMappings = [
                // IDs primários
                { ids: ['aguardando-count'], value: this.stats.aguardando_chegada },
                { ids: ['pendentes-count'], value: this.stats.pendentes },
                { ids: ['conferido-count'], value: this.stats.concluidos },
                { ids: ['conferido-hoje-count'], value: this.stats.concluidos_hoje },
                { ids: ['total-retornos-count'], value: this.stats.total },
                
                // IDs alternativos
                { ids: ['retornos-aguardando'], value: this.stats.aguardando_chegada },
                { ids: ['retornos-pendentes'], value: this.stats.pendentes },
                { ids: ['retornos-concluidos'], value: this.stats.concluidos },
                { ids: ['retornos-hoje'], value: this.stats.concluidos_hoje },
                { ids: ['retornos-total'], value: this.stats.total },
                
                // Novos campos
                { ids: ['itens-total-count'], value: this.stats.itens_total },
                { ids: ['itens-processados-count'], value: this.stats.itens_processados }
            ];
            
            let elementsUpdated = 0;
            
            elementMappings.forEach(mapping => {
                mapping.ids.forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = mapping.value;
                        console.log(`✅ ${id} = ${mapping.value}`);
                        elementsUpdated++;
                    }
                });
            });
            
            console.log(`📊 ${elementsUpdated} elementos de estatísticas atualizados`);
            
            // Método auxiliar: procurar e atualizar cards automaticamente
            this.updateDashboardCardsAuto();
            
            // Atualizar timestamp se existe
            const timestampEl = document.getElementById('stats-timestamp');
            if (timestampEl) {
                timestampEl.textContent = `Atualizado: ${new Date().toLocaleTimeString()}`;
            }
            
            console.log('✅ Display das estatísticas atualizado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao atualizar display das estatísticas:', error);
        }
    }
    
    // Método melhorado para atualizar cards do dashboard automaticamente
    updateDashboardCardsAuto() {
        try {
            console.log('🔍 Procurando cards do dashboard para atualizar...');
            
            // Estratégia 1: Cards com classes específicas
            const specificSelectors = [
                '[data-stat="retornos-total"]',
                '[data-stat="retornos-pendentes"]',
                '[data-stat="retornos-concluidos"]',
                '[data-stat="retornos-aguardando"]'
            ];
            
            specificSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    const statType = el.getAttribute('data-stat');
                    let value = 0;
                    
                    switch (statType) {
                        case 'retornos-total':
                            value = this.stats.total;
                            break;
                        case 'retornos-pendentes':
                            value = this.stats.pendentes;
                            break;
                        case 'retornos-concluidos':
                            value = this.stats.concluidos;
                            break;
                        case 'retornos-aguardando':
                            value = this.stats.aguardando_chegada;
                            break;
                    }
                    
                    el.textContent = value;
                    console.log(`✅ Card específico ${statType} = ${value}`);
                });
            });
            
            // Estratégia 2: Buscar cards genéricos por conteúdo de texto
            const cards = document.querySelectorAll('.card, .card-body, .widget, .metric-card');
            console.log(`📊 Encontrados ${cards.length} cards potenciais no dashboard`);
            
            cards.forEach((card, index) => {
                const text = card.textContent.toLowerCase();
                
                // Procurar por elementos com números grandes
                const numberElements = card.querySelectorAll('.display-1, .display-2, .display-3, .display-4, .h1, .h2, h1, h2, .metric-number, .stat-number');
                
                if (numberElements.length > 0 && text.includes('retorno')) {
                    numberElements.forEach(numEl => {
                        // Detectar tipo de card pelo texto
                        if (text.includes('pendente')) {
                            numEl.textContent = this.stats.pendentes;
                            console.log(`✅ Card ${index} "Retornos Pendentes" = ${this.stats.pendentes}`);
                        } else if (text.includes('concluído') || text.includes('finalizado')) {
                            numEl.textContent = this.stats.concluidos;
                            console.log(`✅ Card ${index} "Retornos Concluídos" = ${this.stats.concluidos}`);
                        } else if (text.includes('aguardando') || text.includes('chegada')) {
                            numEl.textContent = this.stats.aguardando_chegada;
                            console.log(`✅ Card ${index} "Retornos Aguardando" = ${this.stats.aguardando_chegada}`);
                        } else if (text.includes('hoje')) {
                            numEl.textContent = this.stats.concluidos_hoje;
                            console.log(`✅ Card ${index} "Retornos Hoje" = ${this.stats.concluidos_hoje}`);
                        } else if (text.includes('total')) {
                            numEl.textContent = this.stats.total;
                            console.log(`✅ Card ${index} "Retornos Total" = ${this.stats.total}`);
                        }
                    });
                }
            });
            
            console.log('✅ Atualização automática de cards concluída');
            
        } catch (error) {
            console.error('❌ Erro ao atualizar cards do dashboard:', error);
        }
    }
    
    // Renderizar lista de retornos - VERSÃO MELHORADA
    renderRetornos() {
        const container = document.getElementById('retornos-container');
        if (!container) {
            console.warn('⚠️ Container retornos-container não encontrado');
            return;
        }
        
        console.log(`🎨 Renderizando ${this.retornos.length} retornos...`);
        
        if (this.retornos.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="fas fa-truck-loading fa-4x mb-3 text-secondary"></i>
                    <h5>Nenhum retorno de carga registrado</h5>
                    <p class="text-muted">
                        Clique em "Registrar Retorno" para adicionar o primeiro retorno de carga.
                    </p>
                    <button class="btn btn-primary mt-3" data-bs-toggle="modal" data-bs-target="#registrarRetornoModal">
                        <i class="fas fa-plus"></i> Registrar Primeiro Retorno
                    </button>
                    ${this.lastUpdate ? `
                        <div class="mt-3">
                            <small class="text-muted">
                                Última atualização: ${this.lastUpdate.toLocaleTimeString()}
                            </small>
                        </div>
                    ` : ''}
                </div>
            `;
            return;
        }
        
        const html = this.retornos.map(retorno => this.renderRetornoItem(retorno)).join('');
        container.innerHTML = html;
        
        console.log('✅ Lista de retornos renderizada com sucesso');
    }
    
    // Renderizar item de retorno - VERSÃO MELHORADA
    renderRetornoItem(retorno) {
        const statusClass = this.getStatusClass(retorno.status);
        const statusText = this.getStatusText(retorno.status);
        const timeAgo = this.timeAgo(retorno.created_at);
        
        // Contar itens já bipados de forma segura
        let itensBipados = 0;
        try {
            if (retorno.itens_retornados) {
                if (typeof retorno.itens_retornados === 'string') {
                    const itens = JSON.parse(retorno.itens_retornados);
                    itensBipados = Array.isArray(itens) ? itens.length : 0;
                } else if (Array.isArray(retorno.itens_retornados)) {
                    itensBipados = retorno.itens_retornados.length;
                }
            }
            
            // Usar campo itens_processados se disponível
            if (retorno.itens_processados && retorno.itens_processados > itensBipados) {
                itensBipados = retorno.itens_processados;
            }
        } catch (e) {
            console.warn('⚠️ Erro ao contar itens bipados:', e);
            itensBipados = retorno.itens_processados || 0;
        }
        
        const totalItens = retorno.total_itens || 0;
        const progressPercent = totalItens > 0 ? Math.round((itensBipados / totalItens) * 100) : 0;
        
        return `
            <div class="card mb-3 retorno-item ${statusClass}" data-id="${retorno.id}">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <h6 class="mb-1">
                                <i class="fas fa-user"></i> ${this.escapeHtml(retorno.motorista_nome || retorno.driver_name || 'Motorista não informado')}
                            </h6>
                            <small class="text-muted">
                                <i class="fas fa-file-invoice"></i> 
                                NF: ${this.escapeHtml(retorno.numero_nf || retorno.numero_nf_display || 'Não informada')}
                            </small>
                        </div>
                        <div class="col-md-2">
                            <div class="mb-1">
                                <i class="fas fa-calendar"></i> ${this.formatDate(retorno.data_retorno)}
                            </div>
                            <small class="text-muted">
                                <i class="fas fa-clock"></i> ${retorno.horario_retorno || 'Sem horário'}
                            </small>
                        </div>
                        <div class="col-md-2">
                            <span class="badge bg-${this.getStatusBadgeColor(retorno.status)} mb-1">
                                ${statusText}
                            </span>
                            <br>
                            <small class="text-muted">${timeAgo}</small>
                        </div>
                        <div class="col-md-2">
                            <div class="mb-1">
                                <i class="fas fa-boxes"></i> 
                                <strong>${itensBipados}</strong>${totalItens > 0 ? `/${totalItens}` : ''} itens
                            </div>
                            ${totalItens > 0 ? `
                                <div class="progress" style="height: 5px;">
                                    <div class="progress-bar bg-${this.getStatusBadgeColor(retorno.status)}" 
                                         role="progressbar" 
                                         style="width: ${progressPercent}%"
                                         aria-valuenow="${progressPercent}" 
                                         aria-valuemin="0" 
                                         aria-valuemax="100">
                                    </div>
                                </div>
                                <small class="text-muted">${progressPercent}% processado</small>
                            ` : `
                                <small class="text-muted">processados</small>
                            `}
                        </div>
                        <div class="col-md-3 text-end">
                            ${this.renderRetornoActions(retorno)}
                        </div>
                    </div>
                    ${retorno.observacoes ? `
                        <div class="row mt-2">
                            <div class="col-12">
                                <small class="text-muted">
                                    <i class="fas fa-comment"></i> ${this.escapeHtml(retorno.observacoes)}
                                </small>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Renderizar ações com IDs específicos - VERSÃO MELHORADA
    renderRetornoActions(retorno) {
        const actions = [];
        
        switch (retorno.status) {
            case 'aguardando_chegada':
                actions.push(`
                    <button class="btn btn-sm btn-primary me-1" 
                            onclick="window.RetornosDashboard.iniciarBipagem(${retorno.id})"
                            data-retorno-id="${retorno.id}"
                            title="Iniciar processo de bipagem">
                        <i class="fas fa-barcode"></i> Iniciar Bipagem
                    </button>
                    <button class="btn btn-sm btn-outline-danger" 
                            onclick="window.RetornosDashboard.cancelarRetorno(${retorno.id})"
                            data-retorno-id="${retorno.id}"
                            title="Cancelar este retorno">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                `);
                break;
                
            case 'pendente':
                actions.push(`
                    <button class="btn btn-sm btn-info me-1" 
                            onclick="window.RetornosDashboard.continuarBipagem(${retorno.id})"
                            data-retorno-id="${retorno.id}"
                            title="Continuar bipagem de itens">
                        <i class="fas fa-barcode"></i> Continuar Bipagem
                    </button>
                    <button class="btn btn-sm btn-success me-1" 
                            onclick="window.RetornosDashboard.finalizarConferencia(${retorno.id})"
                            data-retorno-id="${retorno.id}"
                            title="Finalizar conferência">
                        <i class="fas fa-check"></i> Finalizar
                    </button>
                    <button class="btn btn-sm btn-warning me-1" 
                            onclick="window.RetornosDashboard.editarRetorno(${retorno.id})"
                            data-retorno-id="${retorno.id}"
                            title="Editar informações do retorno">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                `);
                break;
                
            case 'concluido':
                actions.push(`
                    <div class="text-success text-center">
                        <i class="fas fa-check-circle fa-2x"></i>
                        <br>
                        <strong>Concluído</strong>
                        <br>
                        <small class="text-muted">
                            ${retorno.data_conclusao ? this.formatDateTime(retorno.data_conclusao) : 'Finalizado'}
                        </small>
                    </div>
                `);
                break;
                
            case 'cancelado':
                actions.push(`
                    <div class="text-danger text-center">
                        <i class="fas fa-times-circle fa-2x"></i>
                        <br>
                        <strong>Cancelado</strong>
                        <br>
                        <small class="text-muted">Processo cancelado</small>
                    </div>
                `);
                break;
                
            default:
                actions.push(`
                    <div class="text-muted text-center">
                        <i class="fas fa-question-circle fa-2x"></i>
                        <br>
                        <small>Status: ${retorno.status}</small>
                    </div>
                `);
                break;
        }
        
        return actions.join('');
    }
    
    // ===== FUNÇÕES DE BIPAGEM - IMPLEMENTAÇÃO COMPLETA =====
    
    // Iniciar processo de bipagem
    async iniciarBipagem(id) {
        try {
            console.log(`🔄 Iniciando bipagem para retorno ${id}`);
            
            const response = await fetch(`${this.apiBaseUrl}/retornos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'pendente' })
            });
            
            if (response.ok) {
                this.showAlert('Processo de bipagem iniciado com sucesso!', 'success');
                await this.refreshData();
                
                // Abrir modal de bipagem se existir
                this.openBipagemModal(id);
                
            } else {
                const result = await response.json();
                this.showAlert(`Erro ao iniciar bipagem: ${result.message}`, 'danger');
            }
        } catch (error) {
            console.error('❌ Erro ao iniciar bipagem:', error);
            this.showAlert('Erro de conexão. Verifique sua internet.', 'danger');
        }
    }
    
    // Continuar processo de bipagem
    async continuarBipagem(id) {
        console.log(`📱 Continuando bipagem para retorno ${id}`);
        this.openBipagemModal(id);
    }
    
    // Abrir modal de bipagem
    openBipagemModal(retornoId) {
        try {
            // Buscar retorno atual
            const retorno = this.retornos.find(r => r.id === retornoId);
            if (!retorno) {
                this.showAlert('Retorno não encontrado', 'danger');
                return;
            }
            
            // Verificar se modal existe
            const modalEl = document.getElementById('bipagemModal');
            if (!modalEl) {
                console.warn('⚠️ Modal de bipagem não encontrado - criando modal dinâmico');
                this.createBipagemModal();
            }
            
            // Configurar dados do modal
            this.setupBipagemModal(retorno);
            
            // Abrir modal
            const modal = new bootstrap.Modal(document.getElementById('bipagemModal'));
            modal.show();
            
            // Focar no campo de código
            setTimeout(() => {
                const codigoInput = document.getElementById('codigo-item-input');
                if (codigoInput) {
                    codigoInput.focus();
                }
            }, 300);
            
        } catch (error) {
            console.error('❌ Erro ao abrir modal de bipagem:', error);
            this.showAlert('Erro ao abrir interface de bipagem', 'danger');
        }
    }
    
    // Criar modal de bipagem dinamicamente
    createBipagemModal() {
        const modalHTML = `
            <div class="modal fade" id="bipagemModal" tabindex="-1" aria-labelledby="bipagemModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="bipagemModalLabel">
                                <i class="fas fa-barcode"></i> Bipagem de Retorno
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="retorno-info" class="mb-3"></div>
                            
                            <div class="row mb-3">
                                <div class="col-md-8">
                                    <label for="codigo-item-input" class="form-label">Código do Item</label>
                                    <input type="text" 
                                           class="form-control form-control-lg" 
                                           id="codigo-item-input" 
                                           placeholder="Escaneie ou digite o código do item">
                                </div>
                                <div class="col-md-4">
                                    <label for="quantidade-input" class="form-label">Quantidade</label>
                                    <input type="number" 
                                           class="form-control form-control-lg" 
                                           id="quantidade-input" 
                                           value="1" min="1">
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="descricao-input" class="form-label">Descrição (Opcional)</label>
                                <input type="text" 
                                       class="form-control" 
                                       id="descricao-input" 
                                       placeholder="Descrição do item">
                            </div>
                            
                            <div class="d-grid gap-2 mb-3">
                                <button class="btn btn-primary btn-lg" id="bipar-item-btn">
                                    <i class="fas fa-plus"></i> Bipar Item
                                </button>
                            </div>
                            
                            <div id="itens-bipados-container">
                                <h6><i class="fas fa-list"></i> Itens Bipados</h6>
                                <div id="itens-bipados-list" class="border rounded p-2" style="max-height: 300px; overflow-y: auto;">
                                    <!-- Lista de itens será inserida aqui -->
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times"></i> Fechar
                            </button>
                            <button type="button" class="btn btn-success" id="finalizar-bipagem-btn">
                                <i class="fas fa-check"></i> Finalizar Conferência
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        console.log('✅ Modal de bipagem criado dinamicamente');
    }
    
    // Configurar modal de bipagem com dados do retorno
    setupBipagemModal(retorno) {
        try {
            console.log('🔧 Configurando modal de bipagem para retorno:', retorno.id);
            
            // Configurar informações do retorno
            const retornoInfo = document.getElementById('retorno-info');
            if (retornoInfo) {
                retornoInfo.innerHTML = `
                    <div class="card bg-light">
                        <div class="card-body py-2">
                            <div class="row">
                                <div class="col-md-6">
                                    <strong>Motorista:</strong> ${retorno.motorista_nome || 'Não informado'}
                                </div>
                                <div class="col-md-6">
                                    <strong>NF:</strong> ${retorno.numero_nf || 'Não informada'}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Limpar campos
            const codigoInput = document.getElementById('codigo-item-input');
            const quantidadeInput = document.getElementById('quantidade-input');
            const descricaoInput = document.getElementById('descricao-input');
            
            if (codigoInput) codigoInput.value = '';
            if (quantidadeInput) quantidadeInput.value = '1';
            if (descricaoInput) descricaoInput.value = '';
            
            // Configurar eventos
            this.setupBipagemEvents(retorno.id);
            
            // Carregar itens já bipados
            this.loadItensBipados(retorno);
            
            console.log('✅ Modal configurado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao configurar modal:', error);
        }
    }
    
    // Configurar eventos do modal de bipagem
    setupBipagemEvents(retornoId) {
        // Remover eventos anteriores
        const biparBtn = document.getElementById('bipar-item-btn');
        const finalizarBtn = document.getElementById('finalizar-bipagem-btn');
        const codigoInput = document.getElementById('codigo-item-input');
        
        if (biparBtn) {
            // Remover listeners anteriores
            const newBiparBtn = biparBtn.cloneNode(true);
            biparBtn.parentNode.replaceChild(newBiparBtn, biparBtn);
            
            // Adicionar novo listener
            newBiparBtn.addEventListener('click', () => {
                this.processarBipagem(retornoId);
            });
        }
        
        if (finalizarBtn) {
            const newFinalizarBtn = finalizarBtn.cloneNode(true);
            finalizarBtn.parentNode.replaceChild(newFinalizarBtn, finalizarBtn);
            
            newFinalizarBtn.addEventListener('click', () => {
                this.finalizarConferencia(retornoId);
            });
        }
        
        if (codigoInput) {
            const newCodigoInput = codigoInput.cloneNode(true);
            codigoInput.parentNode.replaceChild(newCodigoInput, codigoInput);
            
            // Enter para bipar
            newCodigoInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.processarBipagem(retornoId);
                }
            });
        }
        
        console.log('✅ Eventos do modal configurados');
    }
    
    // Processar bipagem de item
    async processarBipagem(retornoId) {
        try {
            const codigoInput = document.getElementById('codigo-item-input');
            const quantidadeInput = document.getElementById('quantidade-input');
            const descricaoInput = document.getElementById('descricao-input');
            
            const codigo = codigoInput?.value?.trim();
            const quantidade = parseInt(quantidadeInput?.value) || 1;
            const descricao = descricaoInput?.value?.trim();
            
            if (!codigo) {
                this.showAlert('Digite ou escaneie o código do item', 'warning');
                codigoInput?.focus();
                return;
            }
            
            console.log(`📱 Bipando item: ${codigo} (Qtd: ${quantidade})`);
            
            const response = await fetch(`${this.apiBaseUrl}/retornos/${retornoId}/bipar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    codigo_item: codigo,
                    descricao: descricao,
                    quantidade: quantidade
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Item bipado com sucesso:', result);
                
                // Limpar campos
                if (codigoInput) codigoInput.value = '';
                if (descricaoInput) descricaoInput.value = '';
                if (quantidadeInput) quantidadeInput.value = '1';
                
                // Focar no campo de código
                codigoInput?.focus();
                
                // Atualizar lista de itens
                const retorno = this.retornos.find(r => r.id === retornoId);
                if (retorno) {
                    this.loadItensBipados(retorno);
                }
                
                // Feedback visual
                this.showAlert(`Item ${codigo} bipado com sucesso!`, 'success', 2000);
                
                // Atualizar dados principais
                await this.refreshData();
                
            } else {
                const result = await response.json();
                this.showAlert(`Erro ao bipar item: ${result.message}`, 'danger');
            }
            
        } catch (error) {
            console.error('❌ Erro ao processar bipagem:', error);
            this.showAlert('Erro de conexão durante bipagem', 'danger');
        }
    }
    
    // Carregar e exibir itens já bipados
    loadItensBipados(retorno) {
        try {
            const container = document.getElementById('itens-bipados-list');
            if (!container) return;
            
            let itens = [];
            try {
                if (retorno.itens_retornados) {
                    if (typeof retorno.itens_retornados === 'string') {
                        itens = JSON.parse(retorno.itens_retornados);
                    } else if (Array.isArray(retorno.itens_retornados)) {
                        itens = retorno.itens_retornados;
                    }
                }
            } catch (e) {
                console.warn('⚠️ Erro ao parsear itens bipados:', e);
                itens = [];
            }
            
            if (itens.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-muted py-3">
                        <i class="fas fa-barcode fa-2x mb-2"></i>
                        <p>Nenhum item bipado ainda</p>
                    </div>
                `;
                return;
            }
            
            const itensHTML = itens.map((item, index) => `
                <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                    <div>
                        <strong>${this.escapeHtml(item.codigo)}</strong>
                        ${item.descricao ? `<br><small class="text-muted">${this.escapeHtml(item.descricao)}</small>` : ''}
                    </div>
                    <div class="text-end">
                        <span class="badge bg-primary">Qtd: ${item.quantidade}</span>
                        <br>
                        <small class="text-muted">${this.timeAgo(item.timestamp)}</small>
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = itensHTML;
            
            console.log(`📋 ${itens.length} itens bipados carregados no modal`);
            
        } catch (error) {
            console.error('❌ Erro ao carregar itens bipados:', error);
        }
    }
    
    // Finalizar conferência - IMPLEMENTAÇÃO COMPLETA
    async finalizarConferencia(id) {
        try {
            console.log(`🏁 Iniciando finalização da conferência para retorno ${id}`);
            
            // Confirmar ação
            const confirmar = confirm(
                'Finalizar a conferência deste retorno?\n\n' +
                'Esta ação marcará o retorno como concluído e não poderá ser desfeita.'
            );
            
            if (!confirmar) {
                console.log('❌ Finalização cancelada pelo usuário');
                return;
            }
            
            // Solicitar observações finais
            const observacoes = prompt('Observações finais (opcional):') || '';
            
            console.log(`🔄 Finalizando retorno ${id} com observações: ${observacoes}`);
            
            const response = await fetch(`${this.apiBaseUrl}/retornos/${id}/finalizar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    observacoes_finais: observacoes
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Retorno finalizado com sucesso:', result);
                
                this.showAlert('Conferência finalizada com sucesso!', 'success');
                
                // Fechar modal se estiver aberto
                const modal = bootstrap.Modal.getInstance(document.getElementById('bipagemModal'));
                if (modal) {
                    modal.hide();
                }
                
                // Atualizar dados
                await this.refreshData();
                
            } else {
                const result = await response.json();
                this.showAlert(`Erro ao finalizar: ${result.message}`, 'danger');
            }
            
        } catch (error) {
            console.error('❌ Erro ao finalizar conferência:', error);
            this.showAlert('Erro de conexão durante finalização', 'danger');
        }
    }
    
    // ===== OUTRAS FUNÇÕES =====
    
    // Cancelar retorno
    async cancelarRetorno(id) {
        try {
            const motivo = prompt('Motivo do cancelamento:');
            if (!motivo || motivo.trim().length === 0) {
                console.log('❌ Cancelamento abortado - motivo não fornecido');
                return;
            }
            
            console.log(`🔄 Cancelando retorno ${id} com motivo: ${motivo}`);
            
            const response = await fetch(`${this.apiBaseUrl}/retornos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: 'cancelado', 
                    observacoes: `CANCELADO: ${motivo.trim()}`
                })
            });
            
            if (response.ok) {
                this.showAlert('Retorno cancelado com sucesso', 'warning');
                await this.refreshData();
            } else {
                const result = await response.json();
                this.showAlert(`Erro ao cancelar: ${result.message}`, 'danger');
            }
        } catch (error) {
            console.error('❌ Erro ao cancelar retorno:', error);
            this.showAlert('Erro de conexão durante cancelamento', 'danger');
        }
    }
    
    // Editar retorno - IMPLEMENTAÇÃO BÁSICA
    async editarRetorno(id) {
        try {
            console.log(`📝 Editando retorno ${id}`);
            
            // Buscar dados atuais do retorno
            const retorno = this.retornos.find(r => r.id === id);
            if (!retorno) {
                this.showAlert('Retorno não encontrado', 'danger');
                return;
            }
            
            // Abrir modal de edição (implementação simplificada)
            const novoMotorista = prompt('Nome do motorista:', retorno.motorista_nome || '');
            if (novoMotorista === null) return; // Cancelado
            
            const novaNF = prompt('Número da NF:', retorno.numero_nf || '');
            if (novaNF === null) return; // Cancelado
            
            const novasObservacoes = prompt('Observações:', retorno.observacoes || '');
            if (novasObservacoes === null) return; // Cancelado
            
            // Enviar atualizações
            const response = await fetch(`${this.apiBaseUrl}/retornos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    motorista_nome: novoMotorista.trim(),
                    numero_nf: novaNF.trim(),
                    observacoes: novasObservacoes.trim()
                })
            });
            
            if (response.ok) {
                this.showAlert('Retorno atualizado com sucesso!', 'success');
                await this.refreshData();
            } else {
                const result = await response.json();
                this.showAlert(`Erro ao atualizar: ${result.message}`, 'danger');
            }
            
        } catch (error) {
            console.error('❌ Erro ao editar retorno:', error);
            this.showAlert('Erro durante edição', 'danger');
        }
    }
    
    // Bind eventos principais
    bindEvents() {
        console.log('🔗 Configurando eventos do dashboard...');
        
        // Botão atualizar
        const refreshBtn = document.getElementById('refresh-retornos');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('🔄 Botão atualizar clicado');
                this.refreshData();
            });
        }
        
        // Busca
        const searchInput = document.getElementById('search-retornos');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterRetornos(e.target.value);
            });
        }
        
        // Form registrar retorno
        const form = document.getElementById('registrar-retorno-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                this.handleRegistrarRetorno(e);
            });
        }
        
        // Botão registrar retorno alternativo
        const registrarBtn = document.getElementById('btn-registrar-retorno');
        if (registrarBtn) {
            registrarBtn.addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('registrarRetornoModal'));
                modal.show();
            });
        }
        
        console.log('✅ Eventos configurados');
    }
    
    // Handle registrar retorno - VERSÃO MELHORADA
    async handleRegistrarRetorno(event) {
        event.preventDefault();
        
        console.log('📝 Processando formulário de registro de retorno...');
        
        // Buscar campos do formulário
        const numero_nf = document.getElementById('retorno-nf')?.value?.trim();
        const motorista_nome = document.getElementById('retorno-motorista')?.value?.trim();
        const data_retorno = document.getElementById('retorno-data')?.value;
        const horario_retorno = document.getElementById('retorno-horario')?.value;
        const observacoes = document.getElementById('retorno-observacoes')?.value?.trim();
        const total_itens = document.getElementById('retorno-total-itens')?.value;
        
        console.log('📋 Dados do formulário:', {
            numero_nf, motorista_nome, data_retorno, horario_retorno, observacoes, total_itens
        });
        
        // Validações
        const errors = [];
        if (!numero_nf || numero_nf.length < 2) {
            errors.push('Número da NF é obrigatório');
        }
        if (!motorista_nome || motorista_nome.length < 2) {
            errors.push('Nome do motorista é obrigatório');
        }
        if (!data_retorno) {
            errors.push('Data do retorno é obrigatória');
        }
        
        if (errors.length > 0) {
            this.showAlert(`Erro de validação:\n${errors.join('\n')}`, 'warning');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/retornos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    numero_nf,
                    motorista_nome,
                    data_retorno,
                    horario_retorno,
                    observacoes,
                    status: 'aguardando_chegada',
                    total_itens: parseInt(total_itens) || 0
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Retorno registrado:', result);
                
                this.showAlert('Retorno registrado com sucesso!', 'success');
                
                // Fechar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('registrarRetornoModal'));
                if (modal) modal.hide();
                
                // Reset form
                document.getElementById('registrar-retorno-form').reset();
                
                // Recarregar dados
                await this.refreshData();
                
            } else {
                const result = await response.json();
                this.showAlert(`Erro ao registrar: ${result.message}`, 'danger');
            }
        } catch (error) {
            console.error('❌ Erro ao registrar retorno:', error);
            this.showAlert('Erro de conexão durante registro', 'danger');
        }
    }
    
    // Filtrar retornos por texto
    filterRetornos(searchTerm) {
        const items = document.querySelectorAll('.retorno-item');
        const term = searchTerm.toLowerCase().trim();
        
        let visibleCount = 0;
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            const isVisible = term === '' || text.includes(term);
            item.style.display = isVisible ? 'block' : 'none';
            if (isVisible) visibleCount++;
        });
        
        console.log(`🔍 Filtro aplicado: "${searchTerm}" - ${visibleCount} itens visíveis`);
    }
    
    // ===== FUNÇÕES UTILITÁRIAS =====
    
    // Escape HTML para segurança
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Utilitários de status
    getStatusClass(status) {
        const classes = {
            'aguardando_chegada': 'status-aguardando border-warning',
            'pendente': 'status-pendente border-primary',
            'concluido': 'status-concluido border-success',
            'cancelado': 'status-cancelado border-danger'
        };
        return classes[status] || 'border-secondary';
    }
    
    getStatusText(status) {
        const texts = {
            'aguardando_chegada': 'Aguardando Chegada',
            'pendente': 'Em Andamento',
            'concluido': 'Concluído',
            'cancelado': 'Cancelado'
        };
        return texts[status] || status;
    }
    
    getStatusBadgeColor(status) {
        const colors = {
            'aguardando_chegada': 'warning',
            'pendente': 'primary',
            'concluido': 'success',
            'cancelado': 'danger'
        };
        return colors[status] || 'secondary';
    }
    
    // Formatação de datas
    formatDate(dateString) {
        if (!dateString) return 'Sem data';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch (e) {
            return dateString;
        }
    }
    
    formatDateTime(timestamp) {
        if (!timestamp) return '';
        
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('pt-BR');
        } catch (e) {
            return timestamp;
        }
    }
    
    timeAgo(timestamp) {
        if (!timestamp) return 'Sem data';
        
        try {
            const now = new Date();
            const time = new Date(timestamp);
            const diff = now - time;
            const minutes = Math.floor(diff / 60000);
            
            if (minutes < 1) return 'Agora mesmo';
            if (minutes < 60) return `${minutes}min atrás`;
            
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h atrás`;
            
            const days = Math.floor(hours / 24);
            if (days < 7) return `${days}d atrás`;
            
            return this.formatDate(timestamp);
        } catch (e) {
            return 'Tempo inválido';
        }
    }
    
    // Mostrar alerta melhorado
    showAlert(message, type = 'info', autoClose = 5000) {
        console.log(`🚨 ALERT (${type}): ${message}`);
        
        const container = document.getElementById('alert-container') || document.body;
        
        const alertId = 'alert-' + Date.now();
        const alert = document.createElement('div');
        alert.id = alertId;
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
        alert.innerHTML = `
            <strong>${this.getAlertIcon(type)}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        container.appendChild(alert);
        
        // Auto-remover
        if (autoClose > 0) {
            setTimeout(() => {
                const alertElement = document.getElementById(alertId);
                if (alertElement) {
                    alertElement.remove();
                }
            }, autoClose);
        }
    }
    
    getAlertIcon(type) {
        const icons = {
            'success': '✅',
            'danger': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }
}

// ===== INICIALIZAÇÃO =====

// Criar instância global
window.RetornosDashboard = new RetornosDashboard();

// Funções globais para os botões funcionarem
window.iniciarBipagem = (id) => window.RetornosDashboard.iniciarBipagem(id);
window.continuarBipagem = (id) => window.RetornosDashboard.continuarBipagem(id);
window.finalizarConferencia = (id) => window.RetornosDashboard.finalizarConferencia(id);
window.cancelarRetorno = (id) => window.RetornosDashboard.cancelarRetorno(id);
window.editarRetorno = (id) => window.RetornosDashboard.editarRetorno(id);

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema de retornos (VERSÃO CORRIGIDA FINAL)...');
    window.RetornosDashboard.init().catch(error => {
        console.error('❌ Erro crítico na inicialização:', error);
    });
});

// Adicionar CSS dinâmico para melhorar aparência
const style = document.createElement('style');
style.textContent = `
    .status-aguardando { background-color: #fff3cd; }
    .status-pendente { background-color: #cce7f8; }
    .status-concluido { background-color: #d4edda; }
    .status-cancelado { background-color: #f8d7da; }
    
    .retorno-item:hover {
        box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
        transition: box-shadow 0.3s ease;
    }
    
    #bipagemModal .modal-lg {
        max-width: 800px;
    }
    
    .alert.position-fixed {
        animation: slideInRight 0.3s ease-out;
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);