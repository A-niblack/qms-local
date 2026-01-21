import express from 'express';
import cors from 'cors';
import 'dotenv/config';

// Import database connection
import pool, { testConnection } from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import partTypeRoutes from './routes/partTypes.js';
import shipmentRoutes from './routes/shipments.js';
import inspectionRoutes from './routes/inspections.js';
import quarantineRoutes from './routes/quarantine.js';
import warrantyRoutes from './routes/warranty.js';
import gageRoutes from './routes/gages.js';
import userRoutes from './routes/users.js';
import inspectionPlanRoutes from './routes/inspectionPlans.js';

// Create Express app
const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================

// Enable CORS (Cross-Origin Resource Sharing)
// This allows your frontend to make requests to this API
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Request logging (helpful for debugging)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ==========================================
// ROUTES
// ==========================================

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/part-types', partTypeRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/quarantine', quarantineRoutes);
app.use('/api/warranty', warrantyRoutes);
app.use('/api/gages', gageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inspection-plans', inspectionPlanRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler - route not found
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    message: `The endpoint ${req.method} ${req.path} does not exist`,
    availableEndpoints: [
      'GET  /api/health',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET  /api/auth/me',
      'GET  /api/part-types',
      'GET  /api/shipments',
      'GET  /api/inspections',
      'GET  /api/quarantine',
      'GET  /api/warranty',
      'GET  /api/gages',
      'GET  /api/users'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  // Test database connection first
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('\n⚠️  Warning: Could not connect to database');
    console.error('    Make sure MySQL is running: docker start qms-mysql\n');
  }

  app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('  QMS Backend API Server');
    console.log('========================================\n');
    console.log(`  🚀 Server:     http://localhost:${PORT}`);
    console.log(`  📋 Health:     http://localhost:${PORT}/api/health`);
    console.log(`  🔑 Login:      POST http://localhost:${PORT}/api/auth/login`);
    console.log(`  📦 Part Types: http://localhost:${PORT}/api/part-types`);
    console.log('\n  Default admin credentials:');
    console.log('    Email:    admin@qms.local');
    console.log('    Password: admin123\n');
    console.log('========================================\n');
  });
};

startServer();
