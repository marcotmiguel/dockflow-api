// backend/database.js
const mysql = require('mysql2');

// 🔧 Configuração da conexão usando variáveis de ambiente
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root', 
  password: process.env.DB_PASSWORD || 'eNcTnTjUYdpTowkBhvZFXDOgljRZYygf',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || undefined, // Será definido no server.js
  ssl: process.env.DB_SSL_MODE === 'true' ? { rejectUnauthorized: false } : false,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// 🔍 Log da configuração (sem mostrar senha)
console.log('🔧 Configuração do banco de dados:');
console.log('📡 Host:', dbConfig.host);
console.log('👤 User:', dbConfig.user);
console.log('🔌 Port:', dbConfig.port);
console.log('🗄️  Database:', dbConfig.database || 'Será criado no server.js');
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

// Criar conexão
const db = mysql.createConnection(dbConfig);

module.exports = db;