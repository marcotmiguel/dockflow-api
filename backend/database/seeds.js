// database/seeds.js - Inserção de dados iniciais
const { db } = require('../database');

// 🌱 Dados padrão das rotas
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

// 📝 Inserir rotas padrão (convertido para promises)
const insertDefaultRoutes = async () => {
  try {
    console.log('🌱 Verificando rotas padrão...');
    
    const [results] = await db.execute("SELECT COUNT(*) as count FROM routes");
    
    if (results[0].count === 0) {
      console.log('📝 Inserindo rotas padrão...');
      
      for (const route of defaultRoutes) {
        try {
          const insertRouteQuery = `
            INSERT INTO routes (code, description, priority, active, region, city, state, loadings_count, created_at, updated_at)
            VALUES (?, ?, ?, TRUE, ?, ?, ?, 0, NOW(), NOW())
          `;
          
          await db.execute(insertRouteQuery, [
            route.code,
            route.description,
            route.priority,
            route.region,
            route.city,
            route.state
          ]);
          
          console.log(`✅ Rota padrão criada: ${route.code}`);
        } catch (err) {
          console.error(`❌ Erro ao inserir rota ${route.code}:`, err);
        }
      }
      
      console.log('✅ Todas as rotas padrão foram inseridas');
    } else {
      console.log(`✅ ${results[0].count} rotas já existem no banco`);
    }
  } catch (error) {
    console.error('❌ Erro ao inserir rotas padrão:', error);
  }
};

// 👤 Inserir usuário admin padrão (convertido para promises)
const insertAdminUser = async () => {
  try {
    console.log('👤 Verificando usuário admin...');
    
    const [results] = await db.execute("SELECT * FROM users WHERE email = 'admin@dockflow.com'");
    
    if (results.length === 0) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      
      const insertAdmin = `
        INSERT INTO users (name, email, password, role, status, created_at, updated_at) 
        VALUES ('Administrador', 'admin@dockflow.com', ?, 'admin', 'active', NOW(), NOW())
      `;
      
      try {
        await db.execute(insertAdmin, [adminPassword]);
        console.log('✅ Usuário admin criado com sucesso (admin@dockflow.com)');
        console.log(`🔑 Senha padrão: ${adminPassword}`);
      } catch (err) {
        console.error('❌ Erro ao inserir usuário admin:', err);
      }
    } else {
      console.log('✅ Usuário admin já existe');
    }
  } catch (error) {
    console.error('❌ Erro ao verificar usuário admin:', error);
  }
};

// 🌱 Executar todos os seeds
const runSeeds = async () => {
  console.log('🌱 Iniciando inserção de dados iniciais...');
  
  try {
    await insertDefaultRoutes();
    await insertAdminUser();
    console.log('✅ Todos os dados iniciais foram processados');
  } catch (error) {
    console.error('❌ Erro ao executar seeds:', error);
  }
};

module.exports = {
  defaultRoutes,
  insertDefaultRoutes,
  insertAdminUser,
  runSeeds
};