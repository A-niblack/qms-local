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

// Create warranty claim
router.post('/', async (req, res) => {
  try {
    const { partTypeId, claimNumber, customerName, customerContact, customerEmail, customerPhone, 
            quantity, failureDate, failureDescription, failureMode, serialNumbers } = req.body;
    
    const id = uuidv4();
    await pool.query(
      `INSERT INTO warranty_claims (id, part_type_id, claim_number, customer_name, customer_contact, 
       customer_email, customer_phone, quantity, failure_date, failure_description, failure_mode, 
       serial_numbers, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, partTypeId, claimNumber || null, customerName, customerContact || '', customerEmail || '',
       customerPhone || '', quantity || 1, failureDate || null, failureDescription, failureMode || '',
       serialNumbers || '', req.user.userId]
    );

    const [newClaim] = await pool.query('SELECT * FROM warranty_claims WHERE id = ?', [id]);
    res.status(201).json(newClaim[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create warranty claim' });
  }
});

// Update warranty claim
router.put('/:id', async (req, res) => {
  try {
    const { status, resolution, creditAmount, replacementShipped, assignedTo } = req.body;
    
    const closedAt = status === 'closed' ? new Date() : null;
    
    await pool.query(
      `UPDATE warranty_claims SET status = ?, resolution = ?, credit_amount = ?, 
       replacement_shipped = ?, assigned_to = ?, closed_at = ?
       WHERE id = ?`,
      [status, resolution || '', creditAmount || null, replacementShipped || false, assignedTo || null, closedAt, req.params.id]
    );

    const [updated] = await pool.query('SELECT * FROM warranty_claims WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update warranty claim' });
  }
});

export default router;
