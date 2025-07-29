// backend/routes/userRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { db } = require('../database');

// Middleware de autenticação
const { authMiddleware } = require('../middleware/authMiddleware');

// 🧪 ROTA DE TESTE SEM AUTENTICAÇÃO (ANTES do middleware)
router.post('/test-no-auth', (req, res) => {
  console.log('🧪 Teste sem auth executado');
  res.json({ 
    message: 'Teste sem autenticação OK', 
    timestamp: new Date(),
    body: req.body
  });
});

// Aplicar middleware de autenticação a todas as rotas APÓS este ponto
router.use(authMiddleware);

// 🧪 ROTA DE TESTE 1: Sem banco, com autenticação
router.post('/test-simple', (req, res) => {
  console.log('🧪 Teste simples executado');
  res.json({ 
    message: 'Teste simples OK', 
    timestamp: new Date(),
    body: req.body
  });
});

// 🧪 ROTA DE TESTE 2: Com banco, com autenticação
router.post('/test-db', async (req, res) => {
  try {
    console.log('🧪 Teste com banco executado');
    
    // Query simples para testar banco
    const [results] = await db.execute('SELECT 1 as test');
    
    console.log('✅ Banco funcionando no teste');
    res.json({ 
      message: 'Teste com banco OK', 
      timestamp: new Date(),
      dbResult: results[0]
    });
  } catch (err) {
    console.error('❌ Erro no teste de banco:', err);
    res.status(500).json({ error: 'Erro no banco', details: err.message });
  }
});

// GET /api/users - Listar todos os usuários
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        id, 
        name, 
        email, 
        cpf, 
        phone, 
        role, 
        status, 
        notes,
        last_login,
        created_at, 
        updated_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    
    const [results] = await db.execute(query);
    res.json(results);
    
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/users/:id - Buscar usuário por ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    const query = `
      SELECT 
        id, 
        name, 
        email, 
        cpf, 
        phone, 
        role, 
        status, 
        notes,
        last_login,
        created_at, 
        updated_at 
      FROM users 
      WHERE id = ?
    `;
    
    const [results] = await db.execute(query, [userId]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    res.json(results[0]);
    
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/users - Criar novo usuário
router.post('/', async (req, res) => {
  try {
    const { name, email, cpf, phone, password, role, status, notes } = req.body;
    
    // Validações básicas
    if (!name || !email || !cpf || !password) {
      return res.status(400).json({ error: 'Nome, email, CPF e senha são obrigatórios' });
    }
    
    if (!['admin', 'manager', 'operator'].includes(role)) {
      return res.status(400).json({ error: 'Nível de acesso inválido' });
    }
    
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    
    // Validar CPF (11 dígitos)
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return res.status(400).json({ error: 'CPF deve ter 11 dígitos' });
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    
    // Validar senha
    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }
    
    // Verificar se email já existe
    const emailCheck = 'SELECT id FROM users WHERE email = ?';
    const [emailResults] = await db.execute(emailCheck, [email.toLowerCase()]);
    
    if (emailResults.length > 0) {
      return res.status(400).json({ error: 'Este email já está em uso' });
    }
    
    // Verificar se CPF já existe
    const cpfCheck = 'SELECT id FROM users WHERE cpf = ?';
    const [cpfResults] = await db.execute(cpfCheck, [cleanCpf]);
    
    if (cpfResults.length > 0) {
      return res.status(400).json({ error: 'Este CPF já está cadastrado' });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Inserir usuário
    const insertQuery = `
      INSERT INTO users (name, email, cpf, phone, password, role, status, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      name.trim(),
      email.toLowerCase().trim(),
      cleanCpf,
      phone ? phone.trim() : null,
      hashedPassword,
      role,
      status,
      notes ? notes.trim() : null
    ];
    
    const [result] = await db.execute(insertQuery, values);
    
    res.status(201).json({
      message: 'Usuário criado com sucesso',
      userId: result.insertId
    });
    
  } catch (error) {
    console.error('Erro ao processar criação de usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/users/:id - Atualizar usuário
router.put('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, cpf, phone, password, role, status, notes } = req.body;
    
    // Validações básicas
    if (!name || !email || !cpf) {
      return res.status(400).json({ error: 'Nome, email e CPF são obrigatórios' });
    }
    
    if (!['admin', 'manager', 'operator'].includes(role)) {
      return res.status(400).json({ error: 'Nível de acesso inválido' });
    }
    
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    
    // Validar CPF (11 dígitos)
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return res.status(400).json({ error: 'CPF deve ter 11 dígitos' });
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    
    // Verificar se usuário existe
    const userCheck = 'SELECT id FROM users WHERE id = ?';
    const [userResults] = await db.execute(userCheck, [userId]);
    
    if (userResults.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se email já existe (exceto o próprio usuário)
    const emailCheck = 'SELECT id FROM users WHERE email = ? AND id != ?';
    const [emailResults] = await db.execute(emailCheck, [email.toLowerCase(), userId]);
    
    if (emailResults.length > 0) {
      return res.status(400).json({ error: 'Este email já está em uso' });
    }
    
    // Verificar se CPF já existe (exceto o próprio usuário)
    const cpfCheck = 'SELECT id FROM users WHERE cpf = ? AND id != ?';
    const [cpfResults] = await db.execute(cpfCheck, [cleanCpf, userId]);
    
    if (cpfResults.length > 0) {
      return res.status(400).json({ error: 'Este CPF já está cadastrado' });
    }
    
    // Preparar query de atualização
    let updateQuery = `
      UPDATE users 
      SET name = ?, email = ?, cpf = ?, phone = ?, role = ?, status = ?, notes = ?
    `;
    
    let values = [
      name.trim(),
      email.toLowerCase().trim(),
      cleanCpf,
      phone ? phone.trim() : null,
      role,
      status,
      notes ? notes.trim() : null
    ];
    
    // Se senha foi fornecida, incluir na atualização
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = ?';
      values.push(hashedPassword);
    }
    
    updateQuery += ' WHERE id = ?';
    values.push(userId);
    
    await db.execute(updateQuery, values);
    
    res.json({ message: 'Usuário atualizado com sucesso' });
    
  } catch (error) {
    console.error('Erro ao processar atualização de usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/users/:id - Excluir usuário
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Verificar se usuário existe
    const checkQuery = 'SELECT id, name FROM users WHERE id = ?';
    const [results] = await db.execute(checkQuery, [userId]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se é o último admin
    const adminCheckQuery = 'SELECT COUNT(*) as admin_count FROM users WHERE role = "admin" AND status = "active"';
    const [adminResults] = await db.execute(adminCheckQuery);
    
    const adminCount = adminResults[0].admin_count;
    
    // Verificar se o usuário a ser excluído é admin
    const userRoleQuery = 'SELECT role FROM users WHERE id = ?';
    const [roleResults] = await db.execute(userRoleQuery, [userId]);
    
    if (roleResults[0].role === 'admin' && adminCount <= 1) {
      return res.status(400).json({ error: 'Não é possível excluir o último administrador do sistema' });
    }
    
    // Excluir usuário
    const deleteQuery = 'DELETE FROM users WHERE id = ?';
    await db.execute(deleteQuery, [userId]);
    
    res.json({ message: 'Usuário excluído com sucesso' });
    
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/users/:id/reset-password - Resetar senha
router.post('/:id/reset-password', async (req, res) => {
  try {
    const userId = req.params.id;
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }
    
    // Verificar se usuário existe
    const userCheck = 'SELECT id, name FROM users WHERE id = ?';
    const [results] = await db.execute(userCheck, [userId]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Atualizar senha
    const updateQuery = 'UPDATE users SET password = ? WHERE id = ?';
    await db.execute(updateQuery, [hashedPassword, userId]);
    
    res.json({ message: 'Senha resetada com sucesso' });
    
  } catch (error) {
    console.error('Erro ao processar reset de senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/users/:id/actions - Buscar ações do usuário (placeholder)
router.get('/:id/actions', (req, res) => {
  // Por enquanto retorna array vazio
  // Futuramente pode implementar log de auditoria
  res.json([]);
});

module.exports = router;