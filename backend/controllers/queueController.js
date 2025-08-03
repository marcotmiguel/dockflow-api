const { db } = require('../database');

/**
 * Controller para Fila de Carregamento
 * Gerencia motoristas aguardando na fila
 */

// Listar fila completa com informações da rota
const listarFila = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT 
        q.*,
        r.description as route_description,
        r.name as route_name
      FROM loading_queue q
      LEFT JOIN routes r ON q.route_id = r.id
      WHERE 1=1
    `;
    
    let params = [];
    
    // Filtro por status se fornecido
    if (status) {
      query += ' AND q.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY q.requested_at ASC';
    
    const [fila] = await db.execute(query, params);
    
    res.json({
      success: true,
      data: fila,
      count: fila.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar fila:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Buscar posição específica na fila
const buscarPosicao = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido fornecido'
      });
    }
    
    const [rows] = await db.execute(`
      SELECT 
        q.*,
        r.description as route_description,
        r.name as route_name
      FROM loading_queue q
      LEFT JOIN routes r ON q.route_id = r.id
      WHERE q.id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Posição na fila com ID ${id} não encontrada`
      });
    }
    
    // Calcular posição atual na fila
    const [positionResult] = await db.execute(`
      SELECT COUNT(*) + 1 as position 
      FROM loading_queue 
      WHERE status = 'waiting' 
      AND requested_at < (SELECT requested_at FROM loading_queue WHERE id = ?)
    `, [id]);
    
    const item = rows[0];
    item.position_in_queue = item.status === 'waiting' ? positionResult[0].position : null;
    
    res.json({
      success: true,
      data: item,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar posição na fila:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Adicionar motorista à fila
const adicionarNaFila = async (req, res) => {
  try {
    const {
      driver_cpf,
      driver_name,
      vehicle_plate,
      vehicle_type,
      phone_number,
      route_code
    } = req.body;
    
    // Validações obrigatórias
    if (!driver_cpf || !driver_name || !vehicle_plate || !route_code) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: driver_cpf, driver_name, vehicle_plate, route_code'
      });
    }
    
    // Verificar se motorista já está na fila ativa
    const [existing] = await db.execute(`
      SELECT id, status 
      FROM loading_queue 
      WHERE driver_cpf = ? 
      AND status IN ('waiting', 'approved', 'loading')
    `, [driver_cpf]);
    
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Motorista já está na fila de carregamento',
        current_status: existing[0].status,
        queue_id: existing[0].id
      });
    }
    
    // Verificar se a rota existe
    const [route] = await db.execute(
      'SELECT id, name, description FROM routes WHERE id = ?', 
      [route_code]
    );
    
    if (route.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rota não encontrada',
        route_code: route_code
      });
    }
    
    // Inserir na fila
    const query = `
      INSERT INTO loading_queue (
        driver_cpf, driver_name, vehicle_plate, vehicle_type,
        phone_number, route_code, route_id, status, requested_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting', NOW())
    `;
    
    const [result] = await db.execute(query, [
      driver_cpf,
      driver_name,
      vehicle_plate.toUpperCase(),
      vehicle_type || 'Caminhão',
      phone_number,
      route_code,
      route_code // route_id = route_code neste caso
    ]);
    
    // Calcular posição na fila
    const [positionResult] = await db.execute(`
      SELECT COUNT(*) as position 
      FROM loading_queue 
      WHERE status = 'waiting' 
      AND requested_at <= NOW()
    `);
    
    res.status(201).json({
      success: true,
      message: 'Adicionado à fila com sucesso',
      data: {
        queue_id: result.insertId,
        position: positionResult[0].position,
        route_name: route[0].name,
        status: 'waiting'
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao adicionar à fila:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Atualizar status na fila
const atualizarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido fornecido'
      });
    }
    
    const validStatuses = ['waiting', 'approved', 'loading', 'completed', 'cancelled'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido. Válidos: ' + validStatuses.join(', ')
      });
    }
    
    // Verificar se item existe
    const [existing] = await db.execute(
      'SELECT id, status as current_status FROM loading_queue WHERE id = ?', 
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Item da fila com ID ${id} não encontrado`
      });
    }
    
    // Construir query de update com timestamps baseados no status
    let updateQuery = 'UPDATE loading_queue SET status = ?, updated_at = NOW()';
    let params = [status];
    
    // Adicionar timestamps específicos
    switch (status) {
      case 'approved':
        updateQuery += ', approved_at = NOW()';
        break;
      case 'loading':
        updateQuery += ', loading_started_at = NOW()';
        break;
      case 'completed':
        updateQuery += ', completed_at = NOW()';
        break;
    }
    
    // Adicionar notas se fornecidas
    if (notes) {
      updateQuery += ', notes = ?';
      params.push(notes);
    }
    
    updateQuery += ' WHERE id = ?';
    params.push(id);
    
    await db.execute(updateQuery, params);
    
    res.json({
      success: true,
      message: `Status atualizado para: ${status}`,
      data: {
        id: parseInt(id),
        new_status: status,
        previous_status: existing[0].current_status,
        notes: notes || null
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Remover da fila
const removerDaFila = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido fornecido'
      });
    }
    
    const [result] = await db.execute(
      'DELETE FROM loading_queue WHERE id = ?', 
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Item da fila com ID ${id} não encontrado`
      });
    }
    
    res.json({
      success: true,
      message: 'Removido da fila com sucesso',
      deleted_id: parseInt(id)
    });
    
  } catch (error) {
    console.error('❌ Erro ao remover da fila:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter estatísticas da fila
const obterEstatisticasFila = async (req, res) => {
  try {
    const [
      [waitingResult],
      [approvedResult],
      [loadingResult],
      [completedTodayResult],
      [avgWaitTimeResult]
    ] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM loading_queue WHERE status = "waiting"'),
      db.execute('SELECT COUNT(*) as count FROM loading_queue WHERE status = "approved"'),
      db.execute('SELECT COUNT(*) as count FROM loading_queue WHERE status = "loading"'),
      db.execute('SELECT COUNT(*) as count FROM loading_queue WHERE status = "completed" AND DATE(completed_at) = CURDATE()'),
      db.execute(`
        SELECT AVG(TIMESTAMPDIFF(MINUTE, requested_at, approved_at)) as avg_minutes
        FROM loading_queue 
        WHERE approved_at IS NOT NULL 
        AND DATE(requested_at) = CURDATE()
      `)
    ]);
    
    res.json({
      success: true,
      data: {
        aguardando: waitingResult[0].count,
        aprovados: approvedResult[0].count,
        carregando: loadingResult[0].count,
        concluidos_hoje: completedTodayResult[0].count,
        tempo_medio_aprovacao_minutos: Math.round(avgWaitTimeResult[0].avg_minutes || 0)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas da fila:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

module.exports = {
  listarFila,
  buscarPosicao,
  adicionarNaFila,
  atualizarStatus,
  removerDaFila,
  obterEstatisticasFila
};