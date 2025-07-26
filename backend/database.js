// backend/database.js
const mysql = require('mysql2');

// Configuração da conexão com o banco de dados
const db = mysql.createConnection({
  host: 'localhost',  // Endereço do servidor MySQL
  user: 'root',       // Usuário do MySQL (geralmente 'root')
  password: 'Mm386195@', // Sua senha do MySQL (deixe vazio se não definiu senha)
  port: 3306,         // Porta padrão do MySQL
  // Não definimos o banco de dados aqui para permitir que criemos se não existir
});

module.exports = db;