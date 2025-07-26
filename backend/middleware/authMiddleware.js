// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// Middleware para verificar token JWT
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return res.status(401).json({ message: 'Erro no formato do token' });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ message: 'Token mal formatado' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'suachavesecreta', (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token inválido ou expirado' });
    }

    // Compatibilidade com req.user esperado nas rotas
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    return next();
  });
};

// Middleware para verificar função de administrador
const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado: permissão de administrador necessária' });
  }
  return next();
};

// Middleware para verificar função de gerente ou superior
const managerMiddleware = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Acesso negado: permissão de gerente necessária' });
  }
  return next();
};

// Middleware para debug de autenticação (temporário)
const debugAuth = (req, res, next) => {
  console.log('Authorization Header:', req.headers.authorization);
  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  managerMiddleware,
  debugAuth
};
