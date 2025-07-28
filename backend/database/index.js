// database/index.js - Wrapper de compatibilidade para pool.execute()
const { db } = require('../config/database');
const { promisify } = require('util');

// Converter callback para Promise
const queryAsync = promisify(db.query).bind(db);

// Pool compatível com sintaxe .execute()
const pool = {
  execute: async (sql, params = []) => {
    try {
      console.log('🔄 Executando query:', sql.substring(0, 50) + '...');
      const results = await queryAsync(sql, params);
      return [results]; // Retornar no formato esperado [rows]
    } catch (error) {
      console.error('❌ Erro na query:', error);
      throw error;
    }
  }
};

module.exports = pool;