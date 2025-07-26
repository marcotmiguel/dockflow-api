// Módulo de Carregamentos
const Loadings = {
    queue: [],
    stats: {},
    
    // Inicializar módulo
    init() {
        this.bindEvents();
        this.loadQueue();
        this.loadStats();
        this.loadRoutes();
        
        // Atualizar a cada 30 segundos
        setInterval(() => {
            this.loadQueue();
            this.loadStats();
        }, 30000);
    },
    
    // Eventos da interface
    bindEvents() {
        // Botão atualizar
        document.getElementById('refresh-queue')?.addEventListener('click', () => {
            this.loadQueue();
            this.loadStats();
        });
        
        // Botão nova rota
        document.getElementById('create-route-btn')?.addEventListener('click', () => {
            this.showCreateRouteModal();
        });
        
        // Botão importar XML
        document.getElementById('import-xml-btn')?.addEventListener('click', () => {
            this.showImportXmlModal();
        });
        
        // Form criar rota
        document.getElementById('create-route-form')?.addEventListener('submit', (e) => {
            this.handleCreateRoute(e);
        });
        
        // Form importar XML
        document.getElementById('import-xml-form')?.addEventListener('submit', (e) => {
            this.handleImportXml(e);
        });
        
        // Busca
        document.getElementById('search-queue')?.addEventListener('input', (e) => {
            this.filterQueue(e.target.value);
        });
        
        // Preview do XML
        document.getElementById('xml-file')?.addEventListener('change', (e) => {
            this.previewXml(e.target.files[0]);
        });
    },
    
    // Carregar fila de carregamento
    async loadQueue() {
        try {
            const response = await fetch('/api/carregamentos/queue');
            const result = await response.json();
            
            if (result.success) {
                this.queue = result.data;
                this.renderQueue();
                this.updateQueueStats();
            } else {
                this.showAlert('Erro ao carregar fila: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('Erro ao carregar fila:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    },
    
    // Carregar estatísticas
    async loadStats() {
        try {
            const response = await fetch('/api/carregamentos/stats');
            const result = await response.json();
            
            if (result.success) {
                this.stats = result.stats;
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    },
    
    // Carregar rotas para o select
    async loadRoutes() {
        try {
            const response = await fetch('/api/routes');
            const result = await response.json();
            
            if (result.success) {
                const select = document.getElementById('route-select');
                if (select) {
                    select.innerHTML = '<option value="">Selecione uma rota...</option>';
                    result.data.forEach(route => {
                        const option = document.createElement('option');
                        option.value = route.id;
                        option.textContent = `${route.code} - ${route.description || 'Sem descrição'}`;
                        select.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao carregar rotas:', error);
        }
    },
    
    // Renderizar fila
    renderQueue() {
        const container = document.getElementById('queue-container');
        if (!container) return;
        
        if (this.queue.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-inbox fa-3x mb-3"></i>
                    <p>Nenhum item na fila de carregamento</p>
                </div>
            `;
            return;
        }
        
        const html = this.queue.map(item => this.renderQueueItem(item)).join('');
        container.innerHTML = html;
        
        // Bind eventos dos botões
        this.bindQueueItemEvents();
    },
    
    // Renderizar item da fila
    renderQueueItem(item) {
        const statusClass = this.getStatusClass(item.status);
        const statusText = this.getStatusText(item.status);
        const timeAgo = this.timeAgo(item.created_at);
        
        return `
            <div class="card mb-3 queue-item ${statusClass}" data-id="${item.id}">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <h6 class="mb-1">
                                <i class="fas fa-user"></i> ${item.driver_name}
                            </h6>
                            <small class="text-muted">CPF: ${this.formatCpf(item.driver_cpf)}</small>
                        </div>
                        <div class="col-md-2">
                            <strong>${item.vehicle_plate}</strong>
                            <br>
                            <small class="text-muted">${item.vehicle_type}</small>
                        </div>
                        <div class="col-md-2">
                            <i class="fas fa-route"></i> ${item.route_code}
                            <br>
                            <small class="text-muted">${item.route_description || 'Sem descrição'}</small>
                        </div>
                        <div class="col-md-2">
                            <span class="badge bg-${this.getStatusBadgeColor(item.status)}">
                                ${statusText}
                            </span>
                            <br>
                            <small class="text-muted">${timeAgo}</small>
                        </div>
                        <div class="col-md-3 text-end">
                            ${this.renderQueueActions(item)}
                        </div>
                    </div>
                    
                    ${item.notes ? `
                        <div class="row mt-2">
                            <div class="col-12">
                                <small class="text-muted">
                                    <i class="fas fa-comment"></i> ${item.notes}
                                </small>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },
    
    // Renderizar ações baseadas no status
    renderQueueActions(item) {
        const actions = [];
        
        switch (item.status) {
            case 'waiting':
                actions.push(`
                    <button class="btn btn-sm btn-success me-1" onclick="Loadings.updateQueueStatus(${item.id}, 'approved')">
                        <i class="fas fa-check"></i> Aprovar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="Loadings.updateQueueStatus(${item.id}, 'cancelled')">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                `);
                break;
                
            case 'approved':
                actions.push(`
                    <button class="btn btn-sm btn-primary me-1" onclick="Loadings.updateQueueStatus(${item.id}, 'loading')">
                        <i class="fas fa-truck-loading"></i> Iniciar Carregamento
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="Loadings.updateQueueStatus(${item.id}, 'waiting')">
                        <i class="fas fa-undo"></i> Voltar
                    </button>
                `);
                break;
                
            case 'loading':
                actions.push(`
                    <button class="btn btn-sm btn-success me-1" onclick="Loadings.updateQueueStatus(${item.id}, 'completed')">
                        <i class="fas fa-check-circle"></i> Finalizar
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="Loadings.updateQueueStatus(${item.id}, 'approved')">
                        <i class="fas fa-pause"></i> Pausar
                    </button>
                `);
                break;
                
            case 'completed':
            case 'cancelled':
                actions.push(`
                    <small class="text-muted">
                        <i class="fas fa-check"></i> Finalizado
                    </small>
                `);
                break;
        }
        
        return actions.join('');
    },
    
    // Atualizar status na fila
    async updateQueueStatus(id, status) {
        try {
            const notes = status === 'cancelled' ? prompt('Motivo do cancelamento (opcional):') : null;
            
            const response = await fetch(`/api/carregamentos/queue/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, notes })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert(result.message, 'success');
                this.loadQueue();
                this.loadStats();
            } else {
                this.showAlert('Erro: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    },
    
    // Bind eventos dos itens da fila
    bindQueueItemEvents() {
        // Eventos já são bindados via onclick nos botões
        // Aqui podemos adicionar outros eventos se necessário
    },
    
    // Filtrar fila
    filterQueue(searchTerm) {
        const items = document.querySelectorAll('.queue-item');
        const term = searchTerm.toLowerCase();
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? 'block' : 'none';
        });
    },
    
    // Atualizar estatísticas da fila
    updateQueueStats() {
        const waiting = this.queue.filter(item => item.status === 'waiting').length;
        const approved = this.queue.filter(item => item.status === 'approved').length;
        const loading = this.queue.filter(item => item.status === 'loading').length;
        const completed = this.queue.filter(item => 
            item.status === 'completed' && 
            new Date(item.completed_at).toDateString() === new Date().toDateString()
        ).length;
        
        document.getElementById('waiting-count').textContent = waiting;
        document.getElementById('approved-count').textContent = approved;
        document.getElementById('loading-count').textContent = loading;
        document.getElementById('completed-today').textContent = completed;
        document.getElementById('total-queue').textContent = this.queue.length;
    },
    
    // Atualizar display das estatísticas gerais
    updateStatsDisplay() {
        if (this.stats.volumes_em_armazem !== undefined) {
            // Aqui você pode adicionar mais elementos de estatísticas se necessário
            console.log('Volumes em armazém:', this.stats.volumes_em_armazem);
        }
    },
    
    // Modal criar rota
    showCreateRouteModal() {
        const modal = new bootstrap.Modal(document.getElementById('createRouteModal'));
        modal.show();
    },
    
    // Modal importar XML
    showImportXmlModal() {
        const modal = new bootstrap.Modal(document.getElementById('importXmlModal'));
        modal.show();
    },
    
    // Handle criar rota
    async handleCreateRoute(event) {
        event.preventDefault();
        
        const code = document.getElementById('route-code').value;
        const description = document.getElementById('route-description').value;
        
        try {
            const response = await fetch('/api/routes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, description })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('Rota criada com sucesso!', 'success');
                bootstrap.Modal.getInstance(document.getElementById('createRouteModal')).hide();
                document.getElementById('create-route-form').reset();
                this.loadRoutes(); // Recarregar rotas
            } else {
                this.showAlert('Erro: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('Erro ao criar rota:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    },
    
    // Handle importar XML
    async handleImportXml(event) {
        event.preventDefault();
        
        const routeId = document.getElementById('route-select').value;
        const fileInput = document.getElementById('xml-file');
        
        if (!routeId || !fileInput.files[0]) {
            this.showAlert('Selecione uma rota e um arquivo XML', 'warning');
            return;
        }
        
        // Simular processamento do XML
        const xmlData = {
            numero: 'NF' + Date.now(),
            destinatario: 'Cliente XML',
            volumes: 1,
            produto: 'Produto do XML'
        };
        
        try {
            const response = await fetch('/api/carregamentos/import-xml', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ xmlData, routeId })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('XML importado com sucesso!', 'success');
                bootstrap.Modal.getInstance(document.getElementById('importXmlModal')).hide();
                document.getElementById('import-xml-form').reset();
                document.getElementById('xml-preview').style.display = 'none';
            } else {
                this.showAlert('Erro: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('Erro ao importar XML:', error);
            this.showAlert('Erro de conexão', 'danger');
        }
    },
    
    // Preview do XML
    previewXml(file) {
        if (!file) return;
        
        const preview = document.getElementById('xml-preview');
        const info = document.getElementById('xml-info');
        
        // Simular extração de dados do XML
        info.innerHTML = `
            <strong>Arquivo:</strong> ${file.name}<br>
            <strong>Tamanho:</strong> ${(file.size / 1024).toFixed(2)} KB<br>
            <strong>Tipo:</strong> ${file.type}<br>
            <em>Os dados serão extraídos após o upload</em>
        `;
        
        preview.style.display = 'block';
    },
    
    // Utilitários
    getStatusClass(status) {
        const classes = {
            'waiting': 'status-waiting',
            'approved': 'status-approved',
            'loading': 'status-loading',
            'completed': 'status-completed',
            'cancelled': 'status-cancelled'
        };
        return classes[status] || '';
    },
    
    getStatusText(status) {
        const texts = {
            'waiting': 'Aguardando',
            'approved': 'Aprovado',
            'loading': 'Carregando',
            'completed': 'Finalizado',
            'cancelled': 'Cancelado'
        };
        return texts[status] || status;
    },
    
    getStatusBadgeColor(status) {
        const colors = {
            'waiting': 'warning',
            'approved': 'info',
            'loading': 'primary',
            'completed': 'success',
            'cancelled': 'danger'
        };
        return colors[status] || 'secondary';
    },
    
    formatCpf(cpf) {
        if (!cpf) return '';
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
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
    if (document.querySelector('.content-page')) {
        Loadings.init();
    }
});