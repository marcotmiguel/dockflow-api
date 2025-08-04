// routes/adminRoutes.js - Import Corrigido
const express = require('express');
const { db } = require('../database');
const router = express.Router();

// ✅ IMPORT CORRETO do authRoutes e seus middlewares
const authRoutes = require('./authRoutes');
const { authMiddleware, requireRole, requirePermission } = authRoutes;

// OU se preferir importar individualmente:
// const authMiddleware = authRoutes.authMiddleware;
// const requireRole = authRoutes.requireRole;
// const requirePermission = authRoutes.requirePermission;

console.log('🔧 AdminRoutes carregado');

// Verificar se middleware foi importado corretamente
if (!authMiddleware) {
    console.error('❌ authMiddleware não foi importado corretamente!');
}
if (!requireRole) {
    console.error('❌ requireRole não foi importado corretamente!');
}

// Exemplo de rota protegida - CORRIGIDO
router.get('/users', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT id, email, name, role, status, created_at FROM users ORDER BY created_at DESC'
        );

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('❌ Erro ao buscar usuários:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota de reset do sistema (desenvolvedor apenas)
router.post('/reset-system', authMiddleware, requireRole('desenvolvedor'), async (req, res) => {
    try {
        console.log('🔄 Iniciando reset do sistema...');
        
        // Truncar tabelas
        await db.execute('SET FOREIGN_KEY_CHECKS = 0');
        await db.execute('TRUNCATE TABLE retornos');
        await db.execute('TRUNCATE TABLE carregamentos');
        await db.execute('TRUNCATE TABLE users');
        await db.execute('SET FOREIGN_KEY_CHECKS = 1');
        
        // Recriar dados padrão
        const { initializeDatabase } = require('../database');
        await initializeDatabase();
        
        console.log('✅ Reset do sistema concluído');
        
        res.json({
            success: true,
            message: 'Sistema resetado com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro no reset:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao resetar sistema'
        });
    }
});

// Rota para criar usuário (admin)
router.post('/create-user', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        
        if (!email || !password || !name || !role) {
            return res.status(400).json({
                success: false,
                message: 'Todos os campos são obrigatórios'
            });
        }

        // Verificar se usuário já existe
        const [existing] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email já está em uso'
            });
        }

        // Hash da senha
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 12);

        // Criar usuário
        const [result] = await db.execute(
            'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, name, role]
        );

        console.log(`✅ Usuário criado: ${email} (${role})`);

        res.json({
            success: true,
            message: 'Usuário criado com sucesso',
            data: {
                id: result.insertId,
                email,
                name,
                role
            }
        });

    } catch (error) {
        console.error('❌ Erro ao criar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para atualizar status do usuário
router.patch('/users/:id/status', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status deve ser "active" ou "inactive"'
            });
        }

        await db.execute(
            'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, id]
        );

        res.json({
            success: true,
            message: 'Status do usuário atualizado'
        });

    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para estatísticas do sistema
router.get('/stats', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        // Contar usuários por role
        const [userStats] = await db.execute(`
            SELECT role, COUNT(*) as count 
            FROM users 
            WHERE status = 'active' 
            GROUP BY role
        `);

        // Contar retornos por status
        const [retornoStats] = await db.execute(`
            SELECT status, COUNT(*) as count 
            FROM retornos 
            GROUP BY status
        `);

        // Contar carregamentos por status
        const [carregamentoStats] = await db.execute(`
            SELECT status, COUNT(*) as count 
            FROM carregamentos 
            GROUP BY status
        `);

        res.json({
            success: true,
            data: {
                users: userStats,
                retornos: retornoStats,
                carregamentos: carregamentoStats
            }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

module.exports = router;