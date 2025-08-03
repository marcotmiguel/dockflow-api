// js/modules/retornos-dashboard.js - Módulo de Retornos para Dashboard (VERSÃO CORRIGIDA)
class RetornosDashboard {
    constructor() {
        this.retornos = [];
        this.stats = {};
        this.retornoAtual = null;
        this.apiBaseUrl = '/api'; // Base URL da API
        
        console.log('🔄 Inicializando módulo de retornos...');
    }
    
    // Inicializar módulo
    async init() {
        try {
            console.log('🔄 Carregando dados de retornos...');
            await this.loadRetornos();
            await this.loadStats();
            this.bindEvents();
            
            // Atualizar a cada 30 segundos
            setInterval(() => {
                this.loadRetornos();
                this.loadStats();
            }, 30000);
            
            console.log('✅ Módulo de retornos inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar retornos:', error);
            this.showEmptyState();
        }
    }
    
    // Estado vazio - SEM dados mock
    showEmptyState() {
        console.log('📭 Sistema sem dados - aguardando conexão com API...');
        
        // Arrays e stats vazios
        this.retornos = [];
        this.stats = {
            aguardando_chegada: 0,
            pendentes: 0,
            concluidos: 0,
            concluidos_hoje: 0,
            total: 0
        };
        
        this.updateStatsDisplay();
        this.renderRetornos();
        
        // Mostrar mensagem de conexão
        this.showAlert('Conectando com servidor...', 'info');
    }
    
    // Carregar lista de retornos
    async loadRetornos() {
        try {
            console.log('🔄 Fazendo requisição para /api/retornos...');
            
            const response = await fetch(`${this.apiBaseUrl}/retornos`);
            console.log('📡 Status da resposta:', response.status);
            
            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📋 Resposta completa da API:', result);
            
            // VALIDAÇÃO ROBUSTA DOS DADOS
            if (result && result.success && Array.isArray(result.data)) {
                this.retornos = result.data;
                console.log(`📋 ${this.retornos.length} retornos carregados`);
                
                this.renderRetornos();
                
                // Se há uma mensagem da API, mostrar
                if (result.message) {
                    console.log('📭 Mensagem da API:', result.message);
                }
                
            } else {
                console.warn('⚠️ Resposta da API inválida:', result);
                this.retornos = [];
                this.renderRetornos();
                
                // Se há uma mensagem de erro específica, mostrá-la
                if (result && result.message) {
                    console.log('📭 Mensagem da API:', result.message);
                }
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar retornos:', error);
            
            // Se não há retornos ainda, mostrar estado vazio
            if (this.retornos.length === 0) {
                this.showEmptyState();
            }
            
            this.showAlert(`Erro de conexão: ${error.message}`, 'warning');
        }
    }
    
    // Carregar estatísticas - VERSÃO CORRIGIDA
    async loadStats() {
        try {
            console.log('📊 Fazendo requisição para /api/retornos/stats...');
            
            const response = await fetch(`${this.apiBaseUrl}/retornos/stats`);
            console.log('📡 Status da resposta stats:', response.status);
            
            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📊 Resposta completa da API stats:', result);
            
            // VALIDAÇÃO ROBUSTA DOS DADOS
            if (result && result.success && result.data) {
                // Garantir que todos os campos existem com valores padrão
                this.stats = {
                    aguardando_chegada: result.data.aguardando_chegada || 0,
                    pendentes: result.data.pendentes || 0,
                    concluidos: result.data.concluidos || 0,
                    concluidos_hoje: result.data.concluidos_hoje || 0,
                    total: result.data.total || 0
                };
                
                console.log('✅ Stats processadas:', this.stats);
                this.updateStatsDisplay();
                console.log('📊 Estatísticas de retornos carregadas');
                
            } else {
                console.warn('⚠️ Resposta da API stats inválida:', result);
                
                // Usar dados padrão se a resposta for inválida
                this.stats = {
                    aguardando_chegada: 0,
                    pendentes: 0,
                    concluidos: 0,
                    concluidos_hoje: 0,
                    total: 0
                };
                
                this.updateStatsDisplay();
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas:', error);
            
            // SEMPRE garantir que stats existe com dados válidos
            this.stats = {
                aguardando_chegada: 0,
                pendentes: 0,
                concluidos: 0,
                concluidos_hoje: 0,
                total: 0
            };
            
            this.updateStatsDisplay();
            this.showAlert(`Erro ao carregar estatísticas: ${error.message}`, 'warning');
        }
    }
    
    // Atualizar display das estatísticas - VERSÃO CORRIGIDA
    updateStatsDisplay() {
        try {
            console.log('🔄 Atualizando display das estatísticas:', this.stats);
            
            // VALIDAÇÃO EXTRA - garantir que stats existe e tem as propriedades
            if (!this.stats || typeof this.stats !== 'object') {
                console.warn('⚠️ Stats inválidas recebidas:', this.stats);
                this.stats = {
                    aguardando_chegada: 0,
                    pendentes: 0,
                    concluidos: 0,
                    concluidos_hoje: 0,
                    total: 0
                };
            }
            
            // Mapeamento correto dos elementos do DOM
            const elements = {
                'aguardando-count': this.stats.aguardando_chegada || 0,
                'pendentes-count': this.stats.pendentes || 0,
                'conferido-count': this.stats.concluidos || 0,
                'conferido-hoje-count': this.stats.concluidos_hoje || 0,
                'total-retornos-count': this.stats.total || 0
            };
            
            // Atualizar elementos do DOM com segurança
            Object.entries(elements).forEach(([elementId, value]) => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.textContent = value;
                    console.log(`✅ ${elementId} = ${value}`);
                } else {
                    console.warn(`⚠️ Elemento ${elementId} não encontrado no DOM`);
                }
            });
            
            console.log('✅ Display das estatísticas atualizado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao atualizar display:', error);
        }
    }
    
    // Renderizar lista de retornos
    renderRetornos() {
        const container = document.getElementById('retornos-container');
        if (!container) {
            console.warn('⚠️ Container retornos-container não encontrado');
            return;
        }
        
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
                </div>
            `;
            return;
        }
        
        const html = this.retornos.map(retorno => this.renderRetornoItem(retorno)).join('');
        container.innerHTML = html;
    }
    
    // Renderizar item de retorno
    renderRetornoItem(retorno) {
        const statusClass = this.getStatusClass(retorno.status);
        const statusText = this.getStatusText(retorno.status);
        const timeAgo = this.timeAgo(retorno.created_at);
        
        // Contar itens já bipados
        let itensBipados = 0;
        try {
            const itens = retorno.itens_retornados ? JSON.parse(retorno.itens_retornados) : [];
            itensBipados = itens.length;
        } catch (e) {
            itensBipados = 0;
        }
        
        return `
            <div class="card mb-3 retorno-item ${statusClass}" data-id="${retorno.id}">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <h6 class="mb-1">
                                <i class="fas fa-user"></i> ${retorno.motorista_nome || retorno.driver_name || 'Motorista não informado'}
                            </h6>
                            <small class="text-muted">NF: ${retorno.numero_nf || 'Não informada'}</small>
                        </div>
                        <div class="col-md-2">
                            <i class="fas fa-calendar"></i> ${this.formatDate(retorno.data_retorno)}
                            <br>
                            <small class="text-muted">${retorno.horario_retorno || 'Sem horário'}</small>
                        </div>
                        <div class="col-md-2">
                            <span class="badge bg-${this.getStatusBadgeColor(retorno.status)}">
                                ${statusText}
                            </span>
                            <br>
                            <small class="text-muted">${timeAgo}</small>
                        </div>
                        <div class="col-md-2">
                            <i class="fas fa-boxes"></i> ${itensBipados} itens
                            <br>
                            <small class="text-muted">processados</small>
                        </div>
                        <div class="col-md-3 text-end">
                            ${this.renderRetornoActions(retorno)}
                        </div>
                    </div>
                    ${retorno.observacoes ? `
                        <div class="row mt-2">
                            <div class="col-12">
                                <small class="text-muted">
                                    <i class="fas fa-comment"></i> ${retorno.observacoes}
                                </small>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Renderizar ações com IDs específicos
    renderRetornoActions(retorno) {
        const actions = [];
        
        switch (retorno.status) {
            case 'aguardando_chegada':
                actions.push(`
                    <button class="btn btn-sm btn-primary me-1" 
                            onclick="window.RetornosDashboard.iniciarProcessamento(${retorno.id})"
                            data-retorno-id="${retorno.id}">
                        <i class="fas fa-play"></i> Iniciar
                    </button>
                    <button class="btn btn-sm btn-outline-danger" 
                            onclick="window.RetornosDashboard.cancelarRetorno(${retorno.id})"
                            data-retorno-id="${retorno.id}">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                `);
                break;
                
            case 'pendente':
                actions.push(`
                    <button class="btn btn-sm btn-success me-1" 
                            onclick="window.RetornosDashboard.finalizarRetorno(${retorno.id})"
                            data-retorno-id="${retorno.id}">
                        <i class="fas fa-check"></i> Finalizar
                    </button>
                    <button class="btn btn-sm btn-warning me-1" 
                            onclick="window.RetornosDashboard.editarRetorno(${retorno.id})"
                            data-retorno-id="${retorno.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                `);
                break;
                
            case 'concluido':
                actions.push(`
                    <div class="text-success">
                        <i class="fas fa-check-circle"></i> Concluído
                        <br>
                        <small class="text-muted">Processo finalizado</small>
                    </div>
                `);
                break;
                
            case 'cancelado':
                actions.push(`
                    <div class="text-danger">
                        <i class="fas fa-times-circle"></i> Cancelado
                        <br>
                        <small class="text-muted">Processo cancelado</small>
                    </div>
                `);
                break;
        }
        
        return actions.join('');
    }
    
    // Iniciar processamento do retorno
    async iniciarProcessamento(id) {
        try {
            console.log(`🔄 Iniciando processamento para retorno ${id}`);
            
            const response = await fetch(`${this.apiBaseUrl}/retornos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'pendente' })
            });
            
            if (response.ok) {
                this.showAlert('Processamento iniciado com sucesso!', 'success');
                await this.loadRetornos();
                await this.loadStats();
            } else {
                const result = await response.json();
                this.showAlert(`Erro ao iniciar processamento: ${result.message}`, 'danger');
            }
        } catch (error) {
            console.error('❌ Erro ao iniciar processamento:', error);
            this.showAlert('Erro de conexão. Verifique sua internet.', 'danger');
        }
    }
    
    // Finalizar retorno
    async finalizarRetorno(id) {
        if (!confirm('Finalizar este retorno? Esta ação não pode ser desfeita.')) {
            return;
        }
        
        try {
            console.log(`🔄 Finalizando retorno ${id}`);
            
            const response = await fetch(`${this.apiBaseUrl}/retornos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: 'concluido',
                    data_conclusao: new Date().toISOString()
                })
            });
            
            if (response.ok) {
                this.showAlert('Retorno finalizado com sucesso!', 'success');
                await this.loadRetornos();
                await this.loadStats();
            } else {
                const result = await response.json();
                this.showAlert(`Erro ao finalizar retorno: ${result.message}`, 'danger');
            }
        } catch (error) {
            console.error('❌ Erro ao finalizar retorno:', error);
            this.showAlert('Erro de conexão. Verifique sua internet.', 'danger');
        }
    }
    
    // Cancelar retorno
    async cancelarRetorno(id) {
        const motivo = prompt('Motivo do cancelamento:');
        if (!motivo) return;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/retornos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: 'cancelado', 
                    observacoes: motivo 
                })
            });
            
            if (response.ok) {
                this.showAlert('Retorno cancelado', 'warning');
                await this.loadRetornos();
                await this.loadStats();
            } else {
                const result = await response.json();
                this.showAlert(`Erro: ${result.message}`, 'danger');
            }
        } catch (error) {
            console.error('❌ Erro ao cancelar retorno:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    }
    
    // Editar retorno
    editarRetorno(id) {
        // TODO: Implementar modal de edição
        console.log(`📝 Editando retorno ${id}`);
        this.showAlert('Funcionalidade de edição em desenvolvimento', 'info');
    }
    
    // Bind eventos
    bindEvents() {
        // Botão atualizar
        const refreshBtn = document.getElementById('refresh-retornos');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('🔄 Botão atualizar clicado');
                this.loadRetornos();
                this.loadStats();
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
    }
    
    // Handle registrar retorno
    async handleRegistrarRetorno(event) {
        event.preventDefault();
        
        const numero_nf = document.getElementById('retorno-nf')?.value;
        const motorista_nome = document.getElementById('retorno-motorista')?.value;
        const data_retorno = document.getElementById('retorno-data')?.value;
        const horario_retorno = document.getElementById('retorno-horario')?.value;
        const observacoes = document.getElementById('retorno-observacoes')?.value;
        
        if (!numero_nf || !motorista_nome || !data_retorno) {
            this.showAlert('Preencha todos os campos obrigatórios', 'warning');
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
                    status: 'aguardando_chegada'
                })
            });
            
            if (response.ok) {
                this.showAlert('Retorno registrado com sucesso!', 'success');
                
                // Fechar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('registrarRetornoModal'));
                if (modal) modal.hide();
                
                // Reset form
                document.getElementById('registrar-retorno-form').reset();
                
                // Recarregar dados
                await this.loadRetornos();
                await this.loadStats();
            } else {
                const result = await response.json();
                this.showAlert(`Erro: ${result.message}`, 'danger');
            }
        } catch (error) {
            console.error('❌ Erro ao registrar retorno:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    }
    
    // Filtrar retornos por texto
    filterRetornos(searchTerm) {
        const items = document.querySelectorAll('.retorno-item');
        const term = searchTerm.toLowerCase();
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? 'block' : 'none';
        });
    }
    
    // Utilitários
    getStatusClass(status) {
        const classes = {
            'aguardando_chegada': 'status-aguardando',
            'pendente': 'status-pendente',
            'concluido': 'status-concluido',
            'cancelado': 'status-cancelado'
        };
        return classes[status] || '';
    }
    
    getStatusText(status) {
        const texts = {
            'aguardando_chegada': 'Aguardando Chegada',
            'pendente': 'Pendente',
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
            return `${days}d atrás`;
        } catch (e) {
            return 'Tempo inválido';
        }
    }
    
    // Mostrar alerta
    showAlert(message, type = 'info') {
        const container = document.getElementById('alert-container');
        if (!container) {
            console.log(`ALERT (${type}):`, message);
            return;
        }
        
        const alertId = 'alert-' + Date.now();
        const alert = document.createElement('div');
        alert.id = alertId;
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        container.appendChild(alert);
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                alertElement.remove();
            }
        }, 5000);
    }
}

// Criar instância global
window.RetornosDashboard = new RetornosDashboard();

// Funções globais para os botões funcionarem
window.iniciarProcessamento = (id) => window.RetornosDashboard.iniciarProcessamento(id);
window.finalizarRetorno = (id) => window.RetornosDashboard.finalizarRetorno(id);
window.cancelarRetorno = (id) => window.RetornosDashboard.cancelarRetorno(id);
window.editarRetorno = (id) => window.RetornosDashboard.editarRetorno(id);

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema de retornos (VERSÃO CORRIGIDA)...');
    window.RetornosDashboard.init();
});