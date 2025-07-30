const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET /api/vehicles - Obter todos os veículos
router.get('/', async (req, res) => {
  try {
    console.log('📋 GET /api/vehicles - Buscando todos os veículos');
    
    const [rows] = await db.execute('SELECT * FROM vehicles ORDER BY license_plate');
    
    console.log(`✅ ${rows.length} veículos encontrados`);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao obter veículos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/vehicles/:id - Obter veículo por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 GET /api/vehicles/${id} - Buscando veículo específico`);
    
    const [rows] = await db.execute('SELECT * FROM vehicles WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Veículo não encontrado',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Veículo encontrado: ${rows[0].license_plate}`);
    
    res.json({
      success: true,
      data: rows[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao obter veículo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/vehicles/plate/:plate - Obter veículo por placa
router.get('/plate/:plate', async (req, res) => {
  try {
    const { plate } = req.params;
    console.log(`🔍 GET /api/vehicles/plate/${plate} - Buscando por placa`);
    
    const [rows] = await db.execute('SELECT * FROM vehicles WHERE license_plate = ?', [plate]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Veículo não encontrado',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Veículo encontrado por placa: ${rows[0].license_plate}`);
    
    res.json({
      success: true,
      data: rows[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao obter veículo por placa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/vehicles/status/available - Obter veículos disponíveis
router.get('/status/available', async (req, res) => {
  try {
    console.log('📋 GET /api/vehicles/status/available - Buscando veículos disponíveis');
    
    const [rows] = await db.execute('SELECT * FROM vehicles WHERE status = "available" ORDER BY license_plate');
    
    console.log(`✅ ${rows.length} veículos disponíveis encontrados`);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao obter veículos disponíveis:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/vehicles - Criar novo veículo
router.post('/', async (req, res) => {
  try {
    const { license_plate, vehicle_type, brand, model, year, notes } = req.body;
    
    console.log('📝 POST /api/vehicles - Criando novo veículo:', { license_plate, vehicle_type });
    
    // Validação básica
    if (!license_plate || !vehicle_type) {
      console.log('❌ Dados obrigatórios ausentes');
      return res.status(400).json({
        success: false,
        message: 'Placa e tipo de veículo são obrigatórios',
        timestamp: new Date().toISOString()
      });
    }
    
    // Verificar se placa já está cadastrada
    const [existingVehicles] = await db.execute('SELECT id FROM vehicles WHERE license_plate = ?', [license_plate.toUpperCase()]);
    
    if (existingVehicles.length > 0) {
      console.log('❌ Placa já cadastrada:', license_plate);
      return res.status(400).json({
        success: false,
        message: 'Placa já cadastrada para outro veículo',
        timestamp: new Date().toISOString()
      });
    }
    
    // Preparar dados do novo veículo
    const licensePlateFormatted = license_plate.toUpperCase().trim();
    const vehicleTypeFormatted = vehicle_type.trim();
    const brandFormatted = brand ? brand.trim() : null;
    const modelFormatted = model ? model.trim() : null;
    const yearFormatted = year ? parseInt(year) : null;
    const notesFormatted = notes ? notes.trim() : null;
    
    console.log('💾 Inserindo veículo...');
    
    // Inserir veículo
    const [result] = await db.execute(`
      INSERT INTO vehicles (license_plate, vehicle_type, brand, model, year, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [licensePlateFormatted, vehicleTypeFormatted, brandFormatted, modelFormatted, yearFormatted, 'available', notesFormatted]);
    
    console.log(`✅ Veículo criado com ID: ${result.insertId}`);
    
    res.status(201).json({
      success: true,
      message: 'Veículo criado com sucesso',
      data: {
        id: result.insertId,
        license_plate: licensePlateFormatted,
        vehicle_type: vehicleTypeFormatted,
        brand: brandFormatted,
        model: modelFormatted,
        year: yearFormatted,
        status: 'available',
        notes: notesFormatted
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar veículo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/vehicles/:id - Atualizar veículo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { license_plate, vehicle_type, brand, model, year, status, notes } = req.body;
    
    console.log(`📝 PUT /api/vehicles/${id} - Atualizando veículo`);
    
    // Validação básica
    if (!license_plate || !vehicle_type) {
      return res.status(400).json({
        success: false,
        message: 'Placa e tipo de veículo são obrigatórios',
        timestamp: new Date().toISOString()
      });
    }
    
    // Verificar se placa já está cadastrada para outro veículo
    const [existingVehicles] = await db.execute('SELECT id FROM vehicles WHERE license_plate = ? AND id != ?', [license_plate.toUpperCase(), id]);
    
    if (existingVehicles.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Placa já cadastrada para outro veículo',
        timestamp: new Date().toISOString()
      });
    }
    
    // Atualizar veículo
    const [result] = await db.execute(`
      UPDATE vehicles 
      SET license_plate = ?, vehicle_type = ?, brand = ?, model = ?, year = ?, status = ?, notes = ?
      WHERE id = ?
    `, [
      license_plate.toUpperCase().trim(),
      vehicle_type.trim(),
      brand ? brand.trim() : null,
      model ? model.trim() : null,
      year ? parseInt(year) : null,
      status || 'available',
      notes ? notes.trim() : null,
      id
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Veículo não encontrado',
        timestamp: new Date().toISOString()
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
    
  } catch (error) {
    console.error('❌ Erro ao atualizar veículo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// PATCH /api/vehicles/:id/status - Atualizar status do veículo
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 PATCH /api/vehicles/${id}/status - Alterando status para: ${status}`);
    
    if (!status || !['available', 'in_use', 'maintenance', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido. Use: available, in_use, maintenance ou inactive',
        timestamp: new Date().toISOString()
      });
    }
    
    const [result] = await db.execute('UPDATE vehicles SET status = ? WHERE id = ?', [status, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Veículo não encontrado',
        timestamp: new Date().toISOString()
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
    
  } catch (error) {
    console.error('❌ Erro ao atualizar status do veículo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/vehicles/:id - Excluir veículo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ DELETE /api/vehicles/${id} - Excluindo veículo`);
    
    // Verificar se veículo está associado a algum carregamento
    const [loadings] = await db.execute('SELECT COUNT(*) as count FROM loadings WHERE vehicle_id = ?', [id]);
    
    if (loadings[0].count > 0) {
      console.log(`❌ Veículo ${id} está associado a carregamentos`);
      return res.status(400).json({
        success: false,
        message: 'Este veículo está associado a carregamentos e não pode ser excluído',
        timestamp: new Date().toISOString()
      });
    }
    
    // Excluir veículo se não estiver em uso
    const [result] = await db.execute('DELETE FROM vehicles WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Veículo não encontrado',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Veículo ${id} excluído com sucesso`);
    
    res.json({
      success: true,
      message: 'Veículo excluído com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao excluir veículo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/vehicles/:id/loadings - Obter histórico de carregamentos do veículo
router.get('/:id/loadings', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📋 GET /api/vehicles/${id}/loadings - Buscando histórico`);
    
    const [rows] = await db.execute(`
      SELECT 
        l.*,
        d.name as dock_name,
        dr.name as driver_name,
        dr.phone as driver_phone
      FROM loadings l
      LEFT JOIN docks d ON l.dock_id = d.id
      LEFT JOIN drivers dr ON l.driver_id = dr.id
      WHERE l.vehicle_id = ?
      ORDER BY l.scheduled_time DESC
      LIMIT 10
    `, [id]);
    
    console.log(`✅ ${rows.length} registros de histórico encontrados`);
    
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao obter histórico do veículo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;