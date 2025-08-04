const express = require('express');
const router = express.Router();
const { db } = require('../database');

/**
 * Routes para Retornos - HOTFIX URGENTE
 * URL base: /api/retornos
 * 
 * FOCO: Corrigir erro 500 na listagem de retornos
 */

// Função auxiliar SEGURA para criar tabela
const ensureRetornosTable = async () => {
  try {
    console.log('🔍 Verificando tabela retornos...');
    
    // Verificar se tabela existe de forma segura
    const [tableCheck] = await db.execute(`
      SELECT COUNT(*) as exists_count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'retornos'
    `);
    
    if (tableCheck[0].exists_count === 0) {
      console.log('📋 Criando tabela retornos...');
      
      // Criar tabela com sintaxe mais compatível
      await db.execute(`
        CREATE TABLE retornos (
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
      
      // Inserir dados de exemplo
      await db.execute(`
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

// GET /api/retornos - VERSÃO ULTRA SEGURA
router.get('/', async (req, res) => {
  try {
    console.log('📋 GET /api/retornos - VERSÃO SEGURA');
    
    // Parâmetros com validação rigorosa
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
    
    // Query mais simples e segura
    let baseQuery = 'SELECT * FROM retornos WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM retornos WHERE 1=1';
    let params = [];
    
    // Filtros opcionais e seguros
    const { status, motorista } = req.query;
    
    if (status && ['aguardando_chegada', 'pendente', 'concluido', 'cancelado'].includes(status)) {
      baseQuery += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
    }
    
    if (motorista && typeof motorista === 'string' && motorista.trim()) {
      baseQuery += ' AND motorista_nome LIKE ?';
      countQuery += ' AND motorista_nome LIKE ?';
      params.push(`%${motorista.trim()}%`);
    }
    
    console.log('🔍 Query base:', baseQuery);
    console.log('📝 Parâmetros:', params);
    
    // Executar count primeiro
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total || 0;
    
    console.log(`📊 Total encontrado: ${total}`);
    
    // Query final com paginação - SINTAXE MAIS SEGURA
    const finalQuery = baseQuery + ' ORDER BY id DESC LIMIT ? OFFSET ?';
    const finalParams = [...params, limit, offset];
    
    console.log('🔍 Query final:', finalQuery);
    console.log('📝 Parâmetros finais:', finalParams);
    
    // Executar query principal
    const [retornos] = await db.execute(finalQuery, finalParams);
    
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
    
    // Log do erro específico para debug
    if (error.code) {
      console.error('Código do erro MySQL:', error.code);
    }
    if (error.sqlMessage) {
      console.error('Mensagem SQL:', error.sqlMessage);
    }
    if (error.sql) {
      console.error('Query que falhou:', error.sql);
    }
    
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
      // ADICIONAR DETALHES PARA DEBUG
      debug: {
        code: error.code,
        sqlMessage: error.sqlMessage,
        errno: error.errno
      }
    });
  }
});

// GET /api/retornos/stats - Manter funcionando
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
    
    const hoje = new Date().toISOString().split('T')[0];
    
    const [statsResult] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'aguardando_chegada' THEN 1 ELSE 0 END) as aguardando_chegada,
        SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
        SUM(CASE WHEN status = 'concluido' THEN 1 ELSE 0 END) as concluidos,
        SUM(CASE WHEN status = 'concluido' AND DATE(data_retorno) = ? THEN 1 ELSE 0 END) as concluidos_hoje
      FROM retornos
    `, [hoje]);
    
    const stats = {
      aguardando_chegada: parseInt(statsResult[0].aguardando_chegada) || 0,
      pendentes: parseInt(statsResult[0].pendentes) || 0,
      concluidos: parseInt(statsResult[0].concluidos) || 0,
      concluidos_hoje: parseInt(statsResult[0].concluidos_hoje) || 0,
      total: parseInt(statsResult[0].total) || 0
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

// GET /api/retornos/:id - Manter funcionando
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
    
    const [rows] = await db.execute('SELECT * FROM retornos WHERE id = ?', [retornoId]);
    
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

// POST /api/retornos - Versão segura
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
    
    const [result] = await db.execute(`
      INSERT INTO retornos (numero_nf, motorista_nome, data_retorno, horario_retorno, observacoes, status)
      VALUES (?, ?, ?, ?, ?, 'aguardando_chegada')
    `, [numero_nf, motorista_nome, data_retorno, horario_retorno || null, observacoes || null]);
    
    const [newRetorno] = await db.execute('SELECT * FROM retornos WHERE id = ?', [result.insertId]);
    
    res.status(201).json({
      success: true,
      message: 'Retorno criado com sucesso',
      data: newRetorno[0],
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

// PUT /api/retornos/:id - Versão segura
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
    const [existing] = await db.execute('SELECT id FROM retornos WHERE id = ?', [retornoId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Retorno não encontrado'
      });
    }
    
    // Atualizar status se fornecido
    if (status) {
      await db.execute('UPDATE retornos SET status = ?, updated_at = NOW() WHERE id = ?', [status, retornoId]);
    }
    
    // Atualizar observações se fornecido
    if (observacoes) {
      await db.execute('UPDATE retornos SET observacoes = ?, updated_at = NOW() WHERE id = ?', [observacoes, retornoId]);
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

// POST /api/retornos/:id/bipar - Endpoint para bipagem
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
    const [retorno] = await db.execute('SELECT * FROM retornos WHERE id = ?', [retornoId]);
    if (retorno.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Retorno não encontrado'
      });
    }
    
    // Processar itens (versão simplificada para o hotfix)
    let itensProcessados = retorno[0].itens_processados || 0;
    itensProcessados += parseInt(quantidade) || 1;
    
    // Atualizar contadores
    await db.execute(`
      UPDATE retornos 
      SET itens_processados = ?, 
          status = CASE WHEN status = 'aguardando_chegada' THEN 'pendente' ELSE status END,
          updated_at = NOW()
      WHERE id = ?
    `, [itensProcessados, retornoId]);
    
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

// POST /api/retornos/:id/finalizar - Endpoint para finalizar
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
    
    const [result] = await db.execute(`
      UPDATE retornos 
      SET status = 'concluido', 
          data_conclusao = NOW(),
          updated_at = NOW()
      WHERE id = ? AND status IN ('aguardando_chegada', 'pendente')
    `, [retornoId]);
    
    if (result.affectedRows === 0) {
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