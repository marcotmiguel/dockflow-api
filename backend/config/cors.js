// config/cors.js - Configuração de CORS para Railway
const cors = require('cors');

// 🗃️ CORS permissivo para Railway
const corsOptions = {
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// CORS manual - middleware personalizado
const corsManual = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  console.log(`🌐 CORS: ${req.method} ${req.originalUrl} - Origin: ${req.headers.origin}`);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Respondendo OPTIONS request');
    return res.sendStatus(200);
  }
  next();
};

// Aplicar configurações CORS
const applyCorsConfig = (app) => {
  console.log('🛡️ Configurando CORS...');
  
  // CORS manual (deve vir primeiro)
  app.use(corsManual);
  
  // CORS do pacote cors
  app.use(cors(corsOptions));
  
  console.log('✅ CORS configurado com sucesso');
};

module.exports = {
  corsOptions,
  corsManual,
  applyCorsConfig
};