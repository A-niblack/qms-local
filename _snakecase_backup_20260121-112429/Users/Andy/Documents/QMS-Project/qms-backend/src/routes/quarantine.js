import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get all quarantine batches
router.get('/', async (req, res) => {
  try {
    const [batches] = await pool.query(`
      SELECT q.*, 
             s.shipment_number, s.supplier,
             pt.name as part_type_name,
             u.display_name as created_by_name
      FROM quarantine_batches q
      LEFT JOIN shipments s ON q.shipment_id = s.id
      LEFT JOIN part_types pt ON s.part_type_id = pt.id
      LEFT JOIN users u ON q.created_by = u.id
      ORDER BY q.created_at DESC
    `);
    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quarantine batches' });
  }
});

// Get single batch
router.get('/:id', async (req, res) => {
  try {
    const [batches] = await pool.query('SELECT * FROM quarantine_batches WHERE id = ?', [req.params.id]);
    if (batches.length === 0) {
      return res.status(404).json({ error: 'Quarantine batch not found' });
    }
    res.json(batches[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quarantine batch' });
  }
});

// Create quarantine batch
router.post('/', async (req, res) => {
  try {
    const { shipmentId, inspectionId, quarantineNumber, quantity, reason, defectType, location } = req.body;
    
    const id = uuidv4();
    await pool.query(
      `INSERT INTO quarantine_batches (id, shipment_id, inspection_id, quarantine_number, quantity, reason, defect_type, location, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, shipmentId, inspectionId || null, quarantineNumber || null, quantity, reason, defectType || '', location || '', req.user.userId]
    );

    const [newBatch] = await pool.query('SELECT * FROM quarantine_batches WHERE id = ?', [id]);
    res.status(201).json(newBatch[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create quarantine batch' });
  }
});

// Update quarantine batch (disposition)
router.put('/:id', requireRole('admin', 'engineer'), async (req, res) => {
  try {
    const { disposition, dispositionNotes } = req.body;
    
    await pool.query(
      `UPDATE quarantine_batches SET disposition = ?, disposition_notes = ?, disposition_by = ?, disposition_date = NOW()
       WHERE id = ?`,
      [disposition, dispositionNotes || '', req.user.userId, req.params.id]
    );

    const [updated] = await pool.query('SELECT * FROM quarantine_batches WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quarantine batch' });
  }
});

export default router;
