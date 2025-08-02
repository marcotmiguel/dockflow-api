// js/modules/retornos-dashboard.js - Módulo de Retornos para Dashboard (SEM DADOS MOCK)
class RetornosDashboard {
    constructor() {
        this.retornos = [];
        this.stats = {};
        this.retornoAtual = null;
        
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
            bipando: 0,
            conferido: 0,
            conferido_hoje: 0,
            total_itens_retornados: 0
        };
        
        this.updateStatsDisplay();
        this.renderRetornos();
        
        // Mostrar mensagem de conexão
        this.showAlert('Conectando com servidor...', 'info');
    }
    
    // Carregar lista de retornos
    async loadRetornos() {
        try {
            const response = await fetch('/api/retornos');
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.retornos = result.data;
                    this.renderRetornos();
                    console.log(`📋 ${this.retornos.length} retornos carregados`);
                } else {
                    throw new Error(result.message);
                }
            } else {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
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
    
    // Carregar estatísticas
    async loadStats() {
        try {
            const response = await fetch('/api/retornos/stats');
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.stats = result.stats;
                    this.updateStatsDisplay();
                    console.log('📊 Estatísticas de retornos carregadas');
                } else {
                    throw new Error(result.message);
                }
            } else {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas:', error);
            this.showAlert(`Erro ao carregar estatísticas: ${error.message}`, 'warning');
        }
    }
    
    // Atualizar display das estatísticas
    updateStatsDisplay() {
        const elements = {
            'aguardando-count': this.stats.aguardando_chegada || 0,
            'bipando-count': this.stats.bipando || 0,
            'conferido-count': this.stats.conferido || 0,
            'total-itens-retornados': this.stats.total_itens_retornados || 0
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    // Renderizar lista de retornos
    renderRetornos() {
        const container = document.getElementById('retornos-container');
        if (!container) return;
        
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
                                <i class="fas fa-user"></i> ${retorno.driver_name}
                            </h6>
                            <small class="text-muted">CPF: ${this.formatCpf(retorno.driver_cpf)}</small>
                            <br>
                            <small class="text-muted">Placa: ${retorno.vehicle_plate}</small>
                        </div>
                        <div class="col-md-2">
                            ${retorno.route_code ? `
                                <i class="fas fa-route"></i> ${retorno.route_code}
                                <br>
                                <small class="text-muted">${retorno.route_description || 'Sem descrição'}</small>
                            ` : `
                                <small class="text-muted">Sem rota definida</small>
                            `}
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
                            <small class="text-muted">bipados</small>
                        </div>
                        <div class="col-md-3 text-end">
                            ${this.renderRetornoActions(retorno)}
                        </div>
                    </div>
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
                            onclick="window.RetornosDashboard.iniciarBipagem(${retorno.id})"
                            data-retorno-id="${retorno.id}">
                        <i class="fas fa-barcode"></i> Iniciar Bipagem
                    </button>
                    <button class="btn btn-sm btn-outline-danger" 
                            onclick="window.RetornosDashboard.cancelarRetorno(${retorno.id})"
                            data-retorno-id="${retorno.id}">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                `);
                break;
                
            case 'bipando':
                actions.push(`
                    <button class="btn btn-sm btn-success me-1" 
                            onclick="window.RetornosDashboard.abrirBipagem(${retorno.id})"
                            data-retorno-id="${retorno.id}">
                        <i class="fas fa-barcode"></i> Continuar Bipagem
                    </button>
                    <button class="btn btn-sm btn-warning me-1" 
                            onclick="window.RetornosDashboard.finalizarConferencia(${retorno.id})"
                            data-retorno-id="${retorno.id}">
                        <i class="fas fa-check"></i> Finalizar
                    </button>
                `);
                break;
                
            case 'conferido':
                actions.push(`
                    <div class="text-success">
                        <i class="fas fa-check-circle"></i> Conferido
                        <br>
                        <small class="text-muted">Processo concluído</small>
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
    
    // Iniciar bipagem
    async iniciarBipagem(id) {
        try {
            console.log(`🔄 Iniciando bipagem para retorno ${id}`);
            
            const response = await fetch(`/api/retornos/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'bipando' })
            });
            
            if (response.ok) {
                this.showAlert('Bipagem iniciada com sucesso!', 'success');
                await this.loadRetornos();
                await this.loadStats();
                this.abrirBipagem(id);
            } else {
                const result = await response.json();
                this.showAlert(`Erro ao iniciar bipagem: ${result.message}`, 'danger');
            }
        } catch (error) {
            console.error('❌ Erro ao iniciar bipagem:', error);
            this.showAlert('Erro de conexão. Verifique sua internet.', 'danger');
        }
    }
    
    // Abrir modal de bipagem com controle melhorado
    async abrirBipagem(id) {
        console.log(`🔧 Abrindo bipagem para retorno ID: ${id}`);
        
        // Limpar estado anterior e definir novo ID
        this.retornoAtual = null;
        await new Promise(resolve => setTimeout(resolve, 100));
        this.retornoAtual = id;
        
        console.log(`✅ Retorno atual definido: ${this.retornoAtual}`);
        
        await this.loadItensBipados(id);
        
        const modal = new bootstrap.Modal(document.getElementById('bipagemModal'));
        modal.show();
        
        // Focar no campo código de barras
        setTimeout(() => {
            const input = document.getElementById('codigo-barras');
            if (input) {
                input.focus();
                input.value = '';
            }
        }, 500);
    }
    
    // Carregar itens já bipados
    async loadItensBipados(id) {
        try {
            console.log(`📋 Carregando itens bipados do retorno ${id}`);
            
            const response = await fetch(`/api/retornos/${id}/itens`);
            
            if (response.ok) {
                const result = await response.json();
                console.log(`📦 Resultado loadItensBipados:`, result);
                
                if (result.success) {
                    console.log(`✅ ${result.data.length} itens encontrados`);
                    this.renderItensBipados(result.data);
                } else {
                    console.error('❌ Erro na resposta:', result.message);
                    this.renderItensBipados([]);
                }
            } else {
                console.error('❌ Erro na requisição:', response.status);
                this.renderItensBipados([]);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar itens:', error);
            this.renderItensBipados([]);
        }
    }
    
    // Renderizar itens bipados
    renderItensBipados(itens) {
        console.log(`🎨 Renderizando ${itens.length} itens bipados:`, itens);
        
        const container = document.getElementById('itens-bipados-list');
        if (!container) {
            console.error('❌ Container itens-bipados-list não encontrado');
            return;
        }
        
        if (itens.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="fas fa-barcode fa-2x mb-2"></i>
                    <p>Nenhum item bipado ainda</p>
                    <small>Use o scanner ou digite o código de barras</small>
                </div>
            `;
            
            const counter = document.getElementById('total-itens-bipados');
            if (counter) {
                counter.textContent = '0 itens';
            }
            return;
        }
        
        const html = itens.map((item, index) => `
            <div class="card mb-2">
                <div class="card-body py-2">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <strong>${item.codigo_barras}</strong>
                        </div>
                        <div class="col-md-4">
                            ${item.produto_nome}
                        </div>
                        <div class="col-md-2">
                            Qtd: ${item.quantidade}
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">
                                ${this.formatDateTime(item.bipado_em)}
                            </small>
                        </div>
                        <div class="col-md-1">
                            <button class="btn btn-sm btn-outline-danger" 
                                    onclick="window.RetornosDashboard.removerItem(${index})"
                                    title="Remover item">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        console.log(`✅ HTML gerado para ${itens.length} itens`);
        container.innerHTML = html;
        
        const counter = document.getElementById('total-itens-bipados');
        if (counter) {
            counter.textContent = `${itens.length} itens`;
            console.log(`📊 Contador atualizado: ${itens.length} itens`);
        }
    }
    
    // Finalizar conferência com limpeza completa
    async finalizarConferencia(id = null) {
        const retornoId = id || this.retornoAtual;
        
        console.log(`🔧 Finalizando conferência para ID: ${retornoId}`);
        
        if (!retornoId) {
            this.showAlert('Erro: ID do retorno não encontrado', 'danger');
            return;
        }
        
        if (!confirm(`Finalizar conferência do retorno ID ${retornoId}?\nTodos os itens bipados serão considerados conferidos.`)) {
            return;
        }
        
        try {
            console.log(`📝 Enviando requisição para finalizar retorno ${retornoId}`);
            
            const response = await fetch(`/api/retornos/${retornoId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: 'conferido',
                    finalizado_em: new Date().toISOString(),
                    finalizado_por: 'Sistema'
                })
            });
            
            const result = await response.json();
            console.log(`📋 Resposta da API:`, result);
            
            if (response.ok) {
                console.log(`✅ Conferência finalizada com sucesso para retorno ${retornoId}`);
                this.showAlert('Conferência finalizada com sucesso!', 'success');
                
                // Limpar estado completamente
                if (this.retornoAtual === retornoId) {
                    console.log(`🧹 Limpando retorno atual (era ${this.retornoAtual})`);
                    this.retornoAtual = null;
                }
                
                // Recarregar dados
                setTimeout(async () => {
                    await this.loadRetornos();
                    await this.loadStats();
                    console.log(`🔄 Dados recarregados após finalização`);
                }, 500);
                
                // Fechar modal se estiver aberto
                const modal = bootstrap.Modal.getInstance(document.getElementById('bipagemModal'));
                if (modal) {
                    console.log(`🚪 Fechando modal de bipagem`);
                    modal.hide();
                }
                
            } else {
                console.error(`❌ Erro na API:`, result);
                this.showAlert(`Erro: ${result.message || 'Erro desconhecido'}`, 'danger');
            }
        } catch (error) {
            console.error('❌ Erro ao finalizar conferência:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    }
    
    // Cancelar retorno
    async cancelarRetorno(id) {
        const motivo = prompt('Motivo do cancelamento:');
        if (!motivo) return;
        
        try {
            const response = await fetch(`/api/retornos/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelado', notes: motivo })
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
    
    // Remover item bipado
    async removerItem(index) {
        if (!confirm('Tem certeza que deseja remover este item?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/retornos/${this.retornoAtual}/itens/${index}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showAlert('Item removido!', 'success');
                await this.loadItensBipados(this.retornoAtual);
            } else {
                const result = await response.json();
                this.showAlert(`Erro: ${result.message}`, 'danger');
            }
        } catch (error) {
            console.error('❌ Erro ao remover item:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    }
    
    // Função para limpar estado
    limparEstado() {
        console.log('🧹 Limpando estado do sistema...');
        this.retornoAtual = null;
        
        const campos = ['codigo-barras', 'produto-nome', 'quantidade'];
        campos.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) {
                campo.value = id === 'quantidade' ? '1' : '';
            }
        });
        
        console.log('✅ Estado limpo');
    }
    
    // Bind eventos
    bindEvents() {
        // Botão atualizar
        const refreshBtn = document.getElementById('refresh-retornos');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
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
        
        // Campo de código de barras
        const codigoBarras = document.getElementById('codigo-barras');
        if (codigoBarras) {
            codigoBarras.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.biparItem();
                }
            });
        }
        
        // Botão bipar
        const biparBtn = document.getElementById('bipar-item-btn');
        if (biparBtn) {
            biparBtn.addEventListener('click', () => {
                this.biparItem();
            });
        }
        
        // Form registrar retorno
        const form = document.getElementById('registrar-retorno-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                this.handleRegistrarRetorno(e);
            });
        }
        
        // Limpar estado quando modal for fechado
        const bipagemModal = document.getElementById('bipagemModal');
        if (bipagemModal) {
            bipagemModal.addEventListener('hidden.bs.modal', () => {
                console.log('🚪 Modal fechado - limpando estado');
                this.limparEstado();
            });
        }
    }
    
    // Bipar item
    async biparItem() {
        const codigoBarrasInput = document.getElementById('codigo-barras');
        const produtoNomeInput = document.getElementById('produto-nome');
        const quantidadeInput = document.getElementById('quantidade');
        
        if (!codigoBarrasInput || !produtoNomeInput || !quantidadeInput) {
            this.showAlert('Erro: Campos do modal não encontrados', 'danger');
            return;
        }
        
        const codigoBarras = codigoBarrasInput.value.trim();
        const produtoNome = produtoNomeInput.value.trim();
        const quantidade = quantidadeInput.value || 1;
        
        console.log('🔍 Debug biparItem:');
        console.log('   Código:', codigoBarras);
        console.log('   Produto:', produtoNome);
        console.log('   Quantidade:', quantidade);
        console.log('   Retorno atual:', this.retornoAtual);
        
        if (!codigoBarras) {
            this.showAlert('Digite o código de barras', 'warning');
            codigoBarrasInput.focus();
            return;
        }
        
        if (!this.retornoAtual) {
            this.showAlert('Erro: Nenhum retorno selecionado para bipagem', 'danger');
            console.error('❌ ERRO: retornoAtual é null');
            return;
        }
        
        try {
            console.log(`📦 Bipando item ${codigoBarras} no retorno ${this.retornoAtual}`);
            
            const requestBody = {
                codigo_barras: codigoBarras,
                produto_nome: produtoNome || 'Produto sem nome',
                quantidade: parseInt(quantidade),
                bipado_em: new Date().toISOString(),
                retorno_id: this.retornoAtual
            };
            
            console.log('📋 Dados enviados:', requestBody);
            
            const response = await fetch(`/api/retornos/${this.retornoAtual}/bipar-item`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            const result = await response.json();
            console.log('📋 Resposta da bipagem:', result);
            
            if (response.ok) {
                console.log('✅ Item bipado com sucesso:', result);
                this.showAlert(`Item ${codigoBarras} bipado com sucesso!`, 'success');
                
                // Limpar campos
                codigoBarrasInput.value = '';
                produtoNomeInput.value = '';
                quantidadeInput.value = '1';
                
                // Recarregar APENAS o retorno atual
                console.log(`🔄 Recarregando itens do retorno ${this.retornoAtual}`);
                await this.loadItensBipados(this.retornoAtual);
                
                // Focar novamente no código de barras
                setTimeout(() => {
                    codigoBarrasInput.focus();
                }, 100);
                
            } else {
                console.error('❌ Erro ao bipar:', result);
                this.showAlert(`Erro: ${result.message || 'Erro desconhecido'}`, 'danger');
            }
        } catch (error) {
            console.error('❌ Erro ao bipar item:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    }
    
    // Handle registrar retorno
    async handleRegistrarRetorno(event) {
        event.preventDefault();
        
        const cpf = document.getElementById('retorno-cpf')?.value;
        const nome = document.getElementById('retorno-nome')?.value;
        const placa = document.getElementById('retorno-placa')?.value;
        const telefone = document.getElementById('retorno-telefone')?.value;
        
        if (!cpf || !nome || !placa) {
            this.showAlert('Preencha todos os campos obrigatórios', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/retornos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    driver_cpf: cpf,
                    driver_name: nome,
                    vehicle_plate: placa,
                    phone_number: telefone
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
            'bipando': 'status-bipando',
            'conferido': 'status-conferido',
            'cancelado': 'status-cancelado'
        };
        return classes[status] || '';
    }
    
    getStatusText(status) {
        const texts = {
            'aguardando_chegada': 'Aguardando Chegada',
            'bipando': 'Bipando',
            'conferido': 'Conferido',
            'cancelado': 'Cancelado'
        };
        return texts[status] || status;
    }
    
    getStatusBadgeColor(status) {
        const colors = {
            'aguardando_chegada': 'warning',
            'bipando': 'primary',
            'conferido': 'success',
            'cancelado': 'danger'
        };
        return colors[status] || 'secondary';
    }
    
    formatCpf(cpf) {
        if (!cpf) return '';
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    
    formatDateTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleString('pt-BR');
    }
    
    timeAgo(timestamp) {
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
window.iniciarBipagem = (id) => window.RetornosDashboard.iniciarBipagem(id);
window.continuarBipagem = (id) => window.RetornosDashboard.abrirBipagem(id);
window.finalizarConferencia = (id) => window.RetornosDashboard.finalizarConferencia(id);
window.cancelarRetorno = (id) => window.RetornosDashboard.cancelarRetorno(id);
window.removerItem = (index) => window.RetornosDashboard.removerItem(index);

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema de retornos (VERSÃO LIMPA)...');
    window.RetornosDashboard.init();
});