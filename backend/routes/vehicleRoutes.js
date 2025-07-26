// backend/routes/vehicleRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware } = require('../middleware/authMiddleware');

// Obter todos os veículos
router.get('/', authMiddleware, (req, res) => {
  db.query('SELECT * FROM vehicles ORDER BY license_plate', (err, results) => {
    if (err) {
      console.error('Erro ao obter veículos:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    res.json(results);
  });
});

// Obter veículo por ID
router.get('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  db.query('SELECT * FROM vehicles WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('Erro ao obter veículo:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Veículo não encontrado' });
    }
    
    res.json(results[0]);
  });
});

// Obter veículo por placa
router.get('/plate/:plate', authMiddleware, (req, res) => {
  const { plate } = req.params;
  
  db.query('SELECT * FROM vehicles WHERE license_plate = ?', [plate], (err, results) => {
    if (err) {
      console.error('Erro ao obter veículo por placa:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Veículo não encontrado' });
    }
    
    res.json(results[0]);
  });
});

// Obter veículos disponíveis
router.get('/status/available', authMiddleware, (req, res) => {
  db.query('SELECT * FROM vehicles WHERE status = "available" ORDER BY license_plate', (err, results) => {
    if (err) {
      console.error('Erro ao obter veículos disponíveis:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    res.json(results);
  });
});

// Criar novo veículo
router.post('/', authMiddleware, (req, res) => {
  const { license_plate, vehicle_type, brand, model, year, notes } = req.body;
  
  if (!license_plate || !vehicle_type) {
    return res.status(400).json({ message: 'Placa e tipo de veículo são obrigatórios' });
  }
  
  // Verificar se placa já está cadastrada
  db.query('SELECT id FROM vehicles WHERE license_plate = ?', [license_plate], (err, results) => {
    if (err) {
      console.error('Erro ao verificar placa do veículo:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    if (results.length > 0) {
      return res.status(400).json({ message: 'Placa já cadastrada para outro veículo' });
    }
    
    const newVehicle = {
      license_plate: license_plate.toUpperCase(),
      vehicle_type,
      brand: brand || null,
      model: model || null,
      year: year || null,
      status: 'available',
      notes: notes || null
    };
    
    db.query('INSERT INTO vehicles SET ?', newVehicle, (err, result) => {
      if (err) {
        console.error('Erro ao criar veículo:', err);
        return res.status(500).json({ message: 'Erro interno do servidor' });
      }
      
      res.status(201).json({
        id: result.insertId,
        ...newVehicle
      });
    });
  });
});

// Atualizar veículo
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { license_plate, vehicle_type, brand, model, year, status, notes } = req.body;
  
  if (!license_plate || !vehicle_type) {
    return res.status(400).json({ message: 'Placa e tipo de veículo são obrigatórios' });
  }
  
  // Verificar se placa já está cadastrada para outro veículo
  db.query('SELECT id FROM vehicles WHERE license_plate = ? AND id != ?', [license_plate, id], (err, results) => {
    if (err) {
      console.error('Erro ao verificar placa do veículo:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    if (results.length > 0) {
      return res.status(400).json({ message: 'Placa já cadastrada para outro veículo' });
    }
    
    const updateQuery = `
      UPDATE vehicles 
      SET license_plate = ?, vehicle_type = ?, brand = ?, model = ?, year = ?, status = ?, notes = ?
      WHERE id = ?
    `;
    
    db.query(updateQuery, [
      license_plate.toUpperCase(), 
      vehicle_type, 
      brand, 
      model, 
      year, 
      status || 'available', 
      notes, 
      id
    ], (err, result) => {
      if (err) {
        console.error('Erro ao atualizar veículo:', err);
        return res.status(500).json({ message: 'Erro interno do servidor' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Veículo não encontrado' });
      }
      
      res.json({
        id: parseInt(id),
        license_plate: license_plate.toUpperCase(),
        vehicle_type,
        brand,
        model,
        year,
        status: status || 'available',
        notes
      });
    });
  });
});

// Atualizar status do veículo
router.patch('/:id/status', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status || !['available', 'in_use', 'maintenance'].includes(status)) {
    return res.status(400).json({ message: 'Status inválido. Use: available, in_use ou maintenance' });
  }
  
  db.query('UPDATE vehicles SET status = ? WHERE id = ?', [status, id], (err, result) => {
    if (err) {
      console.error('Erro ao atualizar status do veículo:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Veículo não encontrado' });
    }
    
    res.json({
      id: parseInt(id),
      status,
      message: 'Status do veículo atualizado com sucesso'
    });
  });
});

// Excluir veículo
router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  // Verificar se veículo está associado a algum carregamento
  db.query('SELECT COUNT(*) as count FROM loadings WHERE vehicle_id = ?', [id], (err, results) => {
    if (err) {
      console.error('Erro ao verificar uso do veículo:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    if (results[0].count > 0) {
      return res.status(400).json({ 
        message: 'Este veículo está associado a carregamentos e não pode ser excluído'
      });
    }
    
    // Excluir veículo se não estiver em uso
    db.query('DELETE FROM vehicles WHERE id = ?', [id], (err, result) => {
      if (err) {
        console.error('Erro ao excluir veículo:', err);
        return res.status(500).json({ message: 'Erro interno do servidor' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Veículo não encontrado' });
      }
      
      res.json({ message: 'Veículo excluído com sucesso' });
    });
  });
});

// Obter histórico de carregamentos do veículo
router.get('/:id/loadings', authMiddleware, (req, res) => {
  const { id } = req.params;
  
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
      console.error('Erro ao obter histórico do veículo:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    
    res.json(results);
  });
});

module.exports = router;