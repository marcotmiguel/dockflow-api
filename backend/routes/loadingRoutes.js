const express = require('express');
const router = express.Router();
const pool = require('../database');
const jwt = require('jsonwebtoken');

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    console.log('❌ Token não fornecido no header Authorization');
    return res.status(401).json({ 
      message: 'Token não fornecido',
      timestamp: new Date().toISOString()
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'dockflow-secret-key', (err, user) => {
    if (err) {
      console.log('❌ Token inválido:', err.message);
      return res.status(403).json({ 
        message: 'Token inválido',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ Token válido para usuário:', user.username);
    req.user = user;
    next();
  });
};

// GET /api/loadings/today - Carregamentos do dia (REQUER AUTENTICAÇÃO)
router.get('/today', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Buscando carregamentos de hoje...');
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const [rows] = await pool.execute(`
      SELECT 
        l.id,
        l.truck_plate,
        l.driver_name,
        l.cargo_type,
        l.weight,
        l.origin,
        l.destination,
        l.status,
        l.scheduled_time,
        l.actual_start_time,
        l.actual_end_time,
        l.dock_id,
        d.name as dock_name,
        l.created_at,
        l.updated_at
      FROM loadings l
      LEFT JOIN docks d ON l.dock_id = d.id
      WHERE DATE(l.created_at) = ?
      ORDER BY l.created_at DESC
    `, [today]);
    
    console.log(`✅ Encontrados ${rows.length} carregamentos de hoje`);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length,
      date: today
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar carregamentos de hoje:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar carregamentos de hoje',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/loadings - Listar todos os carregamentos
router.get('/', async (req, res) => {
  try {
    console.log('📋 Buscando todos os carregamentos...');
    
    const [rows] = await pool.execute(`
      SELECT 
        l.id,
        l.truck_plate,
        l.driver_name,
        l.cargo_type,
        l.weight,
        l.origin,
        l.destination,
        l.status,
        l.scheduled_time,
        l.actual_start_time,
        l.actual_end_time,
        l.dock_id,
        d.name as dock_name,
        l.created_at,
        l.updated_at
      FROM loadings l
      LEFT JOIN docks d ON l.dock_id = d.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `);
    
    console.log(`✅ Encontrados ${rows.length} carregamentos`);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar carregamentos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar carregamentos',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/loadings/:id - Buscar carregamento específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Buscando carregamento ID: ${id}`);
    
    const [rows] = await pool.execute(`
      SELECT 
        l.id,
        l.truck_plate,
        l.driver_name,
        l.cargo_type,
        l.weight,
        l.origin,
        l.destination,
        l.status,
        l.scheduled_time,
        l.actual_start_time,
        l.actual_end_time,
        l.dock_id,
        d.name as dock_name,
        l.created_at,
        l.updated_at
      FROM loadings l
      LEFT JOIN docks d ON l.dock_id = d.id
      WHERE l.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Carregamento não encontrado',
        message: `Carregamento com ID ${id} não existe`,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Carregamento encontrado: ${rows[0].truck_plate}`);
    
    res.json({
      success: true,
      data: rows[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar carregamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar carregamento específico',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/loadings - Criar novo carregamento
router.post('/', async (req, res) => {
  try {
    const {
      truck_plate,
      driver_name,
      cargo_type,
      weight,
      origin,
      destination,
      scheduled_time,
      dock_id
    } = req.body;
    
    console.log('📝 Criando novo carregamento:', { truck_plate, driver_name, cargo_type });
    
    // Validação básica
    if (!truck_plate || !driver_name || !cargo_type) {
      return res.status(400).json({
        error: 'Dados obrigatórios ausentes',
        message: 'Placa, motorista e tipo de carga são obrigatórios',
        timestamp: new Date().toISOString()
      });
    }
    
    const [result] = await pool.execute(`
      INSERT INTO loadings (
        truck_plate, driver_name, cargo_type, weight, origin, destination,
        scheduled_time, dock_id, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
    `, [truck_plate, driver_name, cargo_type, weight, origin, destination, scheduled_time, dock_id]);
    
    console.log(`✅ Carregamento criado com ID: ${result.insertId}`);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        truck_plate,
        driver_name,
        cargo_type,
        weight,
        origin,
        destination,
        scheduled_time,
        dock_id,
        status: 'scheduled'
      },
      message: 'Carregamento criado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar carregamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao criar novo carregamento',
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/loadings/:id - Atualizar carregamento
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      truck_plate,
      driver_name,
      cargo_type,
      weight,
      origin,
      destination,
      scheduled_time,
      dock_id,
      status
    } = req.body;
    
    console.log(`📝 Atualizando carregamento ID: ${id}`);
    
    const [result] = await pool.execute(`
      UPDATE loadings 
      SET truck_plate = ?, driver_name = ?, cargo_type = ?, weight = ?,
          origin = ?, destination = ?, scheduled_time = ?, dock_id = ?, status = ?
      WHERE id = ?
    `, [truck_plate, driver_name, cargo_type, weight, origin, destination, scheduled_time, dock_id, status, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Carregamento não encontrado',
        message: `Carregamento com ID ${id} não existe`,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Carregamento ${id} atualizado com sucesso`);
    
    res.json({
      success: true,
      message: 'Carregamento atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar carregamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao atualizar carregamento',
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/loadings/:id - Deletar carregamento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deletando carregamento ID: ${id}`);
    
    const [result] = await pool.execute('DELETE FROM loadings WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Carregamento não encontrado',
        message: `Carregamento com ID ${id} não existe`,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Carregamento ${id} deletado com sucesso`);
    
    res.json({
      success: true,
      message: 'Carregamento deletado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao deletar carregamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao deletar carregamento',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;