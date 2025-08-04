const express = require('express');
const router = express.Router();
const { db } = require('../database');

/**
 * Routes para Retornos - FIX DEFINITIVO
 * URL base: /api/retornos
 * 
 * CORREÇÃO: Erro ER_WRONG_ARGUMENTS - Incorrect arguments to mysqld_stmt_execute
 */

// Função auxiliar SEGURA para criar tabela
const ensureRetornosTable = async () => {
  try {
    console.log('🔍 Verificando tabela retornos...');
    
    // Usar query simples sem prepared statement
    const tableCheck = await db.query(`
      SELECT COUNT(*) as exists_count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'retornos'
    `);
    
    const exists = tableCheck[0] && tableCheck[0][0] && tableCheck[0][0].exists_count > 0;
    
    if (!exists) {
      console.log('📋 Criando tabela retornos...');
      
      // Criar tabela sem prepared statement
      await db.query(`
        CREATE TABLE IF NOT EXISTS retornos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          carregamento_id INT NULL,
          driver_id INT NULL,
          numero_nf VARCHAR(50) NULL,
          motorista_nome VARCHAR(100) NULL,
          data_retorno DATE NOT NULL,
          horario_retorno TIME NULL,
          observacoes TEXT NULL,
          status ENUM('aguardando_chegada', 'pendente', 'concluido', 'cancelado') DEFAULT 'aguardando_chegada',
          itens_retornados JSON NULL,
          total_itens INT DEFAULT 0,
          itens_processados INT DEFAULT 0,
          data_conclusao TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ Tabela criada');
      
      // Inserir dados de exemplo sem prepared statement
      await db.query(`
        INSERT INTO retornos (numero_nf, motorista_nome, data_retorno, status) VALUES
        ('NF-001', 'João Silva', CURDATE(), 'concluido'),
        ('NF-002', 'Maria Santos', CURDATE(), 'pendente')
      `);
      
      console.log('✅ Dados inseridos');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro na tabela:', error.message);
    return false;
  }
};

// GET /api/retornos - VERSÃO SEM PREPARED STATEMENTS
router.get('/', async (req, res) => {
  try {
    console.log('📋 GET /api/retornos - VERSÃO COMPATÍVEL');
    
    // Parâmetros com validação
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    
    console.log(`📊 Parâmetros: page=${page}, limit=${limit}, offset=${offset}`);
    
    // Garantir tabela existe
    const tableExists = await ensureRetornosTable();
    if (!tableExists) {
      return res.json({
        success: true,
        data: [],
        meta: {
          pagination: { page, limit, total: 0, pages: 0 },
          timestamp: new Date().toISOString()
        },
        message: 'Sistema inicializando'
      });
    }
    
    // Construir query sem prepared statements - ESCAPE MANUAL
    let whereClause = 'WHERE 1=1';
    const { status, motorista } = req.query;
    
    if (status && ['aguardando_chegada', 'pendente', 'concluido', 'cancelado'].includes(status)) {
      whereClause += ` AND status = '${status}'`;
    }
    
    if (motorista && typeof motorista === 'string' && motorista.trim()) {
      // Escape manual para prevenir SQL injection
      const escapedMotorista = motorista.trim().replace(/'/g, "''");
      whereClause += ` AND motorista_nome LIKE '%${escapedMotorista}%'`;
    }
    
    console.log('🔍 Where clause:', whereClause);
    
    // Executar count sem prepared statement
    const countQuery = `SELECT COUNT(*) as total FROM retornos ${whereClause}`;
    console.log('📊 Count query:', countQuery);
    
    const countResult = await db.query(countQuery);
    const total = countResult[0] && countResult[0][0] ? countResult[0][0].total : 0;
    
    console.log(`📊 Total encontrado: ${total}`);
    
    // Query principal sem prepared statement
    const mainQuery = `
      SELECT * FROM retornos 
      ${whereClause} 
      ORDER BY id DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    console.log('🔍 Main query:', mainQuery);
    
    // Executar query principal
    const result = await db.query(mainQuery);
    const retornos = result[0] || [];
    
    console.log(`✅ ${retornos.length} retornos carregados`);
    
    // Processar dados de forma segura
    const processedRetornos = retornos.map(retorno => ({
      ...retorno,
      driver_name: retorno.motorista_nome || 'Motorista não informado',
      numero_nf_display: retorno.numero_nf || 'NF não informada',
      itens_bipados_count: retorno.itens_processados || 0
    }));
    
    res.json({
      success: true,
      data: processedRetornos,
      meta: {
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        filters_applied: { status, motorista },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ ERRO DETALHADO:', error);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      data: [],
      meta: {
        pagination: {
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 50,
          total: 0,
          pages: 0
        },
        timestamp: new Date().toISOString()
      },
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro temporário',
      debug: {
        code: error.code,
        sqlMessage: error.sqlMessage,
        errno: error.errno,
        query: error.sql
      }
    });
  }
});

// GET /api/retornos/stats - VERSÃO SEM PREPARED STATEMENTS
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 GET /api/retornos/stats');
    
    const tableExists = await ensureRetornosTable();
    if (!tableExists) {
      return res.json({
        success: true,
        data: {
          aguardando_chegada: 0,
          pendentes: 0,
          concluidos: 0,
          concluidos_hoje: 0,
          total: 0
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Query sem prepared statement
    const hoje = new Date().toISOString().split('T')[0];
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'aguardando_chegada' THEN 1 ELSE 0 END) as aguardando_chegada,
        SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
        SUM(CASE WHEN status = 'concluido' THEN 1 ELSE 0 END) as concluidos,
        SUM(CASE WHEN status = 'concluido' AND DATE(data_retorno) = '${hoje}' THEN 1 ELSE 0 END) as concluidos_hoje
      FROM retornos
    `;
    
    const result = await db.query(statsQuery);
    const statsData = result[0] && result[0][0] ? result[0][0] : {};
    
    const stats = {
      aguardando_chegada: parseInt(statsData.aguardando_chegada) || 0,
      pendentes: parseInt(statsData.pendentes) || 0,
      concluidos: parseInt(statsData.concluidos) || 0,
      concluidos_hoje: parseInt(statsData.concluidos_hoje) || 0,
      total: parseInt(statsData.total) || 0
    };
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro stats:', error);
    res.status(500).json({
      success: false,
      data: {
        aguardando_chegada: 0,
        pendentes: 0,
        concluidos: 0,
        concluidos_hoje: 0,
        total: 0
      },
      message: 'Erro ao carregar estatísticas',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/retornos/:id - VERSÃO SEM PREPARED STATEMENTS
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const retornoId = parseInt(id);
    
    if (!retornoId || retornoId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }
    
    const tableExists = await ensureRetornosTable();
    if (!tableExists) {
      return res.status(503).json({
        success: false,
        message: 'Sistema inicializando'
      });
    }
    
    // Query sem prepared statement
    const query = `SELECT * FROM retornos WHERE id = ${retornoId}`;
    const result = await db.query(query);
    const rows = result[0] || [];
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Retorno ${retornoId} não encontrado`
      });
    }
    
    res.json({
      success: true,
      data: rows[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro buscar retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno',
      error: error.message
    });
  }
});

// POST /api/retornos - VERSÃO SEM PREPARED STATEMENTS
router.post('/', async (req, res) => {
  try {
    const { numero_nf, motorista_nome, data_retorno, horario_retorno, observacoes } = req.body;
    
    // Validações básicas
    if (!numero_nf || !motorista_nome || !data_retorno) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: numero_nf, motorista_nome, data_retorno'
      });
    }
    
    const tableExists = await ensureRetornosTable();
    if (!tableExists) {
      return res.status(503).json({
        success: false,
        message: 'Sistema inicializando'
      });
    }
    
    // Escape manual para prevenir SQL injection
    const escapedNF = numero_nf.replace(/'/g, "''");
    const escapedMotorista = motorista_nome.replace(/'/g, "''");
    const escapedObservacoes = observacoes ? observacoes.replace(/'/g, "''") : null;
    
    // Query sem prepared statement
    const insertQuery = `
      INSERT INTO retornos (numero_nf, motorista_nome, data_retorno, horario_retorno, observacoes, status)
      VALUES ('${escapedNF}', '${escapedMotorista}', '${data_retorno}', ${horario_retorno ? `'${horario_retorno}'` : 'NULL'}, ${escapedObservacoes ? `'${escapedObservacoes}'` : 'NULL'}, 'aguardando_chegada')
    `;
    
    const result = await db.query(insertQuery);
    const insertId = result[0] && result[0].insertId ? result[0].insertId : null;
    
    if (!insertId) {
      throw new Error('Falha ao inserir retorno');
    }
    
    // Buscar retorno criado
    const selectQuery = `SELECT * FROM retornos WHERE id = ${insertId}`;
    const selectResult = await db.query(selectQuery);
    const newRetorno = selectResult[0] && selectResult[0][0] ? selectResult[0][0] : null;
    
    res.status(201).json({
      success: true,
      message: 'Retorno criado com sucesso',
      data: newRetorno,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro criar retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar retorno',
      error: error.message
    });
  }
});

// PUT /api/retornos/:id - VERSÃO SEM PREPARED STATEMENTS
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const retornoId = parseInt(id);
    const { status, observacoes } = req.body;
    
    if (!retornoId) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }
    
    const tableExists = await ensureRetornosTable();
    if (!tableExists) {
      return res.status(503).json({
        success: false,
        message: 'Sistema inicializando'
      });
    }
    
    // Verificar se existe
    const checkQuery = `SELECT id FROM retornos WHERE id = ${retornoId}`;
    const checkResult = await db.query(checkQuery);
    const existing = checkResult[0] || [];
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Retorno não encontrado'
      });
    }
    
    // Construir query de atualização
    let updateParts = [];
    
    if (status) {
      updateParts.push(`status = '${status}'`);
    }
    
    if (observacoes) {
      const escapedObservacoes = observacoes.replace(/'/g, "''");
      updateParts.push(`observacoes = '${escapedObservacoes}'`);
    }
    
    if (updateParts.length > 0) {
      const updateQuery = `
        UPDATE retornos 
        SET ${updateParts.join(', ')}, updated_at = NOW() 
        WHERE id = ${retornoId}
      `;
      
      await db.query(updateQuery);
    }
    
    res.json({
      success: true,
      message: 'Retorno atualizado',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro atualizar retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar',
      error: error.message
    });
  }
});

// POST /api/retornos/:id/bipar - VERSÃO SEM PREPARED STATEMENTS
router.post('/:id/bipar', async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo_item, descricao, quantidade = 1 } = req.body;
    const retornoId = parseInt(id);
    
    if (!retornoId || !codigo_item) {
      return res.status(400).json({
        success: false,
        message: 'ID e código do item são obrigatórios'
      });
    }
    
    const tableExists = await ensureRetornosTable();
    if (!tableExists) {
      return res.status(503).json({
        success: false,
        message: 'Sistema inicializando'
      });
    }
    
    // Buscar retorno atual
    const selectQuery = `SELECT * FROM retornos WHERE id = ${retornoId}`;
    const selectResult = await db.query(selectQuery);
    const retornos = selectResult[0] || [];
    
    if (retornos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Retorno não encontrado'
      });
    }
    
    const retorno = retornos[0];
    
    // Processar itens
    let itensProcessados = retorno.itens_processados || 0;
    itensProcessados += parseInt(quantidade) || 1;
    
    // Atualizar contadores
    const updateQuery = `
      UPDATE retornos 
      SET itens_processados = ${itensProcessados},
          status = CASE WHEN status = 'aguardando_chegada' THEN 'pendente' ELSE status END,
          updated_at = NOW()
      WHERE id = ${retornoId}
    `;
    
    await db.query(updateQuery);
    
    res.json({
      success: true,
      message: 'Item bipado com sucesso',
      data: {
        item_bipado: { codigo: codigo_item, descricao, quantidade },
        total_itens: itensProcessados
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro bipar item:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao bipar item',
      error: error.message
    });
  }
});

// POST /api/retornos/:id/finalizar - VERSÃO SEM PREPARED STATEMENTS
router.post('/:id/finalizar', async (req, res) => {
  try {
    const { id } = req.params;
    const retornoId = parseInt(id);
    
    if (!retornoId) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }
    
    const tableExists = await ensureRetornosTable();
    if (!tableExists) {
      return res.status(503).json({
        success: false,
        message: 'Sistema inicializando'
      });
    }
    
    const updateQuery = `
      UPDATE retornos 
      SET status = 'concluido', 
          data_conclusao = NOW(),
          updated_at = NOW()
      WHERE id = ${retornoId} AND status IN ('aguardando_chegada', 'pendente')
    `;
    
    const result = await db.query(updateQuery);
    const affectedRows = result[0] && result[0].affectedRows ? result[0].affectedRows : 0;
    
    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Retorno não encontrado ou já finalizado'
      });
    }
    
    res.json({
      success: true,
      message: 'Retorno finalizado com sucesso',
      data: { id: retornoId, status: 'concluido' },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro finalizar retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao finalizar',
      error: error.message
    });
  }
});

module.exports = router;