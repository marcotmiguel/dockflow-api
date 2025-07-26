// routes/loadingRoutes.js
// routes/loadingRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/loadingController');
const { authMiddleware } = require('../middleware/authMiddleware');
const mysql = require('mysql2/promise');
const db = require('../database');

router.get('/listar', controller.listar);
router.post('/agendar', controller.agendar);
router.get('/detalhes/:id', controller.detalhes);
router.put('/atualizar/:id', controller.atualizar);
router.delete('/remover/:id', controller.remover);


// Exemplo com autenticação
router.get('/routes', authMiddleware, async (req, res) => {
  res.status(200).json({ mensagem: 'Rota protegida acessada com sucesso!' });
});

module.exports = router;

// Configuração do banco de dados
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Mm386195@',
  database: 'dockflow'
};

// ==================== ROTAS ====================

// Listar todas as rotas
router.get('/routes', authMiddleware, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [routes] = await connection.execute(`
      SELECT r.*, u.name as analyst_name,
             COUNT(i.id) as invoice_count,
             SUM(i.total_value) as total_value,
             SUM(i.total_weight) as total_weight
      FROM routes r
      LEFT JOIN users u ON r.analyst_id = u.id
      LEFT JOIN invoices i ON r.id = i.route_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);
    
    await connection.end();
    res.json(routes);
  } catch (error) {
    console.error('Erro ao buscar rotas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Criar nova rota
router.post('/routes', authMiddleware, async (req, res) => {
  try {
    const { code, description } = req.body;
    const analyst_id = req.user.id;
    
    const connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(
      'INSERT INTO routes (code, description, analyst_id) VALUES (?, ?, ?)',
      [code, description, analyst_id]
    );
    
    await connection.end();
    res.status(201).json({ id: result.insertId, message: 'Rota criada com sucesso' });
  } catch (error) {
    console.error('Erro ao criar rota:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// ==================== NOTAS FISCAIS ====================

// Importar XML de nota fiscal
router.post('/routes/:routeId/invoices/import-xml', authMiddleware, async (req, res) => {
  try {
    const { routeId } = req.params;
    const { xmlContent } = req.body;
    
    // Aqui seria o parser do XML - por ora, vamos simular
    const invoiceData = parseXML(xmlContent);
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Inserir nota fiscal
    const [invoiceResult] = await connection.execute(`
      INSERT INTO invoices (route_id, invoice_number, serie, xml_content, 
                           recipient_name, recipient_cnpj, recipient_address, 
                           total_value, total_weight)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      routeId, invoiceData.number, invoiceData.serie, xmlContent,
      invoiceData.recipient.name, invoiceData.recipient.cnpj, 
      invoiceData.recipient.address, invoiceData.totalValue, invoiceData.totalWeight
    ]);
    
    const invoiceId = invoiceResult.insertId;
    
    // Inserir itens
    for (const item of invoiceData.items) {
      await connection.execute(`
        INSERT INTO invoice_items (invoice_id, product_code, product_name, 
                                 quantity, unit, unit_value, total_value, barcode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoiceId, item.code, item.name, item.quantity, 
        item.unit, item.unitValue, item.totalValue, item.barcode
      ]);
    }
    
    await connection.end();
    res.status(201).json({ message: 'XML importado com sucesso', invoiceId });
  } catch (error) {
    console.error('Erro ao importar XML:', error);
    res.status(500).json({ message: 'Erro ao processar XML' });
  }
});

// Listar notas fiscais de uma rota
router.get('/routes/:routeId/invoices', authMiddleware, async (req, res) => {
  try {
    const { routeId } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [invoices] = await connection.execute(`
      SELECT i.*, 
             COUNT(ii.id) as item_count,
             SUM(CASE WHEN ii.status = 'complete' THEN 1 ELSE 0 END) as completed_items
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.route_id = ?
      GROUP BY i.id
      ORDER BY i.created_at
    `, [routeId]);
    
    await connection.end();
    res.json(invoices);
  } catch (error) {
    console.error('Erro ao buscar notas fiscais:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// ==================== FILA DE CARREGAMENTO ====================

// Adicionar à fila (via WhatsApp)
router.post('/queue', async (req, res) => {
  try {
    const { driver_cpf, driver_name, vehicle_plate, vehicle_type, phone_number, route_code } = req.body;
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Buscar rota pelo código
    const [routes] = await connection.execute('SELECT id FROM routes WHERE code = ? AND status = "active"', [route_code]);
    
    if (routes.length === 0) {
      await connection.end();
      return res.status(404).json({ message: 'Rota não encontrada ou inativa' });
    }
    
    const route_id = routes[0].id;
    
    // Verificar se já existe na fila
    const [existing] = await connection.execute(
      'SELECT id FROM loading_queue WHERE driver_cpf = ? AND status IN ("waiting", "approved", "loading")',
      [driver_cpf]
    );
    
    if (existing.length > 0) {
      await connection.end();
      return res.status(400).json({ message: 'Motorista já está na fila' });
    }
    
    // Adicionar à fila
    const [result] = await connection.execute(`
      INSERT INTO loading_queue (driver_cpf, driver_name, vehicle_plate, vehicle_type, 
                               phone_number, route_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [driver_cpf, driver_name, vehicle_plate, vehicle_type, phone_number, route_id]);
    
    // Log WhatsApp
    await connection.execute(`
      INSERT INTO whatsapp_log (phone_number, driver_cpf, message_type, message_content, queue_id)
      VALUES (?, ?, 'incoming', 'Solicitação de carregamento', ?)
    `, [phone_number, driver_cpf, result.insertId]);
    
    await connection.end();
    res.status(201).json({ 
      message: 'Motorista adicionado à fila com sucesso',
      queueId: result.insertId,
      position: await getQueuePosition(result.insertId)
    });
  } catch (error) {
    console.error('Erro ao adicionar à fila:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});


// Listar fila de carregamento
router.get('/queue', authMiddleware, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [queue] = await connection.execute(`
      SELECT lq.*, r.code as route_code, r.description as route_description,
             d.name as dock_name, u.name as authorized_by_name,
             CASE 
               WHEN lq.status = 'waiting' THEN 
                 (SELECT COUNT(*) FROM loading_queue lq2 
                  WHERE lq2.status = 'waiting' AND lq2.requested_at < lq.requested_at) + 1
               ELSE NULL
             END as queue_position
      FROM loading_queue lq
      LEFT JOIN routes r ON lq.route_id = r.id
      LEFT JOIN docks d ON lq.dock_id = d.id
      LEFT JOIN users u ON lq.authorized_by = u.id
      WHERE lq.status IN ('waiting', 'approved', 'loading')
      ORDER BY 
        CASE lq.status 
          WHEN 'loading' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'waiting' THEN 3
        END,
        lq.priority DESC,
        lq.requested_at ASC
    `);
    
    await connection.end();
    res.json(queue);
  } catch (error) {
    console.error('Erro ao buscar fila:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Autorizar carregamento
router.post('/queue/:queueId/authorize', authMiddleware, async (req, res) => {
  try {
    const { queueId } = req.params;
    const { dock_id } = req.body;
    const authorized_by = req.user.id;
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Verificar se a doca está disponível
    const [dock] = await connection.execute('SELECT status FROM docks WHERE id = ?', [dock_id]);
    
    if (dock.length === 0 || dock[0].status !== 'available') {
      await connection.end();
      return res.status(400).json({ message: 'Doca não disponível' });
    }
    
    // Atualizar fila
    await connection.execute(`
      UPDATE loading_queue 
      SET status = 'approved', dock_id = ?, authorized_by = ?, authorized_at = NOW()
      WHERE id = ?
    `, [dock_id, authorized_by, queueId]);
    
    // Ocupar doca
    await connection.execute(`
      UPDATE docks 
      SET status = 'occupied', current_queue_id = ?
      WHERE id = ?
    `, [queueId, dock_id]);
    
    // Buscar dados para notificação
    const [queueData] = await connection.execute(`
      SELECT lq.*, d.name as dock_name, d.location
      FROM loading_queue lq
      JOIN docks d ON lq.dock_id = d.id
      WHERE lq.id = ?
    `, [queueId]);
    
    // Enviar notificação WhatsApp
    await sendWhatsAppNotification(queueData[0]);
    
    await connection.end();
    res.json({ message: 'Carregamento autorizado com sucesso' });
  } catch (error) {
    console.error('Erro ao autorizar carregamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// ==================== BIPAGEM ====================

// Registrar bipagem de item
router.post('/queue/:queueId/scan', authMiddleware, async (req, res) => {
  try {
    const { queueId } = req.params;
    const { barcode, quantity } = req.body;
    const scanned_by = req.user.id;
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Buscar item pelo código de barras
    const [items] = await connection.execute(`
      SELECT ii.*, i.route_id
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      JOIN loading_queue lq ON i.route_id = lq.route_id
      WHERE ii.barcode = ? AND lq.id = ?
    `, [barcode, queueId]);
    
    if (items.length === 0) {
      await connection.end();
      return res.status(404).json({ message: 'Item não encontrado para este carregamento' });
    }
    
    const item = items[0];
    
    // Verificar se não excede a quantidade
    const new_loaded_quantity = parseFloat(item.loaded_quantity) + parseFloat(quantity);
    
    if (new_loaded_quantity > parseFloat(item.quantity)) {
      await connection.end();
      return res.status(400).json({ 
        message: 'Quantidade excede o previsto',
        available: parseFloat(item.quantity) - parseFloat(item.loaded_quantity)
      });
    }
    
    // Registrar bipagem
    await connection.execute(`
      INSERT INTO loading_scans (queue_id, invoice_item_id, scanned_quantity, scanned_by, barcode_scanned)
      VALUES (?, ?, ?, ?, ?)
    `, [queueId, item.id, quantity, scanned_by, barcode]);
    
    // Atualizar quantidade carregada
    await connection.execute(`
      UPDATE invoice_items 
      SET loaded_quantity = ?, 
          status = CASE 
            WHEN ? >= quantity THEN 'complete'
            WHEN ? > 0 THEN 'partial'
            ELSE 'pending'
          END
      WHERE id = ?
    `, [new_loaded_quantity, new_loaded_quantity, new_loaded_quantity, item.id]);
    
    // Iniciar carregamento se for a primeira bipagem
    await connection.execute(`
      UPDATE loading_queue 
      SET status = 'loading', started_at = COALESCE(started_at, NOW())
      WHERE id = ? AND status = 'approved'
    `, [queueId]);
    
    await connection.end();
    res.json({ 
      message: 'Item bipado com sucesso',
      loaded_quantity: new_loaded_quantity,
      remaining: parseFloat(item.quantity) - new_loaded_quantity
    });
  } catch (error) {
    console.error('Erro ao registrar bipagem:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Finalizar carregamento
router.post('/queue/:queueId/complete', authMiddleware, async (req, res) => {
  try {
    const { queueId } = req.params;
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Verificar se todos os itens foram carregados
    const [pendingItems] = await connection.execute(`
      SELECT COUNT(*) as pending_count
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      JOIN loading_queue lq ON i.route_id = lq.route_id
      WHERE lq.id = ? AND ii.status != 'complete'
    `, [queueId]);
    
    if (pendingItems[0].pending_count > 0) {
      await connection.end();
      return res.status(400).json({ 
        message: 'Ainda há itens pendentes de carregamento',
        pending_items: pendingItems[0].pending_count
      });
    }
    
    // Finalizar carregamento
    const [queueData] = await connection.execute('SELECT dock_id FROM loading_queue WHERE id = ?', [queueId]);
    
    await connection.execute(`
      UPDATE loading_queue 
      SET status = 'completed', completed_at = NOW()
      WHERE id = ?
    `, [queueId]);
    
    // Liberar doca
    if (queueData[0].dock_id) {
      await connection.execute(`
        UPDATE docks 
        SET status = 'available', current_queue_id = NULL
        WHERE id = ?
      `, [queueData[0].dock_id]);
    }
    
    await connection.end();
    res.json({ message: 'Carregamento finalizado com sucesso' });
  } catch (error) {
    console.error('Erro ao finalizar carregamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// ==================== FUNÇÕES AUXILIARES ====================

// Simular parser de XML (implementar com biblioteca específica)
function parseXML(xmlContent) {
  // Esta é uma simulação - implementar com xml2js ou similar
  return {
    number: '12345',
    serie: '1',
    totalValue: 1000.00,
    totalWeight: 50.5,
    recipient: {
      name: 'Cliente Teste',
      cnpj: '12.345.678/0001-90',
      address: 'Rua Teste, 123'
    },
    items: [
      {
        code: 'PROD001',
        name: 'Produto Teste',
        quantity: 10,
        unit: 'UN',
        unitValue: 100.00,
        totalValue: 1000.00,
        barcode: '7891234567890'
      }
    ]
  };
}

// Obter posição na fila
function getQueuePosition(queueId, callback) {
  const query = `
    SELECT COUNT(*) as position
    FROM loading_queue lq1
    JOIN loading_queue lq2 ON lq2.id = ?
    WHERE lq1.status = 'waiting' AND lq1.requested_at < lq2.requested_at
  `;
  
  db.query(query, [queueId], (err, results) => {
    if (err) {
      console.error('Erro ao obter posição na fila:', err);
      return callback(err, null);
    }
    const position = results[0] ? results[0].position + 1 : 1;
    callback(null, position);
  });
}

// Enviar notificação WhatsApp
function sendWhatsAppNotification(queueData) {
  // Simular envio - implementar com API real do WhatsApp
  const message = `🚛 Carregamento autorizado!\n\nDoca: ${queueData.dock_name}\nLocalização: ${queueData.location}\n\nDirija-se à doca indicada.`;
  
  const insertQuery = `
    INSERT INTO whatsapp_log (phone_number, driver_cpf, message_type, message_content, queue_id)
    VALUES (?, ?, 'outgoing', ?, ?)
  `;
  
  db.query(insertQuery, [queueData.phone_number, queueData.driver_cpf, message, queueData.id], (err) => {
    if (err) {
      console.error('Erro ao registrar log do WhatsApp:', err);
    } else {
      console.log(`WhatsApp enviado para ${queueData.phone_number}: ${message}`);
    }
  });
}

// Buscar carregamentos de hoje
const getTodayLoadings = (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    const query = `
      SELECT l.*, 
             d.name as dock_name, 
             dr.name as driver_name,
             dr.phone as driver_phone
      FROM loadings l
      LEFT JOIN docks d ON l.dock_id = d.id
      LEFT JOIN drivers dr ON l.driver_id = dr.id
      WHERE DATE(l.created_at) = ?
      ORDER BY l.created_at DESC
    `;
    
    db.query(query, [today], (err, results) => {
      if (err) {
        console.error('Erro ao buscar carregamentos do dia:', err);
        return res.status(500).json({ 
          message: 'Erro no servidor',
          error: err.message 
        });
      }
      
      res.json(results || []);
    });
    
  } catch (error) {
    console.error('Erro na função getTodayLoadings:', error);
    res.status(500).json({ 
      message: 'Erro no servidor',
      error: error.message 
    });
  }
};

router.get('/today', authMiddleware, getTodayLoadings);

module.exports = router;