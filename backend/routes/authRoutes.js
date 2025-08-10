// routes/authRoutes.js - BACKEND Authentication Routes (Node.js)
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// ✅ CAMINHO CORRIGIDO para a estrutura atual
const { db } = require('../database'); // Era '../config/database'
const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'dockflow_super_secret_key_2025';

// 🔁 Normalização de roles — aceita variações comuns
function normalizeRole(role) {
  if (!role) return '';
  const r = String(role).toLowerCase().trim();
  const map = {
    developer: 'desenvolvedor',
    dev: 'desenvolvedor',
    manager: 'admin',
    analyst: 'analista',
    operator: 'operador'
  };
  return map[r] || r;
}


console.log('🔐 AuthRoutes carregado - Backend Node.js');
// 🔐 Autenticação via JWT
const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers['authorization'] || req.headers['Authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token não fornecido' });
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // (Preferível) Carrega usuário do DB pelo e-mail do token
    let userFromDb = null;
    try {
      if (decoded?.email && typeof db?.execute === 'function') {
        const [rows] = await db.execute(
          'SELECT id, name, email, role, status FROM users WHERE email = ? LIMIT 1',
          [decoded.email]
        );
        userFromDb = rows && rows[0] ? rows[0] : null;
      }
    } catch (e) {
      console.warn('⚠️ authMiddleware: fallback para dados do token (DB indisponível):', e?.message);
    }

    const source = userFromDb || decoded || {};
    req.user = {
      id: source.id || decoded.id || null,
      name: source.name || decoded.name || null,
      email: source.email || decoded.email || null,
      role: normalizeRole(source.role || decoded.role || '')
    };

    if (userFromDb && userFromDb.status && userFromDb.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Usuário inativo.' });
    }

    return next();
  } catch (err) {
    console.error('❌ Erro no middleware de auth:', err);
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
  }
};


// 🔐 POST /api/auth/login
router.post('/login', async (req, res) => {
  console.log('🔐 Tentativa de login:', req.body?.email);
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }

    // Buscar usuário no banco
    const [users] = await db.execute(
      'SELECT * FROM users WHERE email = ? AND status = "active"',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    const user = users[0];
    
    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Gerar JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`✅ Login realizado: ${user.email} (${user.role})`);

    // Resposta de sucesso
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: getPermissionsByRole(user.role)
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// 🚪 POST /api/auth/logout
router.post('/logout', authMiddleware, (req, res) => {
  console.log('🚪 Logout realizado:', req.user.email);
  
  res.json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
});

// 👤 GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ? AND status = "active"',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const user = users[0];

    res.json({
      success: true,
      data: {
        ...user,
        permissions: getPermissionsByRole(user.role)
      }
    });

  } catch (error) {
    console.error('❌ Erro ao obter dados do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// 🔧 GET /api/auth/check-developer
router.get('/check-developer', authMiddleware, (req, res) => {
  const isDeveloper = req.user.role === 'desenvolvedor';
  
  res.json({
    success: true,
    data: {
      isDeveloper,
      role: req.user.role
    }
  });
});

// 🔑 POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Nova senha deve ter pelo menos 6 caracteres'
      });
    }

    // Buscar senha atual do usuário
    const [users] = await db.execute(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar senha atual
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
    
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    // Hash da nova senha
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    
    // Atualizar senha
    await db.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, req.user.id]
    );

    console.log(`✅ Senha alterada: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao alterar senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Função para obter permissões por role
function getPermissionsByRole(role) {
  const permissions = {
    'operador': [
      'view_dashboard',
      'create_retorno',
      'view_own_retornos'
    ],
    'analista': [
      'view_dashboard',
      'create_retorno', 
      'view_own_retornos',
      'manage_retornos',
      'view_reports',
      'edit_retorno'
    ],
    'admin': [
      'view_dashboard',
      'create_retorno',
      'view_own_retornos', 
      'manage_retornos',
      'view_reports',
      'edit_retorno',
      'manage_users',
      'view_analytics',
      'system_config'
    ],
    'desenvolvedor': ['*'] // Todas as permissões
  };
  
  return permissions[role] || [];
}

// 🛡️ Exige hierarquia mínima de role
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    const roleHierarchy = {
      'operador': 1,
      'analista': 2,
      'admin': 3,
      'desenvolvedor': 4 // topo
    };

    const userRole = normalizeRole(req.user?.role);
    const need = normalizeRole(requiredRole);

    if ((roleHierarchy[userRole] || 0) >= (roleHierarchy[need] || 0)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Acesso negado. Requer role: ${requiredRole}`
    });
  };
};


// 🔏 Exige permissão específica
const requirePermission = (permission) => {
  return (req, res, next) => {
    const role = normalizeRole(req.user?.role);

    // Desenvolvedor tem todas as permissões
    if (role === 'desenvolvedor') return next();

    const userPermissions =
      (typeof getPermissionsByRole === 'function' ? getPermissionsByRole(role) : []) || [];

    if (userPermissions.includes('*') || userPermissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Acesso negado. Requer permissão: ${permission}`
    });
  };
};


// Exportar middleware para uso em outras rotas
router.authMiddleware = authMiddleware;
router.requireRole = requireRole;
router.requirePermission = requirePermission;

// ✅ EXPORTAR COMPATÍVEL COM SEU SERVER.JS
module.exports = {
  router,
  authMiddleware,
  requireRole,
  requirePermission
};