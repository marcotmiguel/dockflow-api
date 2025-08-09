// Módulo de Retornos de Carga
const Retornos = {
    retornos: [],
    stats: {},
    retornoAtual: null,
    
    // Inicializar módulo
    init() {
        this.bindEvents();
        this.loadRetornos();
        this.loadStats();
        
        // Atualizar a cada 30 segundos
        setInterval(() => {
            this.loadRetornos();
            this.loadStats();
        }, 30000);
    },
    
    // Eventos da interface
    bindEvents() {
        // Botão atualizar
        document.getElementById('refresh-retornos')?.addEventListener('click', () => {
            this.loadRetornos();
            this.loadStats();
        });
        
        // Botão registrar retorno manual
        document.getElementById('registrar-retorno-btn')?.addEventListener('click', () => {
            this.showRegistrarRetornoModal();
        });
        
        // Form registrar retorno
        document.getElementById('registrar-retorno-form')?.addEventListener('submit', (e) => {
            this.handleRegistrarRetorno(e);
        });
        
        // Busca
        document.getElementById('search-retornos')?.addEventListener('input', (e) => {
            this.filterRetornos(e.target.value);
        });
        
        // Campo de busca de código de barras na bipagem
        document.getElementById('codigo-barras')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.biparItem();
            }
        });
        
        // Botão bipar
        document.getElementById('bipar-item-btn')?.addEventListener('click', () => {
            this.biparItem();
        });
        
        // Filtros
        document.getElementById('filtro-status')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('filtro-data-inicio')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('filtro-data-fim')?.addEventListener('change', () => {
            this.applyFilters();
        });
    },
    
    // Carregar lista de retornos
    async loadRetornos() {
        try {
            const response = await fetch('/api/retornos');
            const result = await response.json();
            
            if (result.success) {
                this.retornos = result.data;
                this.renderRetornos();
            } else {
                this.showAlert('Erro ao carregar retornos: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('Erro ao carregar retornos:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    },
    
    // Carregar estatísticas
    async loadStats() {
        try {
            const response = await fetch('/api/retornos/stats');
            const result = await response.json();
            
            if (result.success) {
                this.stats = result.stats;
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    },
    
    // Renderizar lista de retornos
    renderRetornos() {
        let container = document.getElementById('retornos-container');

// Se não existir, cria dinamicamente
if (!container) {
    const card = document.createElement('section');
    card.className = 'card';
    card.id = 'retornos-card';

    const h3 = document.createElement('h3');
    h3.textContent = 'Retornos';
    card.appendChild(h3);

    container = document.createElement('div');
    container.id = 'retornos-container';
    card.appendChild(container);

    (document.getElementById('content-container') ||
     document.getElementById('dashboard-cards') ||
     document.body).appendChild(card);

    console.info('🧩 [renderRetornos] Criado dinamicamente #retornos-container');
}

// Se não há retornos, mostra mensagem padrão
if (this.retornos.length === 0) {
    container.innerHTML = `
        <div class="text-center text-muted py-4">
            <i class="fas fa-undo fa-3x mb-3"></i>
            <p>Nenhum retorno de carga registrado</p>
        </div>
    `;
    return;
}

        
        const html = this.retornos.map(retorno => this.renderRetornoItem(retorno)).join('');
        container.innerHTML = html;
        
        // Bind eventos dos botões
        this.bindRetornoItemEvents();
    },
    
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
                                <small class="text-muted">Sem rota</small>
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
                    
                    ${retorno.notes ? `
                        <div class="row mt-2">
                            <div class="col-12">
                                <small class="text-muted">
                                    <i class="fas fa-comment"></i> ${retorno.notes}
                                </small>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },
    
    // Renderizar ações baseadas no status
    renderRetornoActions(retorno) {
        const actions = [];
        
        switch (retorno.status) {
            case 'aguardando_chegada':
                actions.push(`
                    <button class="btn btn-sm btn-primary me-1" onclick="Retornos.iniciarBipagem(${retorno.id})">
                        <i class="fas fa-barcode"></i> Iniciar Bipagem
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="Retornos.cancelarRetorno(${retorno.id})">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                `);
                break;
                
            case 'bipando':
                actions.push(`
                    <button class="btn btn-sm btn-success me-1" onclick="Retornos.abrirBipagem(${retorno.id})">
                        <i class="fas fa-barcode"></i> Continuar Bipagem
                    </button>
                    <button class="btn btn-sm btn-warning me-1" onclick="Retornos.finalizarConferencia(${retorno.id})">
                        <i class="fas fa-check"></i> Finalizar Conferência
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="Retornos.pausarBipagem(${retorno.id})">
                        <i class="fas fa-pause"></i> Pausar
                    </button>
                `);
                break;
                
            case 'conferido':
                actions.push(`
                    <button class="btn btn-sm btn-info me-1" onclick="Retornos.verRelatorio(${retorno.id})">
                        <i class="fas fa-file-alt"></i> Ver Relatório
                    </button>
                    <small class="text-success">
                        <i class="fas fa-check-circle"></i> Conferido
                    </small>
                `);
                break;
                
            case 'cancelado':
                actions.push(`
                    <small class="text-danger">
                        <i class="fas fa-times-circle"></i> Cancelado
                    </small>
                `);
                break;
        }
        
        return actions.join('');
    },
    
    // Atualizar display das estatísticas
    updateStatsDisplay() {
        document.getElementById('aguardando-count').textContent = this.stats.aguardando_chegada || 0;
        document.getElementById('bipando-count').textContent = this.stats.bipando || 0;
        document.getElementById('conferido-count').textContent = this.stats.conferido || 0;
        document.getElementById('conferido-hoje-count').textContent = this.stats.conferido_hoje || 0;
        document.getElementById('total-itens-retornados').textContent = this.stats.total_itens_retornados || 0;
    },
    
    // Iniciar bipagem
    async iniciarBipagem(id) {
        try {
            const response = await fetch(`/api/retornos/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'bipando' })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('Bipagem iniciada!', 'success');
                this.loadRetornos();
                this.abrirBipagem(id);
            } else {
                this.showAlert('Erro: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('Erro ao iniciar bipagem:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    },
    
    // Abrir modal de bipagem
    async abrirBipagem(id) {
        this.retornoAtual = id;
        await this.loadItensBipados(id);
        
        const modal = new bootstrap.Modal(document.getElementById('bipagemModal'));
        modal.show();
        
        // Focar no campo código de barras
        setTimeout(() => {
            document.getElementById('codigo-barras')?.focus();
        }, 500);
    },
    
    // Carregar itens já bipados
    async loadItensBipados(id) {
        try {
            const response = await fetch(`/api/retornos/${id}/itens`);
            const result = await response.json();
            
            if (result.success) {
                this.renderItensBipados(result.data);
            }
        } catch (error) {
            console.error('Erro ao carregar itens:', error);
        }
    },
    
    // Renderizar itens bipados
    renderItensBipados(itens) {
        const container = document.getElementById('itens-bipados-list');
        if (!container) return;
        
        if (itens.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="fas fa-barcode fa-2x mb-2"></i>
                    <p>Nenhum item bipado ainda</p>
                    <small>Use o scanner ou digite o código de barras</small>
                </div>
            `;
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
                                    onclick="Retornos.removerItem(${index})"
                                    title="Remover item">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
        
        // Atualizar contador
        document.getElementById('total-itens-bipados').textContent = itens.length;
    },
    
    // Bipar item
    async biparItem() {
        const codigoBarras = document.getElementById('codigo-barras').value.trim();
        const produtoNome = document.getElementById('produto-nome').value.trim();
        const quantidade = document.getElementById('quantidade').value || 1;
        
        if (!codigoBarras) {
            this.showAlert('Digite o código de barras', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`/api/retornos/${this.retornoAtual}/bipar-item`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    codigo_barras: codigoBarras,
                    produto_nome: produtoNome || 'Produto sem nome',
                    quantidade: parseInt(quantidade)
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('Item bipado com sucesso!', 'success');
                
                // Limpar campos
                document.getElementById('codigo-barras').value = '';
                document.getElementById('produto-nome').value = '';
                document.getElementById('quantidade').value = '1';
                
                // Recarregar lista
                await this.loadItensBipados(this.retornoAtual);
                
                // Focar novamente no código de barras
                document.getElementById('codigo-barras').focus();
                
                // Som de sucesso (opcional)
                this.playSuccessSound();
                
            } else {
                this.showAlert('Erro: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('Erro ao bipar item:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    },
    
    // Remover item bipado
    async removerItem(index) {
        if (!confirm('Tem certeza que deseja remover este item?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/retornos/${this.retornoAtual}/itens/${index}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('Item removido!', 'success');
                await this.loadItensBipados(this.retornoAtual);
            } else {
                this.showAlert('Erro: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('Erro ao remover item:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    },
    
    // Finalizar conferência
    async finalizarConferencia(id) {
        if (!confirm('Finalizar conferência? Todos os itens bipados serão considerados conferidos.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/retornos/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'conferido' })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('Conferência finalizada com sucesso!', 'success');
                this.loadRetornos();
                this.loadStats();
                
                // Fechar modal se estiver aberto
                const modal = bootstrap.Modal.getInstance(document.getElementById('bipagemModal'));
                if (modal) {
                    modal.hide();
                }
            } else {
                this.showAlert('Erro: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('Erro ao finalizar conferência:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    },
    
    // Pausar bipagem
    async pausarBipagem(id) {
        try {
            const response = await fetch(`/api/retornos/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'aguardando_chegada' })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('Bipagem pausada', 'info');
                this.loadRetornos();
            } else {
                this.showAlert('Erro: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('Erro ao pausar bipagem:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    },
    
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
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('Retorno cancelado', 'warning');
                this.loadRetornos();
            } else {
                this.showAlert('Erro: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('Erro ao cancelar retorno:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    },
    
    // Modal registrar retorno manual
    showRegistrarRetornoModal() {
        const modal = new bootstrap.Modal(document.getElementById('registrarRetornoModal'));
        modal.show();
    },
    
    // Handle registrar retorno
    async handleRegistrarRetorno(event) {
        event.preventDefault();
        
        const cpf = document.getElementById('retorno-cpf').value;
        const nome = document.getElementById('retorno-nome').value;
        const placa = document.getElementById('retorno-placa').value;
        const telefone = document.getElementById('retorno-telefone').value;
        
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
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('Retorno registrado com sucesso!', 'success');
                bootstrap.Modal.getInstance(document.getElementById('registrarRetornoModal')).hide();
                document.getElementById('registrar-retorno-form').reset();
                this.loadRetornos();
                this.loadStats();
            } else {
                this.showAlert('Erro: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('Erro ao registrar retorno:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    },
    
    // Ver relatório de conferência
    verRelatorio(id) {
        // Implementar visualização de relatório
        this.showAlert('Funcionalidade em desenvolvimento', 'info');
    },
    
    // Aplicar filtros
    applyFilters() {
        const status = document.getElementById('filtro-status')?.value;
        const dataInicio = document.getElementById('filtro-data-inicio')?.value;
        const dataFim = document.getElementById('filtro-data-fim')?.value;
        
        // Recarregar com filtros
        this.loadRetornosWithFilters({ status, data_inicio: dataInicio, data_fim: dataFim });
    },
    
    // Carregar retornos com filtros
    async loadRetornosWithFilters(filters) {
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            
            const response = await fetch(`/api/retornos?${params.toString()}`);
            const result = await response.json();
            
            if (result.success) {
                this.retornos = result.data;
                this.renderRetornos();
            }
        } catch (error) {
            console.error('Erro ao aplicar filtros:', error);
        }
    },
    
    // Filtrar retornos por texto
    filterRetornos(searchTerm) {
        const items = document.querySelectorAll('.retorno-item');
        const term = searchTerm.toLowerCase();
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? 'block' : 'none';
        });
    },
    
    // Bind eventos dos itens
    bindRetornoItemEvents() {
        // Eventos já são bindados via onclick nos botões
    },
    
    // Som de sucesso
    playSuccessSound() {
        // Criar um beep simples
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    },
    
    // Utilitários
    getStatusClass(status) {
        const classes = {
            'aguardando_chegada': 'status-aguardando',
            'bipando': 'status-bipando',
            'conferido': 'status-conferido',
            'cancelado': 'status-cancelado'
        };
        return classes[status] || '';
    },
    
    getStatusText(status) {
        const texts = {
            'aguardando_chegada': 'Aguardando Chegada',
            'bipando': 'Bipando',
            'conferido': 'Conferido',
            'cancelado': 'Cancelado'
        };
        return texts[status] || status;
    },
    
    getStatusBadgeColor(status) {
        const colors = {
            'aguardando_chegada': 'warning',
            'bipando': 'primary',
            'conferido': 'success',
            'cancelado': 'danger'
        };
        return colors[status] || 'secondary';
    },
    
    formatCpf(cpf) {
        if (!cpf) return '';
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    },
    
    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('pt-BR');
    },
    
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
    },
    
    // Mostrar alerta
    showAlert(message, type = 'info') {
        const container = document.getElementById('alert-container');
        if (!container) return;
        
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
                bootstrap.Alert.getOrCreateInstance(alertElement).close();
            }
        }, 5000);
    }
};

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.content-page[data-module="retornos"]')) {
        Retornos.init();
    }
});