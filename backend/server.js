// server.js - REFATORADO COM NOVAS ROTAS ORGANIZADAS
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');

// 📁 Importar módulos personalizados
const { applyCorsConfig } = require('./config/cors');
const { applyLoggingMiddleware, applyErrorHandlers } = require('./middleware/logging');
const { createTables } = require('./database/migrations');
const { migrateRoutesTable } = require('./database/routesMigration');
const { runSeeds } = require('./database/seeds');
const { login } = require('./controllers/authController');
const { router: authRoutes } = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

// 🗄️ Importar database unificado (promises)
const { db, testConnection, initializeDatabase } = require('./database');

// 🔧 Configurações do servidor
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 🚀 Inicialização do app
const app = express();
app.set('trust proxy', true);

console.log('🚀 Iniciando DockFlow Server...');

// 🛡️ Aplicar configurações na ordem correta
applyCorsConfig(app);

// 🔧 Middlewares básicos
app.use(compression()); // Compressão GZIP
app.use(bodyParser.json({ limit: '10mb' })); // Limite de payload
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// 📁 Servir arquivos estáticos do frontend
app.use(express.static('public'));

// 🛡️ Aplicar middleware de segurança (se disponível)
try {
  const { applySecurityMiddleware } = require('./middleware/security');
  applySecurityMiddleware(app);
  console.log('✅ Middleware de segurança aplicado');
} catch (error) {
  console.log('⚠️ Middleware de segurança não disponível, continuando...');
}

// 📊 Sistema de logs
applyLoggingMiddleware(app);

// 🗄️ Inicializar banco de dados (usando promises)
const initializeDatabaseWithRetry = async () => {
  try {
    console.log('🗄️ Inicializando banco de dados...');
    
    // Testar conexão
    await testConnection();
    
    // Aguardar um pouco para a conexão se estabelecer
    setTimeout(async () => {
      await createTables();
      
      // Migrar tabela de rotas
      setTimeout(async () => {
        await migrateRoutesTable();
        
        // Inserir dados iniciais
        setTimeout(() => {
          runSeeds();
        }, 1000);
      }, 2000);
    }, 3000);
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
  }
};

// 🌐 Rotas básicas
app.get('/', (req, res) => {
  res.json({
    message: 'API do DockFlow funcionando!',
    version: '2.1',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      routes: '/api/routes',
      docks: '/api/docks',
      loadings: '/api/loadings',  // ← NOVO: carregamentos organizados
      queue: '/api/queue',        // ← NOVO: fila separada
      drivers: '/api/drivers',
      vehicles: '/api/vehicles',
      products: '/api/products',
      users: '/api/users',
      retornos: '/api/retornos',
      carregamentos: '/api/carregamentos' // ← LEGACY: manter por compatibilidade
    }
  });
});

// 🏥 Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected',
    environment: NODE_ENV,
    memory: process.memoryUsage(),
    version: '2.1',
    message: 'DockFlow API funcionando perfeitamente!'
  });
});

// 🔐 Rota de autenticação
app.post('/api/auth/login', login);

// 🚗 ROTAS DE VEHICLES (CONVERTIDAS PARA PROMISES)

// GET todos os veículos
app.get('/api/vehicles', async (req, res) => {
  try {
    console.log('📋 GET /api/vehicles - Buscando todos os veículos');
    
    const [results] = await db.execute('SELECT * FROM vehicles ORDER BY license_plate');
    
    console.log(`✅ ${results.length} veículos encontrados`);
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (err) {
    console.error('❌ Erro ao obter veículos:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor',
      error: err.message 
    });
  }
});

// GET veículo por ID
app.get('/api/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 GET /api/vehicles/${id} - Buscando veículo específico`);
    
    const [results] = await db.execute('SELECT * FROM vehicles WHERE id = ?', [id]);
    
    if (results.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Veículo não encontrado' 
      });
    }
    
    console.log(`✅ Veículo encontrado: ${results[0].license_plate}`);
    res.json({
      success: true,
      data: results[0]
    });
  } catch (err) {
    console.error('❌ Erro ao obter veículo:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor',
      error: err.message 
    });
  }
});

// POST criar novo veículo
app.post('/api/vehicles', async (req, res) => {
  try {
    const { license_plate, vehicle_type, brand, model, year, notes } = req.body;
    
    console.log('📝 POST /api/vehicles - Criando novo veículo:', { license_plate, vehicle_type });
    
    // Validação básica
    if (!license_plate || !vehicle_type) {
      console.log('❌ Dados obrigatórios ausentes');
      return res.status(400).json({ 
        success: false,
        message: 'Placa e tipo de veículo são obrigatórios' 
      });
    }
    
    // Verificar se placa já está cadastrada
    const [existingVehicles] = await db.execute('SELECT id FROM vehicles WHERE license_plate = ?', [license_plate.toUpperCase()]);
    
    if (existingVehicles.length > 0) {
      console.log('❌ Placa já cadastrada:', license_plate);
      return res.status(400).json({ 
        success: false,
        message: 'Placa já cadastrada para outro veículo' 
      });
    }
    
    // Preparar dados do novo veículo
    const newVehicle = {
      license_plate: license_plate.toUpperCase().trim(),
      vehicle_type: vehicle_type.trim(),
      brand: brand ? brand.trim() : null,
      model: model ? model.trim() : null,
      year: year ? parseInt(year) : null,
      status: 'available',
      notes: notes ? notes.trim() : null
    };
    
    console.log('💾 Inserindo veículo:', newVehicle);
    
    // Inserir veículo
    const [result] = await db.execute(
      'INSERT INTO vehicles (license_plate, vehicle_type, brand, model, year, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [newVehicle.license_plate, newVehicle.vehicle_type, newVehicle.brand, newVehicle.model, newVehicle.year, newVehicle.status, newVehicle.notes]
    );
    
    console.log(`✅ Veículo criado com ID: ${result.insertId}`);
    
    res.status(201).json({
      success: true,
      message: 'Veículo criado com sucesso',
      data: {
        id: result.insertId,
        ...newVehicle
      }
    });
  } catch (err) {
    console.error('❌ Erro ao criar veículo:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor',
      error: err.message 
    });
  }
});

// PUT atualizar veículo
app.put('/api/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { license_plate, vehicle_type, brand, model, year, status, notes } = req.body;
    
    console.log(`📝 PUT /api/vehicles/${id} - Atualizando veículo`);
    
    // Validação básica
    if (!license_plate || !vehicle_type) {
      return res.status(400).json({ 
        success: false,
        message: 'Placa e tipo de veículo são obrigatórios' 
      });
    }
    
    // Verificar se placa já está cadastrada para outro veículo
    const [existingVehicles] = await db.execute('SELECT id FROM vehicles WHERE license_plate = ? AND id != ?', [license_plate.toUpperCase(), id]);
    
    if (existingVehicles.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Placa já cadastrada para outro veículo' 
      });
    }
    
    // Atualizar veículo
    const updateValues = [
      license_plate.toUpperCase().trim(), 
      vehicle_type.trim(), 
      brand ? brand.trim() : null, 
      model ? model.trim() : null, 
      year ? parseInt(year) : null, 
      status || 'available', 
      notes ? notes.trim() : null, 
      id
    ];
    
    const [result] = await db.execute(
      'UPDATE vehicles SET license_plate = ?, vehicle_type = ?, brand = ?, model = ?, year = ?, status = ?, notes = ? WHERE id = ?',
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Veículo não encontrado' 
      });
    }
    
    console.log(`✅ Veículo ${id} atualizado com sucesso`);
    
    res.json({
      success: true,
      message: 'Veículo atualizado com sucesso',
      data: {
        id: parseInt(id),
        license_plate: license_plate.toUpperCase(),
        vehicle_type,
        brand,
        model,
        year: year ? parseInt(year) : null,
        status: status || 'available',
        notes
      }
    });
  } catch (err) {
    console.error('❌ Erro ao atualizar veículo:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor',
      error: err.message 
    });
  }
});

// DELETE excluir veículo
app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ DELETE /api/vehicles/${id} - Excluindo veículo`);
    
    // Verificar se veículo está associado a algum carregamento
    const [loadings] = await db.execute('SELECT COUNT(*) as count FROM loadings WHERE vehicle_id = ?', [id]);
    
    if (loadings[0].count > 0) {
      console.log(`❌ Veículo ${id} está associado a carregamentos`);
      return res.status(400).json({ 
        success: false,
        message: 'Este veículo está associado a carregamentos e não pode ser excluído'
      });
    }
    
    // Excluir veículo se não estiver em uso
    const [result] = await db.execute('DELETE FROM vehicles WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Veículo não encontrado' 
      });
    }
    
    console.log(`✅ Veículo ${id} excluído com sucesso`);
    
    res.json({ 
      success: true,
      message: 'Veículo excluído com sucesso' 
    });
  } catch (err) {
    console.error('❌ Erro ao excluir veículo:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor',
      error: err.message 
    });
  }
});

// 📅 LOADINGS DE HOJE (CONVERTIDO PARA PROMISES)
app.get('/api/loadings/today', async (req, res) => {
  try {
    console.log('📅 GET /api/loadings/today - Buscando carregamentos de hoje');
    
    const today = new Date().toISOString().split('T')[0];
    
    const [loadings] = await db.execute(`
      SELECT 
        l.id,
        l.dock_id,
        l.driver_id,
        l.vehicle_id,
        l.status,
        l.scheduled_time,
        l.checkin_time,
        l.checkout_time,
        l.created_at,
        l.updated_at,
        d.name as dock_name,
        dr.name as driver_name,
        v.license_plate
      FROM loadings l
      LEFT JOIN docks d ON l.dock_id = d.id
      LEFT JOIN drivers dr ON l.driver_id = dr.id
      LEFT JOIN vehicles v ON l.vehicle_id = v.id
      WHERE DATE(l.created_at) = ?
      ORDER BY l.created_at DESC
    `, [today]);
    
    console.log(`✅ ${loadings?.length || 0} carregamentos de hoje encontrados`);
    
    res.json({ 
      success: true, 
      data: loadings || [],
      count: loadings?.length || 0,
      date: today
    });
  } catch (err) {
    console.error('❌ Erro ao buscar carregamentos de hoje:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 📡 Carregar rotas refatoradas e existentes
const loadWorkingRoutes = () => {
  const workingRoutes = [
    // ✅ ROTAS REFATORADAS (novas)
    { path: '/api/loadings', file: './routes/loadingRoutes', name: 'loadingRoutes (NOVO)' },
    { path: '/api/queue', file: './routes/queueRoutes', name: 'queueRoutes (NOVO)' },
    
    // ✅ ROTAS EXISTENTES (mantidas)
    { path: '/api/docks', file: './routes/dockRoutes', name: 'dockRoutes' },
    { path: '/api/products', file: './routes/productRoutes', name: 'productRoutes' },
    { path: '/api/drivers', file: './routes/driverRoutes', name: 'driverRoutes' },
    { path: '/api/users', file: './routes/userRoutes', name: 'userRoutes' },
    { path: '/api/routes', file: './routes/routeRoutes', name: 'routeRoutes' },
    { path: '/api/retornos', file: './routes/retornoRoutes', name: 'retornoRoutes' },
    
    // 🔄 ROTA LEGACY (compatibilidade)
    { path: '/api/carregamentos', file: './routes/carregamentoRoutes', name: 'carregamentoRoutes (LEGACY)' }
  ];

  workingRoutes.forEach(({ path, file, name }) => {
    try {
      const routeModule = require(file);
      app.use(path, routeModule);
      console.log(`✅ ${name} carregado`);
    } catch (e) {
      console.log(`⚠️ ${name} não encontrado - ${e.message}`);
    }
  });
  
  console.log('✅ Rotas diretas de vehicles e loadings criadas');
  console.log('🔄 Sistema refatorado - URLs padronizadas');
};

// 🚀 Iniciar o servidor
const startServer = () => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 ========================================');
    console.log(`   SERVIDOR DOCKFLOW INICIADO COM SUCESSO`);
    console.log('🚀 ========================================');
    console.log(`📡 Porta: ${PORT}`);
    console.log(`🌍 Ambiente: ${NODE_ENV}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Interface: http://localhost:${PORT}/carregamento.html`);
    console.log(`📋 API: http://localhost:${PORT}/api`);
    console.log(`🚛 Carregamentos: http://localhost:${PORT}/api/loadings`);
    console.log(`⏰ Fila: http://localhost:${PORT}/api/queue`);
    console.log(`🔄 Retornos: http://localhost:${PORT}/api/retornos`);
    console.log(`🔐 Segurança: ATIVADA`);
    console.log(`🛡️ Rate limiting: ATIVADO`);
    console.log(`🌐 Railway IPv6: CONFIGURADO`);
    console.log(`✨ REFATORAÇÃO FASE 1: CONCLUÍDA`);
    console.log('🚀 ========================================\n');
  });

  // 🔧 Graceful shutdown
  const gracefulShutdown = (signal) => {
    console.log(`🛑 ${signal} recebido, encerrando servidor...`);
    server.close(async () => {
      console.log('✅ Servidor encerrado com sucesso');
      try {
        await db.end();
        console.log('✅ Conexão com banco encerrada');
      } catch (error) {
        console.error('❌ Erro ao encerrar conexão:', error);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

// Adicione esta rota temporária no seu server.js para debug
// APENAS PARA DEBUG - REMOVA EM PRODUÇÃO

app.get('/api/debug/users', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Verificando usuários no banco...');
    
    // Verificar se tabela users existe
    const [tables] = await db.execute("SHOW TABLES LIKE 'users'");
    
    if (tables.length === 0) {
      return res.json({
        debug: true,
        error: 'Tabela users não existe',
        solution: 'Execute initializeDatabase()'
      });
    }
    
    // Buscar todos os usuários (SEM SENHAS para segurança)
    const [users] = await db.execute(
      'SELECT id, email, name, role, status, created_at FROM users'
    );
    
    // Verificar estrutura da tabela
    const [columns] = await db.execute('DESCRIBE users');
    
    res.json({
      debug: true,
      message: 'Debug dos usuários',
      users_count: users.length,
      users: users,
      table_structure: columns,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
    res.status(500).json({
      debug: true,
      error: error.message,
      stack: error.stack
    });
  }
});

// Rota para testar login manual (APENAS DEBUG)
app.post('/api/debug/test-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log(`🔍 DEBUG: Testando login para ${email}`);
    
    // Buscar usuário
    const [users] = await db.execute(
      'SELECT id, email, password, name, role, status FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.json({
        debug: true,
        error: 'Usuário não encontrado',
        email_searched: email,
        suggestion: 'Verifique se o email está correto ou se os usuários foram criados'
      });
    }
    
    const user = users[0];
    
    // Verificar se senha é hash ou texto plano
    const isHashedPassword = user.password.startsWith('$2');
    
    let isValidPassword = false;
    
    if (isHashedPassword) {
      // Senha hashada - usar bcrypt
      const bcrypt = require('bcryptjs');
      isValidPassword = await bcrypt.compare(password, user.password);
    } else {
      // Senha em texto plano (problema!)
      isValidPassword = password === user.password;
    }
    
    res.json({
      debug: true,
      user_found: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      },
      password_is_hashed: isHashedPassword,
      password_valid: isValidPassword,
      password_length: user.password.length,
      password_prefix: user.password.substring(0, 10) + '...'
    });
    
  } catch (error) {
    console.error('❌ Erro no teste de login:', error);
    res.status(500).json({
      debug: true,
      error: error.message
    });
  }
});

// 🚀 Inicializar tudo
initializeDatabaseWithRetry();
loadWorkingRoutes();
// 🔧 Handlers de erro (devem vir por último)
applyErrorHandlers(app);
startServer();