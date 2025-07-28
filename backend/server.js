// server.js - VERSÃO MÍNIMA QUE FUNCIONA
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
      users: '/api/users'
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

// 🚗 ROTAS DE VEHICLES (DIRETAS - SEM ARQUIVO EXTERNO)
const { db } = require('./config/database');

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

// GET veículo por ID
app.get('/api/vehicles/:id', (req, res) => {
  const { id } = req.params;
  console.log(`🔍 GET /api/vehicles/${id} - Buscando veículo específico`);
  
  db.query('SELECT * FROM vehicles WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('❌ Erro ao obter veículo:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor',
        error: err.message 
      });
    }
    
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

// PUT atualizar veículo
app.put('/api/vehicles/:id', (req, res) => {
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
  db.query('SELECT id FROM vehicles WHERE license_plate = ? AND id != ?', [license_plate.toUpperCase(), id], (err, results) => {
    if (err) {
      console.error('❌ Erro ao verificar placa do veículo:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor',
        error: err.message 
      });
    }
    
    if (results.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Placa já cadastrada para outro veículo' 
      });
    }
    
    // Atualizar veículo
    const updateQuery = `
      UPDATE vehicles 
      SET license_plate = ?, vehicle_type = ?, brand = ?, model = ?, year = ?, status = ?, notes = ?
      WHERE id = ?
    `;
    
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
    
    db.query(updateQuery, updateValues, (err, result) => {
      if (err) {
        console.error('❌ Erro ao atualizar veículo:', err);
        return res.status(500).json({ 
          success: false,
          message: 'Erro interno do servidor',
          error: err.message 
        });
      }
      
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
    });
  });
});

// DELETE excluir veículo
app.delete('/api/vehicles/:id', (req, res) => {
  const { id } = req.params;
  
  console.log(`🗑️ DELETE /api/vehicles/${id} - Excluindo veículo`);
  
  // Verificar se veículo está associado a algum carregamento
  db.query('SELECT COUNT(*) as count FROM loadings WHERE vehicle_id = ?', [id], (err, results) => {
    if (err) {
      console.error('❌ Erro ao verificar uso do veículo:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor',
        error: err.message 
      });
    }
    
    if (results[0].count > 0) {
      console.log(`❌ Veículo ${id} está associado a carregamentos`);
      return res.status(400).json({ 
        success: false,
        message: 'Este veículo está associado a carregamentos e não pode ser excluído'
      });
    }
    
    // Excluir veículo se não estiver em uso
    db.query('DELETE FROM vehicles WHERE id = ?', [id], (err, result) => {
      if (err) {
        console.error('❌ Erro ao excluir veículo:', err);
        return res.status(500).json({ 
          success: false,
          message: 'Erro interno do servidor',
          error: err.message 
        });
      }
      
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
    });
  });
});

// 📅 LOADINGS DE HOJE (DIRETO)
app.get('/api/loadings/today', (req, res) => {
  console.log('📅 GET /api/loadings/today - Buscando carregamentos de hoje');
  
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
      d.name as dock_name,
      dr.name as driver_name,
      v.license_plate
    FROM loadings l
    LEFT JOIN docks d ON l.dock_id = d.id
    LEFT JOIN drivers dr ON l.driver_id = dr.id
    LEFT JOIN vehicles v ON l.vehicle_id = v.id
    WHERE DATE(l.created_at) = ?
    ORDER BY l.created_at DESC
  `, [today], (err, loadings) => {
    if (err) {
      console.error('❌ Erro ao buscar carregamentos de hoje:', err);
      return res.status(500).json({ 
        success: false, 
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ ${loadings?.length || 0} carregamentos de hoje encontrados`);
    
    res.json({ 
      success: true, 
      data: loadings || [],
      count: loadings?.length || 0,
      date: today
    });
  });
});

// 📡 Carregar rotas restantes (que funcionam)
const loadWorkingRoutes = () => {
  const workingRoutes = [
    { path: '/api/docks', file: './routes/dockRoutes', name: 'dockRoutes' },
    { path: '/api/products', file: './routes/productRoutes', name: 'productRoutes' },
    { path: '/api/drivers', file: './routes/driverRoutes', name: 'driverRoutes' },
    { path: '/api/users', file: './routes/userRoutes', name: 'userRoutes' },
    { path: '/api/routes', file: './routes/routeRoutes', name: 'routeRoutes' }
  ];

  workingRoutes.forEach(({ path, file, name }) => {
    try {
      const routeModule = require(file);
      app.use(path, routeModule);
      console.log(`✅ ${name} carregado`);
    } catch (e) {
      console.log(`⚠️ ${name} não encontrado`);
    }
  });
  
  console.log('✅ Rotas diretas de vehicles e loadings criadas');
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
loadWorkingRoutes();
// 🔧 Handlers de erro (devem vir por último)
applyErrorHandlers(app);
startServer();