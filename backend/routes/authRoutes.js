// backend/routes/authRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Usar a mesma conexão do database.js
const db = require('../database');

// Rota de login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios' });
  }
  
  // Buscar usuário pelo email
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Erro ao buscar usuário:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    if (results.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    const user = results[0];
    
    // Verificar senha
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Erro ao verificar senha:', err);
        return res.status(500).json({ message: 'Erro interno do servidor' });
      }
      
      if (!isMatch) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }
      
      // Gerar token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        'suachavesecreta', // Chave secreta para assinar o token
        { expiresIn: '8h' }
      );
      
      res.json({
        message: 'Login realizado com sucesso',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    });
  });
});

// Middleware para verificar token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  
  if (!token) {
    return res.status(401).json({ message: 'Token de acesso requerido' });
  }
  
  // Remover 'Bearer ' do token se presente
  const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
  
  jwt.verify(cleanToken, 'suachavesecreta', (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    
    req.user = decoded;
    next();
  });
};

// Rota para verificar se o token é válido
router.get('/verify', verifyToken, (req, res) => {
  res.json({
    message: 'Token válido',
    user: req.user
  });
});

module.exports = router;