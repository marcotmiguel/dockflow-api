// routes/whatsappRoutes.js
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// Configuração do banco de dados
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Mm386195@',
  database: 'dockflow'
};

// Simulação de configuração do WhatsApp Business API
const WHATSAPP_CONFIG = {
  token: 'your_whatsapp_business_token',
  phoneNumberId: 'your_phone_number_id',
  webhookVerifyToken: 'your_webhook_verify_token'
};

// ==================== WEBHOOK VERIFICATION ====================
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode && token === WHATSAPP_CONFIG.webhookVerifyToken) {
    console.log('Webhook verificado');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ==================== RECEBER MENSAGENS ====================
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
      body.entry.forEach(entry => {
        entry.changes.forEach(change => {
          if (change.field === 'messages') {
            const messages = change.value.messages;
            if (messages) {
              messages.forEach(message => {
                processIncomingMessage(message, change.value.contacts[0]);
              });
            }
          }
        });
      });
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.sendStatus(500);
  }
});

// ==================== PROCESSAR MENSAGENS ====================
async function processIncomingMessage(message, contact) {
  const phoneNumber = message.from;
  const messageText = message.text?.body?.toLowerCase().trim();
  const contactName = contact.profile?.name || 'Motorista';
  
  console.log(`Mensagem recebida de ${phoneNumber}: ${messageText}`);
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Log da mensagem
    await connection.execute(`
      INSERT INTO whatsapp_log (phone_number, message_type, message_content, sent_at)
      VALUES (?, 'incoming', ?, NOW())
    `, [phoneNumber, messageText]);
    
    // Verificar se é comando válido
    if (messageText.includes('carregamento') || messageText.includes('carregar')) {
      await handleLoadingRequest(connection, phoneNumber, contactName, messageText);
    } else if (messageText.includes('status') || messageText.includes('posição')) {
      await handleStatusRequest(connection, phoneNumber);
    } else if (messageText.includes('checkin') || messageText.includes('chegou')) {
      await handleCheckinRequest(connection, phoneNumber, messageText);
    } else if (messageText.includes('ajuda') || messageText.includes('help') || messageText === 'oi' || messageText === 'olá') {
      await sendHelpMessage(phoneNumber);
    } else {
      await sendInvalidCommandMessage(phoneNumber);
    }
    
    await connection.end();
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    await sendErrorMessage(phoneNumber);
  }
}

// ==================== COMANDOS ====================

// Solicitar carregamento
async function handleLoadingRequest(connection, phoneNumber, contactName, messageText) {
  try {
    // Extrair informações da mensagem
    const info = extractLoadingInfo(messageText);
    
    if (!info.cpf || !info.plate || !info.routeCode) {
      await sendLoadingInstructionsMessage(phoneNumber);
      return;
    }
    
    // Verificar se a rota existe
    const [routes] = await connection.execute(
      'SELECT id FROM routes WHERE code = ? AND status = "active"',
      [info.routeCode]
    );
    
    if (routes.length === 0) {
      await sendMessage(phoneNumber, `❌ Rota "${info.routeCode}" não encontrada ou inativa.`);
      return;
    }
    
    // Verificar se já está na fila
    const [existing] = await connection.execute(`
      SELECT id, status FROM loading_queue 
      WHERE driver_cpf = ? AND status IN ('waiting', 'approved', 'loading')
    `, [info.cpf]);
    
    if (existing.length > 0) {
      const status = getStatusText(existing[0].status);
      await sendMessage(phoneNumber, `⚠️ Você já está na fila!\nStatus: ${status}`);
      return;
    }
    
    // Adicionar à fila
    const [result] = await connection.execute(`
      INSERT INTO loading_queue (driver_cpf, driver_name, vehicle_plate, vehicle_type, 
                               phone_number, route_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [info.cpf, contactName, info.plate, 'Caminhão', phoneNumber, routes[0].id]);
    
    // Calcular posição na fila
    const [position] = await connection.execute(`
      SELECT COUNT(*) + 1 as position
      FROM loading_queue 
      WHERE status = 'waiting' AND requested_at < (
        SELECT requested_at FROM loading_queue WHERE id = ?
      )
    `, [result.insertId]);
    
    await sendMessage(phoneNumber, 
      `✅ Solicitação recebida!\n\n` +
      `📋 CPF: ${formatCPF(info.cpf)}\n` +
      `🚛 Placa: ${info.plate}\n` +
      `🛣️ Rota: ${info.routeCode}\n` +
      `📍 Posição na fila: ${position[0].position}\n\n` +
      `Aguarde a autorização. Você será notificado quando a doca for liberada.`
    );
    
  } catch (error) {
    console.error('Erro ao processar solicitação de carregamento:', error);
    await sendMessage(phoneNumber, '❌ Erro ao processar solicitação. Tente novamente.');
  }
}

// Consultar status
async function handleStatusRequest(connection, phoneNumber) {
  try {
    // Buscar CPF pelo telefone
    const [queue] = await connection.execute(`
      SELECT lq.*, r.code as route_code, d.name as dock_name, d.location
      FROM loading_queue lq
      LEFT JOIN routes r ON lq.route_id = r.id
      LEFT JOIN docks d ON lq.dock_id = d.id
      WHERE lq.phone_number = ? AND lq.status IN ('waiting', 'approved', 'loading')
      ORDER BY lq.requested_at DESC
      LIMIT 1
    `, [phoneNumber]);
    
    if (queue.length === 0) {
      await sendMessage(phoneNumber, '📋 Você não está na fila de carregamento no momento.');
      return;
    }
    
    const item = queue[0];
    let statusMessage = `📊 *Status do Carregamento*\n\n`;
    statusMessage += `👤 Motorista: ${item.driver_name}\n`;
    statusMessage += `🚛 Veículo: ${item.vehicle_plate}\n`;
    statusMessage += `🛣️ Rota: ${item.route_code}\n`;
    statusMessage += `📅 Solicitado: ${formatDateTime(item.requested_at)}\n`;
    statusMessage += `🔄 Status: ${getStatusText(item.status)}\n`;
    
    if (item.status === 'waiting') {
      // Calcular posição na fila
      const [position] = await connection.execute(`
        SELECT COUNT(*) + 1 as position
        FROM loading_queue 
        WHERE status = 'waiting' AND requested_at < ?
      `, [item.requested_at]);
      
      statusMessage += `📍 Posição na fila: ${position[0].position}\n`;
    } else if (item.status === 'approved') {
      statusMessage += `🏢 Doca: ${item.dock_name}\n`;
      statusMessage += `📍 Localização: ${item.location}\n`;
      statusMessage += `✅ Dirija-se à doca designada!\n`;
    } else if (item.status === 'loading') {
      statusMessage += `🏢 Doca: ${item.dock_name}\n`;
      statusMessage += `⏳ Carregamento em andamento...\n`;
    }
    
    await sendMessage(phoneNumber, statusMessage);
    
  } catch (error) {
    console.error('Erro ao consultar status:', error);
    await sendMessage(phoneNumber, '❌ Erro ao consultar status.');
  }
}

// Check-in remoto
async function handleCheckinRequest(connection, phoneNumber, messageText) {
  try {
    const [queue] = await connection.execute(`
      SELECT lq.*, d.name as dock_name
      FROM loading_queue lq
      LEFT JOIN docks d ON lq.dock_id = d.id
      WHERE lq.phone_number = ? AND lq.status = 'approved'
      ORDER BY lq.requested_at DESC
      LIMIT 1
    `, [phoneNumber]);
    
    if (queue.length === 0) {
      await sendMessage(phoneNumber, '❌ Você não tem carregamento aprovado para check-in.');
      return;
    }
    
    // Atualizar status para loading
    await connection.execute(`
      UPDATE loading_queue 
      SET status = 'loading', started_at = NOW()
      WHERE id = ?
    `, [queue[0].id]);
    
    await sendMessage(phoneNumber, 
      `✅ Check-in realizado!\n\n` +
      `🏢 Doca: ${queue[0].dock_name}\n` +
      `⏰ Início: ${formatDateTime(new Date())}\n\n` +
      `Bom carregamento! 🚛`
    );
    
  } catch (error) {
    console.error('Erro no check-in:', error);
    await sendMessage(phoneNumber, '❌ Erro ao realizar check-in.');
  }
}

// ==================== FUNÇÕES AUXILIARES ====================

// Extrair informações da mensagem
function extractLoadingInfo(messageText) {
  const info = {
    cpf: null,
    plate: null,
    routeCode: null
  };
  
  // Regex para CPF
  const cpfMatch = messageText.match(/(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/);
  if (cpfMatch) {
    info.cpf = cpfMatch[1].replace(/\D/g, '');
  }
  
  // Regex para placa (formato antigo e Mercosul)
  const plateMatch = messageText.match(/([A-Z]{3}-?\d{4}|[A-Z]{3}\d[A-Z]\d{2})/i);
  if (plateMatch) {
    info.plate = plateMatch[1].toUpperCase();
  }
  
  // Regex para código da rota
  const routeMatch = messageText.match(/rota[\s:]*([\w\-]+)/i);
  if (routeMatch) {
    info.routeCode = routeMatch[1].toUpperCase();
  }
  
  return info;
}

// Obter texto do status
function getStatusText(status) {
  const statusTexts = {
    'waiting': '⏳ Aguardando autorização',
    'approved': '✅ Aprovado - Dirija-se à doca',
    'loading': '🔄 Carregamento em andamento',
    'completed': '✅ Finalizado',
    'cancelled': '❌ Cancelado'
  };
  return statusTexts[status] || status;
}

// Formatadores
function formatCPF(cpf) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatDateTime(date) {
  return new Date(date).toLocaleString('pt-BR');
}

// ==================== ENVIO DE MENSAGENS ====================

// Enviar mensagem de ajuda
async function sendHelpMessage(phoneNumber) {
  const helpText = `🤖 *DockFlow Bot - Ajuda*\n\n` +
    `📋 *Comandos disponíveis:*\n\n` +
    `🚛 *Solicitar carregamento:*\n` +
    `"Solicitar carregamento CPF 123.456.789-10 placa ABC-1234 rota RT001"\n\n` +
    `📊 *Consultar status:*\n` +
    `"Status" ou "Posição"\n\n` +
    `✅ *Check-in:*\n` +
    `"Chegou" ou "Check-in"\n\n` +
    `❓ *Ajuda:*\n` +
    `"Ajuda" ou "Help"\n\n` +
    `💡 *Dica:* Use sempre o formato exato para solicitar carregamento!`;
  
  await sendMessage(phoneNumber, helpText);
}

// Enviar instruções de carregamento
async function sendLoadingInstructionsMessage(phoneNumber) {
  const instructionText = `📋 *Como solicitar carregamento:*\n\n` +
    `Use o formato:\n` +
    `"Solicitar carregamento CPF [seu-cpf] placa [placa-veiculo] rota [codigo-rota]"\n\n` +
    `📝 *Exemplo:*\n` +
    `"Solicitar carregamento CPF 123.456.789-10 placa ABC-1234 rota RT001"\n\n` +
    `⚠️ *Importante:*\n` +
    `• Use o CPF sem espaços extras\n` +
    `• Informe a placa correta\n` +
    `• Confirme o código da rota`;
  
  await sendMessage(phoneNumber, instructionText);
}

// Enviar mensagem de comando inválido
async function sendInvalidCommandMessage(phoneNumber) {
  const invalidText = `❓ Comando não reconhecido.\n\n` +
    `Digite "ajuda" para ver os comandos disponíveis.`;
  
  await sendMessage(phoneNumber, invalidText);
}

// Enviar mensagem de erro
async function sendErrorMessage(phoneNumber) {
  const errorText = `❌ Ocorreu um erro interno.\n\n` +
    `Tente novamente em alguns instantes ou entre em contato com o suporte.`;
  
  await sendMessage(phoneNumber, errorText);
}

// Função principal para envio de mensagens
async function sendMessage(phoneNumber, message) {
  try {
    // Simulação - em produção, usar a API real do WhatsApp
    console.log(`📱 Enviando para ${phoneNumber}:`);
    console.log(message);
    console.log('---');
    
    // Log no banco
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(`
      INSERT INTO whatsapp_log (phone_number, message_type, message_content, status, sent_at)
      VALUES (?, 'outgoing', ?, 'sent', NOW())
    `, [phoneNumber, message]);
    await connection.end();
    
    // Aqui seria a chamada real para a API do WhatsApp:
    /*
    const response = await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_CONFIG.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_CONFIG.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        text: { body: message }
      })
    });
    */
    
    return true;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return false;
  }
}

// ==================== NOTIFICAÇÕES AUTOMÁTICAS ====================

// Notificar aprovação de carregamento
router.post('/notify/approval', async (req, res) => {
  try {
    const { queueId } = req.body;
    
    const connection = await mysql.createConnection(dbConfig);
    const [queue] = await connection.execute(`
      SELECT lq.*, d.name as dock_name, d.location
      FROM loading_queue lq
      JOIN docks d ON lq.dock_id = d.id
      WHERE lq.id = ?
    `, [queueId]);
    
    if (queue.length > 0) {
      const item = queue[0];
      const message = `🎉 *Carregamento Aprovado!*\n\n` +
        `🏢 Doca: ${item.dock_name}\n` +
        `📍 Localização: ${item.location}\n` +
        `⏰ Aprovado: ${formatDateTime(item.authorized_at)}\n\n` +
        `🚛 Dirija-se à doca designada!\n` +
        `📱 Digite "checkin" quando chegar.`;
      
      await sendMessage(item.phone_number, message);
      
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Carregamento não encontrado' });
    }
    
    await connection.end();
  } catch (error) {
    console.error('Erro ao notificar aprovação:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Notificar finalização de carregamento
router.post('/notify/completion', async (req, res) => {
  try {
    const { queueId } = req.body;
    
    const connection = await mysql.createConnection(dbConfig);
    const [queue] = await connection.execute(`
      SELECT * FROM loading_queue WHERE id = ?
    `, [queueId]);
    
    if (queue.length > 0) {
      const item = queue[0];
      const message = `✅ *Carregamento Finalizado!*\n\n` +
        `🚛 Veículo: ${item.vehicle_plate}\n` +
        `⏱️ Finalizado: ${formatDateTime(item.completed_at)}\n\n` +
        `🎉 Boa viagem e obrigado!\n` +
        `🔔 Você será notificado sobre próximos carregamentos.`;
      
      await sendMessage(item.phone_number, message);
      
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Carregamento não encontrado' });
    }
    
    await connection.end();
  } catch (error) {
    console.error('Erro ao notificar finalização:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ==================== ENDPOINTS DE TESTE ====================

// Simular recebimento de mensagem (para testes)
router.post('/simulate-message', async (req, res) => {
  try {
    const { phoneNumber, message, contactName } = req.body;
    
    const mockMessage = {
      from: phoneNumber,
      text: { body: message }
    };
    
    const mockContact = {
      profile: { name: contactName || 'Motorista Teste' }
    };
    
    await processIncomingMessage(mockMessage, mockContact);
    
    res.json({ success: true, message: 'Mensagem processada' });
  } catch (error) {
    console.error('Erro na simulação:', error);
    res.status(500).json({ error: 'Erro ao processar mensagem' });
  }
});

// Listar logs do WhatsApp
router.get('/logs', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [logs] = await connection.execute(`
      SELECT * FROM whatsapp_log 
      ORDER BY sent_at DESC 
      LIMIT 100
    `);
    await connection.end();
    
    res.json(logs);
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;