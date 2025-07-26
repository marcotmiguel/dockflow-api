// backend/server.js - VERSÃO SEGURA PARA PRODUÇÃO
require('dotenv').config(); // 🔐 Carregar variáveis de ambiente PRIMEIRO

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const compression = require('compression');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 🛡️ Importar middlewares de segurança
const { applySecurityMiddleware } = require('./middleware/security');

// 📡 Importar rotas
const carregamentoRoutes = require('./routes/carregamentoRoutes');

// 🔧 Configurações do servidor
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 🚀 Inicialização do app
const app = express();

// 🗃️ Configuração de CORS segura
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN
    ].filter(Boolean);
    
    // Permitir requisições sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🚨 CORS bloqueou origem: ${origin}`);
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// 🔧 Middlewares básicos
app.use(compression()); // Compressão GZIP
app.use(cors(corsOptions)); // CORS configurado
app.use(bodyParser.json({ limit: '10mb' })); // Limite de payload
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('../frontend')); // Servir arquivos estáticos

// 🛡️ Aplicar middlewares de segurança
applySecurityMiddleware(app);

// 📊 Logging melhorado
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`📡 [${timestamp}] ${req.method} ${req.originalUrl} - IP: ${ip}`);
  next();
};

app.use(logRequest);

// 🗄️ Importar e configurar banco de dados
const db = require('./database');

// 🔌 Conectar ao banco de dados
db.connect(error => {
  if (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    process.exit(1); // Sair se não conseguir conectar
  }
  console.log('✅ Conectado ao banco de dados MySQL com sucesso!');
  
  // Verificar/criar banco de dados
  db.query('CREATE DATABASE IF NOT EXISTS dockflow_db', (err) => {
    if (err) {
      console.error('❌ Erro ao criar banco de dados:', err);
    } else {
      console.log('✅ Banco de dados verificado/criado com sucesso');
      
      // Usar o banco de dados
      db.query('USE dockflow_db', (err) => {
        if (err) {
          console.error('❌ Erro ao selecionar banco de dados:', err);
        } else {
          console.log('✅ Banco de dados selecionado com sucesso');
          createTables();
        }
      });
    }
  });
});

// 🔧 FUNÇÃO PARA VERIFICAR E ATUALIZAR COLUNAS DA TABELA ROUTES
function migrateRoutesTable() {
  const checkPriorityColumn = `
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'dockflow_db' 
    AND TABLE_NAME = 'routes' 
    AND COLUMN_NAME = 'priority'
  `;
  
  db.query(checkPriorityColumn, (err, results) => {
    if (err) {
      console.error('❌ Erro ao verificar coluna priority:', err);
    } else if (results.length === 0) {
      console.log('🔧 Adicionando coluna priority à tabela routes...');
      const addPriorityColumn = `
        ALTER TABLE routes 
        ADD COLUMN priority ENUM('urgent', 'high', 'normal') DEFAULT 'normal' 
        AFTER description
      `;
      
      db.query(addPriorityColumn, (err) => {
        if (err) {
          console.error('❌ Erro ao adicionar coluna priority:', err);
        } else {
          console.log('✅ Coluna priority adicionada com sucesso');
          checkAndAddOtherColumns();
        }
      });
    } else {
      console.log('✅ Coluna priority já existe');
      checkAndAddOtherColumns();
    }
  });
}

function checkAndAddOtherColumns() {
  const requiredColumns = [
    { name: 'active', type: 'BOOLEAN DEFAULT TRUE', after: 'priority' },
    { name: 'region', type: 'VARCHAR(100)', after: 'active' },
    { name: 'city', type: 'VARCHAR(100)', after: 'region' },
    { name: 'state', type: 'VARCHAR(10)', after: 'city' },
    { name: 'loadings_count', type: 'INT DEFAULT 0', after: 'state' }
  ];
  
  let columnIndex = 0;
  
  function checkNextColumn() {
    if (columnIndex >= requiredColumns.length) {
      insertDefaultRoutes();
      return;
    }
    
    const column = requiredColumns[columnIndex];
    const checkColumnQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'dockflow_db' 
      AND TABLE_NAME = 'routes' 
      AND COLUMN_NAME = '${column.name}'
    `;
    
    db.query(checkColumnQuery, (err, results) => {
      if (err) {
        console.error(`❌ Erro ao verificar coluna ${column.name}:`, err);
        columnIndex++;
        checkNextColumn();
      } else if (results.length === 0) {
        console.log(`🔧 Adicionando coluna ${column.name} à tabela routes...`);
        const addColumnQuery = `
          ALTER TABLE routes 
          ADD COLUMN ${column.name} ${column.type} 
          AFTER ${column.after}
        `;
        
        db.query(addColumnQuery, (err) => {
          if (err) {
            console.error(`❌ Erro ao adicionar coluna ${column.name}:`, err);
          } else {
            console.log(`✅ Coluna ${column.name} adicionada com sucesso`);
          }
          columnIndex++;
          checkNextColumn();
        });
      } else {
        console.log(`✅ Coluna ${column.name} já existe`);
        columnIndex++;
        checkNextColumn();
      }
    });
  }
  
  checkNextColumn();
}

function insertDefaultRoutes() {
  const checkRoutesQuery = "SELECT COUNT(*) as count FROM routes";
  db.query(checkRoutesQuery, (err, results) => {
    if (err) {
      console.error('❌ Erro ao verificar rotas existentes:', err);
    } else if (results[0].count === 0) {
      console.log('📝 Inserindo rotas padrão...');
      
      const defaultRoutes = [
        {
          code: 'SP-CENTRO',
          description: 'São Paulo Centro - Região Central',
          priority: 'high',
          region: 'Centro',
          city: 'São Paulo',
          state: 'SP'
        },
        {
          code: 'SP-ZONA-SUL',
          description: 'São Paulo Zona Sul - Região Sul',
          priority: 'normal',
          region: 'Zona Sul', 
          city: 'São Paulo',
          state: 'SP'
        },
        {
          code: 'RJ-CENTRO',
          description: 'Rio de Janeiro Centro',
          priority: 'normal',
          region: 'Centro',
          city: 'Rio de Janeiro',
          state: 'RJ'
        },
        {
          code: 'AUTO-GERAL',
          description: 'Rota Automática Geral',
          priority: 'normal',
          region: 'Automática',
          city: 'Múltiplas',
          state: 'ALL'
        }
      ];
      
      let routeIndex = 0;
      
      function insertNextRoute() {
        if (routeIndex >= defaultRoutes.length) {
          console.log('✅ Todas as rotas padrão foram inseridas');
          return;
        }
        
        const route = defaultRoutes[routeIndex];
        const insertRouteQuery = `
          INSERT INTO routes (code, description, priority, active, region, city, state, loadings_count, created_at, updated_at)
          VALUES (?, ?, ?, TRUE, ?, ?, ?, 0, NOW(), NOW())
        `;
        
        db.query(insertRouteQuery, [
          route.code,
          route.description,
          route.priority,
          route.region,
          route.city,
          route.state
        ], (err) => {
          if (err) {
            console.error(`❌ Erro ao inserir rota ${route.code}:`, err);
          } else {
            console.log(`✅ Rota padrão criada: ${route.code}`);
          }
          routeIndex++;
          insertNextRoute();
        });
      }
      
      insertNextRoute();
    } else {
      console.log(`✅ ${results[0].count} rotas já existem no banco`);
    }
  });
}

// 🗄️ Função para criar tabelas no banco de dados
function createTables() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      cpf VARCHAR(11) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'manager', 'operator') NOT NULL DEFAULT 'operator',
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      notes TEXT,
      last_login TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
  
  const createDocksTable = `
    CREATE TABLE IF NOT EXISTS docks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      status ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
  
  const createDriversTable = `
    CREATE TABLE IF NOT EXISTS drivers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      cpf VARCHAR(11),
      notes TEXT,
      license_plate VARCHAR(20),
      vehicle_type VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
  
  const createRoutesTable = `
    CREATE TABLE IF NOT EXISTS routes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
  
  const createLoadingsTable = `
    CREATE TABLE IF NOT EXISTS loadings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dock_id INT,
      driver_id INT,
      route_id INT,
      status ENUM('scheduled', 'in_progress', 'completed', 'canceled') DEFAULT 'scheduled',
      scheduled_time DATETIME,
      checkin_time DATETIME,
      checkout_time DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (dock_id) REFERENCES docks(id),
      FOREIGN KEY (driver_id) REFERENCES drivers(id),
      FOREIGN KEY (route_id) REFERENCES routes(id)
    )
  `;
  
  const createProductsTable = `
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

  const createLoadingItemsTable = `
    CREATE TABLE IF NOT EXISTS loading_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      loading_id INT,
      product_id INT,
      quantity INT NOT NULL DEFAULT 1,
      scanned BOOLEAN DEFAULT FALSE,
      scanned_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (loading_id) REFERENCES loadings(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `;
  
  // Executar criação de tabelas
  const tables = [
    { name: 'usuários', query: createUsersTable },
    { name: 'docas', query: createDocksTable },
    { name: 'motoristas', query: createDriversTable },
    { name: 'rotas', query: createRoutesTable },
    { name: 'carregamentos', query: createLoadingsTable },
    { name: 'produtos', query: createProductsTable },
    { name: 'itens de carregamento', query: createLoadingItemsTable }
  ];
  
  tables.forEach(table => {
    db.query(table.query, (err) => {
      if (err) {
        console.error(`❌ Erro ao criar tabela de ${table.name}:`, err);
      } else {
        console.log(`✅ Tabela de ${table.name} criada/verificada com sucesso`);
      }
    });
  });
  
  // Migrar tabela de rotas após criação
  setTimeout(() => {
    migrateRoutesTable();
  }, 1000);
  
  // Inserir usuário admin padrão se não existir
  setTimeout(() => {
    const checkAdminUser = "SELECT * FROM users WHERE email = 'admin@dockflow.com'";
    db.query(checkAdminUser, (err, results) => {
      if (err) {
        console.error('❌ Erro ao verificar usuário admin:', err);
      } else if (results.length === 0) {
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        bcrypt.hash(adminPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12, (err, hash) => {
          if (err) {
            console.error('❌ Erro ao criar hash da senha:', err);
          } else {
            const insertAdmin = `
              INSERT INTO users (name, email, cpf, password, role, status) 
              VALUES ('Administrador', 'admin@dockflow.com', '00000000000', ?, 'admin', 'active')
            `;
            db.query(insertAdmin, [hash], (err) => {
              if (err) {
                console.error('❌ Erro ao inserir usuário admin:', err);
              } else {
                console.log('✅ Usuário admin criado com sucesso (admin@dockflow.com)');
                console.log(`🔑 Senha padrão: ${adminPassword}`);
              }
            });
          }
        });
      }
    });
  }, 2000);
}

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
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected',
    environment: NODE_ENV,
    memory: process.memoryUsage(),
    version: '2.1'
  });
});

// 📡 Importar e registrar rotas
const dockRoutes = require('./routes/dockRoutes');
const loadingRoutes = require('./routes/loadingRoutes');
const productRoutes = require('./routes/productRoutes');
const driverRoutes = require('./routes/driverRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const routeRoutes = require('./routes/routeRoutes');

// 🔗 Registrar todas as rotas
app.use('/api/auth', authRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/docks', dockRoutes);
app.use('/api/loadings', loadingRoutes);
app.use('/api/products', productRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/carregamentos', carregamentoRoutes);

// 🛠️ Middleware de tratamento de erros global
app.use((err, req, res, next) => {
  console.error('❌ Erro na aplicação:', err);
  
  // Log detalhado em desenvolvimento
  if (NODE_ENV === 'development') {
    console.error('Stack trace:', err.stack);
  }
  
  res.status(err.status || 500).json({
    error: 'Erro interno do servidor',
    message: NODE_ENV === 'development' ? err.message : 'Algo deu errado',
    timestamp: new Date().toISOString()
  });
});

// 🔍 Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    message: `Rota ${req.method} ${req.originalUrl} não existe`,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/auth/login',
      'GET /api/routes',
      'POST /api/routes',
      'GET /api/docks',
      'GET /api/loadings',
      'GET /api/drivers',
      'GET /api/vehicles',
      'GET /api/products',
      'GET /api/users'
    ]
  });
});

// 🚀 Iniciar o servidor
const server = app.listen(PORT, () => {
  console.log('\n🚀 ========================================');
  console.log(`   SERVIDOR DOCKFLOW INICIADO COM SUCESSO`);
  console.log('🚀 ========================================');
  console.log(`📡 Porta: ${PORT}`);
  console.log(`🌍 Ambiente: ${NODE_ENV}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Interface: http://localhost:${PORT}/carregamento.html`);
  console.log(`📋 API: http://localhost:${PORT}/api`);
  console.log(`🔐 Segurança: ATIVADA`);
  console.log(`🛡️  Rate limiting: ATIVADO`);
  console.log('🚀 ========================================\n');
});

// 🔧 Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso');
    db.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso');
    db.end();
    process.exit(0);
  });
});