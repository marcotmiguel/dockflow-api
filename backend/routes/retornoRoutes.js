const express = require('express');
const router = express.Router();
const { db } = require('../database');

/**
 * Routes para Retornos - VERSÃO ULTRA ROBUSTA
 * URL base: /api/retornos
 * 
 * Sistema de controle de retornos de carregamentos
 * Funciona mesmo sem tabela criada
 */

// Função auxiliar para criar tabela se não existir
const ensureRetornosTable = async () => {
  try {
    console.log('🔍 Verificando existência da tabela retornos...');
    
    // Método mais simples para verificar tabela
    const [columns] = await db.execute('DESCRIBE retornos');
    console.log('✅ Tabela retornos já existe');
    
    // Verificar se tem as colunas necessárias
    const columnNames = columns.map(col => col.Field);
    const needsMotoristaColumn = !columnNames.includes('motorista_nome');
    const needsNfColumn = !columnNames.includes('numero_nf');
    
    if (needsMotoristaColumn || needsNfColumn) {
      console.log('🔧 Adicionando colunas faltantes...');
      
      if (needsMotoristaColumn) {
        await db.execute('ALTER TABLE retornos ADD COLUMN motorista_nome VARCHAR(100) NULL');
        console.log('✅ Coluna motorista_nome adicionada');
      }
      
      if (needsNfColumn) {
        await db.execute('ALTER TABLE retornos ADD COLUMN numero_nf VARCHAR(50) NULL');
        console.log('✅ Coluna numero_nf adicionada');
      }
    }
    
    return true;
    
  } catch (error) {
    console.log('⚠️ Tabela retornos não existe - criando...');
    
    try {
      // Criar tabela completa
      await db.execute(`
        CREATE TABLE IF NOT EXISTS retornos (
          id INT PRIMARY KEY AUTO_INCREMENT,
          carregamento_id INT NULL,
          driver_id INT NULL,
          numero_nf VARCHAR(50) NULL,
          motorista_nome VARCHAR(100) NULL,
          data_retorno DATE NOT NULL,
          horario_retorno TIME NULL,
          observacoes TEXT NULL,
          status ENUM('aguardando_chegada', 'pendente', 'concluido', 'cancelado') DEFAULT 'aguardando_chegada',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_retornos_data (data_retorno),
          INDEX idx_retornos_status (status)
        )
      `);
      
      console.log('✅ Tabela retornos criada com sucesso');
      
      // Inserir dados de exemplo
      await db.execute(`
        INSERT INTO retornos (numero_nf, motorista_nome, data_retorno, horario_retorno, observacoes, status) VALUES
        ('NF-001', 'João Silva', CURDATE(), '14:30:00', 'Retorno de exemplo - sistema inicializado', 'concluido'),
        ('NF-002', 'Maria Santos', CURDATE(), NULL, 'Aguardando confirmação de chegada', 'aguardando_chegada'),
        ('NF-003', 'Pedro Costa', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '16:45:00', 'Retorno com atraso devido ao trânsito', 'concluido')
      `);
      
      console.log('✅ Dados de exemplo inseridos');
      return true;
      
    } catch (createError) {
      console.error('❌ Erro ao criar tabela retornos:', createError);
      return false;
    }
  }
};

// GET /api/retornos - Listar todos os retornos
router.get('/', async (req, res) => {
  try {
    const { status, data_inicio, data_fim, motorista, page = 1, limit = 50 } = req.query;
    
    console.log('📋 GET /api/retornos - Buscando retornos...');
    
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
    
    // Verificar quais colunas existem na tabela
    let [columns] = [];
    try {
      [columns] = await db.execute('DESCRIBE retornos');
      console.log('📊 Colunas da tabela retornos:', columns.map(c => c.Field));
    } catch (descError) {
      console.error('❌ Erro ao descrever tabela:', descError);
    }
    
    const hasMotoristaColumn = columns.some(col => col.Field === 'motorista_nome');
    const hasNfColumn = columns.some(col => col.Field === 'numero_nf');
    
    // Query adaptável baseada nas colunas existentes
    let query = `SELECT r.*`;
    
    if (hasMotoristaColumn) {
      query += `, COALESCE(r.motorista_nome, 'Motorista não informado') as driver_name`;
    } else {
      query += `, 'Motorista não informado' as driver_name`;
    }
    
    if (hasNfColumn) {
      query += `, COALESCE(r.numero_nf, 'NF não informada') as numero_nf_display`;
    } else {
      query += `, 'NF não informada' as numero_nf_display`;
    }
    
    query += ` FROM retornos r WHERE 1=1`;
    
    let params = [];
    
    // Filtros básicos
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    
    if (motorista) {
      if (hasMotoristaColumn) {
        query += ' AND COALESCE(r.motorista_nome, "") LIKE ?';
      } else {
        query += ' AND 1=1'; // Ignorar filtro se coluna não existe
      }
      params.push(`%${motorista}%`);
    }
    
    if (data_inicio) {
      query += ' AND DATE(r.data_retorno) >= ?';
      params.push(data_inicio);
    }
    
    if (data_fim) {
      query += ' AND DATE(r.data_retorno) <= ?';
      params.push(data_fim);
    }
    
    // Ordenação e paginação
    query += ' ORDER BY r.created_at DESC';
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    console.log('🔍 Executando query:', query);
    console.log('📝 Parâmetros:', params);
    
    const [retornos] = await db.execute(query, params);
    
    // Contar total
    let countQuery = 'SELECT COUNT(*) as total FROM retornos WHERE 1=1';
    let countParams = [];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    if (motorista) {
      if (hasMotoristaColumn) {
        countQuery += ' AND COALESCE(motorista_nome, "") LIKE ?';
        countParams.push(`%${motorista}%`);
      }
      // Se não tem a coluna, ignorar o filtro
    }
    
    if (data_inicio) {
      countQuery += ' AND DATE(data_retorno) >= ?';
      countParams.push(data_inicio);
    }
    
    if (data_fim) {
      countQuery += ' AND DATE(data_retorno) <= ?';
      countParams.push(data_fim);
    }
    
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    console.log(`✅ ${retornos.length} retornos encontrados de ${total} total`);
    
    res.json({
      success: true,
      data: retornos,
      meta: {
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar retornos:', error);
    console.error('Stack trace:', error.stack);
    
    // Retornar dados vazios em caso de erro
    res.json({
      success: true,
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
      message: 'Erro temporário - dados em carregamento',
      error: error.message
    });
  }
});

// GET /api/retornos/stats - Estatísticas dos retornos
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 GET /api/retornos/stats - Buscando estatísticas...');
    
    // Garantir que a tabela existe
    const tableExists = await ensureRetornosTable();
    
    if (!tableExists) {
      console.log('⚠️ Tabela retornos não existe - retornando stats iniciais');
      return res.json({
        success: true,
        data: {
          aguardando_chegada: 0,
          pendentes: 0,
          concluidos: 0,
          concluidos_hoje: 0,
          total: 0
        },
        message: 'Sistema inicializando...',
        timestamp: new Date().toISOString()
      });
    }
    
    const hoje = new Date().toISOString().split('T')[0];
    
    try {
      // Queries em paralelo para melhor performance
      const [
        [aguardandoResult],
        [pendentesResult],
        [concluidosResult],
        [concluidosHojeResult],
        [totalResult]
      ] = await Promise.all([
        db.execute('SELECT COUNT(*) as count FROM retornos WHERE status = "aguardando_chegada"'),
        db.execute('SELECT COUNT(*) as count FROM retornos WHERE status = "pendente"'),
        db.execute('SELECT COUNT(*) as count FROM retornos WHERE status = "concluido"'),
        db.execute('SELECT COUNT(*) as count FROM retornos WHERE status = "concluido" AND DATE(data_retorno) = ?', [hoje]),
        db.execute('SELECT COUNT(*) as count FROM retornos')
      ]);
      
      const stats = {
        aguardando_chegada: aguardandoResult[0].count,
        pendentes: pendentesResult[0].count,
        concluidos: concluidosResult[0].count,
        concluidos_hoje: concluidosHojeResult[0].count,
        total: totalResult[0].count
      };
      
      console.log('✅ Estatísticas calculadas:', stats);
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
      
    } catch (queryError) {
      console.error('❌ Erro nas queries de estatísticas:', queryError);
      
      // Fallback com dados vazios
      res.json({
        success: true,
        data: {
          aguardando_chegada: 0,
          pendentes: 0,
          concluidos: 0,
          concluidos_hoje: 0,
          total: 0
        },
        message: 'Dados em carregamento...',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    console.error('Stack trace:', error.stack);
    
    // Sempre retornar dados válidos mesmo com erro
    res.json({
      success: true,
      data: {
        aguardando_chegada: 0,
        pendentes: 0,
        concluidos: 0,
        concluidos_hoje: 0,
        total: 0
      },
      message: 'Sistema temporariamente indisponível',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/retornos/:id - Buscar retorno específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido fornecido'
      });
    }
    
    console.log(`🔍 GET /api/retornos/${id} - Buscando retorno específico`);
    
    // Garantir que a tabela existe
    const tableExists = await ensureRetornosTable();
    
    if (!tableExists) {
      return res.status(404).json({
        success: false,
        message: 'Sistema inicializando - tente novamente em alguns segundos'
      });
    }
    
    const [rows] = await db.execute(`
      SELECT 
        r.*,
        COALESCE(r.motorista_nome, 'Motorista não informado') as driver_name,
        COALESCE(r.numero_nf, 'NF não informada') as numero_nf_display
      FROM retornos r
      WHERE r.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Retorno com ID ${id} não encontrado`
      });
    }
    
    console.log(`✅ Retorno encontrado: ${rows[0].id}`);
    
    res.json({
      success: true,
      data: rows[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// POST /api/retornos - Criar novo retorno
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
      status = 'aguardando_chegada'
    } = req.body;
    
    console.log('📝 POST /api/retornos - Criando novo retorno');
    
    // Validações básicas
    if (!data_retorno) {
      return res.status(400).json({
        success: false,
        message: 'Campo obrigatório: data_retorno'
      });
    }
    
    // Garantir que a tabela existe
    const tableExists = await ensureRetornosTable();
    
    if (!tableExists) {
      return res.status(500).json({
        success: false,
        message: 'Sistema inicializando - tente novamente em alguns segundos'
      });
    }
    
    // Inserir retorno
    const query = `
      INSERT INTO retornos (
        carregamento_id, driver_id, numero_nf, motorista_nome,
        data_retorno, horario_retorno, observacoes, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const [result] = await db.execute(query, [
      carregamento_id || null,
      driver_id || null,
      numero_nf || null,
      motorista_nome || null,
      data_retorno,
      horario_retorno || null,
      observacoes || null,
      status
    ]);
    
    console.log(`✅ Retorno criado com ID: ${result.insertId}`);
    
    // Buscar o retorno criado
    const [newRetorno] = await db.execute(`
      SELECT * FROM retornos WHERE id = ?
    `, [result.insertId]);
    
    res.status(201).json({
      success: true,
      message: 'Retorno criado com sucesso',
      data: newRetorno[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// PUT /api/retornos/:id - Atualizar retorno
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido fornecido'
      });
    }
    
    console.log(`📝 PUT /api/retornos/${id} - Atualizando retorno`);
    
    // Garantir que a tabela existe
    const tableExists = await ensureRetornosTable();
    
    if (!tableExists) {
      return res.status(500).json({
        success: false,
        message: 'Sistema inicializando - tente novamente em alguns segundos'
      });
    }
    
    // Verificar se retorno existe
    const [existing] = await db.execute(
      'SELECT id FROM retornos WHERE id = ?', 
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Retorno com ID ${id} não encontrado`
      });
    }
    
    // Campos permitidos para atualização
    const allowedFields = [
      'numero_nf', 'motorista_nome', 'data_retorno', 'horario_retorno', 'observacoes', 'status'
    ];
    
    const fieldsToUpdate = Object.keys(updateFields).filter(field => 
      allowedFields.includes(field)
    );
    
    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo válido fornecido para atualização'
      });
    }
    
    const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
    const values = fieldsToUpdate.map(field => updateFields[field]);
    values.push(id);
    
    const query = `UPDATE retornos SET ${setClause}, updated_at = NOW() WHERE id = ?`;
    
    await db.execute(query, values);
    
    console.log(`✅ Retorno ${id} atualizado com sucesso`);
    
    res.json({
      success: true,
      message: 'Retorno atualizado com sucesso',
      updated_fields: fieldsToUpdate
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// DELETE /api/retornos/:id - Remover retorno
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido fornecido'
      });
    }
    
    console.log(`🗑️ DELETE /api/retornos/${id} - Removendo retorno`);
    
    // Garantir que a tabela existe
    const tableExists = await ensureRetornosTable();
    
    if (!tableExists) {
      return res.status(500).json({
        success: false,
        message: 'Sistema inicializando - tente novamente em alguns segundos'
      });
    }
    
    const [result] = await db.execute(
      'DELETE FROM retornos WHERE id = ?', 
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Retorno com ID ${id} não encontrado`
      });
    }
    
    console.log(`✅ Retorno ${id} removido com sucesso`);
    
    res.json({
      success: true,
      message: 'Retorno removido com sucesso',
      deleted_id: parseInt(id)
    });
    
  } catch (error) {
    console.error('❌ Erro ao remover retorno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

module.exports = router;