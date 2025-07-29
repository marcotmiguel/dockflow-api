// database/routesMigration.js - Migração específica da tabela routes
const { db } = require('../database');

// Obter nome do banco das variáveis de ambiente
const getDatabase = () => {
  return process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway';
};

// 🔧 Função para verificar e atualizar colunas da tabela routes (convertido para promises)
const migrateRoutesTable = async () => {
  try {
    console.log('🔧 Iniciando migração da tabela routes...');
    
    const database = getDatabase();
    
    const checkPriorityColumn = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'routes' 
      AND COLUMN_NAME = 'priority'
    `;
    
    const [results] = await db.execute(checkPriorityColumn, [database]);
    
    if (results.length === 0) {
      console.log('🔧 Adicionando coluna priority à tabela routes...');
      const addPriorityColumn = `
        ALTER TABLE routes 
        ADD COLUMN priority ENUM('urgent', 'high', 'normal') DEFAULT 'normal' 
        AFTER description
      `;
      
      try {
        await db.execute(addPriorityColumn);
        console.log('✅ Coluna priority adicionada com sucesso');
      } catch (err) {
        console.error('❌ Erro ao adicionar coluna priority:', err);
      }
    } else {
      console.log('✅ Coluna priority já existe');
    }
    
    await checkAndAddOtherColumns(database);
    
  } catch (error) {
    console.error('❌ Erro na migração da tabela routes:', error);
  }
};

// Verificar e adicionar outras colunas necessárias (convertido para promises)
const checkAndAddOtherColumns = async (database) => {
  const requiredColumns = [
    { name: 'active', type: 'BOOLEAN DEFAULT TRUE', after: 'priority' },
    { name: 'region', type: 'VARCHAR(100)', after: 'active' },
    { name: 'city', type: 'VARCHAR(100)', after: 'region' },
    { name: 'state', type: 'VARCHAR(10)', after: 'city' },
    { name: 'loadings_count', type: 'INT DEFAULT 0', after: 'state' }
  ];
  
  for (const column of requiredColumns) {
    try {
      const checkColumnQuery = `
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'routes' 
        AND COLUMN_NAME = ?
      `;
      
      const [results] = await db.execute(checkColumnQuery, [database, column.name]);
      
      if (results.length === 0) {
        console.log(`🔧 Adicionando coluna ${column.name} à tabela routes...`);
        const addColumnQuery = `
          ALTER TABLE routes 
          ADD COLUMN ${column.name} ${column.type} 
          AFTER ${column.after}
        `;
        
        try {
          await db.execute(addColumnQuery);
          console.log(`✅ Coluna ${column.name} adicionada com sucesso`);
        } catch (err) {
          console.error(`❌ Erro ao adicionar coluna ${column.name}:`, err);
        }
      } else {
        console.log(`✅ Coluna ${column.name} já existe`);
      }
    } catch (err) {
      console.error(`❌ Erro ao verificar coluna ${column.name}:`, err);
    }
  }
  
  console.log('✅ Migração da tabela routes concluída');
};

module.exports = {
  migrateRoutesTable
};