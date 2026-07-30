/**
 * MACVEL School Management Mobile App - Backend Server
 * Smart. Secure. Connected.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const superadminRoutes = require('./routes/superadmin');
const productRoutes = require('./routes/products');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');
const newsRoutes = require('./routes/news');
const messageRoutes = require('./routes/messages');
const homeworkRoutes = require('./routes/homework');
const examRoutes = require('./routes/exams');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');
const circularRoutes = require('./routes/circulars');
const timetableRoutes = require('./routes/timetable');
const calendarRoutes = require('./routes/calendar');
const galleryRoutes = require('./routes/gallery');
const videoRoutes = require('./routes/videos');
const voiceRoutes = require('./routes/voice');
const contactRoutes = require('./routes/contacts');
const profileRoutes = require('./routes/profile');
const fileRoutes = require('./routes/files');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:3001'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning', '*']
}));

// Handle preflight OPTIONS requests for all routes
app.options('*', cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'MACVEL School Management API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/circulars', circularRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/files', fileRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║     MACVEL School Management Mobile App - Backend        ║');
  console.log('║                                                          ║');
  console.log('║     Smart. Secure. Connected.                            ║');
  console.log('║                                                          ║');
  console.log(`║     Server running on port ${PORT}                          ║`);
  console.log(`║     Environment: ${process.env.NODE_ENV || 'development'}                            ║`);
  console.log('║                                                          ║');
  console.log('║     API Endpoints:                                       ║');
  console.log('║     - GET  /health           - Health check              ║');
  console.log('║     - POST /api/auth/login   - User login                ║');
  console.log('║     - GET  /api/admin/*      - Admin endpoints           ║');
  console.log('║     - GET  /api/teacher/*    - Teacher endpoints         ║');
  console.log('║     - GET  /api/student/*    - Student endpoints         ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
});

module.exports = app;