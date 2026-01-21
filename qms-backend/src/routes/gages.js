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
    console.error('Get gages error:', error);
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
    console.error('Get gage error:', error);
    res.status(500).json({ error: 'Failed to fetch gage' });
  }
});

// Create gage (snake_case request body)
router.post('/', requireRole('admin', 'engineer'), async (req, res) => {
  try {
    const {
      gage_id,
      name,
      description,
      type,
      manufacturer,
      model_number,
      serial_number,
      range_min,
      range_max,
      resolution,
      units,
      accuracy,
      calibration_date,
      next_calibration_date,
      calibration_interval_days,
      calibration_provider,
      certificate_number,
      location,
      assigned_to,
      status,
      notes
    } = req.body;

    if (!gage_id || !name) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'gage_id and name are required'
      });
    }

    const id = uuidv4();

    // If next_calibration_date not provided, compute from calibration_date + interval days
    const nextCalDate =
      next_calibration_date
        ? next_calibration_date
        : (calibration_date && calibration_interval_days
            ? new Date(new Date(calibration_date).getTime() + Number(calibration_interval_days) * 86400000)
                .toISOString()
                .slice(0, 10)
            : null);

    await pool.query(
      `
      INSERT INTO gages
        (id, gage_id, name, description, type, manufacturer, model_number,
         serial_number, range_min, range_max, resolution, units, accuracy, calibration_date,
         next_calibration_date, calibration_interval_days, calibration_provider, certificate_number,
         location, assigned_to, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        gage_id,
        name,
        description || '',
        type || '',
        manufacturer || '',
        model_number || '',
        serial_number || '',
        range_min ?? null,
        range_max ?? null,
        resolution ?? null,
        units || '',
        accuracy || '',
        calibration_date || null,
        nextCalDate,
        calibration_interval_days ?? 365,
        calibration_provider || '',
        certificate_number || '',
        location || '',
        assigned_to || null,
        status || 'active',
        notes || ''
      ]
    );

    const [newGage] = await pool.query('SELECT * FROM gages WHERE id = ?', [id]);
    res.status(201).json(newGage[0]);
  } catch (error) {
    console.error('Create gage error:', error);
    res.status(500).json({ error: 'Failed to create gage' });
  }
});

// Update gage (snake_case request body)
router.put('/:id', requireRole('admin', 'engineer'), async (req, res) => {
  try {
    const {
      gage_id,
      name,
      description,
      type,
      manufacturer,
      model_number,
      serial_number,
      range_min,
      range_max,
      resolution,
      units,
      accuracy,
      calibration_date,
      next_calibration_date,
      calibration_interval_days,
      calibration_provider,
      certificate_number,
      location,
      assigned_to,
      status,
      notes
    } = req.body;

    const nextCalDate =
      next_calibration_date
        ? next_calibration_date
        : (calibration_date && calibration_interval_days
            ? new Date(new Date(calibration_date).getTime() + Number(calibration_interval_days) * 86400000)
                .toISOString()
                .slice(0, 10)
            : null);

    await pool.query(
      `
      UPDATE gages
      SET gage_id = ?,
          name = ?,
          description = ?,
          type = ?,
          manufacturer = ?,
          model_number = ?,
          serial_number = ?,
          range_min = ?,
          range_max = ?,
          resolution = ?,
          units = ?,
          accuracy = ?,
          calibration_date = ?,
          next_calibration_date = ?,
          calibration_interval_days = ?,
          calibration_provider = ?,
          certificate_number = ?,
          location = ?,
          assigned_to = ?,
          status = ?,
          notes = ?
      WHERE id = ?
      `,
      [
        gage_id,
        name,
        description || '',
        type || '',
        manufacturer || '',
        model_number || '',
        serial_number || '',
        range_min ?? null,
        range_max ?? null,
        resolution ?? null,
        units || '',
        accuracy || '',
        calibration_date || null,
        nextCalDate,
        calibration_interval_days ?? 365,
        calibration_provider || '',
        certificate_number || '',
        location || '',
        assigned_to || null,
        status || 'active',
        notes || '',
        req.params.id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM gages WHERE id = ?', [req.params.id]);
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Gage not found' });
    }
    res.json(updated[0]);
  } catch (error) {
    console.error('Update gage error:', error);
    res.status(500).json({ error: 'Failed to update gage' });
  }
});

// Delete gage
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM gages WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    console.error('Delete gage error:', error);
    res.status(500).json({ error: 'Failed to delete gage' });
  }
});

export default router;
