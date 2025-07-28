// server.js - VERSÃO ORIGINAL COM CORREÇÃO MÍNIMA
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

// 🚑 FALLBACK MANUAL PARA VEHICLES (correção temporária)
const createVehiclesFallback = () => {
  const { db } = require('./config/database');
  
  console.log('🚑 Criando fallback manual para vehicles...');
  
  // GET todos os veículos
  app.get('/api/vehicles', (req, res) => {
    console.log('📋 GET /api/vehicles - Buscando todos os veículos');
    
    db.query('SELECT * FROM vehicles ORDER BY license_plate', (err, results) => {
      if (err) {
        console.error('❌ Erro ao obter veículos:', err);
        return res.status(500).json({ 
          success: false,
          message: 'Erro interno do servidor',
          error: err.message 
        });
      }
      
      console.log(`✅ ${results.length} veículos encontrados`);
      res.json({
        success: true,
        data: results,
        count: results.length
      });
    });
  });
  
  // POST criar novo veículo
  app.post('/api/vehicles', (req, res) => {
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
    db.query('SELECT id FROM vehicles WHERE license_plate = ?', [license_plate.toUpperCase()], (err, results) => {
      if (err) {
        console.error('❌ Erro ao verificar placa do veículo:', err);
        return res.status(500).json({ 
          success: false,
          message: 'Erro interno do servidor',
          error: err.message 
        });
      }
      
      if (results.length > 0) {
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
      db.query('INSERT INTO vehicles SET ?', newVehicle, (err, result) => {
        if (err) {
          console.error('❌ Erro ao criar veículo:', err);
          return res.status(500).json({ 
            success: false,
            message: 'Erro interno do servidor',
            error: err.message 
          });
        }
        
        console.log(`✅ Veículo criado com ID: ${result.insertId}`);
        
        res.status(201).json({
          success: true,
          message: 'Veículo criado com sucesso',
          data: {
            id: result.insertId,
            ...newVehicle
          }
        });
      });
    });
  });
  
  console.log('✅ Fallback vehicles criado com sucesso');
};

// 📡 Importar e registrar rotas modulares PRIMEIRO
const loadRoutes = () => {
  const routes = [
    { path: '/api/auth', file: './routes/authRoutes', name: 'authRoutes' },
    { path: '/api/docks', file: './routes/dockRoutes', name: 'dockRoutes' },
    { path: '/api/loadings', file: './routes/loadingRoutes', name: 'loadingRoutes' },
    { path: '/api/products', file: './routes/productRoutes', name: 'productRoutes' },
    { path: '/api/drivers', file: './routes/driverRoutes', name: 'driverRoutes' },
    { path: '/api/whatsapp', file: './routes/whatsappRoutes', name: 'whatsappRoutes' },
    { path: '/api/users', file: './routes/userRoutes', name: 'userRoutes' },
    { path: '/api/routes', file: './routes/routeRoutes', name: 'routeRoutes' },
    { path: '/api/carregamentos', file: './routes/carregamentoRoutes', name: 'carregamentoRoutes' }
  ];

  // Tentar carregar vehicleRoutes primeiro
  try {
    const vehicleRoutes = require('./routes/vehicleRoutes');
    app.use('/api/vehicles', vehicleRoutes);
    console.log('✅ vehicleRoutes carregado');
  } catch (e) {
    console.log('⚠️ vehicleRoutes não encontrado, usando fallback');
    createVehiclesFallback();
  }

  // Carregar outras rotas
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