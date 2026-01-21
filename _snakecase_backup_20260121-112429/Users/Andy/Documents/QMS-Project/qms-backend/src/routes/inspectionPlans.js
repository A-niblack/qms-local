import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get all inspection plans
router.get('/', async (req, res) => {
  try {
    const [plans] = await pool.query(`
      SELECT ip.*, pt.name as part_type_name, pt.part_number,
             u.display_name as created_by_name
      FROM inspection_plans ip
      LEFT JOIN part_types pt ON ip.part_type_id = pt.id
      LEFT JOIN users u ON ip.created_by = u.id
      ORDER BY ip.created_at DESC
    `);
    
    // Parse JSON criteria/characteristics
    const parsedPlans = plans.map(plan => ({
      ...plan,
      criteria: plan.criteria ? JSON.parse(plan.criteria) : [],
      characteristics: plan.criteria ? JSON.parse(plan.criteria) : [] // alias for frontend
    }));
    
    res.json(parsedPlans);
  } catch (error) {
    console.error('Get inspection plans error:', error);
    res.status(500).json({ error: 'Failed to fetch inspection plans' });
  }
});

// Get single plan
router.get('/:id', async (req, res) => {
  try {
    const [plans] = await pool.query('SELECT * FROM inspection_plans WHERE id = ?', [req.params.id]);
    if (plans.length === 0) {
      return res.status(404).json({ error: 'Inspection plan not found' });
    }
    
    const plan = plans[0];
    plan.criteria = plan.criteria ? JSON.parse(plan.criteria) : [];
    plan.characteristics = plan.criteria;
    
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inspection plan' });
  }
});

// Create inspection plan
router.post('/', requireRole('admin', 'engineer'), async (req, res) => {
  try {
    const { 
      partTypeId, 
      name, 
      description, 
      sampleSizeFormula,
      defaultSampleSize,
      characteristics,
      isActive 
    } = req.body;
    
    if (!partTypeId || !name) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: 'Part type and plan name are required' 
      });
    }

    const id = uuidv4();
    const criteria = JSON.stringify(characteristics || []);
    
    await pool.query(
      `INSERT INTO inspection_plans 
       (id, part_type_id, name, description, criteria, sample_size, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        partTypeId, 
        name, 
        description || '', 
        criteria,
        defaultSampleSize || 5,
        isActive !== false,
        req.user.userId
      ]
    );

    const [newPlan] = await pool.query('SELECT * FROM inspection_plans WHERE id = ?', [id]);
    const plan = newPlan[0];
    plan.criteria = plan.criteria ? JSON.parse(plan.criteria) : [];
    plan.characteristics = plan.criteria;
    
    res.status(201).json(plan);
  } catch (error) {
    console.error('Create inspection plan error:', error);
    res.status(500).json({ error: 'Failed to create inspection plan' });
  }
});

// Update inspection plan
router.put('/:id', requireRole('admin', 'engineer'), async (req, res) => {
  try {
    const { 
      name, 
      description, 
      sampleSizeFormula,
      defaultSampleSize,
      characteristics,
      isActive 
    } = req.body;
    
    const criteria = JSON.stringify(characteristics || []);
    
    await pool.query(
      `UPDATE inspection_plans 
       SET name = ?, description = ?, criteria = ?, sample_size = ?, is_active = ?
       WHERE id = ?`,
      [
        name, 
        description || '', 
        criteria,
        defaultSampleSize || 5,
        isActive !== false,
        req.params.id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM inspection_plans WHERE id = ?', [req.params.id]);
    const plan = updated[0];
    plan.criteria = plan.criteria ? JSON.parse(plan.criteria) : [];
    plan.characteristics = plan.criteria;
    
    res.json(plan);
  } catch (error) {
    console.error('Update inspection plan error:', error);
    res.status(500).json({ error: 'Failed to update inspection plan' });
  }
});

// Delete inspection plan
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM inspection_plans WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete inspection plan' });
  }
});

export default router;
