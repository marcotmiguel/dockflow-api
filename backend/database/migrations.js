// database/migrations.js - Criação e migração de tabelas
const { db } = require('../database');

// 📋 Definições das tabelas
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
      vehicle_type VARCHAR(50) NOT NULL,
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

// 🔧 Função para migrar a tabela vehicles existente
const migrateVehiclesTable = async () => {
  try {
    console.log('🔧 Verificando se precisa migrar tabela vehicles...');
    
    // Verificar se a tabela vehicles existe
    const [tables] = await db.execute("SHOW TABLES LIKE 'vehicles'");
    
    if (tables.length > 0) {
      console.log('🔍 Tabela vehicles encontrada, verificando estrutura...');
      
      // Verificar estrutura atual da coluna vehicle_type
      const [columns] = await db.execute("DESCRIBE vehicles");
      const vehicleTypeColumn = columns.find(col => col.Field === 'vehicle_type');
      
      if (vehicleTypeColumn) {
        console.log('📋 Coluna vehicle_type atual:', vehicleTypeColumn.Type);
        
        // Se for ENUM, migrar para VARCHAR
        if (vehicleTypeColumn.Type.includes('enum')) {
          console.log('🔄 Migrando vehicle_type de ENUM para VARCHAR...');
          
          await db.execute(`
            ALTER TABLE vehicles 
            MODIFY COLUMN vehicle_type VARCHAR(50) NOT NULL
          `);
          
          console.log('✅ Migração da coluna vehicle_type concluída!');
        } else {
          console.log('✅ Coluna vehicle_type já está no formato correto');
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao migrar tabela vehicles:', error);
    // Não throw o erro para não quebrar o sistema
  }
};

// 🗄️ Função para criar/verificar tabelas (convertido para promises)
const createTables = async () => {
  try {
    console.log('🗄️ Iniciando criação/verificação de tabelas...');
    
    // Verificar se tabelas já existem
    const [existingTables] = await db.execute("SHOW TABLES");
    const tableNames = existingTables.map(table => Object.values(table)[0]);
    console.log('📋 Tabelas existentes:', tableNames);

    // Executar migração da tabela vehicles primeiro
    await migrateVehiclesTable();

    // Executar criação de tabelas
    const tablesToCreate = Object.keys(tableDefinitions);
    
    for (const tableName of tablesToCreate) {
      try {
        await db.execute(tableDefinitions[tableName]);
        console.log(`✅ Tabela ${tableName} criada/verificada com sucesso`);
      } catch (err) {
        console.error(`❌ Erro ao criar tabela ${tableName}:`, err);
      }
    }
    
    console.log('✅ Todas as tabelas foram processadas');
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    throw error;
  }
};

module.exports = {
  tableDefinitions,
  createTables,
  migrateVehiclesTable
};