// database/routesMigration.js - Migração específica da tabela routes
const { db, dbConfig } = require('../config/database');

// 🔧 Função para verificar e atualizar colunas da tabela routes
const migrateRoutesTable = () => {
  return new Promise((resolve) => {
    console.log('🔧 Iniciando migração da tabela routes...');
    
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
        resolve();
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
          }
          checkAndAddOtherColumns(resolve);
        });
      } else {
        console.log('✅ Coluna priority já existe');
        checkAndAddOtherColumns(resolve);
      }
    });
  });
};

// Verificar e adicionar outras colunas necessárias
const checkAndAddOtherColumns = (callback) => {
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
      console.log('✅ Migração da tabela routes concluída');
      callback();
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
};

module.exports = {
  migrateRoutesTable
};