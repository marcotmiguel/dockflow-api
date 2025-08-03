const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');

/**
 * Routes para Fila de Carregamento
 * URL base: /api/queue
 * 
 * Endpoints separados para gerenciar fila de motoristas
 */

// GET /api/queue - Listar fila completa
router.get('/', queueController.listarFila);

// GET /api/queue/stats - Estatísticas da fila
router.get('/stats', queueController.obterEstatisticasFila);

// GET /api/queue/:id - Buscar posição específica na fila
router.get('/:id', queueController.buscarPosicao);

// POST /api/queue - Adicionar motorista à fila (via WhatsApp)
router.post('/', queueController.adicionarNaFila);

// PUT /api/queue/:id/status - Atualizar status na fila
router.put('/:id/status', queueController.atualizarStatus);

// DELETE /api/queue/:id - Remover da fila
router.delete('/:id', queueController.removerDaFila);

module.exports = router;