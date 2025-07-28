// backend/routes/routeRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database');

// 📡 Health Check da API de rotas
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Routes API',
    version: '1.0.0'
  });
});

// 📋 GET - Buscar todas as rotas
router.get('/', (req, res) => {
  const query = `
    SELECT 
      id,
      code,
      description,
      priority,
      active,
      region,
      city,
      state,
      loadings_count,
      created_at,
      updated_at
    FROM routes 
    ORDER BY 
      CASE priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'normal' THEN 3 
        ELSE 4 
      END,
      code ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Erro ao buscar rotas:', err);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
      });
    } else {
      console.log(`✅ ${results.length} rotas encontradas`);
      res.json(results);
    }
  });
});

// 🔍 GET - Buscar rota por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = 'SELECT * FROM routes WHERE id = ?';
  
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('❌ Erro ao buscar rota:', err);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
      });
    } else if (results.length === 0) {
      res.status(404).json({
        error: 'Rota não encontrada'
      });
    } else {
      res.json(results[0]);
    }
  });
});

// 🌎 GET - Buscar rotas por região
router.get('/region/:city/:state', (req, res) => {
  const { city, state } = req.params;
  
  const query = `
    SELECT * FROM routes 
    WHERE active = 1 
    AND (city = ? OR state = ? OR state = 'ALL')
    ORDER BY 
      CASE priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'normal' THEN 3 
        ELSE 4 
      END,
      loadings_count ASC
  `;
  
  db.query(query, [city, state], (err, results) => {
    if (err) {
      console.error('❌ Erro ao buscar rotas por região:', err);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
      });
    } else {
      console.log(`✅ ${results.length} rotas encontradas para ${city}/${state}`);
      res.json(results);
    }
  });
});

// 🤖 POST - Encontrar melhor rota para XML
router.post('/find-best', (req, res) => {
  const { xmlData } = req.body;
  
  if (!xmlData || !xmlData.endereco) {
    return res.status(400).json({
      error: 'Dados XML inválidos',
      message: 'xmlData.endereco é obrigatório'
    });
  }
  
  const city = xmlData.endereco.cidade;
  const state = xmlData.endereco.uf;
  
  console.log(`🔍 Buscando melhor rota para: ${city}/${state}`);
  
  // Buscar rotas da mesma cidade/estado
  const query = `
    SELECT * FROM routes 
    WHERE active = 1 
    AND (city = ? OR state = ? OR state = 'ALL')
    ORDER BY 
      CASE priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'normal' THEN 3 
        ELSE 4 
      END,
      loadings_count ASC
    LIMIT 1
  `;
  
  db.query(query, [city, state], (err, results) => {
    if (err) {
      console.error('❌ Erro ao buscar melhor rota:', err);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
      });
    } else if (results.length === 0) {
      // Criar rota automática se não encontrar nenhuma
      const autoRouteData = {
        code: `AUTO-${state}-${Date.now()}`,
        description: `Rota Automática - ${city}/${state}`,
        priority: 'normal',
        region: 'Automática',
        city: city,
        state: state
      };
      
      createAutoRoute(autoRouteData, res);
    } else {
      const bestRoute = results[0];
      console.log(`✅ Melhor rota encontrada: ${bestRoute.code}`);
      res.json(bestRoute);
    }
  });
});

// ➕ POST - Criar nova rota
router.post('/', (req, res) => {
  const {
    code,
    description,
    priority = 'normal',
    region,
    city,
    state
  } = req.body;
  
  // Validações
  if (!code || !description) {
    return res.status(400).json({
      error: 'Dados obrigatórios',
      message: 'code e description são obrigatórios'
    });
  }
  
  // Verificar se o código já existe
  const checkQuery = 'SELECT id FROM routes WHERE code = ?';
  
  db.query(checkQuery, [code.toUpperCase()], (err, results) => {
    if (err) {
      console.error('❌ Erro ao verificar código da rota:', err);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
      });
    } else if (results.length > 0) {
      res.status(409).json({
        error: 'Código já existe',
        message: `Já existe uma rota com o código '${code}'`
      });
    } else {
      // Inserir nova rota
      const insertQuery = `
        INSERT INTO routes (
          code, description, priority, active, region, city, state, loadings_count, created_at, updated_at
        ) VALUES (?, ?, ?, 1, ?, ?, ?, 0, NOW(), NOW())
      `;
      
      const extractedRegion = region || extractRegion(description);
      const extractedCity = city || extractCity(description);
      const extractedState = state || extractState(code);
      
      db.query(insertQuery, [
        code.toUpperCase(),
        description,
        priority,
        extractedRegion,
        extractedCity,
        extractedState
      ], (err, result) => {
        if (err) {
          console.error('❌ Erro ao criar rota:', err);
          res.status(500).json({
            error: 'Erro interno do servidor',
            message: err.message
          });
        } else {
          // Buscar rota criada
          const selectQuery = 'SELECT * FROM routes WHERE id = ?';
          
          db.query(selectQuery, [result.insertId], (err, results) => {
            if (err) {
              console.error('❌ Erro ao buscar rota criada:', err);
              res.status(500).json({
                error: 'Erro interno do servidor',
                message: err.message
              });
            } else {
              const newRoute = results[0];
              console.log(`✅ Rota criada: ${newRoute.code}`);
              res.status(201).json(newRoute);
            }
          });
        }
      });
    }
  });
});

// 🔄 PUT - Atualizar rota
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    code,
    description,
    priority,
    active,
    region,
    city,
    state,
    loadings_count
  } = req.body;
  
  // Buscar rota atual primeiro
  const selectQuery = 'SELECT * FROM routes WHERE id = ?';
  
  db.query(selectQuery, [id], (err, results) => {
    if (err) {
      console.error('❌ Erro ao buscar rota para atualizar:', err);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
      });
    } else if (results.length === 0) {
      res.status(404).json({
        error: 'Rota não encontrada'
      });
    } else {
      const currentRoute = results[0];
      
      // Preparar dados para atualização
      const updateData = {
        code: code || currentRoute.code,
        description: description || currentRoute.description,
        priority: priority || currentRoute.priority,
        active: active !== undefined ? active : currentRoute.active,
        region: region || currentRoute.region,
        city: city || currentRoute.city,
        state: state || currentRoute.state,
        loadings_count: loadings_count !== undefined ? loadings_count : currentRoute.loadings_count
      };
      
      const updateQuery = `
        UPDATE routes SET 
          code = ?,
          description = ?,
          priority = ?,
          active = ?,
          region = ?,
          city = ?,
          state = ?,
          loadings_count = ?,
          updated_at = NOW()
        WHERE id = ?
      `;
      
      db.query(updateQuery, [
        updateData.code,
        updateData.description,
        updateData.priority,
        updateData.active,
        updateData.region,
        updateData.city,
        updateData.state,
        updateData.loadings_count,
        id
      ], (err) => {
        if (err) {
          console.error('❌ Erro ao atualizar rota:', err);
          res.status(500).json({
            error: 'Erro interno do servidor',
            message: err.message
          });
        } else {
          // Retornar rota atualizada
          db.query(selectQuery, [id], (err, results) => {
            if (err) {
              console.error('❌ Erro ao buscar rota atualizada:', err);
              res.status(500).json({
                error: 'Erro interno do servidor',
                message: err.message
              });
            } else {
              const updatedRoute = results[0];
              console.log(`✅ Rota atualizada: ${updatedRoute.code}`);
              res.json(updatedRoute);
            }
          });
        }
      });
    }
  });
});

// 📈 PUT - Incrementar contador de carregamentos
router.put('/:id/increment', (req, res) => {
  const { id } = req.params;
  
  const query = `
    UPDATE routes 
    SET loadings_count = loadings_count + 1, updated_at = NOW()
    WHERE id = ?
  `;
  
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('❌ Erro ao incrementar contador:', err);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
      });
    } else if (result.affectedRows === 0) {
      res.status(404).json({
        error: 'Rota não encontrada'
      });
    } else {
      console.log(`✅ Contador incrementado para rota ID: ${id}`);
      res.json({ success: true, message: 'Contador incrementado' });
    }
  });
});

// ❌ DELETE - Deletar rota
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // Verificar se rota existe e se tem carregamentos associados
 const checkQuery = `
  SELECT r.*, COUNT(r.id) as loadings_associated
  FROM routes r  
  WHERE r.id = ?
  GROUP BY r.id
`;
  
  db.query(checkQuery, [id], (err, results) => {
    if (err) {
      console.error('❌ Erro ao verificar rota para deletar:', err);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
      });
    } else if (results.length === 0) {
      res.status(404).json({
        error: 'Rota não encontrada'
      });
    } else {
      const route = results[0];
      
      if (route.loadings_associated > 0) {
        res.status(409).json({
          error: 'Rota não pode ser deletada',
          message: `Existem ${route.loadings_associated} carregamentos associados a esta rota`
        });
      } else {
        // Deletar rota
        const deleteQuery = 'DELETE FROM routes WHERE id = ?';
        
        db.query(deleteQuery, [id], (err, result) => {
          if (err) {
            console.error('❌ Erro ao deletar rota:', err);
            res.status(500).json({
              error: 'Erro interno do servidor',
              message: err.message
            });
          } else {
            console.log(`✅ Rota deletada: ${route.code}`);
            res.json({
              success: true,
              message: `Rota '${route.code}' deletada com sucesso`
            });
          }
        });
      }
    }
  });
});

// 📊 GET - Estatísticas das rotas
router.get('/stats/overview', (req, res) => {
  const statsQuery = `
    SELECT 
      COUNT(*) as total_routes,
      SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_routes,
      SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_routes,
      SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority_routes,
      SUM(CASE WHEN priority = 'normal' THEN 1 ELSE 0 END) as normal_priority_routes,
      SUM(loadings_count) as total_loadings,
      AVG(loadings_count) as avg_loadings_per_route
    FROM routes
  `;
  
  const stateStatsQuery = `
    SELECT state, COUNT(*) as count
    FROM routes 
    WHERE active = 1
    GROUP BY state
    ORDER BY count DESC
  `;
  
  db.query(statsQuery, (err, statsResults) => {
    if (err) {
      console.error('❌ Erro ao buscar estatísticas:', err);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
      });
    } else {
      db.query(stateStatsQuery, (err, stateResults) => {
        if (err) {
          console.error('❌ Erro ao buscar estatísticas por estado:', err);
          res.status(500).json({
            error: 'Erro interno do servidor',
            message: err.message
          });
        } else {
          const stats = statsResults[0];
          stats.by_state = stateResults.reduce((acc, row) => {
            acc[row.state] = row.count;
            return acc;
          }, {});
          
          res.json(stats);
        }
      });
    }
  });
});

// 🔧 FUNÇÕES AUXILIARES

function createAutoRoute(routeData, res) {
  console.log(`🤖 Criando rota automática: ${routeData.code}`);
  
  const insertQuery = `
    INSERT INTO routes (
      code, description, priority, active, region, city, state, loadings_count, created_at, updated_at
    ) VALUES (?, ?, ?, 1, ?, ?, ?, 0, NOW(), NOW())
  `;
  
  db.query(insertQuery, [
    routeData.code,
    routeData.description,
    routeData.priority,
    routeData.region,
    routeData.city,
    routeData.state
  ], (err, result) => {
    if (err) {
      console.error('❌ Erro ao criar rota automática:', err);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
      });
    } else {
      // Buscar rota criada
      const selectQuery = 'SELECT * FROM routes WHERE id = ?';
      
      db.query(selectQuery, [result.insertId], (err, results) => {
        if (err) {
          console.error('❌ Erro ao buscar rota automática criada:', err);
          res.status(500).json({
            error: 'Erro interno do servidor',
            message: err.message
          });
        } else {
          const newRoute = results[0];
          console.log(`✅ Rota automática criada: ${newRoute.code}`);
          res.status(201).json(newRoute);
        }
      });
    }
  });
}

function extractRegion(description) {
  const regionPatterns = [
    /centro/i,
    /zona sul/i,
    /zona norte/i,
    /zona leste/i,
    /zona oeste/i,
    /ABC/i
  ];
  
  for (const pattern of regionPatterns) {
    if (pattern.test(description)) {
      return description.match(pattern)[0];
    }
  }
  
  return 'Geral';
}

function extractCity(description) {
  const cityPatterns = [
    /São Paulo/i,
    /Rio de Janeiro/i,
    /Belo Horizonte/i,
    /Salvador/i,
    /Brasília/i,
    /Curitiba/i,
    /Porto Alegre/i
  ];
  
  for (const pattern of cityPatterns) {
    if (pattern.test(description)) {
      return description.match(pattern)[0];
    }
  }
  
  return 'Não especificada';
}

function extractState(code) {
  const statePattern = /^([A-Z]{2})/;
  const match = code.match(statePattern);
  return match ? match[1] : 'SP';
}

module.exports = router;