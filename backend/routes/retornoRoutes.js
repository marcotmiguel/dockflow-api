const express = require('express');
const router = express.Router();
const { db } = require('../database');

/**
 * Routes para Retornos
 * URL base: /api/retornos
 * 
 * Sistema de controle de retornos de carregamentos
 */

// GET /api/retornos - Listar todos os retornos
router.get('/', async (req, res) => {
  try {
    const { status, data_inicio, data_fim, motorista, page = 1, limit = 50 } = req.query;
    
    console.log('📋 GET /api/retornos - Buscando retornos...');
    
    let query = `
      SELECT 
        r.*,
        c.numero_nf,
        c.destinatario,
        c.local_entrega,
        d.name as driver_name
      FROM retornos r
      LEFT JOIN carregamentos c ON r.carregamento_id = c.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      WHERE 1=1
    `;
    
    let params = [];
    
    // Filtros
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    
    if (motorista) {
      query += ' AND d.name LIKE ?';
      params.push(`%${motorista}%`);
    }
    
    if (data_inicio) {
      query += ' AND DATE(r.data_retorno) >= ?';
      params.push(data_inicio);
    }
    
    if (data_fim) {
      query += ' AND DATE(r.data_retorno) <= ?';
      params.push(data_fim);
    }
    
    // Ordenação e paginação
    query += ' ORDER BY r.created_at DESC';
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [retornos] = await db.execute(query, params);
    
    // Contar total
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM retornos r
      LEFT JOIN drivers d ON r.driver_id = d.id
      WHERE 1=1
    `;
    let countParams = [];
    
    if (status) {
      countQuery += ' AND r.status = ?';
      countParams.push(status);
    }
    
    if (motorista) {
      countQuery += ' AND d.name LIKE ?';
      countParams.push(`%${motorista}%`);
    }
    
    if (data_inicio) {
      countQuery += ' AND DATE(r.data_retorno) >= ?';
      countParams.push(data_inicio);
    }
    
    if (data_fim) {
      countQuery += ' AND DATE(r.data_retorno) <= ?';
      countParams.push(data_fim);
    }
    
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    console.log(`✅ ${retornos.length} retornos encontrados`);
    
    res.json({
      success: true,
      data: retornos,
      meta: {
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        },
        timestamp: new Date().toISOString()
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
    console.log('📊 GET /api/retornos/stats - Buscando estatísticas...');
    
    const hoje = new Date().toISOString().split('T')[0];
    
    // Queries em paralelo para melhor performance
    const [
      [pendentesResult],
      [concluidosResult],
      [concluidosHojeResult],
      [totalResult]
    ] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM retornos WHERE status = "pendente"'),
      db.execute('SELECT COUNT(*) as count FROM retornos WHERE status = "concluido"'),
      db.execute('SELECT COUNT(*) as count FROM retornos WHERE status = "concluido" AND DATE(data_retorno) = ?', [hoje]),
      db.execute('SELECT COUNT(*) as count FROM retornos')
    ]);
    
    const stats = {
      pendentes: pendentesResult[0].count,
      concluidos: concluidosResult[0].count,
      concluidos_hoje: concluidosHojeResult[0].count,
      total: totalResult[0].count
    };
    
    console.log('✅ Estatísticas calculadas:', stats);
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
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
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido fornecido'
      });
    }
    
    console.log(`🔍 GET /api/retornos/${id} - Buscando retorno específico`);
    
    const [rows] = await db.execute(`
      SELECT 
        r.*,
        c.numero_nf,
        c.destinatario,
        c.local_entrega,
        d.name as driver_name,
        d.cpf as driver_cpf
      FROM retornos r
      LEFT JOIN carregamentos c ON r.carregamento_id = c.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      WHERE r.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Retorno com ID ${id} não encontrado`
      });
    }
    
    console.log(`✅ Retorno encontrado: ${rows[0].id}`);
    
    res.json({
      success: true,
      data: rows[0]
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

// POST /api/retornos - Criar novo retorno
router.post('/', async (req, res) => {
  try {
    const {
      carregamento_id,
      driver_id,
      data_retorno,
      horario_retorno,
      observacoes,
      status = 'pendente'
    } = req.body;
    
    console.log('📝 POST /api/retornos - Criando novo retorno');
    
    // Validações
    if (!carregamento_id || !driver_id || !data_retorno) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: carregamento_id, driver_id, data_retorno'
      });
    }
    
    // Verificar se carregamento existe
    const [carregamento] = await db.execute(
      'SELECT id FROM carregamentos WHERE id = ?', 
      [carregamento_id]
    );
    
    if (carregamento.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Carregamento não encontrado'
      });
    }
    
    // Verificar se motorista existe
    const [driver] = await db.execute(
      'SELECT id FROM drivers WHERE id = ?', 
      [driver_id]
    );
    
    if (driver.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Motorista não encontrado'
      });
    }
    
    // Inserir retorno
    const query = `
      INSERT INTO retornos (
        carregamento_id, driver_id, data_retorno, horario_retorno,
        observacoes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const [result] = await db.execute(query, [
      carregamento_id,
      driver_id,
      data_retorno,
      horario_retorno || null,
      observacoes || null,
      status
    ]);
    
    console.log(`✅ Retorno criado com ID: ${result.insertId}`);
    
    // Buscar o retorno criado com joins
    const [newRetorno] = await db.execute(`
      SELECT 
        r.*,
        c.numero_nf,
        d.name as driver_name
      FROM retornos r
      LEFT JOIN carregamentos c ON r.carregamento_id = c.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      WHERE r.id = ?
    `, [result.insertId]);
    
    res.status(201).json({
      success: true,
      message: 'Retorno criado com sucesso',
      data: newRetorno[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// PUT /api/retornos/:id - Atualizar retorno
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido fornecido'
      });
    }
    
    console.log(`📝 PUT /api/retornos/${id} - Atualizando retorno`);
    
    // Verificar se retorno existe
    const [existing] = await db.execute(
      'SELECT id FROM retornos WHERE id = ?', 
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Retorno com ID ${id} não encontrado`
      });
    }
    
    // Campos permitidos para atualização
    const allowedFields = [
      'data_retorno', 'horario_retorno', 'observacoes', 'status'
    ];
    
    const fieldsToUpdate = Object.keys(updateFields).filter(field => 
      allowedFields.includes(field)
    );
    
    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo válido fornecido para atualização'
      });
    }
    
    const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
    const values = fieldsToUpdate.map(field => updateFields[field]);
    values.push(id);
    
    const query = `UPDATE retornos SET ${setClause}, updated_at = NOW() WHERE id = ?`;
    
    await db.execute(query, values);
    
    console.log(`✅ Retorno ${id} atualizado com sucesso`);
    
    res.json({
      success: true,
      message: 'Retorno atualizado com sucesso',
      updated_fields: fieldsToUpdate
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// DELETE /api/retornos/:id - Remover retorno
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido fornecido'
      });
    }
    
    console.log(`🗑️ DELETE /api/retornos/${id} - Removendo retorno`);
    
    const [result] = await db.execute(
      'DELETE FROM retornos WHERE id = ?', 
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Retorno com ID ${id} não encontrado`
      });
    }
    
    console.log(`✅ Retorno ${id} removido com sucesso`);
    
    res.json({
      success: true,
      message: 'Retorno removido com sucesso',
      deleted_id: parseInt(id)
    });
    
  } catch (error) {
    console.error('❌ Erro ao remover retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

module.exports = router;