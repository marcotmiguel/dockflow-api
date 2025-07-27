const express = require('express');
const router = express.Router();
const pool = require('../database');

// GET /api/docks - Listar todas as docas
router.get('/', async (req, res) => {
  try {
    console.log('📋 Buscando lista de docas...');
    
    const [rows] = await pool.execute(`
      SELECT 
        id,
        name,
        status,
        created_at,
        updated_at
      FROM docks 
      ORDER BY name ASC
    `);
    
    console.log(`✅ Encontradas ${rows.length} docas`);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar docas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar lista de docas',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/docks/:id - Buscar doca específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Buscando doca ID: ${id}`);
    
    const [rows] = await pool.execute(`
      SELECT 
        id,
        name,
        status,
        created_at,
        updated_at
      FROM docks 
      WHERE id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Doca não encontrada',
        message: `Doca com ID ${id} não existe`,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Doca encontrada: ${rows[0].name}`);
    
    res.json({
      success: true,
      data: rows[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar doca:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar doca específica',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/docks - Criar nova doca
router.post('/', async (req, res) => {
  try {
    const { name, status = 'available' } = req.body;
    
    console.log('📝 Criando nova doca:', { name, status });
    
    // Validação
    if (!name) {
      return res.status(400).json({
        error: 'Dados obrigatórios ausentes',
        message: 'Nome da doca é obrigatório',
        timestamp: new Date().toISOString()
      });
    }
    
    const [result] = await pool.execute(`
      INSERT INTO docks (name, status)
      VALUES (?, ?)
    `, [name, status]);
    
    console.log(`✅ Doca criada com ID: ${result.insertId}`);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name,
        status
      },
      message: 'Doca criada com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar doca:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao criar nova doca',
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/docks/:id - Atualizar doca
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;
    
    console.log(`📝 Atualizando doca ID: ${id}`);
    
    const [result] = await pool.execute(`
      UPDATE docks 
      SET name = ?, status = ?
      WHERE id = ?
    `, [name, status, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Doca não encontrada',
        message: `Doca com ID ${id} não existe`,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Doca ${id} atualizada com sucesso`);
    
    res.json({
      success: true,
      message: 'Doca atualizada com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar doca:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao atualizar doca',
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/docks/:id - Deletar doca
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deletando doca ID: ${id}`);
    
    const [result] = await pool.execute('DELETE FROM docks WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Doca não encontrada',
        message: `Doca com ID ${id} não existe`,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Doca ${id} deletada com sucesso`);
    
    res.json({
      success: true,
      message: 'Doca deletada com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao deletar doca:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao deletar doca',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;