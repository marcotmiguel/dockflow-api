// routes/adminRoutes.js - Compatível com sua estrutura
const express = require('express');
const { db } = require('../database');
const router = express.Router();

// ✅ IMPORT COMPATÍVEL com a estrutura do seu server
const { authMiddleware, requireRole, requirePermission } = require('./authRoutes');

console.log('🔧 AdminRoutes carregado');

// Verificar se middlewares foram importados
if (!authMiddleware) {
    console.error('❌ authMiddleware não foi importado!');
}

// ✅ Rota para listar usuários (admin+)
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

// ✅ Rota de reset do sistema (desenvolvedor apenas)
router.post('/reset-system', authMiddleware, requireRole('desenvolvedor'), async (req, res) => {
    try {
        console.log('🔄 Iniciando reset do sistema...');
        
        // Desabilitar foreign key checks
        await db.execute('SET FOREIGN_KEY_CHECKS = 0');
        
        // Limpar tabelas principais
        await db.execute('TRUNCATE TABLE retornos');
        await db.execute('TRUNCATE TABLE carregamentos');
        await db.execute('TRUNCATE TABLE users');
        
        // Reabilitar foreign key checks
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

// ✅ Criar usuário (admin+)
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

// ✅ Atualizar status do usuário
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

// ✅ Estatísticas do sistema
router.get('/stats', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        // Contar usuários por role
        const [userStats] = await db.execute(`
            SELECT role, COUNT(*) as count 
            FROM users 
            WHERE status = 'active' 
            GROUP BY role
        `);

        // Contar retornos por status (se a tabela existir)
        let retornoStats = [];
        try {
            const [retornos] = await db.execute(`
                SELECT status, COUNT(*) as count 
                FROM retornos 
                GROUP BY status
            `);
            retornoStats = retornos;
        } catch (error) {
            console.warn('⚠️ Tabela retornos não existe ainda');
        }

        // Contar carregamentos por status (se a tabela existir)
        let carregamentoStats = [];
        try {
            const [carregamentos] = await db.execute(`
                SELECT status, COUNT(*) as count 
                FROM carregamentos 
                GROUP BY status
            `);
            carregamentoStats = carregamentos;
        } catch (error) {
            console.warn('⚠️ Tabela carregamentos não existe ainda');
        }

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