// qms-backend/src/routes/quarantine.js
// SNAKE_CASE + STATUS WORKFLOW ALIGNED WITH DB (run.js)

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

const FINAL_STATUSES = new Set(['released', 'scrapped', 'returned']);
const WORKFLOW_STATUSES = new Set(['pending', 'under-review', 'disposition', 'released', 'scrapped', 'returned']);

// Get all quarantine batches
router.get('/', async (req, res) => {
  try {
    const [batches] = await pool.query(`
      SELECT q.*,
             s.shipment_number,
             s.supplier,
             s.part_type_id,
             pt.part_number,
             pt.name AS part_type_name,
             u.display_name AS created_by_name
      FROM quarantine_batches q
      LEFT JOIN shipments s ON q.shipment_id = s.id
      LEFT JOIN part_types pt ON s.part_type_id = pt.id
      LEFT JOIN users u ON q.created_by = u.id
      ORDER BY q.created_at DESC
    `);

    res.json(batches);
  } catch (error) {
    console.error('Get quarantine batches error:', error);
    res.status(500).json({ error: 'Failed to fetch quarantine batches' });
  }
});

// Get single batch
router.get('/:id', async (req, res) => {
  try {
    const [batches] = await pool.query(
      `
      SELECT q.*,
             s.shipment_number,
             s.supplier,
             s.part_type_id,
             pt.part_number,
             pt.name AS part_type_name,
             u.display_name AS created_by_name
      FROM quarantine_batches q
      LEFT JOIN shipments s ON q.shipment_id = s.id
      LEFT JOIN part_types pt ON s.part_type_id = pt.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE q.id = ?
      `,
      [req.params.id]
    );

    if (batches.length === 0) {
      return res.status(404).json({ error: 'Quarantine batch not found' });
    }

    res.json(batches[0]);
  } catch (error) {
    console.error('Get quarantine batch error:', error);
    res.status(500).json({ error: 'Failed to fetch quarantine batch' });
  }
});

// Create quarantine batch (snake_case request body)
router.post('/', async (req, res) => {
  try {
    const {
      shipment_id,
      inspection_id,
      quarantine_number,
      quantity,
      reason,
      defect_type,
      location,
      notes
    } = req.body;

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'Validation failed', message: 'reason is required' });
    }
    if (quantity == null || Number.isNaN(Number(quantity))) {
      return res.status(400).json({ error: 'Validation failed', message: 'quantity is required' });
    }

    const id = uuidv4();

    await pool.query(
      `
      INSERT INTO quarantine_batches
        (id, shipment_id, inspection_id, quarantine_number, quantity, reason, defect_type,
         location, notes, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        shipment_id || null,
        inspection_id || null,
        quarantine_number || null,
        Number(quantity),
        reason,
        defect_type || '',
        location || '',
        notes || '',
        'pending',
        req.user.userId
      ]
    );

    const [newBatch] = await pool.query('SELECT * FROM quarantine_batches WHERE id = ?', [id]);
    res.status(201).json(newBatch[0]);
  } catch (error) {
    console.error('Create quarantine batch error:', error);
    res.status(500).json({ error: 'Failed to create quarantine batch' });
  }
});

// Update quarantine batch status + (optional) disposition notes when final
router.put('/:id', requireRole('admin', 'engineer'), async (req, res) => {
  try {
    const { status, disposition_notes } = req.body;

    if (!status || !WORKFLOW_STATUSES.has(status)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: `status must be one of: ${Array.from(WORKFLOW_STATUSES).join(', ')}`
      });
    }

    const isFinal = FINAL_STATUSES.has(status);

    await pool.query(
      `
      UPDATE quarantine_batches
      SET status = ?,
          disposition = CASE WHEN ? THEN ? ELSE disposition END,
          disposition_notes = CASE WHEN ? THEN ? ELSE disposition_notes END,
          disposition_by = CASE WHEN ? THEN ? ELSE disposition_by END,
          disposition_date = CASE WHEN ? THEN NOW() ELSE disposition_date END
      WHERE id = ?
      `,
      [
        status,
        isFinal, status,
        isFinal, disposition_notes || '',
        isFinal, req.user.userId,
        isFinal,
        req.params.id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM quarantine_batches WHERE id = ?', [req.params.id]);
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Quarantine batch not found' });
    }

    res.json(updated[0]);
  } catch (error) {
    console.error('Update quarantine batch error:', error);
    res.status(500).json({ error: 'Failed to update quarantine batch' });
  }
});

// Delete quarantine batch
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM quarantine_batches WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    console.error('Delete quarantine batch error:', error);
    res.status(500).json({ error: 'Failed to delete quarantine batch' });
  }
});

export default router;
