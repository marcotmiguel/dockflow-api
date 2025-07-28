// backend/routes/vehicleRoutes.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/database'); // 🔧 CORREÇÃO: Importação correta
// const { authMiddleware } = require('../middleware/authMiddleware'); // 🔧 COMENTADO TEMPORARIAMENTE

// Obter todos os veículos
router.get('/', /* authMiddleware, */ (req, res) => {
  console.log('📋 GET /api/vehicles - Buscando todos os veículos');
  
  db.query('SELECT * FROM vehicles ORDER BY license_plate', (err, results) => {
    if (err) {
      console.error('❌ Erro ao obter veículos:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor',
        error: err.message 
      });
    }
    
    console.log(`✅ ${results.length} veículos encontrados`);
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  });
});

// Obter veículo por ID
router.get('/:id', /* authMiddleware, */ (req, res) => {
  const { id } = req.params;
  console.log(`🔍 GET /api/vehicles/${id} - Buscando veículo específico`);
  
  db.query('SELECT * FROM vehicles WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('❌ Erro ao obter veículo:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor',
        error: err.message 
      });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Veículo não encontrado' 
      });
    }
    
    console.log(`✅ Veículo encontrado: ${results[0].license_plate}`);
    res.json({
      success: true,
      data: results[0]
    });
  });
});

// Obter veículo por placa
router.get('/plate/:plate', /* authMiddleware, */ (req, res) => {
  const { plate } = req.params;
  console.log(`🔍 GET /api/vehicles/plate/${plate} - Buscando por placa`);
  
  db.query('SELECT * FROM vehicles WHERE license_plate = ?', [plate], (err, results) => {
    if (err) {
      console.error('❌ Erro ao obter veículo por placa:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor',
        error: err.message 
      });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Veículo não encontrado' 
      });
    }
    
    console.log(`✅ Veículo encontrado por placa: ${results[0].license_plate}`);
    res.json({
      success: true,
      data: results[0]
    });
  });
});

// Obter veículos disponíveis
router.get('/status/available', /* authMiddleware, */ (req, res) => {
  console.log('📋 GET /api/vehicles/status/available - Buscando veículos disponíveis');
  
  db.query('SELECT * FROM vehicles WHERE status = "available" ORDER BY license_plate', (err, results) => {
    if (err) {
      console.error('❌ Erro ao obter veículos disponíveis:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor',
        error: err.message 
      });
    }
    
    console.log(`✅ ${results.length} veículos disponíveis encontrados`);
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  });
});

// Criar novo veículo
router.post('/', /* authMiddleware, */ (req, res) => {
  const { license_plate, vehicle_type, brand, model, year, notes } = req.body;
  
  console.log('📝 POST /api/vehicles - Criando novo veículo:', { license_plate, vehicle_type });
  
  // Validação básica
  if (!license_plate || !vehicle_type) {
    console.log('❌ Dados obrigatórios ausentes');
    return res.status(400).json({ 
      success: false,
      message: 'Placa e tipo de veículo são obrigatórios' 
    });
  }
  
  // Verificar se placa já está cadastrada
  db.query('SELECT id FROM vehicles WHERE license_plate = ?', [license_plate.toUpperCase()], (err, results) => {
    if (err) {
      console.error('❌ Erro ao verificar placa do veículo:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor',
        error: err.message 
      });
    }
    
    if (results.length > 0) {
      console.log('❌ Placa já cadastrada:', license_plate);
      return res.status(400).json({ 
        success: false,
        message: 'Placa já cadastrada para outro veículo' 
      });
    }
    
    // Preparar dados do novo veículo
    const newVehicle = {
      license_plate: license_plate.toUpperCase().trim(),
      vehicle_type: vehicle_type.trim(),
      brand: brand ? brand.trim() : null,
      model: model ? model.trim() : null,
      year: year ? parseInt(year) : null,
      status: 'available',
      notes: notes ? notes.trim() : null
    };
    
    console.log('💾 Inserindo veículo:', newVehicle);
    
    // Inserir veículo
    db.query('INSERT INTO vehicles SET ?', newVehicle, (err, result) => {
      if (err) {
        console.error('❌ Erro ao criar veículo:', err);
        return res.status(500).json({ 
          success: false,
          message: 'Erro interno do servidor',
          error: err.message 
        });
      }
      
      console.log(`✅ Veículo criado com ID: ${result.insertId}`);
      
      res.status(201).json({
        success: true,
        message: 'Veículo criado com sucesso',
        data: {
          id: result.insertId,
          ...newVehicle
        }
      });
    });
  });
});

// Atualizar veículo
router.put('/:id', /* authMiddleware, */ (req, res) => {
  const { id } = req.params;
  const { license_plate, vehicle_type, brand, model, year, status, notes } = req.body;
  
  console.log(`📝 PUT /api/vehicles/${id} - Atualizando veículo`);
  
  // Validação básica
  if (!license_plate || !vehicle_type) {
    return res.status(400).json({ 
      success: false,
      message: 'Placa e tipo de veículo são obrigatórios' 
    });
  }
  
  // Verificar se placa já está cadastrada para outro veículo
  db.query('SELECT id FROM vehicles WHERE license_plate = ? AND id != ?', [license_plate.toUpperCase(), id], (err, results) => {
    if (err) {
      console.error('❌ Erro ao verificar placa do veículo:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor',
        error: err.message 
      });
    }
    
    if (results.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Placa já cadastrada para outro veículo' 
      });
    }
    
    // Atualizar veículo
    const updateQuery = `
      UPDATE vehicles 
      SET license_plate = ?, vehicle_type = ?, brand = ?, model = ?, year = ?, status = ?, notes = ?
      WHERE id = ?
    `;
    
    const updateValues = [
      license_plate.toUpperCase().trim(), 
      vehicle_type.trim(), 
      brand ? brand.trim() : null, 
      model ? model.trim() : null, 
      year ? parseInt(year) : null, 
      status || 'available', 
      notes ? notes.trim() : null, 
      id
    ];
    
    db.query(updateQuery, updateValues, (err, result) => {
      if (err) {
        console.error('❌ Erro ao atualizar veículo:', err);
        return res.status(500).json({ 
          success: false,
          message: 'Erro interno do servidor',
          error: err.message 
        });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false,
          message: 'Veículo não encontrado' 
        });
      }
      
      console.log(`✅ Veículo ${id} atualizado com sucesso`);
      
      res.json({
        success: true,
        message: 'Veículo atualizado com sucesso',
        data: {
          id: parseInt(id),
          license_plate: license_plate.toUpperCase(),
          vehicle_type,
          brand,
          model,
          year: year ? parseInt(year) : null,
          status: status || 'available',
          notes
        }
      });
    });
  });
});

// Atualizar status do veículo
router.patch('/:id/status', /* authMiddleware, */ (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  console.log(`🔄 PATCH /api/vehicles/${id}/status - Alterando status para: ${status}`);
  
  if (!status || !['available', 'in_use', 'maintenance', 'inactive'].includes(status)) {
    return res.status(400).json({ 
      success: false,
      message: 'Status inválido. Use: available, in_use, maintenance ou inactive' 
    });
  }
  
  db.query('UPDATE vehicles SET status = ? WHERE id = ?', [status, id], (err, result) => {
    if (err) {
      console.error('❌ Erro ao atualizar status do veículo:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor',
        error: err.message 
      });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Veículo não encontrado' 
      });
    }
    
    console.log(`✅ Status do veículo ${id} alterado para: ${status}`);
    
    res.json({
      success: true,
      message: 'Status do veículo atualizado com sucesso',
      data: {
        id: parseInt(id),
        status
      }
    });
  });
});

// Excluir veículo
router.delete('/:id', /* authMiddleware, */ (req, res) => {
  const { id } = req.params;
  
  console.log(`🗑️ DELETE /api/vehicles/${id} - Excluindo veículo`);
  
  // Verificar se veículo está associado a algum carregamento
  db.query('SELECT COUNT(*) as count FROM loadings WHERE vehicle_id = ?', [id], (err, results) => {
    if (err) {
      console.error('❌ Erro ao verificar uso do veículo:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor',
        error: err.message 
      });
    }
    
    if (results[0].count > 0) {
      console.log(`❌ Veículo ${id} está associado a carregamentos`);
      return res.status(400).json({ 
        success: false,
        message: 'Este veículo está associado a carregamentos e não pode ser excluído'
      });
    }
    
    // Excluir veículo se não estiver em uso
    db.query('DELETE FROM vehicles WHERE id = ?', [id], (err, result) => {
      if (err) {
        console.error('❌ Erro ao excluir veículo:', err);
        return res.status(500).json({ 
          success: false,
          message: 'Erro interno do servidor',
          error: err.message 
        });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false,
          message: 'Veículo não encontrado' 
        });
      }
      
      console.log(`✅ Veículo ${id} excluído com sucesso`);
      
      res.json({ 
        success: true,
        message: 'Veículo excluído com sucesso' 
      });
    });
  });
});

// Obter histórico de carregamentos do veículo
router.get('/:id/loadings', /* authMiddleware, */ (req, res) => {
  const { id } = req.params;
  
  console.log(`📋 GET /api/vehicles/${id}/loadings - Buscando histórico`);
  
  const query = `
    SELECT l.*, d.name as dock_name, dr.name as driver_name, dr.phone as driver_phone
    FROM loadings l
    LEFT JOIN docks d ON l.dock_id = d.id
    LEFT JOIN drivers dr ON l.driver_id = dr.id
    WHERE l.vehicle_id = ?
    ORDER BY l.scheduled_time DESC
    LIMIT 10
  `;
  
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('❌ Erro ao obter histórico do veículo:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor',
        error: err.message 
      });
    }
    
    console.log(`✅ ${results.length} registros de histórico encontrados`);
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  });
});

module.exports = router;