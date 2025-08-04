const express = require('express');
const router = express.Router();
const { db } = require('../database');

/**
 * Routes para Retornos - VERSÃO ULTRA ROBUSTA CORRIGIDA
 * URL base: /api/retornos
 * 
 * Sistema de controle de retornos de carregamentos
 * ✅ PROBLEMAS CORRIGIDOS:
 * - Query SQL malformada no ensureRetornosTable
 * - Parâmetros inválidos nas queries
 * - Validação de dados melhorada
 * - Tratamento de erros aprimorado
 */

// Função auxiliar para criar tabela se não existir - VERSÃO CORRIGIDA
const ensureRetornosTable = async () => {
  try {
    console.log('🔍 Verificando existência da tabela retornos...');
    
    // Verificar se tabela existe usando INFORMATION_SCHEMA (mais seguro)
    const [tableCheck] = await db.execute(`
      SELECT COUNT(*) as table_exists 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'retornos'
    `);
    
    const tableExists = tableCheck[0].table_exists > 0;
    
    if (!tableExists) {
      console.log('⚠️ Tabela retornos não existe - criando...');
      
      // Criar tabela completa com estrutura corrigida
      await db.execute(`
        CREATE TABLE retornos (
          id INT PRIMARY KEY AUTO_INCREMENT,
          carregamento_id INT NULL,
          driver_id INT NULL,
          numero_nf VARCHAR(50) NULL,
          motorista_nome VARCHAR(100) NULL,
          data_retorno DATE NOT NULL,
          horario_retorno TIME NULL,
          observacoes TEXT NULL,
          status ENUM('aguardando_chegada', 'pendente', 'concluido', 'cancelado') DEFAULT 'aguardando_chegada',
          itens_retornados JSON NULL COMMENT 'Array de itens bipados no retorno',
          total_itens INT DEFAULT 0 COMMENT 'Total de itens esperados',
          itens_processados INT DEFAULT 0 COMMENT 'Total de itens já processados',
          data_conclusao TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_retornos_data (data_retorno),
          INDEX idx_retornos_status (status),
          INDEX idx_retornos_carregamento (carregamento_id)
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ Tabela retornos criada com sucesso');
      
      // Inserir dados de exemplo
      await db.execute(`
        INSERT INTO retornos (
          numero_nf, motorista_nome, data_retorno, horario_retorno, 
          observacoes, status, total_itens, itens_processados
        ) VALUES
        ('NF-001', 'João Silva', CURDATE(), '14:30:00', 
         'Retorno de exemplo - sistema inicializado', 'concluido', 5, 5),
        ('NF-002', 'Maria Santos', CURDATE(), NULL, 
         'Aguardando confirmação de chegada', 'aguardando_chegada', 8, 0),
        ('NF-003', 'Pedro Costa', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '16:45:00', 
         'Retorno com atraso devido ao trânsito', 'pendente', 3, 2)
      `);
      
      console.log('✅ Dados de exemplo inseridos');
      
    } else {
      console.log('✅ Tabela retornos já existe');
      
      // Verificar se tem as colunas necessárias
      const [columns] = await db.execute('DESCRIBE retornos');
      const columnNames = columns.map(col => col.Field);
      
      const missingColumns = [];
      const requiredColumns = [
        { name: 'motorista_nome', type: 'VARCHAR(100) NULL' },
        { name: 'numero_nf', type: 'VARCHAR(50) NULL' },
        { name: 'itens_retornados', type: 'JSON NULL' },
        { name: 'total_itens', type: 'INT DEFAULT 0' },
        { name: 'itens_processados', type: 'INT DEFAULT 0' },
        { name: 'data_conclusao', type: 'TIMESTAMP NULL' }
      ];
      
      requiredColumns.forEach(col => {
        if (!columnNames.includes(col.name)) {
          missingColumns.push(col);
        }
      });
      
      if (missingColumns.length > 0) {
        console.log('🔧 Adicionando colunas faltantes...');
        
        for (const col of missingColumns) {
          try {
            await db.execute(`ALTER TABLE retornos ADD COLUMN ${col.name} ${col.type}`);
            console.log(`✅ Coluna ${col.name} adicionada`);
          } catch (alterError) {
            console.warn(`⚠️ Erro ao adicionar coluna ${col.name}:`, alterError.message);
          }
        }
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao garantir tabela retornos:', error);
    return false;
  }
};

// GET /api/retornos - Listar todos os retornos - VERSÃO CORRIGIDA
router.get('/', async (req, res) => {
  try {
    const { status, data_inicio, data_fim, motorista, page = 1, limit = 50 } = req.query;
    
    console.log('📋 GET /api/retornos - Buscando retornos...');
    console.log('📝 Parâmetros recebidos:', { status, data_inicio, data_fim, motorista, page, limit });
    
    // Garantir que a tabela existe
    const tableExists = await ensureRetornosTable();
    
    if (!tableExists) {
      console.log('❌ Não foi possível criar/acessar tabela retornos');
      return res.json({
        success: true,
        data: [],
        meta: {
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          },
          timestamp: new Date().toISOString()
        },
        message: 'Sistema inicializando - tabela em criação'
      });
    }
    
    // Query principal com JOINs seguros
    let query = `
      SELECT 
        r.*,
        COALESCE(r.motorista_nome, 'Motorista não informado') as driver_name,
        COALESCE(r.numero_nf, 'NF não informada') as numero_nf_display,
        CASE 
          WHEN r.itens_retornados IS NOT NULL THEN JSON_LENGTH(r.itens_retornados)
          ELSE 0 
        END as itens_bipados_count
      FROM retornos r 
      WHERE 1=1
    `;
    
    let params = [];
    
    // Aplicar filtros com validação
    if (status && ['aguardando_chegada', 'pendente', 'concluido', 'cancelado'].includes(status)) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    
    if (motorista && motorista.trim()) {
      query += ' AND COALESCE(r.motorista_nome, "") LIKE ?';
      params.push(`%${motorista.trim()}%`);
    }
    
    if (data_inicio && /^\d{4}-\d{2}-\d{2}$/.test(data_inicio)) {
      query += ' AND DATE(r.data_retorno) >= ?';
      params.push(data_inicio);
    }
    
    if (data_fim && /^\d{4}-\d{2}-\d{2}$/.test(data_fim)) {
      query += ' AND DATE(r.data_retorno) <= ?';
      params.push(data_fim);
    }
    
    // Contar total primeiro (sem paginação)
    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;
    
    // Aplicar ordenação e paginação
    query += ' ORDER BY r.created_at DESC, r.id DESC';
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;
    
    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);
    
    console.log('🔍 Executando query:', query);
    console.log('📝 Parâmetros finais:', params);
    
    const [retornos] = await db.execute(query, params);
    
    console.log(`✅ ${retornos.length} retornos encontrados de ${total} total`);
    
    res.json({
      success: true,
      data: retornos,
      meta: {
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          pages: Math.ceil(total / limitNum)
        },
        filters_applied: {
          status: status || null,
          motorista: motorista || null,
          data_inicio: data_inicio || null,
          data_fim: data_fim || null
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar retornos:', error);
    console.error('Stack trace:', error.stack);
    
    // Retornar resposta válida mesmo com erro
    res.status(500).json({
      success: false,
      data: [],
      meta: {
        pagination: {
          page: parseInt(req.query.page || 1),
          limit: parseInt(req.query.limit || 50),
          total: 0,
          pages: 0
        },
        timestamp: new Date().toISOString()
      },
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro temporário'
    });
  }
});

// GET /api/retornos/stats - Estatísticas dos retornos - VERSÃO CORRIGIDA
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 GET /api/retornos/stats - Buscando estatísticas...');
    
    // Garantir que a tabela existe
    const tableExists = await ensureRetornosTable();
    
    if (!tableExists) {
      console.log('⚠️ Tabela retornos não existe - retornando stats vazias');
      return res.json({
        success: true,
        data: {
          aguardando_chegada: 0,
          pendentes: 0,
          concluidos: 0,
          concluidos_hoje: 0,
          total: 0,
          itens_total: 0,
          itens_processados: 0
        },
        message: 'Sistema inicializando...',
        timestamp: new Date().toISOString()
      });
    }
    
    const hoje = new Date().toISOString().split('T')[0];
    
    try {
      // Query única para todas as estatísticas (mais eficiente)
      const [statsResult] = await db.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'aguardando_chegada' THEN 1 ELSE 0 END) as aguardando_chegada,
          SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
          SUM(CASE WHEN status = 'concluido' THEN 1 ELSE 0 END) as concluidos,
          SUM(CASE WHEN status = 'concluido' AND DATE(data_retorno) = ? THEN 1 ELSE 0 END) as concluidos_hoje,
          SUM(COALESCE(total_itens, 0)) as itens_total,
          SUM(COALESCE(itens_processados, 0)) as itens_processados
        FROM retornos
      `, [hoje]);
      
      const stats = {
        aguardando_chegada: parseInt(statsResult[0].aguardando_chegada) || 0,
        pendentes: parseInt(statsResult[0].pendentes) || 0,
        concluidos: parseInt(statsResult[0].concluidos) || 0,
        concluidos_hoje: parseInt(statsResult[0].concluidos_hoje) || 0,
        total: parseInt(statsResult[0].total) || 0,
        itens_total: parseInt(statsResult[0].itens_total) || 0,
        itens_processados: parseInt(statsResult[0].itens_processados) || 0
      };
      
      console.log('✅ Estatísticas calculadas:', stats);
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
      
    } catch (queryError) {
      console.error('❌ Erro nas queries de estatísticas:', queryError);
      throw queryError;
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    console.error('Stack trace:', error.stack);
    
    // Sempre retornar dados válidos mesmo com erro
    res.status(500).json({
      success: false,
      data: {
        aguardando_chegada: 0,
        pendentes: 0,
        concluidos: 0,
        concluidos_hoje: 0,
        total: 0,
        itens_total: 0,
        itens_processados: 0
      },
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Sistema temporariamente indisponível',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/retornos/:id - Buscar retorno específico - VERSÃO CORRIGIDA
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validação rigorosa do ID
    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido fornecido - deve ser um número positivo'
      });
    }
    
    const retornoId = parseInt(id);
    console.log(`🔍 GET /api/retornos/${retornoId} - Buscando retorno específico`);
    
    // Garantir que a tabela existe
    const tableExists = await ensureRetornosTable();
    
    if (!tableExists) {
      return res.status(503).json({
        success: false,
        message: 'Sistema inicializando - tente novamente em alguns segundos'
      });
    }
    
    const [rows] = await db.execute(`
      SELECT 
        r.*,
        COALESCE(r.motorista_nome, 'Motorista não informado') as driver_name,
        COALESCE(r.numero_nf, 'NF não informada') as numero_nf_display,
        CASE 
          WHEN r.itens_retornados IS NOT NULL THEN JSON_LENGTH(r.itens_retornados)
          ELSE 0 
        END as itens_bipados_count
      FROM retornos r
      WHERE r.id = ?
    `, [retornoId]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Retorno com ID ${retornoId} não encontrado`
      });
    }
    
    console.log(`✅ Retorno encontrado: ${rows[0].id} - ${rows[0].numero_nf || 'Sem NF'}`);
    
    res.json({
      success: true,
      data: rows[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro temporário'
    });
  }
});

// POST /api/retornos - Criar novo retorno - VERSÃO CORRIGIDA
router.post('/', async (req, res) => {
  try {
    const {
      carregamento_id,
      driver_id,
      numero_nf,
      motorista_nome,
      data_retorno,
      horario_retorno,
      observacoes,
      status = 'aguardando_chegada',
      total_itens = 0
    } = req.body;
    
    console.log('📝 POST /api/retornos - Criando novo retorno');
    console.log('📋 Dados recebidos:', req.body);
    
    // Validações rigorosas
    const errors = [];
    
    if (!data_retorno) {
      errors.push('Campo obrigatório: data_retorno');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data_retorno)) {
      errors.push('data_retorno deve estar no formato YYYY-MM-DD');
    }
    
    if (!motorista_nome || motorista_nome.trim().length < 2) {
      errors.push('Campo obrigatório: motorista_nome (mínimo 2 caracteres)');
    }
    
    if (status && !['aguardando_chegada', 'pendente', 'concluido', 'cancelado'].includes(status)) {
      errors.push('Status inválido');
    }
    
    if (horario_retorno && !/^\d{2}:\d{2}(:\d{2})?$/.test(horario_retorno)) {
      errors.push('horario_retorno deve estar no formato HH:MM ou HH:MM:SS');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors
      });
    }
    
    // Garantir que a tabela existe
    const tableExists = await ensureRetornosTable();
    
    if (!tableExists) {
      return res.status(503).json({
        success: false,
        message: 'Sistema inicializando - tente novamente em alguns segundos'
      });
    }
    
    // Inserir retorno com dados validados
    const query = `
      INSERT INTO retornos (
        carregamento_id, driver_id, numero_nf, motorista_nome,
        data_retorno, horario_retorno, observacoes, status,
        total_itens, itens_processados,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
    `;
    
    const [result] = await db.execute(query, [
      carregamento_id || null,
      driver_id || null,
      numero_nf?.trim() || null,
      motorista_nome.trim(),
      data_retorno,
      horario_retorno || null,
      observacoes?.trim() || null,
      status,
      parseInt(total_itens) || 0
    ]);
    
    console.log(`✅ Retorno criado com ID: ${result.insertId}`);
    
    // Buscar o retorno criado para retornar os dados completos
    const [newRetorno] = await db.execute(`
      SELECT 
        r.*,
        COALESCE(r.motorista_nome, 'Motorista não informado') as driver_name,
        COALESCE(r.numero_nf, 'NF não informada') as numero_nf_display
      FROM retornos r 
      WHERE r.id = ?
    `, [result.insertId]);
    
    res.status(201).json({
      success: true,
      message: 'Retorno criado com sucesso',
      data: newRetorno[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro temporário'
    });
  }
});

// PUT /api/retornos/:id - Atualizar retorno - VERSÃO CORRIGIDA
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    // Validação rigorosa do ID
    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido fornecido - deve ser um número positivo'
      });
    }
    
    const retornoId = parseInt(id);
    console.log(`📝 PUT /api/retornos/${retornoId} - Atualizando retorno`);
    console.log('📋 Campos para atualizar:', updateFields);
    
    // Garantir que a tabela existe
    const tableExists = await ensureRetornosTable();
    
    if (!tableExists) {
      return res.status(503).json({
        success: false,
        message: 'Sistema inicializando - tente novamente em alguns segundos'
      });
    }
    
    // Verificar se retorno existe
    const [existing] = await db.execute(
      'SELECT id, status FROM retornos WHERE id = ?', 
      [retornoId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Retorno com ID ${retornoId} não encontrado`
      });
    }
    
    // Campos permitidos para atualização com validação
    const allowedFields = {
      'numero_nf': { type: 'string', maxLength: 50 },
      'motorista_nome': { type: 'string', maxLength: 100, required: true },
      'data_retorno': { type: 'date', pattern: /^\d{4}-\d{2}-\d{2}$/ },
      'horario_retorno': { type: 'time', pattern: /^\d{2}:\d{2}(:\d{2})?$/ },
      'observacoes': { type: 'text', maxLength: 1000 },
      'status': { type: 'enum', values: ['aguardando_chegada', 'pendente', 'concluido', 'cancelado'] },
      'total_itens': { type: 'number', min: 0 },
      'itens_processados': { type: 'number', min: 0 },
      'itens_retornados': { type: 'json' },
      'data_conclusao': { type: 'datetime' }
    };
    
    const fieldsToUpdate = [];
    const values = [];
    const errors = [];
    
    Object.keys(updateFields).forEach(field => {
      if (allowedFields[field]) {
        const value = updateFields[field];
        const validation = allowedFields[field];
        
        // Validar campo
        if (value === null || value === undefined) {
          if (validation.required) {
            errors.push(`Campo ${field} é obrigatório`);
            return;
          }
        } else {
          if (validation.type === 'string' && typeof value !== 'string') {
            errors.push(`Campo ${field} deve ser uma string`);
            return;
          }
          
          if (validation.type === 'number' && isNaN(Number(value))) {
            errors.push(`Campo ${field} deve ser um número`);
            return;
          }
          
          if (validation.type === 'enum' && !validation.values.includes(value)) {
            errors.push(`Campo ${field} deve ser um dos valores: ${validation.values.join(', ')}`);
            return;
          }
          
          if (validation.pattern && !validation.pattern.test(value)) {
            errors.push(`Campo ${field} tem formato inválido`);
            return;
          }
          
          if (validation.maxLength && value.length > validation.maxLength) {
            errors.push(`Campo ${field} excede o tamanho máximo de ${validation.maxLength} caracteres`);
            return;
          }
          
          if (validation.min !== undefined && Number(value) < validation.min) {
            errors.push(`Campo ${field} deve ser maior ou igual a ${validation.min}`);
            return;
          }
        }
        
        fieldsToUpdate.push(field);
        values.push(value);
      }
    });
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors
      });
    }
    
    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo válido fornecido para atualização'
      });
    }
    
    // Construir query de atualização
    const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
    values.push(retornoId);
    
    const query = `UPDATE retornos SET ${setClause}, updated_at = NOW() WHERE id = ?`;
    
    const [result] = await db.execute(query, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Nenhuma linha foi atualizada para o ID ${retornoId}`
      });
    }
    
    console.log(`✅ Retorno ${retornoId} atualizado com sucesso`);
    
    // Buscar dados atualizados
    const [updated] = await db.execute(`
      SELECT 
        r.*,
        COALESCE(r.motorista_nome, 'Motorista não informado') as driver_name,
        COALESCE(r.numero_nf, 'NF não informada') as numero_nf_display
      FROM retornos r 
      WHERE r.id = ?
    `, [retornoId]);
    
    res.json({
      success: true,
      message: 'Retorno atualizado com sucesso',
      data: updated[0],
      updated_fields: fieldsToUpdate,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro temporário'
    });
  }
});

// DELETE /api/retornos/:id - Remover retorno - VERSÃO CORRIGIDA
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validação rigorosa do ID
    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido fornecido - deve ser um número positivo'
      });
    }
    
    const retornoId = parseInt(id);
    console.log(`🗑️ DELETE /api/retornos/${retornoId} - Removendo retorno`);
    
    // Garantir que a tabela existe
    const tableExists = await ensureRetornosTable();
    
    if (!tableExists) {
      return res.status(503).json({
        success: false,
        message: 'Sistema inicializando - tente novamente em alguns segundos'
      });
    }
    
    // Verificar se retorno existe antes de deletar
    const [existing] = await db.execute(
      'SELECT id, numero_nf, status FROM retornos WHERE id = ?', 
      [retornoId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Retorno com ID ${retornoId} não encontrado`
      });
    }
    
    const retornoData = existing[0];
    
    // Verificar se retorno pode ser deletado (regras de negócio)
    if (retornoData.status === 'concluido') {
      return res.status(400).json({
        success: false,
        message: 'Não é possível deletar um retorno já concluído'
      });
    }
    
    const [result] = await db.execute(
      'DELETE FROM retornos WHERE id = ?', 
      [retornoId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Retorno com ID ${retornoId} não foi encontrado para exclusão`
      });
    }
    
    console.log(`✅ Retorno ${retornoId} removido com sucesso`);
    
    res.json({
      success: true,
      message: 'Retorno removido com sucesso',
      deleted_id: retornoId,
      deleted_data: {
        numero_nf: retornoData.numero_nf,
        status: retornoData.status
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao remover retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro temporário'
    });
  }
});

// POST /api/retornos/:id/bipar - Nova rota para bipagem de itens
router.post('/:id/bipar', async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo_item, descricao, quantidade = 1 } = req.body;
    
    const retornoId = parseInt(id);
    
    if (!retornoId || !codigo_item) {
      return res.status(400).json({
        success: false,
        message: 'ID do retorno e código do item são obrigatórios'
      });
    }
    
    console.log(`📱 POST /api/retornos/${retornoId}/bipar - Bipando item: ${codigo_item}`);
    
    // Buscar retorno atual
    const [retorno] = await db.execute(
      'SELECT * FROM retornos WHERE id = ? AND status IN ("aguardando_chegada", "pendente")',
      [retornoId]
    );
    
    if (retorno.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Retorno não encontrado ou não permite bipagem'
      });
    }
    
    // Processar itens retornados
    let itensRetornados = [];
    try {
      if (retorno[0].itens_retornados) {
        itensRetornados = JSON.parse(retorno[0].itens_retornados);
      }
    } catch (e) {
      console.warn('⚠️ Erro ao parsear itens_retornados, iniciando array vazio');
      itensRetornados = [];
    }
    
    // Adicionar novo item
    const novoItem = {
      codigo: codigo_item,
      descricao: descricao || 'Item não identificado',
      quantidade: parseInt(quantidade) || 1,
      timestamp: new Date().toISOString()
    };
    
    itensRetornados.push(novoItem);
    
    // Atualizar retorno
    const novoStatus = retorno[0].status === 'aguardando_chegada' ? 'pendente' : retorno[0].status;
    
    await db.execute(`
      UPDATE retornos 
      SET itens_retornados = ?, 
          itens_processados = ?,
          status = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [
      JSON.stringify(itensRetornados),
      itensRetornados.length,
      novoStatus,
      retornoId
    ]);
    
    console.log(`✅ Item ${codigo_item} bipado com sucesso. Total: ${itensRetornados.length} itens`);
    
    res.json({
      success: true,
      message: 'Item bipado com sucesso',
      data: {
        item_bipado: novoItem,
        total_itens: itensRetornados.length,
        status_atualizado: novoStatus
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao bipar item:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro temporário'
    });
  }
});

// POST /api/retornos/:id/finalizar - Nova rota para finalizar retorno
router.post('/:id/finalizar', async (req, res) => {
  try {
    const { id } = req.params;
    const { observacoes_finais } = req.body;
    
    const retornoId = parseInt(id);
    
    if (!retornoId) {
      return res.status(400).json({
        success: false,
        message: 'ID do retorno inválido'
      });
    }
    
    console.log(`🏁 POST /api/retornos/${retornoId}/finalizar - Finalizando retorno`);
    
    // Atualizar status para concluído
    const observacoes = observacoes_finais || 'Retorno finalizado automaticamente';
    
    const [result] = await db.execute(`
      UPDATE retornos 
      SET status = 'concluido',
          data_conclusao = NOW(),
          observacoes = CONCAT(COALESCE(observacoes, ''), ' | ', ?),
          updated_at = NOW()
      WHERE id = ? AND status IN ('aguardando_chegada', 'pendente')
    `, [observacoes, retornoId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Retorno não encontrado ou já finalizado'
      });
    }
    
    console.log(`✅ Retorno ${retornoId} finalizado com sucesso`);
    
    res.json({
      success: true,
      message: 'Retorno finalizado com sucesso',
      data: {
        id: retornoId,
        status: 'concluido',
        data_conclusao: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao finalizar retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro temporário'
    });
  }
});

module.exports = router;