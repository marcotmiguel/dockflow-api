const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET /api/drivers - Listar todos os motoristas
router.get('/', async (req, res) => {
  try {
    console.log('📋 Buscando lista de motoristas...');
    
    const [rows] = await db.execute(`
      SELECT 
        id, 
        name, 
        phone, 
        cpf,
        notes,
        created_at, 
        updated_at 
      FROM drivers 
      ORDER BY created_at DESC
    `);
    
    console.log(`✅ Encontrados ${rows.length} motoristas`);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar motoristas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar lista de motoristas',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/drivers/:id - Buscar motorista por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Buscando motorista ID: ${id}`);
    
    const [rows] = await db.execute(`
      SELECT 
        id, 
        name, 
        phone, 
        cpf,
        notes,
        created_at, 
        updated_at 
      FROM drivers 
      WHERE id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Motorista não encontrado',
        message: `Motorista com ID ${id} não existe`,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Motorista encontrado: ${rows[0].name}`);
    
    res.json({
      success: true,
      data: rows[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar motorista:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar motorista específico',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/drivers - Criar novo motorista
router.post('/', async (req, res) => {
  try {
    const { name, phone, cpf, notes } = req.body;
    
    console.log('📝 Criando novo motorista:', { name, phone, cpf });
    
    // Validações básicas
    if (!name || !phone || !cpf) {
      return res.status(400).json({
        error: 'Dados obrigatórios ausentes',
        message: 'Nome, telefone e CPF são obrigatórios',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validar CPF (11 dígitos)
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return res.status(400).json({
        error: 'CPF inválido',
        message: 'CPF deve ter 11 dígitos',
        timestamp: new Date().toISOString()
      });
    }
    
    // Verificar se CPF já existe
    const [existingDrivers] = await db.execute(
      'SELECT id FROM drivers WHERE cpf = ?', 
      [cleanCpf]
    );
    
    if (existingDrivers.length > 0) {
      return res.status(400).json({
        error: 'CPF já cadastrado',
        message: 'Este CPF já está cadastrado para outro motorista',
        timestamp: new Date().toISOString()
      });
    }
    
    // Inserir motorista
    const [result] = await db.execute(`
      INSERT INTO drivers (name, phone, cpf, notes) 
      VALUES (?, ?, ?, ?)
    `, [
      name.trim(),
      phone.trim(),
      cleanCpf,
      notes ? notes.trim() : null
    ]);
    
    console.log(`✅ Motorista criado com ID: ${result.insertId}`);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name: name.trim(),
        phone: phone.trim(),
        cpf: cleanCpf,
        notes: notes ? notes.trim() : null
      },
      message: 'Motorista criado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar motorista:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao criar novo motorista',
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/drivers/:id - Atualizar motorista
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, cpf, notes } = req.body;
    
    console.log(`📝 Atualizando motorista ID: ${id}`);
    
    // Validações básicas
    if (!name || !phone || !cpf) {
      return res.status(400).json({
        error: 'Dados obrigatórios ausentes',
        message: 'Nome, telefone e CPF são obrigatórios',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validar CPF (11 dígitos)
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return res.status(400).json({
        error: 'CPF inválido',
        message: 'CPF deve ter 11 dígitos',
        timestamp: new Date().toISOString()
      });
    }
    
    // Verificar se CPF já existe para outro motorista
    const [existingDrivers] = await db.execute(
      'SELECT id FROM drivers WHERE cpf = ? AND id != ?', 
      [cleanCpf, id]
    );
    
    if (existingDrivers.length > 0) {
      return res.status(400).json({
        error: 'CPF já cadastrado',
        message: 'Este CPF já está cadastrado para outro motorista',
        timestamp: new Date().toISOString()
      });
    }
    
    // Atualizar motorista
    const [result] = await db.execute(`
      UPDATE drivers 
      SET name = ?, phone = ?, cpf = ?, notes = ?
      WHERE id = ?
    `, [
      name.trim(),
      phone.trim(),
      cleanCpf,
      notes ? notes.trim() : null,
      id
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Motorista não encontrado',
        message: `Motorista com ID ${id} não existe`,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Motorista ${id} atualizado com sucesso`);
    
    res.json({
      success: true,
      message: 'Motorista atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar motorista:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao atualizar motorista',
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/drivers/:id - Excluir motorista
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deletando motorista ID: ${id}`);
    
    // Verificar se motorista tem carregamentos
    const [loadings] = await db.execute(
      'SELECT COUNT(*) as count FROM loadings WHERE driver_id = ?', 
      [id]
    );
    
    if (loadings[0].count > 0) {
      console.log(`❌ Motorista ${id} está associado a carregamentos`);
      return res.status(400).json({
        error: 'Motorista possui carregamentos',
        message: 'Não é possível excluir motorista que possui carregamentos registrados',
        timestamp: new Date().toISOString()
      });
    }
    
    // Excluir motorista
    const [result] = await db.execute('DELETE FROM drivers WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Motorista não encontrado',
        message: `Motorista com ID ${id} não existe`,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Motorista ${id} excluído com sucesso`);
    
    res.json({
      success: true,
      message: 'Motorista excluído com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao excluir motorista:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao excluir motorista',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;