const express = require('express');
const router = express.Router();
const { db } = require('../database');
const fs = require('fs').promises;
const path = require('path');
const { authenticateToken, requireDeveloper } = require('./authRoutes');

/**
 * Sistema de Reset Seguro com Autenticação - ADMIN ROUTES
 * URL base: /api/admin
 * 
 * FUNCIONALIDADES:
 * - Backup completo do sistema
 * - Reset seguro de todas as tabelas
 * - Autenticação obrigatória de usuário desenvolvedor
 * - Logs de auditoria com usuário responsável
 */

// Configurações do sistema
const ADMIN_CONFIG = {
  BACKUP_DIR: process.env.BACKUP_DIR || './backups',
  MAX_BACKUPS: 10, // Manter apenas os 10 backups mais recentes
};

// Lista de tabelas do sistema (ordem importa para foreign keys)
const SYSTEM_TABLES = [
  'retornos',
  'carregamentos', 
  'drivers',
  'vehicles',
  'products',
  'docks',
  'users',
  'user_sessions',
  'audit_logs'
];

// Função para criar backup completo
const createSystemBackup = async (userId, userName) => {
  try {
    console.log(`📦 Iniciando backup completo do sistema por ${userName}...`);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `dockflow_backup_${timestamp}.sql`;
    const backupPath = path.join(ADMIN_CONFIG.BACKUP_DIR, backupFileName);
    
    // Garantir que diretório de backup existe
    await ensureBackupDirectory();
    
    let backupContent = '';
    let totalRecords = 0;
    const tableStats = [];
    
    // Header do backup
    backupContent += `-- DockFlow System Backup\n`;
    backupContent += `-- Created: ${new Date().toISOString()}\n`;
    backupContent += `-- User: ${userName} (ID: ${userId})\n`;
    backupContent += `-- Database: ${process.env.DB_NAME || 'dockflow'}\n\n`;
    
    // Backup de cada tabela
    for (const tableName of SYSTEM_TABLES) {
      try {
        console.log(`📋 Fazendo backup da tabela: ${tableName}`);
        
        // Verificar se tabela existe
        const [tableExists] = await db.query(`
          SELECT COUNT(*) as exists_count 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}'
        `);
        
        if (!tableExists[0] || tableExists[0].exists_count === 0) {
          console.log(`⚠️ Tabela ${tableName} não existe - pulando`);
          tableStats.push({ table: tableName, status: 'not_exists', records: 0 });
          continue;
        }
        
        // Estrutura da tabela
        const [createTable] = await db.query(`SHOW CREATE TABLE ${tableName}`);
        backupContent += `-- Estrutura da tabela ${tableName}\n`;
        backupContent += `DROP TABLE IF EXISTS ${tableName};\n`;
        backupContent += `${createTable[0]['Create Table']};\n\n`;
        
        // Dados da tabela
        const [rows] = await db.query(`SELECT * FROM ${tableName}`);
        
        if (rows.length > 0) {
          backupContent += `-- Dados da tabela ${tableName}\n`;
          backupContent += `LOCK TABLES ${tableName} WRITE;\n`;
          
          // Construir INSERT statements
          const [columns] = await db.query(`DESCRIBE ${tableName}`);
          const columnNames = columns.map(col => col.Field);
          
          for (const row of rows) {
            const values = columnNames.map(col => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
              if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
              if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
              return value;
            });
            
            backupContent += `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')});\n`;
          }
          
          backupContent += `UNLOCK TABLES;\n\n`;
          totalRecords += rows.length;
        }
        
        tableStats.push({ table: tableName, status: 'success', records: rows.length });
        console.log(`✅ Backup da tabela ${tableName}: ${rows.length} registros`);
        
      } catch (tableError) {
        console.error(`❌ Erro no backup da tabela ${tableName}:`, tableError);
        backupContent += `-- ERRO no backup da tabela ${tableName}: ${tableError.message}\n\n`;
        tableStats.push({ table: tableName, status: 'error', records: 0, error: tableError.message });
      }
    }
    
    // Footer do backup
    backupContent += `-- Backup completed: ${new Date().toISOString()}\n`;
    backupContent += `-- Total records: ${totalRecords}\n`;
    backupContent += `-- Created by: ${userName} (ID: ${userId})\n`;
    
    // Salvar arquivo de backup
    await fs.writeFile(backupPath, backupContent, 'utf8');
    
    // Log de auditoria
    await logAuditEvent('BACKUP_CREATED', {
      userId,
      userName,
      fileName: backupFileName,
      totalRecords,
      tableStats,
      size: backupContent.length
    });
    
    console.log(`✅ Backup completo salvo: ${backupFileName}`);
    console.log(`📊 Total de registros: ${totalRecords}`);
    
    // Limpar backups antigos
    await cleanOldBackups();
    
    return {
      fileName: backupFileName,
      filePath: backupPath,
      totalRecords,
      tableStats,
      size: backupContent.length,
      timestamp: new Date().toISOString(),
      createdBy: userName
    };
    
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error);
    
    // Log de erro
    await logAuditEvent('BACKUP_FAILED', {
      userId,
      userName,
      error: error.message
    });
    
    throw new Error(`Falha no backup: ${error.message}`);
  }
};

// Garantir que diretório de backup existe
const ensureBackupDirectory = async () => {
  try {
    await fs.access(ADMIN_CONFIG.BACKUP_DIR);
  } catch (error) {
    console.log('📁 Criando diretório de backup...');
    await fs.mkdir(ADMIN_CONFIG.BACKUP_DIR, { recursive: true });
  }
};

// Limpar backups antigos
const cleanOldBackups = async () => {
  try {
    const files = await fs.readdir(ADMIN_CONFIG.BACKUP_DIR);
    const backupFiles = files
      .filter(file => file.startsWith('dockflow_backup_') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(ADMIN_CONFIG.BACKUP_DIR, file)
      }))
      .sort((a, b) => b.name.localeCompare(a.name)); // Mais recente primeiro
    
    if (backupFiles.length > ADMIN_CONFIG.MAX_BACKUPS) {
      const filesToDelete = backupFiles.slice(ADMIN_CONFIG.MAX_BACKUPS);
      
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        console.log(`🗑️ Backup antigo removido: ${file.name}`);
      }
      
      console.log(`✅ Limpeza concluída: ${filesToDelete.length} backups antigos removidos`);
    }
  } catch (error) {
    console.error('⚠️ Erro ao limpar backups antigos:', error);
  }
};

// Função para resetar sistema
const resetSystemTables = async (userId, userName) => {
  try {
    console.log(`🧹 Iniciando reset completo do sistema por ${userName}...`);
    
    let deletedRecords = 0;
    const results = [];
    
    // Desabilitar foreign key checks temporariamente
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Deletar dados de cada tabela (ordem reversa para foreign keys)
    const tablesToReset = [...SYSTEM_TABLES].reverse();
    
    for (const tableName of tablesToReset) {
      try {
        console.log(`🗑️ Limpando tabela: ${tableName}`);
        
        // Verificar se tabela existe
        const [tableExists] = await db.query(`
          SELECT COUNT(*) as exists_count 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}'
        `);
        
        if (!tableExists[0] || tableExists[0].exists_count === 0) {
          console.log(`⚠️ Tabela ${tableName} não existe - pulando`);
          results.push({ table: tableName, status: 'not_exists', records: 0 });
          continue;
        }
        
        // Contar registros antes de deletar
        const [countResult] = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const recordCount = countResult[0] ? countResult[0].count : 0;
        
        // Não deletar usuários desenvolvedores
        if (tableName === 'users') {
          const [deleteResult] = await db.query(`DELETE FROM ${tableName} WHERE role != 'desenvolvedor'`);
          console.log(`✅ Tabela ${tableName}: ${recordCount} registros (preservou desenvolvedores)`);
        } else {
          // Deletar todos os registros das outras tabelas
          const [deleteResult] = await db.query(`DELETE FROM ${tableName}`);
          
          // Reset auto increment
          await db.query(`ALTER TABLE ${tableName} AUTO_INCREMENT = 1`);
          
          console.log(`✅ Tabela ${tableName}: ${recordCount} registros removidos`);
        }
        
        deletedRecords += recordCount;
        results.push({ 
          table: tableName, 
          status: 'success', 
          records: recordCount 
        });
        
      } catch (tableError) {
        console.error(`❌ Erro ao limpar tabela ${tableName}:`, tableError);
        results.push({ 
          table: tableName, 
          status: 'error', 
          error: tableError.message,
          records: 0 
        });
      }
    }
    
    // Reabilitar foreign key checks
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    
    // Log de auditoria
    await logAuditEvent('SYSTEM_RESET', {
      userId,
      userName,
      deletedRecords,
      results
    });
    
    console.log(`✅ Reset completo: ${deletedRecords} registros removidos por ${userName}`);
    
    return {
      totalDeleted: deletedRecords,
      results,
      timestamp: new Date().toISOString(),
      executedBy: userName
    };
    
  } catch (error) {
    // Reabilitar foreign key checks em caso de erro
    try {
      await db.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (e) {}
    
    console.error('❌ Erro no reset do sistema:', error);
    
    // Log de erro
    await logAuditEvent('SYSTEM_RESET_FAILED', {
      userId,
      userName,
      error: error.message
    });
    
    throw new Error(`Falha no reset: ${error.message}`);
  }
};

// Função para log de auditoria
const logAuditEvent = async (action, details) => {
  try {
    const logEntry = {
      action,
      user_id: details.userId || null,
      user_name: details.userName || 'system',
      details: JSON.stringify(details),
      timestamp: new Date().toISOString(),
      ip_address: details.ip || 'server'
    };
    
    // Tentar salvar no banco (se tabela existir)
    try {
      await db.query(`
        INSERT INTO audit_logs (action, user_id, user_name, details, timestamp, ip_address) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        logEntry.action,
        logEntry.user_id,
        logEntry.user_name,
        logEntry.details,
        logEntry.timestamp,
        logEntry.ip_address
      ]);
    } catch (dbError) {
      // Se tabela não existir, apenas logar no console
      console.log('📋 AUDIT LOG:', logEntry);
    }
    
  } catch (error) {
    console.error('❌ Erro ao salvar log de auditoria:', error);
  }
};

// ENDPOINTS PROTEGIDOS

// POST /api/admin/backup - Criar backup manual (DESENVOLVEDOR ONLY)
router.post('/backup', authenticateToken, requireDeveloper, async (req, res) => {
  try {
    console.log(`📦 Solicitação de backup manual por ${req.user.name}`);
    
    const backupInfo = await createSystemBackup(req.user.id, req.user.name);
    
    res.json({
      success: true,
      message: 'Backup criado com sucesso',
      data: backupInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar backup',
      error: error.message
    });
  }
});

// POST /api/admin/reset - Reset completo do sistema (DESENVOLVEDOR ONLY)
router.post('/reset', authenticateToken, requireDeveloper, async (req, res) => {
  try {
    console.log(`🚨 Solicitação de reset completo por ${req.user.name}`);
    
    const { confirm_reset } = req.body;
    
    if (confirm_reset !== 'CONFIRM_RESET_ALL_DATA') {
      return res.status(400).json({
        success: false,
        message: 'Confirmação de reset inválida. Use: CONFIRM_RESET_ALL_DATA'
      });
    }
    
    // 1. Criar backup automático antes do reset
    console.log('📦 Criando backup automático antes do reset...');
    const backupInfo = await createSystemBackup(req.user.id, req.user.name);
    
    // 2. Executar reset
    console.log('🧹 Executando reset do sistema...');
    const resetInfo = await resetSystemTables(req.user.id, req.user.name);
    
    console.log(`✅ Reset completo do sistema finalizado por ${req.user.name}`);
    
    res.json({
      success: true,
      message: 'Sistema resetado com sucesso',
      data: {
        backup: backupInfo,
        reset: resetInfo,
        executedBy: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no reset do sistema:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erro no reset do sistema',
      error: error.message
    });
  }
});

// GET /api/admin/backups - Listar backups disponíveis (DESENVOLVEDOR ONLY)
router.get('/backups', authenticateToken, requireDeveloper, async (req, res) => {
  try {
    await ensureBackupDirectory();
    
    const files = await fs.readdir(ADMIN_CONFIG.BACKUP_DIR);
    const backupFiles = [];
    
    for (const file of files) {
      if (file.startsWith('dockflow_backup_') && file.endsWith('.sql')) {
        const filePath = path.join(ADMIN_CONFIG.BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        
        backupFiles.push({
          fileName: file,
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          createdFormatted: stats.birthtime.toLocaleString('pt-BR')
        });
      }
    }
    
    // Ordenar por data de criação (mais recente primeiro)
    backupFiles.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({
      success: true,
      data: backupFiles,
      total: backupFiles.length,
      maxBackups: ADMIN_CONFIG.MAX_BACKUPS
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar backups:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar backups',
      error: error.message
    });
  }
});

// GET /api/admin/status - Status do sistema (DESENVOLVEDOR ONLY)
router.get('/status', authenticateToken, requireDeveloper, async (req, res) => {
  try {
    const status = {
      database: 'connected',
      tables: [],
      totalRecords: 0,
      lastBackup: null,
      systemTime: new Date().toISOString(),
      user: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role
      }
    };
    
    // Verificar status das tabelas
    for (const tableName of SYSTEM_TABLES) {
      try {
        const [tableExists] = await db.query(`
          SELECT COUNT(*) as exists_count 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}'
        `);
        
        if (tableExists[0] && tableExists[0].exists_count > 0) {
          const [countResult] = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          const recordCount = countResult[0] ? countResult[0].count : 0;
          
          status.tables.push({
            name: tableName,
            exists: true,
            records: recordCount,
            status: 'ok'
          });
          
          status.totalRecords += recordCount;
        } else {
          status.tables.push({
            name: tableName,
            exists: false,
            records: 0,
            status: 'missing'
          });
        }
      } catch (error) {
        status.tables.push({
          name: tableName,
          exists: false,
          records: 0,
          status: 'error',
          error: error.message
        });
      }
    }
    
    // Verificar último backup
    try {
      await ensureBackupDirectory();
      const files = await fs.readdir(ADMIN_CONFIG.BACKUP_DIR);
      const backupFiles = files
        .filter(file => file.startsWith('dockflow_backup_') && file.endsWith('.sql'))
        .sort()
        .reverse();
      
      if (backupFiles.length > 0) {
        const lastBackupPath = path.join(ADMIN_CONFIG.BACKUP_DIR, backupFiles[0]);
        const stats = await fs.stat(lastBackupPath);
        status.lastBackup = {
          fileName: backupFiles[0],
          created: stats.birthtime.toISOString(),
          createdFormatted: stats.birthtime.toLocaleString('pt-BR'),
          size: stats.size,
          sizeFormatted: formatBytes(stats.size)
        };
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar backups:', error.message);
    }
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status',
      error: error.message
    });
  }
});

// GET /api/admin/audit-logs - Logs de auditoria (DESENVOLVEDOR ONLY)
router.get('/audit-logs', authenticateToken, requireDeveloper, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const [logs] = await db.query(`
      SELECT * FROM audit_logs 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);
    
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM audit_logs');
    const total = countResult[0] ? countResult[0].total : 0;
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + logs.length) < total
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar logs de auditoria:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar logs de auditoria',
      error: error.message
    });
  }
});

// Função utilitária para formatar bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;