// backend/middleware/security.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// 🔒 Rate Limiting - Proteção contra ataques de força bruta
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    message: {
      error: 'Muitas tentativas',
      message: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.log(`🚨 Rate limit excedido: ${req.ip} - ${req.originalUrl}`);
      res.status(429).json({
        error: 'Muitas tentativas',
        message: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// 🔐 Rate limits específicos
const loginRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutos
  5, // máximo 5 tentativas
  'Muitas tentativas de login. Tente novamente em 15 minutos.'
);

const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutos
  100, // máximo 100 requests
  'Muitas requisições à API. Tente novamente em 15 minutos.'
);

const strictRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutos
  10, // máximo 10 tentativas
  'Endpoint sensível. Muitas tentativas. Tente novamente em 5 minutos.'
);

// 🛡️ Configuração do Helmet para segurança HTTP
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

// 📝 Middleware de log de segurança
const securityLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  // Log de tentativas de login
  if (req.originalUrl.includes('/auth/login')) {
    console.log(`🔐 [${timestamp}] Login attempt: ${ip} - ${req.body.email || 'no email'}`);
  }
  
  // Log de acesso a endpoints sensíveis
  if (req.originalUrl.includes('/users') || 
      req.originalUrl.includes('/admin') ||
      req.originalUrl.includes('/config')) {
    console.log(`🔍 [${timestamp}] Sensitive endpoint access: ${ip} - ${req.method} ${req.originalUrl}`);
  }
  
  // Log de tentativas suspeitas
  if (req.headers['x-forwarded-for'] || 
      userAgent.includes('bot') || 
      userAgent.includes('crawler')) {
    console.log(`⚠️  [${timestamp}] Suspicious request: ${ip} - ${userAgent}`);
  }
  
  next();
};

// 🛡️ Middleware de validação de entrada
const inputSanitizer = (req, res, next) => {
  // Limpar possíveis ataques XSS básicos
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };
  
  if (req.body) {
    sanitizeObject(req.body);
  }
  
  if (req.query) {
    sanitizeObject(req.query);
  }
  
  next();
};

// 🔒 Middleware de verificação de origem
const corsSecurityCheck = (req, res, next) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const allowedOrigins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    process.env.FRONTEND_URL
  ].filter(Boolean);
  
  // Para requisições de API, verificar origem
  if (req.originalUrl.startsWith('/api/')) {
    if (origin && !allowedOrigins.includes(origin)) {
      console.log(`🚨 Origem não autorizada: ${origin} tentando acessar ${req.originalUrl}`);
      return res.status(403).json({
        error: 'Origem não autorizada',
        message: 'Acesso negado para esta origem'
      });
    }
  }
  
  next();
};

// 📊 Middleware de monitoramento de performance
const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log de requisições lentas (> 2 segundos)
    if (duration > 2000) {
      console.log(`🐌 Requisição lenta: ${req.method} ${req.originalUrl} - ${duration}ms`);
    }
    
    // Log de erros de servidor
    if (res.statusCode >= 500) {
      console.log(`❌ Erro do servidor: ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`);
    }
  });
  
  next();
};

// 🔧 Função para aplicar todas as proteções
const applySecurityMiddleware = (app) => {
  // Aplicar Helmet primeiro
  app.use(helmetConfig);
  
  // Rate limiting geral
  app.use('/api/', apiRateLimit);
  app.use('/api/auth/login', loginRateLimit);
  app.use('/api/users', strictRateLimit);
  app.use('/api/admin', strictRateLimit);
  
  // Middlewares de segurança
  app.use(securityLogger);
  app.use(inputSanitizer);
  app.use(corsSecurityCheck);
  app.use(performanceMonitor);
  
  console.log('🛡️  Middlewares de segurança aplicados com sucesso!');
};

module.exports = {
  applySecurityMiddleware,
  loginRateLimit,
  apiRateLimit,
  strictRateLimit,
  securityLogger,
  inputSanitizer,
  corsSecurityCheck,
  performanceMonitor
};