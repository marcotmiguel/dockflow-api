const express = require('express');
const router = express.Router();

// Importar database com promises
const { db } = require('../database');

// ===== ENDPOINTS PARA RETORNOS DE CARGA =====

// GET /api/retornos - Listar todos os retornos
router.get('/', async (req, res) => {
    try {
        console.log('📋 GET /api/retornos - Buscando retornos');
        
        const { status, motorista, data_inicio, data_fim, page = 1, limit = 50 } = req.query;
        
        let query = `
            SELECT 
                r.*,
                c.numero_nf,
                c.destinatario,
                c.route_id,
                rt.code as route_code,
                rt.description as route_description
            FROM retornos_carga r
            LEFT JOIN carregamentos c ON r.carregamento_id = c.id
            LEFT JOIN routes rt ON c.route_id = rt.id
            WHERE 1=1
        `;
        let params = [];
        
        // Filtros
        if (status) {
            query += ' AND r.status = ?';
            params.push(status);
        }
        
        if (motorista) {
            query += ' AND (r.driver_name LIKE ? OR r.driver_cpf LIKE ?)';
            params.push(`%${motorista}%`, `%${motorista}%`);
        }
        
        if (data_inicio) {
            query += ' AND DATE(r.created_at) >= ?';
            params.push(data_inicio);
        }
        
        if (data_fim) {
            query += ' AND DATE(r.created_at) <= ?';
            params.push(data_fim);
        }
        
        // Ordenação e paginação
        query += ' ORDER BY r.created_at DESC';
        
        const offset = (page - 1) * limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [retornos] = await db.execute(query, params);
        
        // Contar total para paginação
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM retornos_carga r
            LEFT JOIN carregamentos c ON r.carregamento_id = c.id
            WHERE 1=1
        `;
        let countParams = [];
        
        if (status) {
            countQuery += ' AND r.status = ?';
            countParams.push(status);
        }
        
        if (motorista) {
            countQuery += ' AND (r.driver_name LIKE ? OR r.driver_cpf LIKE ?)';
            countParams.push(`%${motorista}%`, `%${motorista}%`);
        }
        
        if (data_inicio) {
            countQuery += ' AND DATE(r.created_at) >= ?';
            countParams.push(data_inicio);
        }
        
        if (data_fim) {
            countQuery += ' AND DATE(r.created_at) <= ?';
            countParams.push(data_fim);
        }
        
        const [countResult] = await db.execute(countQuery, countParams);
        const total = countResult[0].total;
        
        console.log(`✅ ${retornos.length} retornos encontrados`);
        
        res.json({
            success: true,
            data: retornos,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar retornos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// GET /api/retornos/stats - Estatísticas dos retornos
router.get('/stats', async (req, res) => {
    try {
        console.log('📊 GET /api/retornos/stats - Buscando estatísticas');
        
        const hoje = new Date().toISOString().split('T')[0];
        
        const queries = {
            aguardando: 'SELECT COUNT(*) as count FROM retornos_carga WHERE status = "aguardando_chegada"',
            bipando: 'SELECT COUNT(*) as count FROM retornos_carga WHERE status = "bipando"',
            conferido: 'SELECT COUNT(*) as count FROM retornos_carga WHERE status = "conferido"',
            hoje: 'SELECT COUNT(*) as count FROM retornos_carga WHERE DATE(created_at) = ? AND status = "conferido"',
            itens: `
                SELECT SUM(
                    JSON_LENGTH(
                        CASE 
                            WHEN JSON_VALID(itens_retornados) THEN itens_retornados 
                            ELSE '[]' 
                        END
                    )
                ) as total 
                FROM retornos_carga 
                WHERE DATE(created_at) = ?
            `
        };
        
        // Executar todas as queries
        const [aguardandoResult] = await db.execute(queries.aguardando);
        const [bipandoResult] = await db.execute(queries.bipando);
        const [conferidoResult] = await db.execute(queries.conferido);
        const [hojeResult] = await db.execute(queries.hoje, [hoje]);
        const [itensResult] = await db.execute(queries.itens, [hoje]);
        
        const stats = {
            aguardando_chegada: aguardandoResult[0].count || 0,
            bipando: bipandoResult[0].count || 0,
            conferido: conferidoResult[0].count || 0,
            conferido_hoje: hojeResult[0].count || 0,
            total_itens_retornados: itensResult[0].total || 0
        };
        
        console.log('✅ Estatísticas carregadas:', stats);
        
        res.json({
            success: true,
            stats: stats
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// POST /api/retornos - Registrar retorno via WhatsApp
router.post('/', async (req, res) => {
    try {
        console.log('📝 POST /api/retornos - Registrando novo retorno');
        
        const {
            carregamento_id,
            driver_cpf,
            driver_name,
            vehicle_plate,
            phone_number,
            motivos_retorno,
            itens_nao_entregues
        } = req.body;
        
        // Validações básicas
        if (!driver_cpf || !driver_name || !vehicle_plate) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios: driver_cpf, driver_name, vehicle_plate'
            });
        }
        
        // Verificar se já existe retorno pendente para este motorista
        const [existing] = await db.execute(
            'SELECT id FROM retornos_carga WHERE driver_cpf = ? AND status IN ("aguardando_chegada", "bipando")',
            [driver_cpf]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Motorista já possui retorno pendente'
            });
        }
        
        const query = `
            INSERT INTO retornos_carga (
                carregamento_id, driver_cpf, driver_name, vehicle_plate,
                phone_number, motivos_retorno, itens_nao_entregues,
                status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'aguardando_chegada', NOW(), NOW())
        `;
        
        const params = [
            carregamento_id || null,
            driver_cpf,
            driver_name,
            vehicle_plate.toUpperCase(),
            phone_number || null,
            motivos_retorno ? JSON.stringify(motivos_retorno) : null,
            itens_nao_entregues ? JSON.stringify(itens_nao_entregues) : null
        ];
        
        const [result] = await db.execute(query, params);
        
        console.log(`✅ Retorno registrado com ID: ${result.insertId}`);
        
        res.status(201).json({
            success: true,
            message: 'Retorno registrado com sucesso',
            retorno_id: result.insertId
        });
        
    } catch (error) {
        console.error('❌ Erro ao registrar retorno:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// PUT /api/retornos/:id/status - Atualizar status do retorno
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        
        console.log(`📝 PUT /api/retornos/${id}/status - Atualizando para: ${status}`);
        
        const validStatuses = ['aguardando_chegada', 'bipando', 'conferido', 'cancelado'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status inválido. Válidos: ' + validStatuses.join(', ')
            });
        }
        
        let updateQuery = 'UPDATE retornos_carga SET status = ?, updated_at = NOW()';
        let params = [status];
        
        // Adicionar timestamp específico baseado no status
        if (status === 'bipando') {
            updateQuery += ', bipagem_iniciada_at = NOW()';
        } else if (status === 'conferido') {
            updateQuery += ', conferido_at = NOW()';
        }
        
        // Adicionar notes se fornecido
        if (notes) {
            updateQuery += ', notes = ?';
            params.push(notes);
        }
        
        updateQuery += ' WHERE id = ?';
        params.push(id);
        
        const [result] = await db.execute(updateQuery, params);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Retorno não encontrado'
            });
        }
        
        console.log(`✅ Status do retorno ${id} atualizado para: ${status}`);
        
        res.json({
            success: true,
            message: `Status atualizado para: ${status}`
        });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// POST /api/retornos/:id/bipar-item - Bipar item de retorno
router.post('/:id/bipar-item', async (req, res) => {
    try {
        const { id } = req.params;
        const { codigo_barras, produto_nome, quantidade = 1 } = req.body;
        
        console.log(`📦 POST /api/retornos/${id}/bipar-item - Bipando: ${codigo_barras}`);
        
        if (!codigo_barras) {
            return res.status(400).json({
                success: false,
                message: 'Código de barras é obrigatório'
            });
        }
        
        // Buscar o retorno
        const [retorno] = await db.execute('SELECT * FROM retornos_carga WHERE id = ?', [id]);
        
        if (retorno.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Retorno não encontrado'
            });
        }
        
        const retornoData = retorno[0];
        
        if (retornoData.status !== 'bipando') {
            return res.status(400).json({
                success: false,
                message: 'Retorno deve estar no status "bipando" para bipar itens'
            });
        }
        
        // Buscar itens já retornados
        let itensRetornados = [];
        try {
            itensRetornados = retornoData.itens_retornados ? 
                JSON.parse(retornoData.itens_retornados) : [];
        } catch (e) {
            itensRetornados = [];
        }
        
        // Adicionar novo item
        const novoItem = {
            codigo_barras,
            produto_nome: produto_nome || 'Produto sem nome',
            quantidade: parseInt(quantidade),
            bipado_em: new Date().toISOString(),
            operador: 'Sistema' // Aqui você pode pegar do usuário logado
        };
        
        itensRetornados.push(novoItem);
        
        // Atualizar no banco
        const updateQuery = `
            UPDATE retornos_carga 
            SET itens_retornados = ?, updated_at = NOW() 
            WHERE id = ?
        `;
        
        const [result] = await db.execute(updateQuery, [JSON.stringify(itensRetornados), id]);
        
        console.log(`✅ Item ${codigo_barras} bipado com sucesso`);
        
        // TODO: Aqui você pode adicionar lógica para atualizar estoque
        // await db.execute('UPDATE estoque SET quantidade = quantidade + ? WHERE codigo_barras = ?', 
        //                  [quantidade, codigo_barras]);
        
        res.json({
            success: true,
            message: 'Item bipado com sucesso',
            item: novoItem,
            total_itens: itensRetornados.length
        });
        
    } catch (error) {
        console.error('❌ Erro ao bipar item:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// GET /api/retornos/:id/itens - Listar itens bipados de um retorno
router.get('/:id/itens', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`📋 GET /api/retornos/${id}/itens - Buscando itens bipados`);
        
        const [result] = await db.execute('SELECT itens_retornados FROM retornos_carga WHERE id = ?', [id]);
        
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Retorno não encontrado'
            });
        }
        
        let itens = [];
        try {
            itens = result[0].itens_retornados ? 
                JSON.parse(result[0].itens_retornados) : [];
        } catch (e) {
            itens = [];
        }
        
        console.log(`✅ ${itens.length} itens encontrados`);
        
        res.json({
            success: true,
            data: itens,
            count: itens.length
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar itens:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// DELETE /api/retornos/:id/itens/:index - Remover item bipado
router.delete('/:id/itens/:index', async (req, res) => {
    try {
        const { id, index } = req.params;
        
        console.log(`🗑️ DELETE /api/retornos/${id}/itens/${index} - Removendo item`);
        
        const [result] = await db.execute('SELECT itens_retornados FROM retornos_carga WHERE id = ?', [id]);
        
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Retorno não encontrado'
            });
        }
        
        let itens = [];
        try {
            itens = result[0].itens_retornados ? 
                JSON.parse(result[0].itens_retornados) : [];
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: 'Erro ao processar itens'
            });
        }
        
        const itemIndex = parseInt(index);
        if (itemIndex < 0 || itemIndex >= itens.length) {
            return res.status(400).json({
                success: false,
                message: 'Índice de item inválido'
            });
        }
        
        // Remover item
        const itemRemovido = itens.splice(itemIndex, 1)[0];
        
        // Atualizar no banco
        const [updateResult] = await db.execute(
            'UPDATE retornos_carga SET itens_retornados = ?, updated_at = NOW() WHERE id = ?',
            [JSON.stringify(itens), id]
        );
        
        console.log(`✅ Item removido com sucesso`);
        
        res.json({
            success: true,
            message: 'Item removido com sucesso',
            item_removido: itemRemovido,
            total_itens: itens.length
        });
        
    } catch (error) {
        console.error('❌ Erro ao remover item:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

module.exports = router;