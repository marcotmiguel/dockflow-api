// routes/debugRoutes.js - Endpoints de Debug e Diagnóstico
const express = require('express');
const router = express.Router();

// 🧪 ENDPOINT DE DIAGNÓSTICO DETALHADO
router.get('/diagnostic', (req, res) => {
  const results = [];
  
  results.push('🔍 DIAGNÓSTICO DETALHADO:');
  
  // Testar rotas específicas do dockRoutes
  try {
    const dockRoutes = require('./dockRoutes');
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
    const loadingRoutes = require('./loadingRoutes');
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
    const app = req.app;
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

// 🔧 Debug específico para docas
router.get('/docks', (req, res) => {
  const { db } = require('../config/database');
  
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

// 🔧 Loadings sem autenticação para teste
router.get('/loadings', (req, res) => {
  const { db } = require('../config/database');
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
router.get('/loadings-structure', (req, res) => {
  const { db } = require('../config/database');
  
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
router.get('/vehicles-noauth', (req, res) => {
  const { db } = require('../config/database');
  
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
router.get('/auth-test', (req, res) => {
  try {
    const { authMiddleware } = require('../middleware/authMiddleware');
    
    authMiddleware(req, res, () => {
      res.json({
        success: true,
        message: 'Auth middleware funcionando',
        user: req.user
      });
    });
  } catch (e) {
    res.json({
      success: false,
      error: 'Auth middleware não disponível: ' + e.message
    });
  }
});

// 🧪 GET vehicles sem auth para teste (formato frontend)
router.get('/vehicles-frontend', (req, res) => {
  const { db } = require('../config/database');
  
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
router.get('/all-apis', (req, res) => {
  const results = [];
  
  results.push('🔍 DIAGNÓSTICO DE TODAS AS APIS:');
  
  // Testar database
  try {
    const { db } = require('../config/database');
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
router.get('/tables', (req, res) => {
  const { db } = require('../config/database');
  
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

// 🧪 Teste POST de vehicles direto
router.post('/vehicles-test', (req, res) => {
  const { db } = require('../config/database');
  
  console.log('📝 POST vehicles test - Body:', req.body);
  
  const testVehicle = {
    license_plate: 'TEST' + Date.now(),
    vehicle_type: 'truck',
    brand: 'Test',
    model: 'Test',
    year: 2020,
    status: 'available',
    notes: 'Teste debug'
  };
  
  console.log('💾 Inserindo veículo teste:', testVehicle);
  
  db.query('INSERT INTO vehicles SET ?', testVehicle, (err, result) => {
    if (err) {
      console.error('❌ Erro ao criar veículo teste:', err);
      return res.status(500).json({
        success: false,
        error: err.message,
        code: err.code,
        sqlState: err.sqlState
      });
    }
    
    console.log(`✅ Veículo teste criado com ID: ${result.insertId}`);
    
    res.json({
      success: true,
      message: 'Veículo teste criado com sucesso',
      data: { id: result.insertId, ...testVehicle }
    });
  });
});

// 🧪 Verificar versão do vehicleRoutes
router.get('/vehicle-routes', (req, res) => {
  try {
    // Tentar importar a rota
    const vehicleRoutes = require('./vehicleRoutes');
    
    res.json({
      success: true,
      message: 'VehicleRoutes importado com sucesso',
      hasAuth: vehicleRoutes.toString().includes('authMiddleware'),
      routesCount: vehicleRoutes.stack ? vehicleRoutes.stack.length : 'N/A'
    });
  } catch (e) {
    res.json({
      success: false,
      error: e.message
    });
  }
});

// 🔍 Endpoint principal de debug - resumo geral
router.get('/', (req, res) => {
  res.json({
    message: 'Debug Routes - DockFlow API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      diagnostic: '/api/debug/diagnostic',
      docks: '/api/debug/docks', 
      loadings: '/api/debug/loadings',
      loadings_structure: '/api/debug/loadings-structure',
      vehicles_noauth: '/api/debug/vehicles-noauth',
      auth_test: '/api/debug/auth-test',
      vehicles_frontend: '/api/debug/vehicles-frontend',
      all_apis: '/api/debug/all-apis',
      tables: '/api/debug/tables',
      vehicles_test: '/api/debug/vehicles-test (POST)',
      vehicle_routes: '/api/debug/vehicle-routes'
    },
    note: 'Endpoints de debug disponíveis apenas em desenvolvimento'
  });
});

module.exports = router;