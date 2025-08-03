const express = require('express');
const router = express.Router();
const loadingController = require('../controllers/loadingController');

/**
 * Routes para Carregamentos
 * URL base: /api/loadings
 * 
 * Agora com responsabilidades separadas:
 * - Routes apenas definem endpoints
 * - Controller faz toda lógica de negócio
 */

// GET /api/loadings - Listar carregamentos
router.get('/', loadingController.listar);

// GET /api/loadings/stats - Estatísticas do dashboard
router.get('/stats', loadingController.obterEstatisticas);

// GET /api/loadings/:id - Buscar carregamento específico
router.get('/:id', loadingController.buscarPorId);

// POST /api/loadings - Criar novo carregamento
router.post('/', loadingController.criar);

// POST /api/loadings/import-xml - Importar XML
router.post('/import-xml', loadingController.importarXML);

// PUT /api/loadings/:id - Atualizar carregamento
router.put('/:id', loadingController.atualizar);

// DELETE /api/loadings/:id - Remover carregamento
router.delete('/:id', loadingController.remover);

module.exports = router;