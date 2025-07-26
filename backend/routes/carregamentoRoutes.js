const express = require('express');
const router = express.Router();

// ===== ENDPOINTS PARA CARREGAMENTOS =====

// GET /api/carregamentos - Listar todos os carregamentos
router.get('/', async (req, res) => {
    try {
        const { status, destinatario, data_inicio, data_fim, page = 1, limit = 50 } = req.query;
        
        let query = 'SELECT * FROM carregamentos WHERE 1=1';
        let params = [];
        
        // Filtros
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        if (destinatario) {
            query += ' AND destinatario LIKE ?';
            params.push(`%${destinatario}%`);
        }
        
        if (data_inicio) {
            query += ' AND data_entrega >= ?';
            params.push(data_inicio);
        }
        
        if (data_fim) {
            query += ' AND data_entrega <= ?';
            params.push(data_fim);
        }
        
        // Ordenação e paginação
        query += ' ORDER BY created_at DESC';
        
        const offset = (page - 1) * limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        // Usar a conexão global do seu projeto
        const db = require('../database');
        
        db.query(query, params, (err, carregamentos) => {
            if (err) {
                console.error('Erro ao buscar carregamentos:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erro interno do servidor',
                    error: err.message
                });
            }
            
            // Contar total para paginação
            let countQuery = 'SELECT COUNT(*) as total FROM carregamentos WHERE 1=1';
            let countParams = [];
            
            if (status) {
                countQuery += ' AND status = ?';
                countParams.push(status);
            }
            
            if (destinatario) {
                countQuery += ' AND destinatario LIKE ?';
                countParams.push(`%${destinatario}%`);
            }
            
            if (data_inicio) {
                countQuery += ' AND data_entrega >= ?';
                countParams.push(data_inicio);
            }
            
            if (data_fim) {
                countQuery += ' AND data_entrega <= ?';
                countParams.push(data_fim);
            }
            
            db.query(countQuery, countParams, (err, countResult) => {
                if (err) {
                    console.error('Erro ao contar carregamentos:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Erro interno do servidor'
                    });
                }
                
                const total = countResult[0].total;
                
                res.json({
                    success: true,
                    data: carregamentos,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: total,
                        pages: Math.ceil(total / limit)
                    }
                });
            });
        });
        
    } catch (error) {
        console.error('Erro ao buscar carregamentos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// GET /api/carregamentos/stats - Estatísticas do dashboard
router.get('/stats', (req, res) => {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        const db = require('../database');
        
        // Consultas para estatísticas
        const queries = {
            aguardando: 'SELECT COUNT(*) as count FROM carregamentos WHERE status = "aguardando carregamento"',
            em_rota: 'SELECT COUNT(*) as count FROM carregamentos WHERE status = "em rota"',
            entregue: 'SELECT COUNT(*) as count FROM carregamentos WHERE status = "entregue"',
            hoje: 'SELECT COUNT(*) as count FROM carregamentos WHERE DATE(created_at) = ? AND status = "entregue"'
        };
        
        let results = {};
        let completed = 0;
        
        // Função para verificar se todas as consultas foram executadas
        function checkCompletion() {
            completed++;
            if (completed === 5) { // 4 queries + 1 para volumes
                res.json({
                    success: true,
                    stats: {
                        aguardando: results.aguardando || 0,
                        em_rota: results.em_rota || 0,
                        entregue: results.entregue || 0,
                        entregue_hoje: results.hoje || 0,
                        volumes_em_armazem: results.volumes || 0
                    }
                });
            }
        }
        
        // Executar queries
        db.query(queries.aguardando, (err, result) => {
            if (!err) results.aguardando = result[0].count;
            checkCompletion();
        });
        
        db.query(queries.em_rota, (err, result) => {
            if (!err) results.em_rota = result[0].count;
            checkCompletion();
        });
        
        db.query(queries.entregue, (err, result) => {
            if (!err) results.entregue = result[0].count;
            checkCompletion();
        });
        
        db.query(queries.hoje, [hoje], (err, result) => {
            if (!err) results.hoje = result[0].count;
            checkCompletion();
        });
        
        // Saldo total de volumes
        db.query('SELECT SUM(quantidade_volumes) as total FROM carregamentos WHERE status != "entregue"', (err, result) => {
            if (!err) results.volumes = result[0].total;
            checkCompletion();
        });
        
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// POST /api/carregamentos - Criar novo carregamento
router.post('/', (req, res) => {
    try {
        const {
            numero_nf,
            chave_acesso,
            destinatario,
            local_entrega,
            data_entrega,
            quantidade_volumes,
            peso_carga,
            codigo_barras,
            nome_produto,
            restricoes_analisadas,
            route_id
        } = req.body;
        
        // Validações básicas
        if (!numero_nf || !destinatario || !quantidade_volumes) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios: numero_nf, destinatario, quantidade_volumes'
            });
        }
        
        const db = require('../database');
        
        // Verificar se já existe
        db.query('SELECT id FROM carregamentos WHERE numero_nf = ?', [numero_nf], (err, existing) => {
            if (err) {
                console.error('Erro ao verificar carregamento existente:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erro interno do servidor'
                });
            }
            
            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Nota fiscal já cadastrada'
                });
            }
            
            const query = `
                INSERT INTO carregamentos (
                    numero_nf, chave_acesso, destinatario, local_entrega,
                    data_entrega, quantidade_volumes, peso_carga, codigo_barras,
                    nome_produto, status, restricoes_analisadas, route_id,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `;
            
            const params = [
                numero_nf,
                chave_acesso || null,
                destinatario,
                local_entrega || null,
                data_entrega || new Date().toISOString().split('T')[0], // Data padrão hoje
                quantidade_volumes,
                peso_carga || 0, // Peso padrão 0
                codigo_barras || null,
                nome_produto || 'Produto sem nome', // Nome padrão
                'aguardando carregamento', // Status padrão
                restricoes_analisadas ? JSON.stringify(restricoes_analisadas) : null, // JSON
                route_id || null
            ];
            
            db.query(query, params, (err, result) => {
                if (err) {
                    console.error('Erro ao criar carregamento:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Erro interno do servidor'
                    });
                }
                
                // Buscar o carregamento criado
                db.query('SELECT * FROM carregamentos WHERE id = ?', [result.insertId], (err, newCarregamento) => {
                    if (err) {
                        console.error('Erro ao buscar carregamento criado:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Carregamento criado mas erro ao retornar dados'
                        });
                    }
                    
                    res.status(201).json({
                        success: true,
                        message: 'Carregamento criado com sucesso',
                        data: newCarregamento[0]
                    });
                });
            });
        });
        
    } catch (error) {
        console.error('Erro ao criar carregamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// ===== ENDPOINTS PARA FILA DE CARREGAMENTO =====

// GET /api/carregamentos/queue - Obter fila de carregamento
router.get('/queue', (req, res) => {
    try {
        const db = require('../database');
        
        const query = `
            SELECT 
                q.*,
                r.description as route_description
            FROM loading_queue q
            LEFT JOIN routes r ON q.route_id = r.id
            ORDER BY q.requested_at ASC
        `;
        
        db.query(query, (err, queue) => {
            if (err) {
                console.error('Erro ao buscar fila:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erro interno do servidor'
                });
            }
            
            res.json({
                success: true,
                data: queue
            });
        });
        
    } catch (error) {
        console.error('Erro ao buscar fila:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// POST /api/carregamentos/queue - Adicionar à fila (via WhatsApp)
router.post('/queue', (req, res) => {
    try {
        const {
            driver_cpf,
            driver_name,
            vehicle_plate,
            vehicle_type,
            phone_number,
            route_code
        } = req.body;
        
        // Validações
        if (!driver_cpf || !driver_name || !vehicle_plate || !route_code) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios: driver_cpf, driver_name, vehicle_plate, route_code'
            });
        }
        
        const db = require('../database');
        
        // Verificar se já está na fila
        db.query(
            'SELECT id FROM loading_queue WHERE driver_cpf = ? AND status IN ("waiting", "approved", "loading")',
            [driver_cpf],
            (err, existing) => {
                if (err) {
                    console.error('Erro ao verificar fila:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Erro interno do servidor'
                    });
                }
                
                if (existing.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Motorista já está na fila de carregamento'
                    });
                }
                
                // Verificar se a rota existe (usando route_id ao invés de route_code)
                db.query('SELECT id FROM routes WHERE id = ?', [route_code], (err, route) => {
                    if (err) {
                        console.error('Erro ao verificar rota:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Erro interno do servidor'
                        });
                    }
                    
                    if (route.length === 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Rota não encontrada'
                        });
                    }
                    
                    const query = `
                        INSERT INTO loading_queue (
                            driver_cpf, driver_name, vehicle_plate, vehicle_type,
                            phone_number, route_code, route_id, status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting')
                    `;
                    
                    db.query(query, [
                        driver_cpf,
                        driver_name,
                        vehicle_plate.toUpperCase(),
                        vehicle_type || 'Caminhão',
                        phone_number,
                        route_code, // Manter para compatibilidade
                        route_code  // Agora usamos como route_id
                    ], (err, result) => {
                        if (err) {
                            console.error('Erro ao adicionar à fila:', err);
                            return res.status(500).json({
                                success: false,
                                message: 'Erro interno do servidor'
                            });
                        }
                        
                        // Calcular posição na fila
                        db.query(
                            'SELECT COUNT(*) as position FROM loading_queue WHERE status = "waiting" AND id <= ?',
                            [result.insertId],
                            (err, position) => {
                                if (err) {
                                    console.error('Erro ao calcular posição:', err);
                                    return res.status(500).json({
                                        success: false,
                                        message: 'Erro interno do servidor'
                                    });
                                }
                                
                                res.status(201).json({
                                    success: true,
                                    message: 'Adicionado à fila com sucesso',
                                    position: position[0].position,
                                    queue_id: result.insertId
                                });
                            }
                        );
                    });
                });
            }
        );
        
    } catch (error) {
        console.error('Erro ao adicionar à fila:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// PUT /api/carregamentos/queue/:id/status - Atualizar status na fila
router.put('/queue/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        
        const validStatuses = ['waiting', 'approved', 'loading', 'completed', 'cancelled'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status inválido. Válidos: ' + validStatuses.join(', ')
            });
        }
        
        const db = require('../database');
        
        let updateQuery = 'UPDATE loading_queue SET status = ?, updated_at = NOW()';
        let params = [status];
        
        // Adicionar timestamp específico baseado no status
        if (status === 'approved') {
            updateQuery += ', approved_at = NOW()';
        } else if (status === 'loading') {
            updateQuery += ', loading_started_at = NOW()';
        } else if (status === 'completed') {
            updateQuery += ', completed_at = NOW()';
        }
        
        // Adicionar notes se fornecido
        if (notes) {
            updateQuery += ', notes = ?';
            params.push(notes);
        }
        
        updateQuery += ' WHERE id = ?';
        params.push(id);
        
        db.query(updateQuery, params, (err, result) => {
            if (err) {
                console.error('Erro ao atualizar status:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erro interno do servidor'
                });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Item da fila não encontrado'
                });
            }
            
            res.json({
                success: true,
                message: `Status atualizado para: ${status}`
            });
        });
        
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// POST /api/carregamentos/import-xml - Importar XML
router.post('/import-xml', (req, res) => {
    try {
        const { xmlData, routeId } = req.body;
        
        if (!xmlData || !routeId) {
            return res.status(400).json({
                success: false,
                message: 'XML e rota são obrigatórios'
            });
        }
        
        const db = require('../database');
        
        // Simular extração de dados do XML
        const extractedData = {
            numero_nf: xmlData.numero || 'XML_' + Date.now(),
            chave_acesso: xmlData.chave || null,
            destinatario: xmlData.destinatario || 'Destinatário XML',
            local_entrega: xmlData.endereco || null,
            data_entrega: xmlData.data_entrega || null,
            quantidade_volumes: xmlData.volumes || 1,
            peso_carga: xmlData.peso || null,
            nome_produto: xmlData.produto || 'Produto XML',
            route_id: routeId,
            restricoes_analisadas: xmlData.restricoes || null
        };
        
        const query = `
            INSERT INTO carregamentos (
                numero_nf, chave_acesso, destinatario, local_entrega,
                data_entrega, quantidade_volumes, peso_carga, codigo_barras,
                nome_produto, status, restricoes_analisadas, route_id,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const params = [
            extractedData.numero_nf,
            extractedData.chave_acesso,
            extractedData.destinatario,
            extractedData.local_entrega,
            extractedData.data_entrega,
            extractedData.quantidade_volumes,
            extractedData.peso_carga,
            null, // codigo_barras - será gerado depois
            extractedData.nome_produto,
            'aguardando carregamento',
            extractedData.restricoes_analisadas,
            extractedData.route_id
        ];
        
        db.query(query, params, (err, result) => {
            if (err) {
                console.error('Erro ao importar XML:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao processar XML'
                });
            }
            
            res.json({
                success: true,
                message: 'XML importado com sucesso',
                carregamento_id: result.insertId
            });
        });
        
    } catch (error) {
        console.error('Erro ao importar XML:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar XML',
            error: error.message
        });
    }
});

module.exports = router;