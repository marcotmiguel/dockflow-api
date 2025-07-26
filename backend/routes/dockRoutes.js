// backend/routes/dockRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database');

// Listar todas as docas
router.get('/', (req, res) => {
  db.query('SELECT * FROM docks ORDER BY name', (err, results) => {
    if (err) {
      console.error('Erro ao buscar docas:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    res.json(results);
  });
});

// Buscar doca por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.query('SELECT * FROM docks WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('Erro ao buscar doca:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Doca não encontrada' });
    }
    
    res.json(results[0]);
  });
});

// Criar nova doca
router.post('/', (req, res) => {
  const { name, status = 'available' } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Nome da doca é obrigatório' });
  }
  
  db.query('INSERT INTO docks (name, status) VALUES (?, ?)', [name, status], (err, result) => {
    if (err) {
      console.error('Erro ao criar doca:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    res.status(201).json({
      id: result.insertId,
      name,
      status,
      message: 'Doca criada com sucesso'
    });
  });
});

// Atualizar doca
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;
  
  db.query('UPDATE docks SET name = ?, status = ? WHERE id = ?', [name, status, id], (err, result) => {
    if (err) {
      console.error('Erro ao atualizar doca:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Doca não encontrada' });
    }
    
    res.json({ message: 'Doca atualizada com sucesso' });
  });
});

// Deletar doca
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.query('DELETE FROM docks WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error('Erro ao deletar doca:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Doca não encontrada' });
    }
    
    res.json({ message: 'Doca deletada com sucesso' });
  });
});

module.exports = router;