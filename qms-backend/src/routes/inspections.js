import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get all inspections
router.get('/', async (req, res) => {
  try {
    const [inspections] = await pool.query(`
      SELECT i.*, 
             s.shipment_number, s.supplier,
             pt.name as part_type_name, pt.part_number,
             u.display_name as inspector_name
      FROM inspections i
      LEFT JOIN shipments s ON i.shipment_id = s.id
      LEFT JOIN part_types pt ON s.part_type_id = pt.id
      LEFT JOIN users u ON i.inspector_id = u.id
      ORDER BY i.created_at DESC
    `);
    res.json(inspections);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inspections' });
  }
});

// Get single inspection
router.get('/:id', async (req, res) => {
  try {
    const [inspections] = await pool.query(`
      SELECT i.*, s.shipment_number, pt.name as part_type_name
      FROM inspections i
      LEFT JOIN shipments s ON i.shipment_id = s.id
      LEFT JOIN part_types pt ON s.part_type_id = pt.id
      WHERE i.id = ?
    `, [req.params.id]);
    
    if (inspections.length === 0) {
      return res.status(404).json({ error: 'Inspection not found' });
    }
    res.json(inspections[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inspection' });
  }
});

// Create inspection
router.post('/', async (req, res) => {
  try {
    const { shipmentId, inspectionPlanId, inspectionType, sampleSize, results, notes } = req.body;
    
    const id = uuidv4();
    await pool.query(
      `INSERT INTO inspections (id, shipment_id, inspection_plan_id, inspector_id, inspection_type, sample_size, results, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, shipmentId, inspectionPlanId || null, req.user.userId, inspectionType || 'incoming', sampleSize || 5, JSON.stringify(results || {}), notes || '']
    );

    const [newInspection] = await pool.query('SELECT * FROM inspections WHERE id = ?', [id]);
    res.status(201).json(newInspection[0]);
  } catch (error) {
    console.error('Create inspection error:', error);
    res.status(500).json({ error: 'Failed to create inspection' });
  }
});

// Update inspection
router.put('/:id', async (req, res) => {
  try {
    const { results, defectsFound, status, disposition, notes } = req.body;
    
    const completedAt = status === 'passed' || status === 'failed' ? new Date() : null;
    
    await pool.query(
      `UPDATE inspections SET results = ?, defects_found = ?, status = ?, disposition = ?, notes = ?, completed_at = ?
       WHERE id = ?`,
      [JSON.stringify(results || {}), defectsFound || 0, status, disposition, notes, completedAt, req.params.id]
    );

    // Update shipment status if inspection is complete
    if (status === 'passed' || status === 'failed') {
      const [inspection] = await pool.query('SELECT shipment_id FROM inspections WHERE id = ?', [req.params.id]);
      if (inspection.length > 0) {
        await pool.query(
          'UPDATE shipments SET status = ? WHERE id = ?',
          [status === 'passed' ? 'approved' : 'rejected', inspection[0].shipment_id]
        );
      }
    }

    const [updated] = await pool.query('SELECT * FROM inspections WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update inspection' });
  }
});

export default router;
