import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authenticateToken, requireRole, requireFeature } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);
router.use(requireFeature('warranty'));

// Get all warranty claims
router.get('/', async (req, res) => {
  try {
    const [claims] = await pool.query(`
      SELECT w.*, pt.name as part_type_name, pt.part_number,
             u.display_name as assigned_to_name
      FROM warranty_claims w
      LEFT JOIN part_types pt ON w.part_type_id = pt.id
      LEFT JOIN users u ON w.assigned_to = u.id
      ORDER BY w.created_at DESC
    `);
    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch warranty claims' });
  }
});

// Get single claim
router.get('/:id', async (req, res) => {
  try {
    const [claims] = await pool.query('SELECT * FROM warranty_claims WHERE id = ?', [req.params.id]);
    if (claims.length === 0) {
      return res.status(404).json({ error: 'Warranty claim not found' });
    }
    res.json(claims[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch warranty claim' });
  }
});

// Create warranty claim (snake_case request body)
router.post('/', async (req, res) => {
  try {
    const {
      part_type_id,
      claim_number,
      customer_name,
      customer_contact,
      customer_email,
      customer_phone,
      quantity,
      failure_date,
      failure_description,
      failure_mode,
      serial_numbers,
      status,
      notes
    } = req.body;

    if (!failure_description || !String(failure_description).trim()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Description is required'
      });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO warranty_claims 
       (id, part_type_id, claim_number, customer_name, customer_contact, 
        customer_email, customer_phone, quantity, failure_date, failure_description, 
        failure_mode, serial_numbers, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        part_type_id || null,
        claim_number || null,
        customer_name || '',
        customer_contact || '',
        customer_email || '',
        customer_phone || '',
        quantity || 1,
        failure_date || null,
        failure_description,
        failure_mode || '',
        serial_numbers || '',
        status || 'open',
        req.user.userId
      ]
    );

    const [newClaim] = await pool.query('SELECT * FROM warranty_claims WHERE id = ?', [id]);
    res.status(201).json(newClaim[0]);
  } catch (error) {
    console.error('Create warranty claim error:', error);
    res.status(500).json({ error: 'Failed to create warranty claim' });
  }
});

// Update warranty claim (snake_case request body)
router.put('/:id', async (req, res) => {
  try {
    const {
      status,
      resolution,
      credit_amount,
      replacement_shipped,
      assigned_to
    } = req.body;

    const closed_at = status === 'closed' ? new Date() : null;

    await pool.query(
      `UPDATE warranty_claims 
       SET status = COALESCE(?, status),
           resolution = COALESCE(?, resolution),
           credit_amount = COALESCE(?, credit_amount),
           replacement_shipped = COALESCE(?, replacement_shipped),
           assigned_to = COALESCE(?, assigned_to),
           closed_at = COALESCE(?, closed_at)
       WHERE id = ?`,
      [
        status,
        resolution || '',
        credit_amount || null,
        replacement_shipped || false,
        assigned_to || null,
        closed_at,
        req.params.id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM warranty_claims WHERE id = ?', [req.params.id]);
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Warranty claim not found' });
    }
    res.json(updated[0]);
  } catch (error) {
    console.error('Update warranty claim error:', error);
    res.status(500).json({ error: 'Failed to update warranty claim' });
  }
});

// Delete warranty claim
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM warranty_claims WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete warranty claim' });
  }
});

export default router;
