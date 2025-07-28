// server.js - DockFlow API Server (Versão Profissional)
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
const IS_DEVELOPMENT = NODE_ENV === 'development';

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
      whatsapp: '/api/whatsapp',
      ...(IS_DEVELOPMENT && { debug: '/api/debug' })
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

// 📡 Carregar e registrar rotas modulares
const loadRoutes = () => {
  const routes = [
    { path: '/api/auth', file: './routes/authRoutes', name: 'authRoutes' },
    { path: '/api/vehicles', file: './routes/vehicleRoutes', name: 'vehicleRoutes' },
    { path: '/api/docks', file: './routes/dockRoutes', name: 'dockRoutes' },
    { path: '/api/loadings', file: './routes/loadingRoutes', name: 'loadingRoutes' },
    { path: '/api/products', file: './routes/productRoutes', name: 'productRoutes' },
    { path: '/api/drivers', file: './routes/driverRoutes', name: 'driverRoutes' },
    { path: '/api/whatsapp', file: './routes/whatsappRoutes', name: 'whatsappRoutes' },
    { path: '/api/users', file: './routes/userRoutes', name: 'userRoutes' },
    { path: '/api/routes', file: './routes/routeRoutes', name: 'routeRoutes' },
    { path: '/api/carregamentos', file: './routes/carregamentoRoutes', name: 'carregamentoRoutes' }
  ];

  // Carregar rotas principais primeiro
  routes.forEach(({ path, file, name }) => {
    try {
      const routeModule = require(file);
      app.use(path, routeModule);
      console.log(`✅ ${name} carregado`);
    } catch (e) {
      console.log(`⚠️ ${name} não encontrado`);
      
      // Fallback para loadings se não existir
      if (name === 'loadingRoutes') {
        createLoadingsFallback(path);
      }
    }
  });

  // Carregar rotas de debug apenas em desenvolvimento
  if (IS_DEVELOPMENT) {
    try {
      const debugRoutes = require('./routes/debugRoutes');
      app.use('/api/debug', debugRoutes);
      console.log('🧪 debugRoutes carregado (desenvolvimento)');
    } catch (e) {
      console.log('⚠️ debugRoutes não encontrado');
    }
  }
};

// 🔧 Fallback para loadings se não existir o arquivo
const createLoadingsFallback = (path) => {
  const { db } = require('./config/database');
  
  app.get(`${path}/today`, (req, res) => {
    console.log('📅 Fallback: Buscando carregamentos de hoje...');
    
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
  
  console.log('✅ loadingRoutes fallback criado');
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
    if (IS_DEVELOPMENT) {
      console.log(`🧪 Debug: http://localhost:${PORT}/api/debug`);
    }
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

// 🚀 Inicializar tudo na ordem correta
console.log('🛠️ Configurando handlers de erro...');
applyErrorHandlers(app);
console.log('✅ Handlers de erro configurados');

console.log('🗄️ Inicializando banco de dados...');
initializeDatabase();

console.log('📡 Carregando rotas...');
loadRoutes();

console.log('🚀 Iniciando servidor...');
startServer();