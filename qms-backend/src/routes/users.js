import express from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);
router.use(requireRole('admin'));

// Get all users (admin only)
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT id, email, display_name, role, tier, is_active, last_login, created_at
      FROM users
      ORDER BY display_name
    `);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, display_name, role, tier, is_active, last_login, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user (admin only) - expects snake_case
router.post('/', async (req, res) => {
  try {
    const { email, password, display_name, role, tier } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (id, email, password_hash, display_name, role, tier)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, email.toLowerCase(), passwordHash, display_name || '', role || 'inspector', tier || 'free']
    );

    const [newUser] = await pool.query(
      'SELECT id, email, display_name, role, tier, created_at FROM users WHERE id = ?',
      [id]
    );
    res.status(201).json(newUser[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin only) - expects snake_case
router.put('/:id', async (req, res) => {
  try {
    const { display_name, role, tier, is_active } = req.body;

    // Check user exists
    const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.query(
      `UPDATE users 
       SET display_name = COALESCE(?, display_name),
           role = COALESCE(?, role),
           tier = COALESCE(?, tier),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [display_name, role, tier, is_active, req.params.id]
    );

    const [updated] = await pool.query(
      'SELECT id, email, display_name, role, tier, is_active, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Reset user password (admin only)
router.put('/:id/password', async (req, res) => {
  try {
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.params.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
