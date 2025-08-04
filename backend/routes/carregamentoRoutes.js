const express = require('express');
const router = express.Router();
const loadingController = require('../controllers/loadingController');

/**
 * 🚛 ROTAS DE CARREGAMENTOS - FASE 1 REFATORADA
 * 
 * ✅ Mantém URLs originais: /api/carregamentos/
 * ✅ Usa loadingController.js (bem estruturado)
 * ✅ Zero risco - funciona exatamente igual
 * ✅ Código muito mais limpo e organizado
 */

// GET /api/carregamentos - Listar todos os carregamentos
router.get('/', loadingController.listar);

// GET /api/carregamentos/stats - Estatísticas do dashboard
router.get('/stats', loadingController.obterEstatisticas);

// GET /api/carregamentos/:id - Buscar carregamento específico
router.get('/:id', loadingController.buscarPorId);

// POST /api/carregamentos - Criar novo carregamento
router.post('/', loadingController.criar);

// PUT /api/carregamentos/:id - Atualizar carregamento
router.put('/:id', loadingController.atualizar);

// DELETE /api/carregamentos/:id - Remover carregamento
router.delete('/:id', loadingController.remover);

// POST /api/carregamentos/import-xml - Importar XML
router.post('/import-xml', loadingController.importarXML);

// ===== ENDPOINTS PARA FILA DE CARREGAMENTO =====
// Mantidos inline por enquanto (FASE 2 moverá para queueController)

// GET /api/carregamentos/queue - Obter fila de carregamento
router.get('/queue', async (req, res) => {
    try {
        const { db } = require('../database');
        
        const query = `
            SELECT 
                q.*,
                r.description as route_description
            FROM loading_queue q
            LEFT JOIN routes r ON q.route_id = r.id
            ORDER BY q.requested_at ASC
        `;
        
        const [queue] = await db.execute(query);
        
        res.json({
            success: true,
            data: queue,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar fila:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// POST /api/carregamentos/queue - Adicionar à fila (via WhatsApp)
router.post('/queue', async (req, res) => {
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
        
        const { db } = require('../database');
        
        // Verificar se já está na fila
        const [existing] = await db.execute(
            'SELECT id FROM loading_queue WHERE driver_cpf = ? AND status IN ("waiting", "approved", "loading")',
            [driver_cpf]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Motorista já está na fila de carregamento'
            });
        }
        
        // Verificar se a rota existe
        const [route] = await db.execute('SELECT id FROM routes WHERE id = ?', [route_code]);
        
        if (route.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Rota não encontrada'
            });
        }
        
        const query = `
            INSERT INTO loading_queue (
                driver_cpf, driver_name, vehicle_plate, vehicle_type,
                phone_number, route_code, route_id, status, requested_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting', NOW())
        `;
        
        const [result] = await db.execute(query, [
            driver_cpf,
            driver_name,
            vehicle_plate.toUpperCase(),
            vehicle_type || 'Caminhão',
            phone_number,
            route_code,
            route_code
        ]);
        
        // Calcular posição na fila
        const [position] = await db.execute(
            'SELECT COUNT(*) as position FROM loading_queue WHERE status = "waiting" AND id <= ?',
            [result.insertId]
        );
        
        res.status(201).json({
            success: true,
            message: 'Adicionado à fila com sucesso',
            position: position[0].position,
            queue_id: result.insertId,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro ao adicionar à fila:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// PUT /api/carregamentos/queue/:id/status - Atualizar status na fila
router.put('/queue/:id/status', async (req, res) => {
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
        
        const { db } = require('../database');
        
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
        
        const [result] = await db.execute(updateQuery, params);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item da fila não encontrado'
            });
        }
        
        res.json({
            success: true,
            message: `Status atualizado para: ${status}`,
            timestamp: new Date().toISOString()
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

module.exports = router;