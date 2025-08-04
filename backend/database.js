const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Configuração para Railway com suporte IPv6 - SEM PARÂMETROS INVÁLIDOS
const createDatabaseConnection = () => {
    const config = {
        host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
        port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
        user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
        password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
        
        // ✅ APENAS PARÂMETROS VÁLIDOS PARA MYSQL2
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 60000,
        // ❌ REMOVIDOS: acquireTimeout, timeout, reconnect (causam warnings)
        
        // Configurações SSL para produção
        ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: false
        } : undefined
    };

    // Suporte IPv6 para Railway
    if (process.env.MYSQLHOST) {
        config.family = 0; // Enable IPv6 support for Railway
        console.log('🌐 Configurando IPv6 para Railway');
    }

    console.log('🔧 Configuração MySQL:', {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database,
        hasPassword: !!config.password
    });

    return mysql.createPool(config);
};

// Criar pool de conexões
const db = createDatabaseConnection();

// Testar conexão
const testConnection = async () => {
    try {
        const connection = await db.getConnection();
        console.log('✅ Conectado ao MySQL com sucesso!');
        await connection.release();
        return true;
    } catch (error) {
        console.error('❌ Erro de conexão MySQL:', error.message);
        return false;
    }
};

// Inicializar banco de dados
const initializeDatabase = async () => {
    try {
        console.log('🏗️ Inicializando banco de dados...');
        
        // Criar tabela de usuários com roles corretas
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                role ENUM('operador', 'analista', 'admin', 'desenvolvedor') DEFAULT 'operador',
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Criar tabela de carregamentos
        await db.execute(`
            CREATE TABLE IF NOT EXISTS carregamentos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                navio VARCHAR(255) NOT NULL,
                produto VARCHAR(255) NOT NULL,
                quantidade DECIMAL(10,2) NOT NULL,
                status ENUM('aguardando', 'carregando', 'concluido') DEFAULT 'aguardando',
                data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_fim TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Criar tabela de retornos (para o sistema)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS retornos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                cliente VARCHAR(255) NOT NULL,
                produto VARCHAR(255) NOT NULL,
                quantidade DECIMAL(10,2) NOT NULL,
                motivo TEXT,
                status ENUM('pendente', 'processando', 'concluido') DEFAULT 'pendente',
                user_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Verificar e criar usuários padrão
        await createDefaultUsers();

        // Inserir dados de exemplo
        await insertSampleData();

        console.log('✅ Banco de dados inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao inicializar banco:', error.message);
        throw error;
    }
};

// Criar usuários padrão do sistema
const createDefaultUsers = async () => {
    console.log('👥 Criando usuários padrão...');
    
    const defaultUsers = [
        {
            email: 'dev@dockflow.com',
            password: 'DockFlow2025!',
            name: 'Desenvolvedor',
            role: 'desenvolvedor'
        },
        {
            email: 'admin@dockflow.com', 
            password: 'Admin2025!',
            name: 'Administrador',
            role: 'admin'
        },
        {
            email: 'analista@dockflow.com',
            password: 'Analista2025!', 
            name: 'Analista',
            role: 'analista'
        },
        {
            email: 'operador@dockflow.com',
            password: 'Operador2025!',
            name: 'Operador', 
            role: 'operador'
        }
    ];

    for (const user of defaultUsers) {
        try {
            // Verificar se usuário já existe
            const [exists] = await db.execute(
                'SELECT id FROM users WHERE email = ?',
                [user.email]
            );

            if (exists.length === 0) {
                console.log(`📝 Criando usuário: ${user.email}`);
                
                // ✅ SEMPRE FAZER HASH DA SENHA
                const hashedPassword = await bcrypt.hash(user.password, 12);
                console.log(`🔐 Senha hashada para ${user.email}: ${hashedPassword.substring(0, 20)}...`);
                
                // Criar usuário
                const [result] = await db.execute(
                    'INSERT INTO users (email, password, name, role, status) VALUES (?, ?, ?, ?, ?)',
                    [user.email, hashedPassword, user.name, user.role, 'active']
                );
                
                console.log(`✅ Usuário criado: ${user.email} (ID: ${result.insertId}, Role: ${user.role})`);
            } else {
                console.log(`👤 Usuário já existe: ${user.email}`);
                
                // ✅ VERIFICAR SE A SENHA ESTÁ HASHADA
                const [userCheck] = await db.execute(
                    'SELECT password FROM users WHERE email = ?',
                    [user.email]
                );
                
                const currentPassword = userCheck[0].password;
                const isHashed = currentPassword.startsWith('$2');
                
                if (!isHashed) {
                    console.log(`🔧 Atualizando senha não-hashada para: ${user.email}`);
                    const hashedPassword = await bcrypt.hash(user.password, 12);
                    
                    await db.execute(
                        'UPDATE users SET password = ? WHERE email = ?',
                        [hashedPassword, user.email]
                    );
                    
                    console.log(`✅ Senha atualizada e hashada: ${user.email}`);
                }
            }
        } catch (error) {
            console.error(`❌ Erro ao processar usuário ${user.email}:`, error.message);
        }
    }
    
    // ✅ VERIFICAR TOTAL DE USUÁRIOS CRIADOS
    const [totalUsers] = await db.execute('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Total de usuários no banco: ${totalUsers[0].count}`);
};

// Inserir dados de exemplo
const insertSampleData = async () => {
    try {
        // Verificar se já existem carregamentos
        const [carregamentosCount] = await db.execute('SELECT COUNT(*) as count FROM carregamentos');
        
        if (carregamentosCount[0].count === 0) {
            const exemploCarregamentos = [
                ['Navio Alpha', 'Soja', 5000.00, 'aguardando'],
                ['Navio Beta', 'Milho', 3200.50, 'carregando'], 
                ['Navio Gamma', 'Trigo', 4100.25, 'concluido']
            ];

            for (const carregamento of exemploCarregamentos) {
                await db.execute(
                    'INSERT INTO carregamentos (navio, produto, quantidade, status) VALUES (?, ?, ?, ?)',
                    carregamento
                );
            }
            console.log('📦 Carregamentos de exemplo inseridos');
        }

        // Verificar se já existem retornos
        const [retornosCount] = await db.execute('SELECT COUNT(*) as count FROM retornos');
        
        if (retornosCount[0].count === 0) {
            const exemploRetornos = [
                ['Cliente A', 'Produto X', 100.50, 'Produto danificado', 'pendente'],
                ['Cliente B', 'Produto Y', 250.00, 'Quantidade incorreta', 'processando'],
                ['Cliente C', 'Produto Z', 75.25, 'Prazo vencido', 'concluido']
            ];

            for (const retorno of exemploRetornos) {
                await db.execute(
                    'INSERT INTO retornos (cliente, produto, quantidade, motivo, status) VALUES (?, ?, ?, ?, ?)',
                    retorno
                );
            }
            console.log('🔄 Retornos de exemplo inseridos');
        }

    } catch (error) {
        console.error('❌ Erro ao inserir dados de exemplo:', error.message);
    }
};

module.exports = {
    db,
    testConnection,
    initializeDatabase
};