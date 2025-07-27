const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuração para Railway com suporte IPv6
const createDatabaseConnection = () => {
    const config = {
        host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
        port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
        user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
        password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true
    };

    // Suporte IPv6 para Railway (correção crítica!)
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
        
        // Criar tabela de usuários se não existir
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Criar tabela de carregamentos se não existir
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

        // Verificar se usuário admin existe
        const [adminExists] = await db.execute(
            'SELECT COUNT(*) as count FROM users WHERE email = ?',
            ['admin@dockflow.com']
        );

        // Criar usuário admin se não existir
        if (adminExists[0].count === 0) {
            await db.execute(`
                INSERT INTO users (email, password, name, role) 
                VALUES ('admin@dockflow.com', 'admin123', 'Administrator', 'admin')
            `);
            console.log('👤 Usuário admin criado: admin@dockflow.com / admin123');
        } else {
            console.log('👤 Usuário admin já existe');
        }

        // Inserir dados de exemplo se não existirem
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
            console.log('📦 Dados de exemplo inseridos');
        }

        console.log('✅ Banco de dados inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao inicializar banco:', error.message);
        throw error;
    }
};

module.exports = {
    db,
    testConnection,
    initializeDatabase
};