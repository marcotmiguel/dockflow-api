const express = require('express');
const router = express.Router();

// Importar database com promises
const { db } = require('../database');

// ===== ENDPOINTS PARA RETORNOS DE CARGA =====

// GET /api/retornos - Listar todos os retornos (versão simplificada)
router.get('/', async (req, res) => {
    try {
        console.log('📋 GET /api/retornos - Buscando retornos');
        
        // Query mais simples possível
        const query = 'SELECT * FROM retornos_carga ORDER BY created_at DESC LIMIT 50';
        
        const [retornos] = await db.execute(query);
        
        console.log(`✅ ${retornos.length} retornos encontrados`);
        
        res.json({
            success: true,
            data: retornos,
            count: retornos.length
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
        
        // Queries mais simples
        const [aguardandoResult] = await db.execute('SELECT COUNT(*) as count FROM retornos_carga WHERE status = ?', ['aguardando_chegada']);
        const [bipandoResult] = await db.execute('SELECT COUNT(*) as count FROM retornos_carga WHERE status = ?', ['bipando']);
        const [conferidoResult] = await db.execute('SELECT COUNT(*) as count FROM retornos_carga WHERE status = ?', ['conferido']);
        
        const hoje = new Date().toISOString().split('T')[0];
        const [hojeResult] = await db.execute('SELECT COUNT(*) as count FROM retornos_carga WHERE DATE(created_at) = ? AND status = ?', [hoje, 'conferido']);
        
        const stats = {
            aguardando_chegada: aguardandoResult[0].count || 0,
            bipando: bipandoResult[0].count || 0,
            conferido: conferidoResult[0].count || 0,
            conferido_hoje: hojeResult[0].count || 0,
            total_itens_retornados: 0
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

// GET /api/retornos/:id - Buscar retorno específico
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`🔍 GET /api/retornos/${id} - Buscando retorno específico`);
        
        const [result] = await db.execute('SELECT * FROM retornos_carga WHERE id = ?', [id]);
        
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Retorno não encontrado'
            });
        }
        
        console.log(`✅ Retorno ${id} encontrado`);
        
        res.json({
            success: true,
            data: result[0]
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar retorno:', error);
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
        
        // Queries mais simples
        const [aguardandoResult] = await db.execute('SELECT COUNT(*) as count FROM retornos_carga WHERE status = ?', ['aguardando_chegada']);
        const [bipandoResult] = await db.execute('SELECT COUNT(*) as count FROM retornos_carga WHERE status = ?', ['bipando']);
        const [conferidoResult] = await db.execute('SELECT COUNT(*) as count FROM retornos_carga WHERE status = ?', ['conferido']);
        
        const hoje = new Date().toISOString().split('T')[0];
        const [hojeResult] = await db.execute('SELECT COUNT(*) as count FROM retornos_carga WHERE DATE(created_at) = ? AND status = ?', [hoje, 'conferido']);
        
        const stats = {
            aguardando_chegada: aguardandoResult[0].count || 0,
            bipando: bipandoResult[0].count || 0,
            conferido: conferidoResult[0].count || 0,
            conferido_hoje: hojeResult[0].count || 0,
            total_itens_retornados: 0
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

// GET /api/retornos/stats - Estatísticas dos retornos
router.get('/stats', async (req, res) => {
    try {
        console.log('📊 GET /api/retornos/stats - Buscando estatísticas');
        
        // Queries mais simples
        const [aguardandoResult] = await db.execute('SELECT COUNT(*) as count FROM retornos_carga WHERE status = ?', ['aguardando_chegada']);
        const [bipandoResult] = await db.execute('SELECT COUNT(*) as count FROM retornos_carga WHERE status = ?', ['bipando']);
        const [conferidoResult] = await db.execute('SELECT COUNT(*) as count FROM retornos_carga WHERE status = ?', ['conferido']);
        
        const hoje = new Date().toISOString().split('T')[0];
        const [hojeResult] = await db.execute('SELECT COUNT(*) as count FROM retornos_carga WHERE DATE(created_at) = ? AND status = ?', [hoje, 'conferido']);
        
        const stats = {
            aguardando_chegada: aguardandoResult[0].count || 0,
            bipando: bipandoResult[0].count || 0,
            conferido: conferidoResult[0].count || 0,
            conferido_hoje: hojeResult[0].count || 0,
            total_itens_retornados: 0
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

// POST /api/retornos - Registrar retorno
router.post('/', async (req, res) => {
    try {
        console.log('📝 POST /api/retornos - Registrando novo retorno');
        
        const {
            driver_cpf,
            driver_name,
            vehicle_plate,
            phone_number
        } = req.body;
        
        // Validações básicas
        if (!driver_cpf || !driver_name || !vehicle_plate) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios: driver_cpf, driver_name, vehicle_plate'
            });
        }
        
        const query = `
            INSERT INTO retornos_carga (
                driver_cpf, driver_name, vehicle_plate, phone_number,
                status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'aguardando_chegada', NOW(), NOW())
        `;
        
        const [result] = await db.execute(query, [
            driver_cpf,
            driver_name,
            vehicle_plate.toUpperCase(),
            phone_number || null
        ]);
        
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
        const { status } = req.body;
        
        console.log(`📝 PUT /api/retornos/${id}/status - Atualizando para: ${status}`);
        
        const validStatuses = ['aguardando_chegada', 'bipando', 'conferido', 'cancelado'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status inválido'
            });
        }
        
        const [result] = await db.execute(
            'UPDATE retornos_carga SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, id]
        );
        
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
        
        // Buscar itens já retornados
        let itensRetornados = [];
        try {
            if (retornoData.itens_retornados) {
                // Se já é string JSON, fazer parse
                if (typeof retornoData.itens_retornados === 'string') {
                    itensRetornados = JSON.parse(retornoData.itens_retornados);
                } else {
                    // Se é objeto, usar diretamente
                    itensRetornados = Array.isArray(retornoData.itens_retornados) ? 
                        retornoData.itens_retornados : [];
                }
            }
        } catch (e) {
            console.error('❌ Erro ao processar itens existentes:', e);
            itensRetornados = [];
        }
        
        console.log('📦 Itens existentes:', itensRetornados);
        
        // Adicionar novo item
        const novoItem = {
            codigo_barras,
            produto_nome: produto_nome || 'Produto sem nome',
            quantidade: parseInt(quantidade),
            bipado_em: new Date().toISOString(),
            operador: 'Sistema'
        };
        
        itensRetornados.push(novoItem);
        
        console.log('📦 Itens após adicionar:', itensRetornados);
        
        // Atualizar no banco - garantir que é JSON
        const itensJson = JSON.stringify(itensRetornados);
        
        // Atualizar no banco
        const [result] = await db.execute(
            'UPDATE retornos_carga SET itens_retornados = ?, updated_at = NOW() WHERE id = ?',
            [itensJson, id]
        );
        
        console.log(`✅ Item ${codigo_barras} salvo no banco como JSON:`, itensJson);
        
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
        const itensRaw = result[0].itens_retornados;
        
        console.log(`📦 Dados brutos do banco:`, typeof itensRaw, itensRaw);
        
        try {
            if (itensRaw) {
                if (typeof itensRaw === 'string') {
                    // Se é string, fazer parse
                    itens = JSON.parse(itensRaw);
                } else if (Array.isArray(itensRaw)) {
                    // Se já é array, usar diretamente
                    itens = itensRaw;
                } else if (typeof itensRaw === 'object') {
                    // Se é objeto mas não array, pode ser um item único
                    itens = [itensRaw];
                }
            }
        } catch (e) {
            console.error('❌ Erro ao processar itens:', e);
            itens = [];
        }
        
        console.log(`✅ ${itens.length} itens processados:`, itens);
        
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
        await db.execute(
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