// config/database.js - Configuração e conexão com banco de dados
const mysql = require('mysql2');

// 🗄️ Configuração do banco de dados com IPv6 fix
const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
  charset: 'utf8mb4',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// 🌐 IPv6 fix para Railway
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

// Criar conexão
const db = mysql.createConnection(dbConfig);

// 🔌 Conectar ao banco de dados com retry
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
      }
    });
  });
};

module.exports = {
  db,
  dbConfig,
  connectWithRetry
};