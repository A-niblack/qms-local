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
// Update the POST route to handle frontend field names
router.post('/', async (req, res) => {
  try {
    const { 
      partTypeId, 
      claimNumber, 
      customerName, 
      customerContact, 
      customerEmail, 
      customerPhone, 
      quantity, 
      failureDate,
      purchaseDate,
      description,        // Frontend sends this
      failureDescription, // Backend originally expected this
      failureMode, 
      serialNumber,       // Frontend sends singular
      serialNumbers,      // Backend expected plural
      rootCause,
      correctiveAction,
      resolution,
      priority,
      status,
      cost,
      images,
      attachments,
      notes
    } = req.body;
    
    // Use description or failureDescription
    const failureDesc = description || failureDescription;
    
    if (!failureDesc) {
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
        partTypeId || null, 
        claimNumber || null, 
        customerName || '', 
        customerContact || '', 
        customerEmail || '',
        customerPhone || '', 
        quantity || 1, 
        failureDate || null, 
        failureDesc,
        failureMode || '',
        serialNumber || serialNumbers || '', 
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
