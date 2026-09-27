/**
 * MACVEL School Management Backend Server
 * Smart. Secure. Connected.
 * 
 * Multi-tenant SaaS architecture with MongoDB/Mongoose
 * Phase 5 Implementation - Final Wireup
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import database connection
const { connectDB } = require('./config/db');

// Import new Phase 4/5 middleware
const { authenticate, optionalAuth } = require('./middleware/authMiddleware');
const { verifyRole, enforceSchoolIsolation } = require('./middleware/rbacMiddleware');

// Import routes
const superAdminRoutes = require('./routes/superAdminRoutes');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');
const homeworkRoutes = require('./routes/homework');
const newsRoutes = require('./routes/news');
const circularsRoutes = require('./routes/circulars');
const galleryRoutes = require('./routes/gallery');
const examsRoutes = require('./routes/exams');
const timetableRoutes = require('./routes/timetable');
const messagesRoutes = require('./routes/messages');
const profileRoutes = require('./routes/profile');
const filesRoutes = require('./routes/files');
const postsRoutes = require('./routes/posts');
const contentRoutes = require('./routes/content');
const adminContentRoutes = require('./routes/adminContent');
const tenantsRoutes = require('./routes/tenants');
const cleanupRoutes = require('./routes/cleanup');
const weeklyLessonsRoutes = require('./routes/weeklyLessons');
const calendarRoutes = require('./routes/calendar');
const contactsRoutes = require('./routes/contacts');
const videosRoutes = require('./routes/videos');
const albumsRoutes = require('./routes/albums');
const productsRoutes = require('./routes/products');
const classControllerRoutes = require('./routes/classController');
const reportCardsRoutes = require('./routes/reportcards');
const schoolContextRoutes = require('./routes/schoolContext');
const portalBrandingRoutes = require('./routes/portalBranding');

// Import error handler
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ============================================
// Security Middleware (Helmet)
// ============================================
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API use
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));

// ============================================
// CORS Configuration
// ============================================
// Reflect any request origin and allow credentials. This is required so the
// browser (e.g. http://localhost:5173 in dev) can call the API cross-origin,
// including for preflight OPTIONS requests which must also carry the
// Access-Control-Allow-Origin header.
const corsOptions = {
  origin: true, // Reflect the request's Origin header (allow any origin)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-tenant-id', 'ngrok-skip-browser-warning'],
  maxAge: 86400, // Cache preflight response for 24h
};

app.use(cors(corsOptions));

// Handle preflight OPTIONS requests explicitly with the same CORS settings
// so they always return the required access-control headers.
app.options('*', cors(corsOptions), (req, res) => {
  res.sendStatus(204);
});

// ============================================
// Body Parsing Middleware
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Static Files for Uploads (BEFORE auth middleware)
// ============================================
// Serve uploaded files publicly (images, PDFs, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));

// ============================================
// Database Connection
// ============================================
connectDB().catch(err => {
  console.error('[Server] Failed to connect to database:', err);
  process.exit(1);
});

// ============================================
// Health Check Endpoint
// ============================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'MACVEL School Management API is running',
    timestamp: new Date().toISOString(),
    version: '3.0.0'
  });
});

// ============================================
// API Routes
// ============================================

// Super Admin Routes (Placed BEFORE global authenticate middleware)
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/superadmin', superAdminRoutes);

// Auth Routes (public/login)
app.use('/api/auth', authRoutes);

// Portal Branding - the GET endpoint is PUBLIC (login page reads it before login).
// Registered BEFORE the global authenticate middleware; the router itself protects
// all write endpoints with authenticate + isSuperAdmin.
app.use('/api/portal-branding', portalBrandingRoutes);

// All routes below require authentication
app.use(authenticate);

// School Admin Routes
app.use('/api/admin', adminRoutes);

// Teacher Routes
app.use('/api/teacher', teacherRoutes);

// Student Routes
app.use('/api/student', studentRoutes);

// Class Controller Routes
app.use('/api/class-controller', classControllerRoutes);

// Homework Routes
app.use('/api/homework', homeworkRoutes);

// Content Routes (News, Circulars, Gallery, etc.)
app.use('/api/news', newsRoutes);
app.use('/api/circulars', circularsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin-content', adminContentRoutes);
app.use('/api/weekly-lessons', weeklyLessonsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/albums', albumsRoutes);

// Report Cards Routes
app.use('/api/reportcards', reportCardsRoutes);

// Tenant Management Routes
app.use('/api/tenants', tenantsRoutes);

// School Context (logo + name for that school's dashboards) - NO logic change, NEW route only
app.use('/api/school-context', schoolContextRoutes);

// Cleanup Routes (Super Admin only)
app.use('/api/cleanup', cleanupRoutes);

// Products Routes (legacy/demo)
app.use('/api/products', productsRoutes);

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      path: req.path,
      method: req.method
    }
  });
});

// ============================================
// Global Error Handler
// ============================================
app.use(errorHandler);

// ============================================
// Start Server
// ============================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║     MACVEL School Management Mobile App - Backend        ║');
  console.log('║                                                          ║');
  console.log('║     Smart. Secure. Connected.                            ║');
  console.log('║                                                          ║');
  console.log(`║     Server running on port ${PORT.toString().padEnd(34)}║`);
  console.log(`║     Environment: ${(process.env.NODE_ENV || 'development').padEnd(27)}║`);
  console.log('║                                                          ║');
  console.log('║     API Endpoints:                                       ║');
  console.log('║     - GET  /health            - Health check             ║');
  console.log('║     - POST /api/auth/*        - Authentication           ║');
  console.log('║     - GET  /api/super-admin/* - Super Admin              ║');
  console.log('║     - *    /api/admin/*       - School Admin             ║');
  console.log('║     - *    /api/teacher/*     - Teacher                  ║');
  console.log('║     - *    /api/student/*     - Student                  ║');
  console.log('║     - *    /api/class-controller/* - Class Login         ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
});

module.exports = app;