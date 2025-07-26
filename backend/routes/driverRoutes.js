// backend/routes/driverRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database');

// Middleware de autenticação
const { authMiddleware } = require('../middleware/authMiddleware');

// Aplicar middleware de autenticação a todas as rotas
router.use(authMiddleware);

// GET /api/drivers - Listar todos os motoristas
router.get('/', (req, res) => {
  const query = `
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
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao buscar motoristas:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    res.json(results);
  });
});

// GET /api/drivers/:id - Buscar motorista por ID
router.get('/:id', (req, res) => {
  const driverId = req.params.id;
  
  const query = `
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
  `;
  
  db.query(query, [driverId], (err, results) => {
    if (err) {
      console.error('Erro ao buscar motorista:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Motorista não encontrado' });
    }
    
    res.json(results[0]);
  });
});

// POST /api/drivers - Criar novo motorista
router.post('/', (req, res) => {
  const { name, phone, cpf, notes } = req.body;
  
  // Validações básicas
  if (!name || !phone || !cpf) {
    return res.status(400).json({ error: 'Nome, telefone e CPF são obrigatórios' });
  }
  
  // Validar CPF (11 dígitos)
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) {
    return res.status(400).json({ error: 'CPF deve ter 11 dígitos' });
  }
  
  // Verificar se CPF já existe
  const cpfCheck = 'SELECT id FROM drivers WHERE cpf = ?';
  db.query(cpfCheck, [cleanCpf], (err, cpfResults) => {
    if (err) {
      console.error('Erro ao verificar CPF:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (cpfResults.length > 0) {
      return res.status(400).json({ error: 'Este CPF já está cadastrado' });
    }
    
    // Inserir motorista (APENAS campos que existem na tabela)
    const insertQuery = `
      INSERT INTO drivers (name, phone, cpf, notes) 
      VALUES (?, ?, ?, ?)
    `;
    
    const values = [
      name.trim(),
      phone.trim(),
      cleanCpf,
      notes ? notes.trim() : null
    ];
    
    db.query(insertQuery, values, (err, result) => {
      if (err) {
        console.error('Erro ao criar motorista:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      res.status(201).json({
        message: 'Motorista criado com sucesso',
        driverId: result.insertId
      });
    });
  });
});

// PUT /api/drivers/:id - Atualizar motorista
router.put('/:id', (req, res) => {
  const driverId = req.params.id;
  const { name, phone, cpf, notes } = req.body;
  
  // Validações básicas
  if (!name || !phone || !cpf) {
    return res.status(400).json({ error: 'Nome, telefone e CPF são obrigatórios' });
  }
  
  // Validar CPF (11 dígitos)
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) {
    return res.status(400).json({ error: 'CPF deve ter 11 dígitos' });
  }
  
  // Verificar se motorista existe
  const driverCheck = 'SELECT id FROM drivers WHERE id = ?';
  db.query(driverCheck, [driverId], (err, driverResults) => {
    if (err) {
      console.error('Erro ao verificar motorista:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (driverResults.length === 0) {
      return res.status(404).json({ error: 'Motorista não encontrado' });
    }
    
    // Verificar se CPF já existe (exceto o próprio motorista)
    const cpfCheck = 'SELECT id FROM drivers WHERE cpf = ? AND id != ?';
    db.query(cpfCheck, [cleanCpf, driverId], (err, cpfResults) => {
      if (err) {
        console.error('Erro ao verificar CPF:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      if (cpfResults.length > 0) {
        return res.status(400).json({ error: 'Este CPF já está cadastrado' });
      }
      
      // Atualizar motorista
      const updateQuery = `
        UPDATE drivers 
        SET name = ?, phone = ?, cpf = ?, notes = ?
        WHERE id = ?
      `;
      
      const values = [
        name.trim(),
        phone.trim(),
        cleanCpf,
        notes ? notes.trim() : null,
        driverId
      ];
      
      db.query(updateQuery, values, (err, result) => {
        if (err) {
          console.error('Erro ao atualizar motorista:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        res.json({ message: 'Motorista atualizado com sucesso' });
      });
    });
  });
});

// DELETE /api/drivers/:id - Excluir motorista
router.delete('/:id', (req, res) => {
  const driverId = req.params.id;
  
  // Verificar se motorista existe
  const checkQuery = 'SELECT id, name FROM drivers WHERE id = ?';
  db.query(checkQuery, [driverId], (err, results) => {
    if (err) {
      console.error('Erro ao verificar motorista:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Motorista não encontrado' });
    }
    
    // Verificar se motorista tem carregamentos
    const loadingsCheck = 'SELECT COUNT(*) as loading_count FROM loadings WHERE driver_id = ?';
    db.query(loadingsCheck, [driverId], (err, loadingResults) => {
      if (err) {
        console.error('Erro ao verificar carregamentos:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      const loadingCount = loadingResults[0].loading_count;
      if (loadingCount > 0) {
        return res.status(400).json({ 
          error: 'Não é possível excluir motorista que possui carregamentos registrados' 
        });
      }
      
      // Excluir motorista
      const deleteQuery = 'DELETE FROM drivers WHERE id = ?';
      db.query(deleteQuery, [driverId], (err, result) => {
        if (err) {
          console.error('Erro ao excluir motorista:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        res.json({ message: 'Motorista excluído com sucesso' });
      });
    });
  });
});

module.exports = router;