import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get all shipments
router.get('/', async (req, res) => {
  try {
    const [shipments] = await pool.query(`
      SELECT s.*, pt.name as part_type_name, pt.part_number,
             u.display_name as created_by_name
      FROM shipments s
      LEFT JOIN part_types pt ON s.part_type_id = pt.id
      LEFT JOIN users u ON s.created_by = u.id
      ORDER BY s.created_at DESC
    `);
    res.json(shipments);
  } catch (error) {
    console.error('Get shipments error:', error);
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
});

// Get single shipment
router.get('/:id', async (req, res) => {
  try {
    const [shipments] = await pool.query(`
      SELECT s.*, pt.name as part_type_name, pt.part_number
      FROM shipments s
      LEFT JOIN part_types pt ON s.part_type_id = pt.id
      WHERE s.id = ?
    `, [req.params.id]);
    
    if (shipments.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    res.json(shipments[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipment' });
  }
});

// Create shipment (snake_case request body)
router.post('/', async (req, res) => {
  try {
    const {
      part_type_id,
      shipment_number,
      supplier,
      supplier_lot,
      quantity,
      received_date,
      po_number,
      notes
    } = req.body;
    
    if (!part_type_id || !quantity) {
      return res.status(400).json({ error: 'Part type and quantity are required' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO shipments (id, part_type_id, shipment_number, supplier, supplier_lot, quantity, received_date, po_number, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        part_type_id,
        shipment_number || null,
        supplier || '',
        supplier_lot || '',
        quantity,
        received_date || null,
        po_number || '',
        notes || '',
        req.user.userId
      ]
    );

    const [newShipment] = await pool.query('SELECT * FROM shipments WHERE id = ?', [id]);
    res.status(201).json(newShipment[0]);
  } catch (error) {
    console.error('Create shipment error:', error);
    res.status(500).json({ error: 'Failed to create shipment' });
  }
});

// Update shipment (snake_case request body)
router.put('/:id', async (req, res) => {
  try {
    const {
      part_type_id,
      shipment_number,
      supplier,
      supplier_lot,
      quantity,
      quantity_received,
      received_date,
      po_number,
      status,
      notes
    } = req.body;

    // Check shipment exists
    const [existing] = await pool.query('SELECT id FROM shipments WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    await pool.query(
      `UPDATE shipments 
       SET part_type_id = COALESCE(?, part_type_id), 
           shipment_number = COALESCE(?, shipment_number), 
           supplier = COALESCE(?, supplier), 
           supplier_lot = COALESCE(?, supplier_lot), 
           quantity = COALESCE(?, quantity), 
           quantity_received = COALESCE(?, quantity_received), 
           received_date = COALESCE(?, received_date), 
           po_number = COALESCE(?, po_number), 
           status = COALESCE(?, status), 
           notes = COALESCE(?, notes)
       WHERE id = ?`,
      [
        part_type_id,
        shipment_number,
        supplier,
        supplier_lot,
        quantity,
        quantity_received,
        received_date,
        po_number,
        status,
        notes,
        req.params.id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM shipments WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update shipment error:', error);
    res.status(500).json({ error: 'Failed to update shipment' });
  }
});

// Delete shipment
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM shipments WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete shipment' });
  }
});

export default router;
