const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { db } = require('../database');

// GET /api/users - Listar todos os usuários
router.get('/', async (req, res) => {
  try {
    console.log('📋 Buscando lista de usuários...');
    
    const [rows] = await db.execute(`
      SELECT 
        id, 
        name, 
        email, 
        role, 
        status, 
        notes,
        last_login,
        created_at, 
        updated_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log(`✅ Encontrados ${rows.length} usuários`);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar lista de usuários',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/users/:id - Buscar usuário por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Buscando usuário ID: ${id}`);
    
    const [rows] = await db.execute(`
      SELECT 
        id, 
        name, 
        email, 
        role, 
        status, 
        notes,
        last_login,
        created_at, 
        updated_at 
      FROM users 
      WHERE id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        message: `Usuário com ID ${id} não existe`,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Usuário encontrado: ${rows[0].name}`);
    
    res.json({
      success: true,
      data: rows[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao buscar usuário específico',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/users - Criar novo usuário
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role = 'operator', status = 'active', notes } = req.body;
    
    console.log('📝 Criando novo usuário:', { name, email, role });
    
    // Validações básicas
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Dados obrigatórios ausentes',
        message: 'Nome, email e senha são obrigatórios',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Email inválido',
        message: 'Formato de email inválido',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validar senha
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Senha inválida',
        message: 'Senha deve ter pelo menos 6 caracteres',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validar role
    if (!['operator', 'analyst', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Nível de acesso inválido',
        message: 'Use: operator, analyst ou admin',
        timestamp: new Date().toISOString()
      });
    }
    
    // Verificar se email já existe
    const [existingUsers] = await db.execute('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({
        error: 'Email já cadastrado',
        message: 'Este email já está em uso por outro usuário',
        timestamp: new Date().toISOString()
      });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Inserir usuário
    const [result] = await db.execute(`
      INSERT INTO users (name, email, password, role, status, notes) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      name.trim(),
      email.toLowerCase().trim(),
      hashedPassword,
      role,
      status,
      notes ? notes.trim() : null
    ]);
    
    console.log(`✅ Usuário criado com ID: ${result.insertId}`);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role,
        status,
        notes: notes ? notes.trim() : null
      },
      message: 'Usuário criado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao criar novo usuário',
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/users/:id - Atualizar usuário
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status, notes } = req.body;
    
    console.log(`📝 Atualizando usuário ID: ${id}`);
    
    // Validações básicas
    if (!name || !email) {
      return res.status(400).json({
        error: 'Dados obrigatórios ausentes',
        message: 'Nome e email são obrigatórios',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Email inválido',
        message: 'Formato de email inválido',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validar role
    if (role && !['operator', 'analyst', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Nível de acesso inválido',
        message: 'Use: operator, analyst ou admin',
        timestamp: new Date().toISOString()
      });
    }
    
    // Verificar se email já existe para outro usuário
    const [existingUsers] = await db.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email.toLowerCase(), id]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({
        error: 'Email já cadastrado',
        message: 'Este email já está em uso por outro usuário',
        timestamp: new Date().toISOString()
      });
    }
    
    // Preparar query de atualização
    let updateQuery = `
      UPDATE users 
      SET name = ?, email = ?, role = ?, status = ?, notes = ?
    `;
    
    let values = [
      name.trim(),
      email.toLowerCase().trim(),
      role || 'operator',
      status || 'active',
      notes ? notes.trim() : null
    ];
    
    // Se senha foi fornecida, incluir na atualização
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({
          error: 'Senha inválida',
          message: 'Senha deve ter pelo menos 6 caracteres',
          timestamp: new Date().toISOString()
        });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = ?';
      values.push(hashedPassword);
    }
    
    updateQuery += ' WHERE id = ?';
    values.push(id);
    
    const [result] = await db.execute(updateQuery, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        message: `Usuário com ID ${id} não existe`,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Usuário ${id} atualizado com sucesso`);
    
    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao atualizar usuário',
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/users/:id - Excluir usuário
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deletando usuário ID: ${id}`);
    
    // Verificar se é o último admin
    const [adminCount] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = "admin" AND status = "active"');
    
    // Verificar se o usuário a ser excluído é admin
    const [userRole] = await db.execute('SELECT role FROM users WHERE id = ?', [id]);
    
    if (userRole.length > 0 && userRole[0].role === 'admin' && adminCount[0].count <= 1) {
      return res.status(400).json({
        error: 'Operação não permitida',
        message: 'Não é possível excluir o último administrador do sistema',
        timestamp: new Date().toISOString()
      });
    }
    
    // Excluir usuário
    const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        message: `Usuário com ID ${id} não existe`,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Usuário ${id} excluído com sucesso`);
    
    res.json({
      success: true,
      message: 'Usuário excluído com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao excluir usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao excluir usuário',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/users/:id/reset-password - Resetar senha
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    console.log(`🔐 Resetando senha do usuário ID: ${id}`);
    
    if (!password || password.length < 6) {
      return res.status(400).json({
        error: 'Senha inválida',
        message: 'Nova senha deve ter pelo menos 6 caracteres',
        timestamp: new Date().toISOString()
      });
    }
    
    // Verificar se usuário existe
    const [userExists] = await db.execute('SELECT id, name FROM users WHERE id = ?', [id]);
    
    if (userExists.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        message: `Usuário com ID ${id} não existe`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Atualizar senha
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
    
    console.log(`✅ Senha do usuário ${id} resetada com sucesso`);
    
    res.json({
      success: true,
      message: 'Senha resetada com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao resetar senha:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Erro ao resetar senha',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/users/:id/actions - Buscar ações do usuário (placeholder)
router.get('/:id/actions', (req, res) => {
  console.log(`📋 Buscando ações do usuário ID: ${req.params.id}`);
  
  // Por enquanto retorna array vazio
  // Futuramente pode implementar log de auditoria
  res.json({
    success: true,
    data: [],
    count: 0,
    message: 'Log de auditoria será implementado futuramente'
  });
});

module.exports = router;