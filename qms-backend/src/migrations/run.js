import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

// SQL statements to create all tables
const createTablesSQL = `
-- =============================================
-- USERS TABLE
-- Stores all user accounts and their roles/tiers
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  role ENUM('admin', 'engineer', 'inspector', 'warranty_manager') DEFAULT 'inspector',
  tier ENUM('free', 'basic', 'professional', 'enterprise') DEFAULT 'free',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- PART TYPES TABLE
-- Master list of part types that can be inspected
-- =============================================
CREATE TABLE IF NOT EXISTS part_types (
  id VARCHAR(36) PRIMARY KEY,
  part_number VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- INSPECTION PLANS TABLE
-- Templates for how to inspect specific part types
-- =============================================
CREATE TABLE IF NOT EXISTS inspection_plans (
  id VARCHAR(36) PRIMARY KEY,
  part_type_id VARCHAR(36),
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) DEFAULT '1.0',
  description TEXT,
  criteria JSON,
  sample_size INT DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(36),
  approved_by VARCHAR(36),
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (part_type_id) REFERENCES part_types(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- SHIPMENTS TABLE
-- Incoming shipments of parts to be inspected
-- =============================================
CREATE TABLE IF NOT EXISTS shipments (
  id VARCHAR(36) PRIMARY KEY,
  part_type_id VARCHAR(36),
  shipment_number VARCHAR(100),
  supplier VARCHAR(255),
  supplier_lot VARCHAR(100),
  quantity INT NOT NULL,
  quantity_received INT,
  received_date DATE,
  po_number VARCHAR(100),
  status ENUM('pending', 'in_inspection', 'approved', 'rejected', 'partial') DEFAULT 'pending',
  notes TEXT,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (part_type_id) REFERENCES part_types(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- INSPECTIONS TABLE
-- Individual inspection records
-- =============================================
CREATE TABLE IF NOT EXISTS inspections (
  id VARCHAR(36) PRIMARY KEY,
  shipment_id VARCHAR(36),
  inspection_plan_id VARCHAR(36),
  inspector_id VARCHAR(36),
  inspection_type ENUM('incoming', 'in_process', 'final', 'audit') DEFAULT 'incoming',
  sample_size INT,
  results JSON,
  defects_found INT DEFAULT 0,
  status ENUM('in_progress', 'passed', 'failed', 'conditional') DEFAULT 'in_progress',
  disposition VARCHAR(255),
  notes TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
  FOREIGN KEY (inspection_plan_id) REFERENCES inspection_plans(id) ON DELETE SET NULL,
  FOREIGN KEY (inspector_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- QUARANTINE BATCHES TABLE
-- Parts that failed inspection and need disposition
-- =============================================
CREATE TABLE IF NOT EXISTS quarantine_batches (
  id VARCHAR(36) PRIMARY KEY,
  shipment_id VARCHAR(36),
  inspection_id VARCHAR(36),
  quarantine_number VARCHAR(100),
  quantity INT NOT NULL,
  reason TEXT NOT NULL,
  defect_type VARCHAR(255),
  disposition ENUM('pending', 'rework', 'scrap', 'return_to_supplier', 'use_as_is', 'sort') DEFAULT 'pending',
  disposition_notes TEXT,
  disposition_by VARCHAR(36),
  disposition_date TIMESTAMP NULL,
  location VARCHAR(255),
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE SET NULL,
  FOREIGN KEY (disposition_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- ENGINEERING TASKS TABLE
-- Engineering evaluations for quarantined parts
-- =============================================
CREATE TABLE IF NOT EXISTS engineering_tasks (
  id VARCHAR(36) PRIMARY KEY,
  quarantine_batch_id VARCHAR(36),
  task_number VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to VARCHAR(36),
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  evaluation TEXT,
  root_cause TEXT,
  corrective_action TEXT,
  recommendation ENUM('scrap', 'rework', 'return', 'use_as_is', 'pending') DEFAULT 'pending',
  status ENUM('open', 'in_progress', 'pending_review', 'completed', 'cancelled') DEFAULT 'open',
  due_date DATE,
  completed_at TIMESTAMP NULL,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (quarantine_batch_id) REFERENCES quarantine_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- WARRANTY CLAIMS TABLE
-- Customer warranty claims
-- =============================================
CREATE TABLE IF NOT EXISTS warranty_claims (
  id VARCHAR(36) PRIMARY KEY,
  claim_number VARCHAR(100) UNIQUE,
  part_type_id VARCHAR(36),
  customer_name VARCHAR(255) NOT NULL,
  customer_contact VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  quantity INT DEFAULT 1,
  failure_date DATE,
  failure_description TEXT NOT NULL,
  failure_mode VARCHAR(255),
  serial_numbers TEXT,
  photos JSON,
  status ENUM('open', 'investigating', 'pending_parts', 'approved', 'denied', 'closed') DEFAULT 'open',
  resolution TEXT,
  credit_amount DECIMAL(10, 2),
  replacement_shipped BOOLEAN DEFAULT FALSE,
  assigned_to VARCHAR(36),
  closed_at TIMESTAMP NULL,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (part_type_id) REFERENCES part_types(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- GAGES TABLE
-- Measuring instruments and calibration tracking
-- =============================================
CREATE TABLE IF NOT EXISTS gages (
  id VARCHAR(36) PRIMARY KEY,
  gage_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100),
  manufacturer VARCHAR(255),
  model_number VARCHAR(100),
  serial_number VARCHAR(100),
  range_min DECIMAL(15, 6),
  range_max DECIMAL(15, 6),
  resolution DECIMAL(15, 6),
  units VARCHAR(50),
  accuracy VARCHAR(100),
  calibration_date DATE,
  next_calibration_date DATE,
  calibration_interval_days INT DEFAULT 365,
  calibration_provider VARCHAR(255),
  certificate_number VARCHAR(100),
  location VARCHAR(255),
  assigned_to VARCHAR(36),
  status ENUM('active', 'calibration_due', 'out_for_calibration', 'out_of_service', 'retired') DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- DRAWINGS TABLE
-- Document and drawing management
-- =============================================
CREATE TABLE IF NOT EXISTS drawings (
  id VARCHAR(36) PRIMARY KEY,
  part_type_id VARCHAR(36),
  document_number VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  revision VARCHAR(50) DEFAULT 'A',
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  document_type ENUM('drawing', 'specification', 'procedure', 'work_instruction', 'other') DEFAULT 'drawing',
  is_current BOOLEAN DEFAULT TRUE,
  uploaded_by VARCHAR(36),
  approved_by VARCHAR(36),
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (part_type_id) REFERENCES part_types(id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- NOTIFICATIONS TABLE
-- System notifications for users
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'warning', 'error', 'success', 'action_required') DEFAULT 'info',
  category VARCHAR(50),
  reference_type VARCHAR(50),
  reference_id VARCHAR(36),
  action_url VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- AUDIT LOG TABLE
-- Track all changes for compliance
-- =============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  action ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'export') NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36),
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_part_types_part_number ON part_types(part_number);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_received_date ON shipments(received_date);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_inspector ON inspections(inspector_id);
CREATE INDEX idx_quarantine_disposition ON quarantine_batches(disposition);
CREATE INDEX idx_engineering_status ON engineering_tasks(status);
CREATE INDEX idx_engineering_assigned ON engineering_tasks(assigned_to);
CREATE INDEX idx_warranty_status ON warranty_claims(status);
CREATE INDEX idx_warranty_claim_number ON warranty_claims(claim_number);
CREATE INDEX idx_gages_status ON gages(status);
CREATE INDEX idx_gages_calibration ON gages(next_calibration_date);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
`;

async function runMigrations() {
  console.log('========================================');
  console.log('QMS Database Migration');
  console.log('========================================\n');

  let connection;
  
  try {
    // Connect to MySQL
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true,
    });
    console.log('✓ Connected to MySQL\n');

    // Run table creation
    console.log('Creating tables...');
    await connection.query(createTablesSQL);
    console.log('✓ All tables created successfully\n');

    // Create default admin user
    console.log('Creating default admin user...');
    
    const adminId = uuidv4();
    const passwordHash = await bcrypt.hash('admin123', 12);
    
    // Check if admin already exists
    const [existingAdmin] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      ['admin@qms.local']
    );

    if (existingAdmin.length === 0) {
      await connection.query(
        `INSERT INTO users (id, email, password_hash, display_name, role, tier)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [adminId, 'admin@qms.local', passwordHash, 'System Admin', 'admin', 'enterprise']
      );
      console.log('✓ Default admin user created\n');
      console.log('  Email: admin@qms.local');
      console.log('  Password: admin123');
      console.log('  Role: admin');
      console.log('  Tier: enterprise\n');
    } else {
      console.log('✓ Admin user already exists\n');
    }

    // Show table summary
    console.log('========================================');
    console.log('Migration Complete!');
    console.log('========================================\n');
    
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`Created ${tables.length} tables:`);
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`  ${index + 1}. ${tableName}`);
    });
    console.log('');

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the migration
runMigrations();
