// controllers/authController.js - Controlador de autenticação
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');

// 🔐 Login do usuário
const login = async (req, res) => {
  try {
    console.log('🔐 Tentativa de login:', req.body);
    
    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }

    // Buscar usuário no banco (convertido para promises)
    const [users] = await db.execute('SELECT * FROM users WHERE email = ? AND status = ?', [email, 'active']);

    if (users.length === 0) {
      console.log('❌ Usuário não encontrado:', email);
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }

    const user = users[0];
    
    // Verificar senha (suporta hash e senha simples)
    let passwordValid = false;
    
    if (user.password.startsWith('$2')) {
      // Senha hasheada
      passwordValid = await bcrypt.compare(password, user.password);
    } else {
      // Senha simples (para compatibilidade)
      passwordValid = password === user.password;
    }

    if (!passwordValid) {
      console.log('❌ Senha incorreta para:', email);
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }

    // Gerar token JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'dockflow_secret_key_2024';
    
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Atualizar último login
    try {
      await db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    } catch (updateErr) {
      console.error('⚠️ Erro ao atualizar last_login:', updateErr);
    }

    console.log('✅ Login bem-sucedido para:', user.email);

    // Resposta compatível com auth.js
    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// 🔒 Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acesso requerido'
    });
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'dockflow_secret_key_2024';
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    req.user = user;
    next();
  });
};

// 🛡️ Middleware de autorização por role
const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para este tipo de usuário'
      });
    }

    next();
  };
};

module.exports = {
  login,
  authenticateToken,
  authorizeRole
};