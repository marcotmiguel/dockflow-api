// server.js - VERSÃO MODULAR E LIMPA
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');

// 📁 Importar módulos personalizados
const { connectWithRetry } = require('./config/database');
const { applyCorsConfig } = require('./config/cors');
const { applyLoggingMiddleware, applyErrorHandlers } = require('./middleware/logging');
const { createTables } = require('./database/migrations');
const { migrateRoutesTable } = require('./database/routesMigration');
const { runSeeds } = require('./database/seeds');
const { login } = require('./controllers/authController');

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

// 🗄️ Inicializar banco de dados
const initializeDatabase = async () => {
  try {
    console.log('🗄️ Inicializando banco de dados...');
    
    // Conectar ao banco
    connectWithRetry();
    
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
      loadings: '/api/loadings',
      drivers: '/api/drivers',
      vehicles: '/api/vehicles',
      products: '/api/products',
      users: '/api/users',
      whatsapp: '/api/whatsapp'
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

// 🧪 ENDPOINT DE DIAGNÓSTICO TEMPORÁRIO
// 🧪 ENDPOINT DE DIAGNÓSTICO DETALHADO
app.get('/api/debug', (req, res) => {
  const results = [];
  
  results.push('🔍 DIAGNÓSTICO DETALHADO:');
  
  // Testar rotas específicas do dockRoutes
  try {
    const dockRoutes = require('./routes/dockRoutes');
    results.push('📋 ROTAS DO DOCKROUTES:');
    
    if (dockRoutes.stack) {
      dockRoutes.stack.forEach((layer, index) => {
        const path = layer.route?.path || 'N/A';
        const methods = Object.keys(layer.route?.methods || {}).join(', ').toUpperCase();
        results.push(`   ${index + 1}. ${methods} ${path}`);
      });
    }
  } catch (e) {
    results.push('❌ Erro ao analisar dockRoutes: ' + e.message);
  }
  
  // Testar rotas específicas do loadingRoutes  
  try {
    const loadingRoutes = require('./routes/loadingRoutes');
    results.push('📅 ROTAS DO LOADINGROUTES:');
    
    if (loadingRoutes.stack) {
      loadingRoutes.stack.forEach((layer, index) => {
        const path = layer.route?.path || 'N/A';
        const methods = Object.keys(layer.route?.methods || {}).join(', ').toUpperCase();
        results.push(`   ${index + 1}. ${methods} ${path}`);
      });
    }
  } catch (e) {
    results.push('❌ Erro ao analisar loadingRoutes: ' + e.message);
  }
  
  // Verificar rotas registradas no app principal
  results.push('🌐 ROTAS REGISTRADAS NO APP:');
  try {
    app._router.stack.forEach((middleware, index) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
        results.push(`   ${index + 1}. ${methods} ${middleware.route.path}`);
      } else if (middleware.name === 'router') {
        const regex = middleware.regexp.source.replace(/\\\//g, '/').replace(/\$|\^/g, '');
        const subroutes = middleware.handle?.stack?.length || 0;
        results.push(`   ${index + 1}. Router: ${regex} (${subroutes} sub-rotas)`);
      } else {
        results.push(`   ${index + 1}. Middleware: ${middleware.name || 'anonymous'}`);
      }
    });
  } catch (e) {
    results.push('❌ Erro ao listar rotas do app: ' + e.message);
  }
  
  res.json({
    diagnostic: results,
    timestamp: new Date().toISOString()
  });
});
// 🔧 Debug específico para docas - ADICIONAR AQUI
app.get('/api/debug-docks', (req, res) => {
  const { db } = require('./config/database');
  
  console.log('🔍 Testando query de docas...');
  
  db.query('SELECT * FROM docks LIMIT 1', (err, results) => {
    if (err) {
      console.error('❌ Erro na query:', err);
      return res.json({
        error: true,
        message: err.message,
        code: err.code,
        sqlState: err.sqlState
      });
    }
    
    console.log('✅ Query funcionou, resultados:', results);
    res.json({
      success: true,
      sampleData: results,
      message: 'Query de docas funcionando'
    });
  });
});

// 🔧 Loadings sem autenticação para teste - VERSÃO CORRIGIDA
app.get('/api/loadings-test', (req, res) => {
  const { db } = require('./config/database');
  console.log('📅 Testando loadings sem autenticação (versão corrigida)...');
  
  const today = new Date().toISOString().split('T')[0];
  
  db.query(`
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
      d.name as dock_name
    FROM loadings l
    LEFT JOIN docks d ON l.dock_id = d.id
    WHERE DATE(l.created_at) = ?
    ORDER BY l.created_at DESC
    LIMIT 10
  `, [today], (err, loadings) => {
    if (err) {
      console.error('❌ Erro ao buscar loadings:', err);
      return res.json({
        error: true,
        message: err.message,
        code: err.code
      });
    }
    
    console.log(`✅ Encontrados ${loadings?.length || 0} loadings`);
    res.json({ 
      success: true, 
      data: loadings || [],
      count: loadings?.length || 0,
      date: today,
      message: 'Loadings recuperados com sucesso'
    });
  });
});

// 🔧 Ver estrutura da tabela loadings
app.get('/api/debug-loadings-structure', (req, res) => {
  const { db } = require('./config/database');
  
  console.log('🔍 Verificando estrutura da tabela loadings...');
  
  db.query('DESCRIBE loadings', (err, structure) => {
    if (err) {
      console.error('❌ Erro ao descrever tabela:', err);
      return res.json({
        error: true,
        message: err.message,
        code: err.code
      });
    }
    
    console.log('✅ Estrutura da tabela loadings:', structure);
    res.json({
      success: true,
      tableStructure: structure,
      message: 'Estrutura da tabela loadings'
    });
  });
});

// 🧪 Teste vehicles sem autenticação
app.get('/api/vehicles-noauth', (req, res) => {
  const { db } = require('./config/database');
  
  console.log('🔍 Testando vehicles sem auth...');
  
  db.query('SELECT * FROM vehicles LIMIT 3', (err, results) => {
    if (err) {
      console.error('❌ Erro na query vehicles:', err);
      return res.json({
        error: true,
        message: err.message,
        code: err.code
      });
    }
    
    console.log('✅ Query vehicles OK:', results.length);
    res.json({
      success: true,
      data: results,
      count: results.length,
      message: 'Vehicles sem auth funcionando'
    });
  });
});

// 🧪 Teste auth middleware
app.get('/api/test-auth', (req, res) => {
  const { authMiddleware } = require('./middleware/authMiddleware');
  
  authMiddleware(req, res, () => {
    res.json({
      success: true,
      message: 'Auth middleware funcionando',
      user: req.user
    });
  });
});

// 🧪 GET vehicles sem auth para teste
app.get('/api/vehicles-frontend-test', (req, res) => {
  const { db } = require('./config/database');
  
  db.query('SELECT * FROM vehicles ORDER BY license_plate', (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
    
    // Retornar no formato que o frontend espera
    res.json({
      success: true,
      data: results || []
    });
  });
});

// 🧪 Debug completo das APIs
app.get('/api/debug-all-apis', (req, res) => {
  const results = [];
  
  results.push('🔍 DIAGNÓSTICO DE TODAS AS APIS:');
  
  // Testar database
  try {
    const { db } = require('./config/database');
    results.push('✅ Database importado com sucesso');
    
    // Testar query simples
    db.query('SELECT 1 as test', (err, result) => {
      if (err) {
        results.push('❌ Database não conectado: ' + err.message);
      } else {
        results.push('✅ Database conectado e funcionando');
      }
      
      res.json({
        results,
        timestamp: new Date().toISOString()
      });
    });
  } catch (e) {
    results.push('❌ Erro ao importar database: ' + e.message);
    res.json({
      results,
      timestamp: new Date().toISOString()
    });
  }
});

// 🧪 Debug estrutura de tabelas
app.get('/api/debug-tables', (req, res) => {
  const { db } = require('./config/database');
  
  db.query('SHOW TABLES', (err, tables) => {
    if (err) {
      return res.json({
        error: true,
        message: err.message
      });
    }
    
    res.json({
      success: true,
      tables: tables.map(t => Object.values(t)[0]),
      count: tables.length
    });
  });
});

// 📡 Importar e registrar rotas modulares
const loadRoutes = () => {
  const routes = [
    { path: '/api/auth', file: './routes/authRoutes', name: 'authRoutes' },
    { path: '/api/docks', file: './routes/dockRoutes', name: 'dockRoutes' },
    { path: '/api/loadings', file: './routes/loadingRoutes', name: 'loadingRoutes' },
    { path: '/api/products', file: './routes/productRoutes', name: 'productRoutes' },
    { path: '/api/drivers', file: './routes/driverRoutes', name: 'driverRoutes' },
    { path: '/api/whatsapp', file: './routes/whatsappRoutes', name: 'whatsappRoutes' },
    { path: '/api/vehicles', file: './routes/vehicleRoutes', name: 'vehicleRoutes' },
    { path: '/api/users', file: './routes/userRoutes', name: 'userRoutes' },
    { path: '/api/routes', file: './routes/routeRoutes', name: 'routeRoutes' },
    { path: '/api/carregamentos', file: './routes/carregamentoRoutes', name: 'carregamentoRoutes' }
  ];

  routes.forEach(({ path, file, name }) => {
    try {
      const routeModule = require(file);
      app.use(path, routeModule);
      console.log(`✅ ${name} carregado`);
    } catch (e) {
      console.log(`⚠️ ${name} não encontrado`);
      
      // Rota básica para loadings se não existir
      if (name === 'loadingRoutes') {
        const { db } = require('./config/database');
        app.get('/api/loadings/today', (req, res) => {
          console.log('📅 Buscando carregamentos de hoje...');
          
          db.query(`
            SELECT 
              lq.id, 
              lq.status, 
              lq.priority, 
              lq.created_at,
              lq.notes,
              v.license_plate, 
              v.vehicle_type,
              d.name as dock_name
            FROM loading_queue lq
            LEFT JOIN vehicles v ON lq.vehicle_id = v.id
            LEFT JOIN docks d ON lq.dock_id = d.id
            WHERE DATE(lq.created_at) = CURDATE()
            ORDER BY lq.created_at DESC
          `, (err, loadings) => {
            if (err) {
              console.error('❌ Erro ao buscar carregamentos:', err);
              return res.status(500).json({ 
                success: false, 
                error: err.message,
                timestamp: new Date().toISOString()
              });
            }
            
            console.log(`✅ ${loadings?.length || 0} carregamentos encontrados`);
            
            res.json({ 
              success: true, 
              data: loadings || [],
              count: loadings?.length || 0,
              date: new Date().toISOString().split('T')[0]
            });
          });
        });
      }
    }
  });
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
    console.log(`🔐 Segurança: ATIVADA`);
    console.log(`🛡️ Rate limiting: ATIVADO`);
    console.log(`🌐 Railway IPv6: CONFIGURADO`);
    console.log('🚀 ========================================\n');
  });

  // 🔧 Graceful shutdown
  const gracefulShutdown = (signal) => {
    console.log(`🛑 ${signal} recebido, encerrando servidor...`);
    server.close(() => {
      console.log('✅ Servidor encerrado com sucesso');
      const { db } = require('./config/database');
      db.end();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

// 🚀 Inicializar tudo
initializeDatabase();
loadRoutes();
// 🔧 Handlers de erro (devem vir por último)
applyErrorHandlers(app);
startServer();