import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authenticateToken, requireRole, getTierLimits } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/part-types
 * Get all part types
 */
router.get('/', async (req, res) => {
  try {
    const [partTypes] = await pool.query(`
      SELECT
        pt.*,
        u.display_name as created_by_name,
        (SELECT COUNT(*) FROM inspection_plans WHERE part_type_id = pt.id) as plan_count,
        (SELECT COUNT(*) FROM shipments WHERE part_type_id = pt.id) as shipment_count
      FROM part_types pt
      LEFT JOIN users u ON pt.created_by = u.id
      ORDER BY pt.name
    `);

    res.json(partTypes);
  } catch (error) {
    console.error('Get part types error:', error);
    res.status(500).json({ error: 'Failed to fetch part types' });
  }
});

/**
 * GET /api/part-types/:id
 * Get single part type by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const [partTypes] = await pool.query(
      `
      SELECT
        pt.*,
        u.display_name as created_by_name
      FROM part_types pt
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE pt.id = ?
      `,
      [req.params.id]
    );

    if (partTypes.length === 0) {
      return res.status(404).json({ error: 'Part type not found' });
    }

    res.json(partTypes[0]);
  } catch (error) {
    console.error('Get part type error:', error);
    res.status(500).json({ error: 'Failed to fetch part type' });
  }
});

/**
 * POST /api/part-types
 * Create new part type (admin only)
 * Snake_case request body
 */
router.post('/', requireRole('admin'), getTierLimits, async (req, res) => {
  try {
    const {
      part_number,
      name,
      description,
      category,
      // present in some UIs but NOT in your schema migration; ignore safely
      supplier,
      revision,
      drawing_number,
      drawing_url,
      drawing_file_name,
      is_active
    } = req.body;

    if (!part_number) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Part number is required'
      });
    }

    // Check tier limit
    const [countResult] = await pool.query('SELECT COUNT(*) as count FROM part_types WHERE is_active = TRUE');
    const currentCount = countResult[0].count;
    const limit = req.tierLimits.maxPartTypes;

    if (limit !== -1 && currentCount >= limit) {
      return res.status(403).json({
        error: 'Tier limit reached',
        message: `Your ${req.user.tier} plan allows ${limit} part types. Please upgrade to add more.`,
        currentCount,
        limit,
        upgradeRequired: true
      });
    }

    const partName = name || part_number;

    // Check for duplicate part number
    const [existing] = await pool.query(
      'SELECT id FROM part_types WHERE part_number = ?',
      [part_number]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: 'Duplicate entry',
        message: 'A part type with this part number already exists'
      });
    }

    const id = uuidv4();

    await pool.query(
      `
      INSERT INTO part_types (id, part_number, name, description, category, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        part_number,
        partName,
        description || '',
        category || '',
        is_active !== false,
        req.user.userId
      ]
    );

    const [newPartType] = await pool.query('SELECT * FROM part_types WHERE id = ?', [id]);
    res.status(201).json(newPartType[0]);
  } catch (error) {
    console.error('Create part type error:', error);
    res.status(500).json({ error: 'Failed to create part type' });
  }
});

/**
 * PUT /api/part-types/:id
 * Update part type (admin only)
 * Snake_case request body
 */
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { part_number, name, description, category, is_active } = req.body;

    const [existing] = await pool.query('SELECT id FROM part_types WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Part type not found' });
    }

    await pool.query(
      `
      UPDATE part_types
      SET part_number = ?,
          name = ?,
          description = ?,
          category = ?,
          is_active = ?
      WHERE id = ?
      `,
      [
        part_number,
        name,
        description || '',
        category || '',
        is_active !== false,
        req.params.id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM part_types WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update part type error:', error);
    res.status(500).json({ error: 'Failed to update part type' });
  }
});

/**
 * DELETE /api/part-types/:id
 * Delete part type (admin only)
 */
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const [relatedShipments] = await pool.query(
      'SELECT COUNT(*) as count FROM shipments WHERE part_type_id = ?',
      [req.params.id]
    );

    if (relatedShipments[0].count > 0) {
      return res.status(400).json({
        error: 'Cannot delete',
        message: 'This part type has associated shipments. Deactivate it instead.'
      });
    }

    await pool.query('DELETE FROM part_types WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    console.error('Delete part type error:', error);
    res.status(500).json({ error: 'Failed to delete part type' });
  }
});

export default router;
