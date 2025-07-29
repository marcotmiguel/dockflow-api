// backend/routes/userRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { db } = require('../config/database');

// Middleware de autenticação
const { authMiddleware } = require('../middleware/authMiddleware');

// Aplicar middleware de autenticação a todas as rotas
router.use(authMiddleware);

// GET /api/users - Listar todos os usuários
router.get('/', (req, res) => {
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
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao buscar usuários:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    res.json(results);
  });
});

// GET /api/users/:id - Buscar usuário por ID
router.get('/:id', (req, res) => {
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
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Erro ao buscar usuário:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    res.json(results[0]);
  });
});

// POST /api/users - Criar novo usuário
router.post('/', async (req, res) => {
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
  
  try {
    // Verificar se email já existe
    const emailCheck = 'SELECT id FROM users WHERE email = ?';
    db.query(emailCheck, [email.toLowerCase()], async (err, emailResults) => {
      if (err) {
        console.error('Erro ao verificar email:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      if (emailResults.length > 0) {
        return res.status(400).json({ error: 'Este email já está em uso' });
      }
      
      // Verificar se CPF já existe
      const cpfCheck = 'SELECT id FROM users WHERE cpf = ?';
      db.query(cpfCheck, [cleanCpf], async (err, cpfResults) => {
        if (err) {
          console.error('Erro ao verificar CPF:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
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
        
        db.query(insertQuery, values, (err, result) => {
          if (err) {
            console.error('Erro ao criar usuário:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
          }
          
          res.status(201).json({
            message: 'Usuário criado com sucesso',
            userId: result.insertId
          });
        });
      });
    });
  } catch (error) {
    console.error('Erro ao processar criação de usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/users/:id - Atualizar usuário
router.put('/:id', async (req, res) => {
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
  
  try {
    // Verificar se usuário existe
    const userCheck = 'SELECT id FROM users WHERE id = ?';
    db.query(userCheck, [userId], async (err, userResults) => {
      if (err) {
        console.error('Erro ao verificar usuário:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      if (userResults.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      // Verificar se email já existe (exceto o próprio usuário)
      const emailCheck = 'SELECT id FROM users WHERE email = ? AND id != ?';
      db.query(emailCheck, [email.toLowerCase(), userId], async (err, emailResults) => {
        if (err) {
          console.error('Erro ao verificar email:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (emailResults.length > 0) {
          return res.status(400).json({ error: 'Este email já está em uso' });
        }
        
        // Verificar se CPF já existe (exceto o próprio usuário)
        const cpfCheck = 'SELECT id FROM users WHERE cpf = ? AND id != ?';
        db.query(cpfCheck, [cleanCpf, userId], async (err, cpfResults) => {
          if (err) {
            console.error('Erro ao verificar CPF:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
          }
          
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
          
          db.query(updateQuery, values, (err, result) => {
            if (err) {
              console.error('Erro ao atualizar usuário:', err);
              return res.status(500).json({ error: 'Erro interno do servidor' });
            }
            
            res.json({ message: 'Usuário atualizado com sucesso' });
          });
        });
      });
    });
  } catch (error) {
    console.error('Erro ao processar atualização de usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/users/:id - Excluir usuário
router.delete('/:id', (req, res) => {
  const userId = req.params.id;
  
  // Verificar se usuário existe
  const checkQuery = 'SELECT id, name FROM users WHERE id = ?';
  db.query(checkQuery, [userId], (err, results) => {
    if (err) {
      console.error('Erro ao verificar usuário:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se é o último admin
    const adminCheckQuery = 'SELECT COUNT(*) as admin_count FROM users WHERE role = "admin" AND status = "active"';
    db.query(adminCheckQuery, (err, adminResults) => {
      if (err) {
        console.error('Erro ao verificar admins:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      const adminCount = adminResults[0].admin_count;
      
      // Verificar se o usuário a ser excluído é admin
      const userRoleQuery = 'SELECT role FROM users WHERE id = ?';
      db.query(userRoleQuery, [userId], (err, roleResults) => {
        if (err) {
          console.error('Erro ao verificar role do usuário:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (roleResults[0].role === 'admin' && adminCount <= 1) {
          return res.status(400).json({ error: 'Não é possível excluir o último administrador do sistema' });
        }
        
        // Excluir usuário
        const deleteQuery = 'DELETE FROM users WHERE id = ?';
        db.query(deleteQuery, [userId], (err, result) => {
          if (err) {
            console.error('Erro ao excluir usuário:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
          }
          
          res.json({ message: 'Usuário excluído com sucesso' });
        });
      });
    });
  });
});

// POST /api/users/:id/reset-password - Resetar senha
router.post('/:id/reset-password', async (req, res) => {
  const userId = req.params.id;
  const { password } = req.body;
  
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
  }
  
  try {
    // Verificar se usuário existe
    const userCheck = 'SELECT id, name FROM users WHERE id = ?';
    db.query(userCheck, [userId], async (err, results) => {
      if (err) {
        console.error('Erro ao verificar usuário:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Atualizar senha
      const updateQuery = 'UPDATE users SET password = ? WHERE id = ?';
      db.query(updateQuery, [hashedPassword, userId], (err, result) => {
        if (err) {
          console.error('Erro ao resetar senha:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        res.json({ message: 'Senha resetada com sucesso' });
      });
    });
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