/**
 * Express Server Setup
 * Main entry point for the Node.js backend API
 * Multi-Tenant School Management System
 */

// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');

// Import database configuration
const db = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const tenantRoutes = require('./routes/tenants');
const superadminRoutes = require('./routes/superadmin');
const adminRoutes = require('./routes/admin');
const adminContentRoutes = require('./routes/adminContent');
const contentRoutes = require('./routes/content'); // Shared content routes for students/teachers
const studentRoutes = require('./routes/student');
const teacherRoutes = require('./routes/teacher');
const classControllerRoutes = require('./routes/classController'); // Class Controller routes
const weeklyLessonsRoutes = require('./routes/weeklyLessons');
const utilsRoutes = require('./routes/utils');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { maintenanceGuard, rateLimiter } = require('./middleware/maintenanceGuard');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware Setup
// ============================================

// Apply global rate limiting (configurable via system config)
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }));

// Apply maintenance guard to all routes except health checks
app.use(maintenanceGuard);

// CORS Configuration - Dynamic origin matching for localhost, local IPs, and ngrok
// This allows seamless access from desktop browsers, mobile devices on local network, and ngrok tunnels
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow localhost (any port)
    if (origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
    
    // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (origin.includes('192.168') || origin.includes('10.') || origin.match(/172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
      return callback(null, true);
    }
    
    // Allow ngrok domains (ngrok-free.dev, ngrok-free.app, ngrok.io, etc.)
    if (origin.includes('ngrok')) {
      return callback(null, true);
    }
    
    // Allow any origin in development mode (fallback)
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Block other origins
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning'],
  credentials: true,
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// ============================================
// Health Check Endpoint
// ============================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// API Routes
// ============================================

// Public/Auth routes
app.use('/api/auth', authRoutes);

// Posts routes (legacy)
app.use('/api/posts', postRoutes);

// Tenant management routes (Super Admin only)
app.use('/api/tenants', tenantRoutes);

// Super Admin routes (Telemetry, System Config)
app.use('/api/superadmin', superadminRoutes);

// Admin routes (School Admin)
app.use('/api/admin', adminRoutes);

// Admin Content routes (News, Circulars, Exams with visibility)
app.use('/api/admin/content', adminContentRoutes);

// Content routes (Shared read-only access for Students and Teachers)
app.use('/api/content', contentRoutes);

// Weekly Lessons routes (MUST be before teacher/student routes to avoid conflicts)
// The weeklyLessonsRoutes handles /api/teacher/weekly-lessons and /api/student/weekly-lessons
app.use('/api', weeklyLessonsRoutes);

// Student routes
app.use('/api/student', studentRoutes);

// Teacher routes
app.use('/api/teacher', teacherRoutes);

// Class Controller routes (For Class ID login - CLS-X)
app.use('/api/class-controller', classControllerRoutes);

// Utils routes (shared utilities)
app.use('/api/utils', utilsRoutes);

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
});

// ============================================
// Error Handling Middleware
// ============================================
app.use(errorHandler);

// ============================================
// Database Connection & Server Start
// ============================================

async function runMigrations() {
  try {
    console.log('[Migration] Running database migrations/fixes for Exam table...');
    
    // 1. Create table if not exists
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS "Exam" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255),
        class_id UUID,
        tenant_id UUID,
        file_url TEXT,
        due_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await db.query(createTableSQL);
    console.log('[Migration] Exam table exists or was created.');

    // 2. Add individual columns if they don't exist
    const addColumnsSQL = [
      'ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "title" VARCHAR(255)',
      'ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "class_id" UUID',
      'ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "tenant_id" UUID',
      'ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "file_url" TEXT',
      'ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "due_date" TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
      'ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()'
    ];
    for (const sql of addColumnsSQL) {
      await db.query(sql);
    }

    // 3. Drop NOT NULL on class_id to support global exams
    await db.query('ALTER TABLE "Exam" ALTER COLUMN "class_id" DROP NOT NULL');

    // 4. Data Migration: Copy data from camelCase columns if they exist and snake_case columns are NULL
    try {
      const examNameCheck = await db.query(`
        SELECT COLUMN_NAME FROM information_schema.columns 
        WHERE table_name = 'Exam' AND column_name = 'examName'
      `);
      if (examNameCheck.rows.length > 0) {
        await db.query('UPDATE "Exam" SET "title" = "examName" WHERE "title" IS NULL');
        console.log('[Migration] Copied examName to title column.');
      }
    } catch (e) {
      console.warn('[Migration] Error migrating examName to title:', e.message);
    }

    try {
      const pdfUrlCheck = await db.query(`
        SELECT COLUMN_NAME FROM information_schema.columns 
        WHERE table_name = 'Exam' AND column_name = 'pdfUrl'
      `);
      if (pdfUrlCheck.rows.length > 0) {
        await db.query('UPDATE "Exam" SET "file_url" = COALESCE("pdfUrl", "imageUrl") WHERE "file_url" IS NULL');
        console.log('[Migration] Copied pdfUrl/imageUrl to file_url column.');
      }
    } catch (e) {
      console.warn('[Migration] Error migrating pdfUrl/imageUrl to file_url:', e.message);
    }

    try {
      const tenantIdCheck = await db.query(`
        SELECT COLUMN_NAME FROM information_schema.columns 
        WHERE table_name = 'Exam' AND column_name = 'tenantId'
      `);
      if (tenantIdCheck.rows.length > 0) {
        await db.query('UPDATE "Exam" SET "tenant_id" = "tenantId" WHERE "tenant_id" IS NULL');
        console.log('[Migration] Copied tenantId to tenant_id column.');
      }
    } catch (e) {
      console.warn('[Migration] Error migrating tenantId to tenant_id:', e.message);
    }

    try {
      const classIdCheck = await db.query(`
        SELECT COLUMN_NAME FROM information_schema.columns 
        WHERE table_name = 'Exam' AND column_name = 'classId'
      `);
      if (classIdCheck.rows.length > 0) {
        await db.query('UPDATE "Exam" SET "class_id" = "classId" WHERE "class_id" IS NULL');
        console.log('[Migration] Copied classId to class_id column.');
      }
    } catch (e) {
      console.warn('[Migration] Error migrating classId to class_id:', e.message);
    }

    try {
      const createdAtCheck = await db.query(`
        SELECT COLUMN_NAME FROM information_schema.columns 
        WHERE table_name = 'Exam' AND column_name = 'createdAt'
      `);
      if (createdAtCheck.rows.length > 0) {
        await db.query('UPDATE "Exam" SET "created_at" = "createdAt" WHERE "created_at" IS NULL');
        console.log('[Migration] Copied createdAt to created_at column.');
      }
    } catch (e) {
      console.warn('[Migration] Error migrating createdAt to created_at:', e.message);
    }

    try {
      const updatedAtCheck = await db.query(`
        SELECT COLUMN_NAME FROM information_schema.columns 
        WHERE table_name = 'Exam' AND column_name = 'updatedAt'
      `);
      if (updatedAtCheck.rows.length > 0) {
        await db.query('UPDATE "Exam" SET "updated_at" = "updatedAt" WHERE "updated_at" IS NULL');
        console.log('[Migration] Copied updatedAt to updated_at column.');
      }
    } catch (e) {
      console.warn('[Migration] Error migrating updatedAt to updated_at:', e.message);
    }

    // 5. Enforce NOT NULL on title and tenant_id
    await db.query(`UPDATE "Exam" SET "title" = 'Exam Timetable' WHERE "title" IS NULL`);
    await db.query(`ALTER TABLE "Exam" ALTER COLUMN "title" SET NOT NULL`);

    const sampleTenant = await db.query('SELECT id FROM "Tenant" LIMIT 1');
    if (sampleTenant.rows.length > 0) {
      await db.query(`UPDATE "Exam" SET "tenant_id" = $1 WHERE "tenant_id" IS NULL`, [sampleTenant.rows[0].id]);
      await db.query(`ALTER TABLE "Exam" ALTER COLUMN "tenant_id" SET NOT NULL`);
    }

    console.log('✅ [Migration] Exam table schema check completed successfully');
  } catch (error) {
    console.error('❌ [Migration] Error checking/upgrading Exam table:', error.message);
  }
}

async function startServer() {
  try {
    // Test database connection
    await db.query('SELECT 1');
    console.log('✅ Connected to database successfully');

    // Run database migrations for Exam table
    await runMigrations();

    // Seed Super Admin if not exists
    await seedSuperAdmin();

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 API available at http://localhost:${PORT}/api`);
      console.log(`🏥 Health check at http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🏫 Multi-Tenant School Management System`);
      console.log(`👤 Super Admin: ${process.env.SUPER_ADMIN_EMAIL}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ============================================
// Seed Super Admin
// ============================================
async function seedSuperAdmin() {
  try {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@school.com';
    
    // Check if super admin exists
    const existingResult = await db.query(
      'SELECT id FROM "User" WHERE email = $1',
      [superAdminEmail]
    );

    if (existingResult.rows.length > 0) {
      console.log('✅ Super Admin already exists');
      return;
    }

    // Create super admin
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(
      process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123', 
      saltRounds
    );

    await db.query(
      `INSERT INTO "User" (email, password, name, role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [superAdminEmail, hashedPassword, process.env.SUPER_ADMIN_NAME || 'Super Admin', 'SUPER_ADMIN']
    );

    console.log('✅ Super Admin seeded successfully');
    console.log(`   Email: ${superAdminEmail}`);
    console.log(`   Password: ${process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123'}`);
  } catch (error) {
    console.error('⚠️ Error seeding Super Admin:', error.message);
  }
}

// ============================================
// Graceful Shutdown
// ============================================
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  try {
    await db.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();

// Export for testing
module.exports = { app, db };