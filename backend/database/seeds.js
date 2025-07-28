// database/seeds.js - Inserção de dados iniciais
const { db } = require('../config/database');

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

// 📝 Inserir rotas padrão
const insertDefaultRoutes = () => {
  return new Promise((resolve) => {
    console.log('🌱 Verificando rotas padrão...');
    
    const checkRoutesQuery = "SELECT COUNT(*) as count FROM routes";
    db.query(checkRoutesQuery, (err, results) => {
      if (err) {
        console.error('❌ Erro ao verificar rotas existentes:', err);
        resolve();
      } else if (results[0].count === 0) {
        console.log('📝 Inserindo rotas padrão...');
        
        let routeIndex = 0;
        
        function insertNextRoute() {
          if (routeIndex >= defaultRoutes.length) {
            console.log('✅ Todas as rotas padrão foram inseridas');
            resolve();
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
        resolve();
      }
    });
  });
};

// 👤 Inserir usuário admin padrão
const insertAdminUser = () => {
  return new Promise((resolve) => {
    console.log('👤 Verificando usuário admin...');
    
    const checkAdminUser = "SELECT * FROM users WHERE email = 'admin@dockflow.com'";
    db.query(checkAdminUser, (err, results) => {
      if (err) {
        console.error('❌ Erro ao verificar usuário admin:', err);
        resolve();
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
          resolve();
        });
      } else {
        console.log('✅ Usuário admin já existe');
        resolve();
      }
    });
  });
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