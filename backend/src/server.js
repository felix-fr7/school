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
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');
const teacherRoutes = require('./routes/teacher');
const weeklyLessonsRoutes = require('./routes/weeklyLessons');
const utilsRoutes = require('./routes/utils');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware Setup
// ============================================

// CORS Configuration - Allow requests from mobile app and ngrok tunnel
const corsOptions = {
  origin: process.env.FRONTEND_URL 
    ? [...process.env.FRONTEND_URL.split(','), 'https://unadvised-tribunal-mutate.ngrok-free.dev']
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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

// Admin routes (School Admin)
app.use('/api/admin', adminRoutes);

// Weekly Lessons routes (MUST be before teacher/student routes to avoid conflicts)
// The weeklyLessonsRoutes handles /api/teacher/weekly-lessons and /api/student/weekly-lessons
app.use('/api', weeklyLessonsRoutes);

// Student routes
app.use('/api/student', studentRoutes);

// Teacher routes
app.use('/api/teacher', teacherRoutes);

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
async function startServer() {
  try {
    // Test database connection
    await db.query('SELECT 1');
    console.log('✅ Connected to database successfully');

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