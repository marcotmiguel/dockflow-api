const express = require('express');
const router = express.Router();
const loadingController = require('../controllers/loadingController');
const { db } = require('../database'); // usar o pool já criado

/**
 * Routes para Carregamentos
 * URL base: /api/loadings
 * 
 * - Routes apenas definem endpoints
 * - Controller faz a lógica de negócio
 */

// ⚠️ Coloque rotas estáticas ANTES das dinâmicas (/:id)

// GET /api/loadings/today - Carregamentos do dia
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Versão alinhada ao seu schema atual (tabela: carregamentos)
    const [rows] = await db.execute(`
      SELECT 
        id,
        numero_nf,
        destinatario,
        local_entrega,
        data_entrega,
        quantidade_volumes,
        peso_carga,
        nome_produto,
        status,
        created_at,
        updated_at
      FROM carregamentos
      WHERE DATE(created_at) = ?
      ORDER BY created_at DESC
    `, [today]);

    res.json({
      success: true,
      data: rows || [],
      count: rows?.length || 0,
      date: today
    });
  } catch (err) {
    console.error('❌ Erro ao buscar carregamentos de hoje:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

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
