const { db } = require('../database');

/**
 * Controller para Carregamentos
 * Segue padrão do authController.js - async/await com validações
 */

// Listar carregamentos com filtros e paginação
const listar = async (req, res) => {
  try {
    const { status, destinatario, data_inicio, data_fim, page = 1, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM carregamentos WHERE 1=1';
    let params = [];
    
    // Filtros dinâmicos
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (destinatario) {
      query += ' AND destinatario LIKE ?';
      params.push(`%${destinatario}%`);
    }
    
    if (data_inicio) {
      query += ' AND data_entrega >= ?';
      params.push(data_inicio);
    }
    
    if (data_fim) {
      query += ' AND data_entrega <= ?';
      params.push(data_fim);
    }
    
    // Ordenação e paginação
    query += ' ORDER BY created_at DESC';
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    // Executar query principal
    const [carregamentos] = await db.execute(query, params);
    
    // Query para contagem total (sem LIMIT)
    let countQuery = 'SELECT COUNT(*) as total FROM carregamentos WHERE 1=1';
    let countParams = [];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    if (destinatario) {
      countQuery += ' AND destinatario LIKE ?';
      countParams.push(`%${destinatario}%`);
    }
    
    if (data_inicio) {
      countQuery += ' AND data_entrega >= ?';
      countParams.push(data_inicio);
    }
    
    if (data_fim) {
      countQuery += ' AND data_entrega <= ?';
      countParams.push(data_fim);
    }
    
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      success: true,
      data: carregamentos,
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
    console.error('❌ Erro ao listar carregamentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Buscar carregamento específico
const buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido fornecido'
      });
    }
    
    const [rows] = await db.execute(
      'SELECT * FROM carregamentos WHERE id = ?', 
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Carregamento com ID ${id} não encontrado`
      });
    }
    
    res.json({
      success: true,
      data: rows[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar carregamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Criar novo carregamento
const criar = async (req, res) => {
  try {
    const {
      numero_nf,
      chave_acesso,
      destinatario,
      local_entrega,
      data_entrega,
      quantidade_volumes,
      peso_carga,
      codigo_barras,
      nome_produto,
      restricoes_analisadas,
      route_id
    } = req.body;
    
    // Validações obrigatórias
    if (!numero_nf || !destinatario || !quantidade_volumes) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: numero_nf, destinatario, quantidade_volumes'
      });
    }
    
    // Verificar se NF já existe
    const [existing] = await db.execute(
      'SELECT id FROM carregamentos WHERE numero_nf = ?', 
      [numero_nf]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Nota fiscal já cadastrada',
        existing_id: existing[0].id
      });
    }
    
    // Inserir novo carregamento
    const query = `
      INSERT INTO carregamentos (
        numero_nf, chave_acesso, destinatario, local_entrega,
        data_entrega, quantidade_volumes, peso_carga, codigo_barras,
        nome_produto, status, restricoes_analisadas, route_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const params = [
      numero_nf,
      chave_acesso || null,
      destinatario,
      local_entrega || null,
      data_entrega || new Date().toISOString().split('T')[0],
      quantidade_volumes,
      peso_carga || 0,
      codigo_barras || null,
      nome_produto || 'Produto sem nome',
      'aguardando carregamento',
      restricoes_analisadas ? JSON.stringify(restricoes_analisadas) : null,
      route_id || null
    ];
    
    const [result] = await db.execute(query, params);
    
    // Buscar o carregamento criado
    const [newCarregamento] = await db.execute(
      'SELECT * FROM carregamentos WHERE id = ?', 
      [result.insertId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Carregamento criado com sucesso',
      data: newCarregamento[0],
      id: result.insertId
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar carregamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Atualizar carregamento
const atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido fornecido'
      });
    }
    
    // Verificar se carregamento existe
    const [existing] = await db.execute(
      'SELECT id FROM carregamentos WHERE id = ?', 
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Carregamento com ID ${id} não encontrado`
      });
    }
    
    // Construir query de update dinamicamente
    const allowedFields = [
      'numero_nf', 'chave_acesso', 'destinatario', 'local_entrega',
      'data_entrega', 'quantidade_volumes', 'peso_carga', 'codigo_barras',
      'nome_produto', 'status', 'restricoes_analisadas', 'route_id'
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
    values.push(id); // Para o WHERE
    
    const query = `UPDATE carregamentos SET ${setClause}, updated_at = NOW() WHERE id = ?`;
    
    await db.execute(query, values);
    
    res.json({
      success: true,
      message: 'Carregamento atualizado com sucesso',
      updated_fields: fieldsToUpdate
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar carregamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Remover carregamento
const remover = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido fornecido'
      });
    }
    
    const [result] = await db.execute(
      'DELETE FROM carregamentos WHERE id = ?', 
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Carregamento com ID ${id} não encontrado`
      });
    }
    
    res.json({
      success: true,
      message: 'Carregamento removido com sucesso',
      deleted_id: parseInt(id)
    });
    
  } catch (error) {
    console.error('❌ Erro ao remover carregamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter estatísticas do dashboard
const obterEstatisticas = async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    
    // Todas as queries em paralelo usando Promise.all
    const [
      [aguardandoResult],
      [emRotaResult], 
      [entregueResult],
      [entregueHojeResult],
      [volumesResult]
    ] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM carregamentos WHERE status = "aguardando carregamento"'),
      db.execute('SELECT COUNT(*) as count FROM carregamentos WHERE status = "em rota"'),
      db.execute('SELECT COUNT(*) as count FROM carregamentos WHERE status = "entregue"'),
      db.execute('SELECT COUNT(*) as count FROM carregamentos WHERE DATE(created_at) = ? AND status = "entregue"', [hoje]),
      db.execute('SELECT SUM(quantidade_volumes) as total FROM carregamentos WHERE status != "entregue"')
    ]);
    
    res.json({
      success: true,
      data: {
        aguardando_carregamento: aguardandoResult[0].count,
        em_rota: emRotaResult[0].count,
        entregue: entregueResult[0].count,
        entregue_hoje: entregueHojeResult[0].count,
        volumes_em_armazem: volumesResult[0].total || 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Importar XML
const importarXML = async (req, res) => {
  try {
    const { xmlData, routeId } = req.body;
    
    if (!xmlData || !routeId) {
      return res.status(400).json({
        success: false,
        message: 'XML e rota são obrigatórios'
      });
    }
    
    // Extrair dados do XML (simulação - você pode implementar parser real)
    const extractedData = {
      numero_nf: xmlData.numero || 'XML_' + Date.now(),
      chave_acesso: xmlData.chave || null,
      destinatario: xmlData.destinatario || 'Destinatário XML',
      local_entrega: xmlData.endereco || null,
      data_entrega: xmlData.data_entrega || null,
      quantidade_volumes: xmlData.volumes || 1,
      peso_carga: xmlData.peso || null,
      nome_produto: xmlData.produto || 'Produto XML',
      route_id: routeId,
      restricoes_analisadas: xmlData.restricoes || null
    };
    
    // Reutilizar a função criar (DRY principle)
    req.body = extractedData;
    await criar(req, res);
    
  } catch (error) {
    console.error('❌ Erro ao importar XML:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar XML',
      error: error.message
    });
  }
};

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  remover,
  obterEstatisticas,
  importarXML
};