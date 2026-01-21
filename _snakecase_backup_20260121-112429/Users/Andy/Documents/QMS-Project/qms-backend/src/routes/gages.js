import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get all gages
router.get('/', async (req, res) => {
  try {
    const [gages] = await pool.query(`
      SELECT g.*, u.display_name as assigned_to_name
      FROM gages g
      LEFT JOIN users u ON g.assigned_to = u.id
      ORDER BY g.name
    `);
    res.json(gages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch gages' });
  }
});

// Get single gage
router.get('/:id', async (req, res) => {
  try {
    const [gages] = await pool.query('SELECT * FROM gages WHERE id = ?', [req.params.id]);
    if (gages.length === 0) {
      return res.status(404).json({ error: 'Gage not found' });
    }
    res.json(gages[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch gage' });
  }
});

// Create gage
router.post('/', requireRole('admin', 'engineer'), async (req, res) => {
  try {
    const { gageId, name, description, type, manufacturer, modelNumber, serialNumber,
            rangeMin, rangeMax, resolution, units, accuracy, calibrationDate, 
            calibrationIntervalDays, calibrationProvider, location, assignedTo } = req.body;
    
    const id = uuidv4();
    const nextCalDate = calibrationDate && calibrationIntervalDays 
      ? new Date(new Date(calibrationDate).getTime() + calibrationIntervalDays * 24 * 60 * 60 * 1000)
      : null;
    
    await pool.query(
      `INSERT INTO gages (id, gage_id, name, description, type, manufacturer, model_number, 
       serial_number, range_min, range_max, resolution, units, accuracy, calibration_date, 
       next_calibration_date, calibration_interval_days, calibration_provider, location, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, gageId, name, description || '', type || '', manufacturer || '', modelNumber || '',
       serialNumber || '', rangeMin || null, rangeMax || null, resolution || null, units || '',
       accuracy || '', calibrationDate || null, nextCalDate, calibrationIntervalDays || 365,
       calibrationProvider || '', location || '', assignedTo || null]
    );

    const [newGage] = await pool.query('SELECT * FROM gages WHERE id = ?', [id]);
    res.status(201).json(newGage[0]);
  } catch (error) {
    console.error('Create gage error:', error);
    res.status(500).json({ error: 'Failed to create gage' });
  }
});

// Update gage
router.put('/:id', requireRole('admin', 'engineer'), async (req, res) => {
  try {
    const { gageId, name, description, type, manufacturer, modelNumber, serialNumber,
            rangeMin, rangeMax, resolution, units, accuracy, calibrationDate, 
            calibrationIntervalDays, calibrationProvider, certificateNumber, location, 
            assignedTo, status, notes } = req.body;
    
    const nextCalDate = calibrationDate && calibrationIntervalDays 
      ? new Date(new Date(calibrationDate).getTime() + calibrationIntervalDays * 24 * 60 * 60 * 1000)
      : null;
    
    await pool.query(
      `UPDATE gages SET gage_id = ?, name = ?, description = ?, type = ?, manufacturer = ?, 
       model_number = ?, serial_number = ?, range_min = ?, range_max = ?, resolution = ?, 
       units = ?, accuracy = ?, calibration_date = ?, next_calibration_date = ?, 
       calibration_interval_days = ?, calibration_provider = ?, certificate_number = ?,
       location = ?, assigned_to = ?, status = ?, notes = ?
       WHERE id = ?`,
      [gageId, name, description, type, manufacturer, modelNumber, serialNumber,
       rangeMin, rangeMax, resolution, units, accuracy, calibrationDate, nextCalDate,
       calibrationIntervalDays, calibrationProvider, certificateNumber, location, 
       assignedTo, status, notes, req.params.id]
    );

    const [updated] = await pool.query('SELECT * FROM gages WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update gage' });
  }
});

// Delete gage
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM gages WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete gage' });
  }
});

export default router;
