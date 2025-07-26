// backend/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, managerMiddleware } = require('../middleware/authMiddleware');

// Obter todos os produtos
router.get('/', authMiddleware, (req, res) => {
  db.query('SELECT * FROM products ORDER BY name', (err, results) => {
    if (err) {
      console.error('Erro ao obter produtos:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    res.json(results);
  });
});

// Obter produto por ID
router.get('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('Erro ao obter produto:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    
    res.json(results[0]);
  });
});

// Obter produto por código
router.get('/code/:code', authMiddleware, (req, res) => {
  const { code } = req.params;
  
  db.query('SELECT * FROM products WHERE code = ?', [code], (err, results) => {
    if (err) {
      console.error('Erro ao obter produto por código:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    
    res.json(results[0]);
  });
});

// Criar novo produto
router.post('/', authMiddleware, managerMiddleware, (req, res) => {
  const { name, code, description } = req.body;
  
  if (!name || !code) {
    return res.status(400).json({ message: 'Nome e código do produto são obrigatórios' });
  }
  
  // Verificar se código já existe
  db.query('SELECT id FROM products WHERE code = ?', [code], (err, results) => {
    if (err) {
      console.error('Erro ao verificar código de produto:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    if (results.length > 0) {
      return res.status(400).json({ message: 'Código de produto já existe' });
    }
    
    const newProduct = {
      name,
      code,
      description: description || null
    };
    
    db.query('INSERT INTO products SET ?', newProduct, (err, result) => {
      if (err) {
        console.error('Erro ao criar produto:', err);
        return res.status(500).json({ message: 'Erro interno do servidor' });
      }
      
      res.status(201).json({
        id: result.insertId,
        ...newProduct
      });
    });
  });
});

// Atualizar produto
router.put('/:id', authMiddleware, managerMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, code, description } = req.body;
  
  if (!name || !code) {
    return res.status(400).json({ message: 'Nome e código do produto são obrigatórios' });
  }
  
  // Verificar se código já existe em outro produto
  db.query('SELECT id FROM products WHERE code = ? AND id != ?', [code, id], (err, results) => {
    if (err) {
      console.error('Erro ao verificar código de produto:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    if (results.length > 0) {
      return res.status(400).json({ message: 'Código de produto já existe em outro produto' });
    }
    
    const updateQuery = `
      UPDATE products 
      SET name = ?, code = ?, description = ?
      WHERE id = ?
    `;
    
    db.query(updateQuery, [name, code, description, id], (err, result) => {
      if (err) {
        console.error('Erro ao atualizar produto:', err);
        return res.status(500).json({ message: 'Erro interno do servidor' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Produto não encontrado' });
      }
      
      res.json({
        id: parseInt(id),
        name,
        code,
        description
      });
    });
  });
});

// Excluir produto
router.delete('/:id', authMiddleware, managerMiddleware, (req, res) => {
  const { id } = req.params;
  
  // Verificar se produto está sendo usado em algum carregamento
  const checkUsageQuery = `
    SELECT COUNT(*) as count 
    FROM loading_items 
    WHERE product_id = ?
  `;
  
  db.query(checkUsageQuery, [id], (err, results) => {
    if (err) {
      console.error('Erro ao verificar uso do produto:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    if (results[0].count > 0) {
      return res.status(400).json({ 
        message: 'Este produto está sendo usado em carregamentos e não pode ser excluído'
      });
    }
    
    // Excluir produto se não estiver em uso
    db.query('DELETE FROM products WHERE id = ?', [id], (err, result) => {
      if (err) {
        console.error('Erro ao excluir produto:', err);
        return res.status(500).json({ message: 'Erro interno do servidor' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Produto não encontrado' });
      }
      
      res.json({ message: 'Produto excluído com sucesso' });
    });
  });
});

module.exports = router;
