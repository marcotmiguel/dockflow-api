// middleware/logging.js - Sistema de logging personalizado

// 📊 Middleware de logging melhorado
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`📡 [${timestamp}] ${req.method} ${req.originalUrl} - IP: ${ip}`);
  next();
};

// 🛠️ Middleware de tratamento de erros global
const errorHandler = (err, req, res, next) => {
  console.error('❌ Erro na aplicação:', err);
  
  // Log detalhado em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack trace:', err.stack);
  }
  
  res.status(err.status || 500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado',
    timestamp: new Date().toISOString()
  });
};

// 🔍 Middleware para rotas não encontradas
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    message: `Rota ${req.method} ${req.originalUrl} não existe`,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/routes',
      'POST /api/routes',
      'GET /api/docks',
      'GET /api/loadings/today',
      'GET /api/drivers',
      'GET /api/vehicles',
      'GET /api/products',
      'GET /api/users'
    ]
  });
};

// Aplicar middlewares de logging
const applyLoggingMiddleware = (app) => {
  console.log('📊 Configurando sistema de logs...');
  
  // Request logging
  app.use(logRequest);
  
  console.log('✅ Sistema de logs configurado');
};

// Aplicar handlers de erro (deve ser chamado por último)
const applyErrorHandlers = (app) => {
  console.log('🛠️ Configurando handlers de erro...');
  
  // Error handler
  app.use(errorHandler);
  
  // 404 handler (deve ser o último)
  app.use('*', notFoundHandler);
  
  console.log('✅ Handlers de erro configurados');
};

module.exports = {
  logRequest,
  errorHandler,
  notFoundHandler,
  applyLoggingMiddleware,
  applyErrorHandlers
};