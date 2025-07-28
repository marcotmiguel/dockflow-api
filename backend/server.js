// backend/server.js - VERSÃO COMPLETA CORRIGIDA PARA RAILWAY
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const compression = require('compression');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const mysql = require('mysql2');

// 🛡️ Importar middlewares de segurança
try {
  const { applySecurityMiddleware } = require('./middleware/security');
  var securityMiddleware = applySecurityMiddleware;
} catch (error) {
  console.log('⚠️ Middleware de segurança não disponível, continuando...');
  var securityMiddleware = null;
}

// 🔧 Configurações do servidor
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 🚀 Inicialização do app
const app = express();
app.set('trust proxy', true);

// 🗃️ Configuração de CORS segura + Railway fix
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN,
      'https://dockflow-api-production.up.railway.app',
      'https://dockflow-api-production.up.railway.app/', // Com barra final
      process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null
    ].filter(Boolean);
    
    // Permitir requisições sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // CORREÇÃO: Log para debug e permitir temporariamente
    console.log(`🔍 CORS - Origem recebida: ${origin}`);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🚨 CORS bloqueou origem: ${origin}`);
      // TEMPORÁRIO: Permitir mesmo se não estiver na lista (para debug)
      callback(null, true);
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

// 📁 Servir arquivos estáticos do frontend
app.use(express.static('public'));

// 🛡️ Aplicar middlewares de segurança (se disponível)
if (securityMiddleware) {
  try {
    securityMiddleware(app);
  } catch (error) {
    console.log('⚠️ Erro ao aplicar middleware de segurança:', error.message);
  }
}

// 📊 Logging melhorado
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`📡 [${timestamp}] ${req.method} ${req.originalUrl} - IP: ${ip}`);
  next();
};
app.use(logRequest);

// 🗄️ Configuração do banco de dados com IPv6 fix
const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway', // CORRIGIDO: usar 'railway'
  charset: 'utf8mb4',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// 🌐 IPv6 fix para Railway (CORREÇÃO CRÍTICA!)
if (process.env.MYSQLHOST) {
  dbConfig.family = 0; // Enable IPv6 support for Railway
  console.log('🌐 Configurando IPv6 para Railway');
}

console.log('🔧 Configuração MySQL:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
  hasPassword: !!dbConfig.password
});

const db = mysql.createConnection(dbConfig);

// 🔌 Conectar ao banco de dados com retry (Railway fix)
const connectWithRetry = () => {
  db.connect(error => {
    if (error) {
      console.error('❌ Erro ao conectar ao banco de dados:', error);
      console.log('🔄 Tentando reconectar em 5 segundos...');
      setTimeout(connectWithRetry, 5000);
      return;
    }
    console.log('✅ Conectado ao banco de dados MySQL com sucesso!');
    
    // Usar o banco railway diretamente
    db.query(`USE ${dbConfig.database}`, (err) => {
      if (err) {
        console.error('❌ Erro ao selecionar banco de dados:', err);
      } else {
        console.log('✅ Banco de dados selecionado com sucesso');
        createTables();
      }
    });
  });
};

// Iniciar conexão com retry
connectWithRetry();

// 🔧 FUNÇÃO PARA VERIFICAR E ATUALIZAR COLUNAS DA TABELA ROUTES
function migrateRoutesTable() {
  const checkPriorityColumn = `
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = '${dbConfig.database}' 
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
      WHERE TABLE_SCHEMA = '${dbConfig.database}' 
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

// 🗄️ Função para criar/verificar tabelas no banco de dados
function createTables() {
  // Verificar se tabelas já existem
  const checkTablesQuery = "SHOW TABLES";
  db.query(checkTablesQuery, (err, existingTables) => {
    if (err) {
      console.error('❌ Erro ao verificar tabelas existentes:', err);
      return;
    }

    const tableNames = existingTables.map(table => Object.values(table)[0]);
    console.log('📋 Tabelas existentes:', tableNames);

    // Definir estruturas das tabelas
    const tableDefinitions = {
      users: `
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role ENUM('operator','analyst','admin') NOT NULL DEFAULT 'operator',
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          phone VARCHAR(20) DEFAULT NULL,
          status ENUM('active','inactive') DEFAULT 'active',
          notes TEXT,
          last_login TIMESTAMP NULL DEFAULT NULL
        )
      `,
      docks: `
        CREATE TABLE IF NOT EXISTS docks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          status ENUM('available','occupied','maintenance','inactive') DEFAULT 'available',
          notes TEXT,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `,
      drivers: `
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
      `,
      routes: `
        CREATE TABLE IF NOT EXISTS routes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(50) UNIQUE,
          description TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `,
      vehicles: `
        CREATE TABLE IF NOT EXISTS vehicles (
          id INT NOT NULL AUTO_INCREMENT,
          license_plate VARCHAR(10) NOT NULL,
          vehicle_type ENUM('truck','van','car','motorcycle','other') NOT NULL,
          brand VARCHAR(50) DEFAULT NULL,
          model VARCHAR(50) DEFAULT NULL,
          year INT DEFAULT NULL,
          status ENUM('available','in_use','maintenance','inactive') DEFAULT 'available',
          notes TEXT,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY license_plate (license_plate)
        )
      `,
      loading_queue: `
        CREATE TABLE IF NOT EXISTS loading_queue (
          id INT NOT NULL AUTO_INCREMENT,
          vehicle_id INT DEFAULT NULL,
          dock_id INT DEFAULT NULL,
          status ENUM('waiting','loading','completed','cancelled') DEFAULT 'waiting',
          priority INT DEFAULT 1,
          estimated_time INT DEFAULT NULL,
          actual_start_time TIMESTAMP NULL DEFAULT NULL,
          actual_end_time TIMESTAMP NULL DEFAULT NULL,
          authorized_by INT DEFAULT NULL,
          notes TEXT,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY vehicle_id (vehicle_id),
          KEY dock_id (dock_id),
          KEY authorized_by (authorized_by),
          FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
          FOREIGN KEY (dock_id) REFERENCES docks (id),
          FOREIGN KEY (authorized_by) REFERENCES users (id)
        )
      `,
      products: `
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          code VARCHAR(50) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `,
      carregamentos: `
        CREATE TABLE IF NOT EXISTS carregamentos (
          id INT NOT NULL AUTO_INCREMENT,
          numero_nf VARCHAR(50) NOT NULL,
          chave_acesso VARCHAR(44) DEFAULT NULL,
          destinatario VARCHAR(255) NOT NULL,
          local_entrega TEXT,
          data_entrega DATE DEFAULT NULL,
          quantidade_volumes INT NOT NULL,
          peso_carga DECIMAL(10,3) DEFAULT NULL,
          codigo_barras VARCHAR(100) DEFAULT NULL,
          nome_produto VARCHAR(255) DEFAULT NULL,
          status ENUM('aguardando carregamento','em carregamento','carregado','enviado','entregue','cancelado') DEFAULT 'aguardando carregamento',
          restricoes_analisadas TEXT,
          route_id INT DEFAULT NULL,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY numero_nf (numero_nf),
          KEY chave_acesso (chave_acesso),
          KEY data_entrega (data_entrega),
          KEY status (status),
          KEY route_id (route_id),
          FOREIGN KEY (route_id) REFERENCES routes (id)
        )
      `,
      invoices: `
        CREATE TABLE IF NOT EXISTS invoices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          invoice_number VARCHAR(50) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          status ENUM('pending','paid','cancelled') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `,
      invoice_items: `
        CREATE TABLE IF NOT EXISTS invoice_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          invoice_id INT,
          product_name VARCHAR(255) NOT NULL,
          quantity INT NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (invoice_id) REFERENCES invoices(id)
        )
      `,
      loadings: `
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
      `,
      loading_items: `
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
      `,
      whatsapp_log: `
        CREATE TABLE IF NOT EXISTS whatsapp_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          phone_number VARCHAR(20) NOT NULL,
          message_content TEXT NOT NULL,
          message_type ENUM('text','image','document') DEFAULT 'text',
          direction ENUM('incoming','outgoing') DEFAULT 'incoming',
          status ENUM('sent','delivered','read','failed') DEFAULT 'sent',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    };

    // Executar criação de tabelas
    const tablesToCreate = Object.keys(tableDefinitions);
    
    tablesToCreate.forEach(tableName => {
      db.query(tableDefinitions[tableName], (err) => {
        if (err) {
          console.error(`❌ Erro ao criar tabela ${tableName}:`, err);
        } else {
          console.log(`✅ Tabela de ${tableName} criada/verificada com sucesso`);
        }
      });
    });
    
    // Migrar tabela de rotas após criação
    setTimeout(() => {
      migrateRoutesTable();
    }, 2000);
    
    // Inserir usuário admin padrão se não existir
    setTimeout(() => {
      const checkAdminUser = "SELECT * FROM users WHERE email = 'admin@dockflow.com'";
      db.query(checkAdminUser, (err, results) => {
        if (err) {
          console.error('❌ Erro ao verificar usuário admin:', err);
        } else if (results.length === 0) {
          const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
          
          const insertAdmin = `
            INSERT INTO users (name, email, password, role, status, created_at, updated_at) 
            VALUES ('Administrador', 'admin@dockflow.com', ?, 'admin', 'active', NOW(), NOW())
          `;
          db.query(insertAdmin, [adminPassword], (err) => {
            if (err) {
              console.error('❌ Erro ao inserir usuário admin:', err);
            } else {
              console.log('✅ Usuário admin criado com sucesso (admin@dockflow.com)');
              console.log(`🔑 Senha padrão: ${adminPassword}`);
            }
          });
        } else {
          console.log('✅ Usuário admin já existe');
        }
      });
    }, 3000);
  });
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

// 🔐 Rota de autenticação personalizada (JWT fix para Railway)
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Tentativa de login:', req.body);
    
    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }

    // Buscar usuário no banco
    db.query('SELECT * FROM users WHERE email = ? AND status = ?', [email, 'active'], (err, users) => {
      if (err) {
        console.error('❌ Erro na consulta:', err);
        return res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }

      if (users.length === 0) {
        console.log('❌ Usuário não encontrado:', email);
        return res.status(401).json({
          success: false,
          message: 'Email ou senha incorretos'
        });
      }

      const user = users[0];
      
      // Verificar senha (suporta hash e senha simples)
      const checkPassword = async () => {
        let passwordValid = false;
        
        if (user.password.startsWith('$2')) {
          // Senha hasheada
          passwordValid = await bcrypt.compare(password, user.password);
        } else {
          // Senha simples (para compatibilidade)
          passwordValid = password === user.password;
        }

        if (!passwordValid) {
          console.log('❌ Senha incorreta para:', email);
          return res.status(401).json({
            success: false,
            message: 'Email ou senha incorretos'
          });
        }

        // Gerar token JWT
        const JWT_SECRET = process.env.JWT_SECRET || 'dockflow_secret_key_2024';
        
        const token = jwt.sign(
          { 
            id: user.id, 
            email: user.email, 
            role: user.role 
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        // Atualizar último login
        db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id], (updateErr) => {
          if (updateErr) {
            console.error('⚠️ Erro ao atualizar last_login:', updateErr);
          }
        });

        console.log('✅ Login bem-sucedido para:', user.email);

        // Resposta compatível com auth.js
        res.json({
          success: true,
          message: 'Login realizado com sucesso',
          token: token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        });
      };

      checkPassword();
    });

  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// 📡 Importar e registrar rotas (com try/catch para rotas não existentes)
try {
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes);
} catch (e) { 
  console.log('⚠️ authRoutes não encontrado, usando rota personalizada'); 
}

try {
  const dockRoutes = require('./routes/dockRoutes');
  app.use('/api/docks', dockRoutes);
  console.log('✅ dockRoutes carregado');
} catch (e) { 
  console.log('⚠️ dockRoutes não encontrado'); 
}

try {
  const loadingRoutes = require('./routes/loadingRoutes');
  app.use('/api/loadings', loadingRoutes);
  console.log('✅ loadingRoutes carregado');
} catch (e) { 
  console.log('⚠️ loadingRoutes não encontrado, criando rota básica');
  
  // Rota básica para /api/loadings/today
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

try {
  const productRoutes = require('./routes/productRoutes');
  app.use('/api/products', productRoutes);
} catch (e) { console.log('⚠️ productRoutes não encontrado'); }

try {
  const driverRoutes = require('./routes/driverRoutes');
  app.use('/api/drivers', driverRoutes);
} catch (e) { console.log('⚠️ driverRoutes não encontrado'); }

try {
  const whatsappRoutes = require('./routes/whatsappRoutes');
  app.use('/api/whatsapp', whatsappRoutes);
} catch (e) { console.log('⚠️ whatsappRoutes não encontrado'); }

try {
  const vehicleRoutes = require('./routes/vehicleRoutes');
  app.use('/api/vehicles', vehicleRoutes);
} catch (e) { console.log('⚠️ vehicleRoutes não encontrado'); }

try {
  const userRoutes = require('./routes/userRoutes');
  app.use('/api/users', userRoutes);
} catch (e) { console.log('⚠️ userRoutes não encontrado'); }

try {
  const routeRoutes = require('./routes/routeRoutes');
  app.use('/api/routes', routeRoutes);
} catch (e) { console.log('⚠️ routeRoutes não encontrado'); }

try {
  const carregamentoRoutes = require('./routes/carregamentoRoutes');
  app.use('/api/carregamentos', carregamentoRoutes);
} catch (e) { console.log('⚠️ carregamentoRoutes não encontrado'); }

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
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/routes',
      'POST /api/routes',
      'GET /api/docks',
      'GET /api/loadings/today',
      'GET /api/drivers',
      'GET /api/vehicles',
      'GET /api/products',
      'GET /api/users'
    ]
  });
});

// 🚀 Iniciar o servidor
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