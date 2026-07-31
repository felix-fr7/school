/**
 * Admin Routes
 * School administration endpoints
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticate, isAdmin);

// ============================================
// Dashboard Stats
// ============================================
router.get('/dashboard', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    // Get counts
    const [totalStudents] = await query(
      `SELECT COUNT(*) as count FROM users u 
       JOIN student_profiles sp ON u.id = sp.user_id 
       WHERE u.tenant_id = $1 AND u.role = 'STUDENT' AND u.is_active = TRUE`,
      [tenantId]
    );

    const [totalTeachers] = await query(
      `SELECT COUNT(*) as count FROM users u 
       JOIN teacher_profiles tp ON u.id = tp.user_id 
       WHERE u.tenant_id = $1 AND u.role = 'TEACHER' AND u.is_active = TRUE`,
      [tenantId]
    );

    const [totalClasses] = await query(
      `SELECT COUNT(*) as count FROM classes WHERE tenant_id = $1 AND is_active = TRUE`,
      [tenantId]
    );

    const [todayAttendance] = await query(
      `SELECT 
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late
       FROM attendance 
       WHERE class_id IN (SELECT id FROM classes WHERE tenant_id = $1) 
       AND attendance_date = CURRENT_DATE`,
      [tenantId]
    );

    const [recentNews] = await query(
      `SELECT id, title, type, is_published, created_at as createdAt 
       FROM news WHERE tenant_id = $1 
       ORDER BY created_at DESC LIMIT 5`,
      [tenantId]
    );

    const [pendingLeaves] = await query(
      `SELECT COUNT(*) as count FROM leave_requests 
       WHERE class_id IN (SELECT id FROM classes WHERE tenant_id = $1) 
       AND status = 'pending'`,
      [tenantId]
    );

    res.json({
      success: true,
      data: {
        totalStudents: totalStudents.count,
        totalTeachers: totalTeachers.count,
        totalClasses: totalClasses.count,
        todayAttendance: todayAttendance,
        recentNews,
        pendingLeaves: pendingLeaves.count
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Classes Management
// ============================================
router.get('/classes', async (req, res, next) => {
  try {
    const classes = await query(
      `SELECT c.*, ct.name as class_teacher_name,
              COUNT(sp.user_id) as student_count
       FROM classes c
       LEFT JOIN users ct ON c.class_teacher_id = ct.id
       LEFT JOIN student_profiles sp ON c.id = sp.class_id AND sp.is_active = TRUE
       WHERE c.tenant_id = $1 AND c.is_active = TRUE
       GROUP BY c.id, ct.name
       ORDER BY c.grade_level, c.section`,
      [req.user.tenantId]
    );

    res.json({ success: true, data: classes });
  } catch (error) {
    next(error);
  }
});

router.post('/classes', async (req, res, next) => {
  try {
    const { name, section, gradeLevel, classTeacherId, roomNumber, capacity } = req.body;
    const classId = uuidv4();

    await query(
      `INSERT INTO classes (id, tenant_id, name, section, grade_level, class_teacher_id, room_number, capacity, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
      [classId, req.user.tenantId, name, section, gradeLevel, classTeacherId, roomNumber, capacity]
    );

    res.status(201).json({ success: true, data: { id: classId } });
  } catch (error) {
    next(error);
  }
});

router.put('/classes/:id', async (req, res, next) => {
  try {
    const { name, section, gradeLevel, classTeacherId, roomNumber, capacity } = req.body;

    await query(
      `UPDATE classes SET name = $1, section = $2, grade_level = $3, class_teacher_id = $4, 
              room_number = $5, capacity = $6, updated_at = NOW()
       WHERE id = $7 AND tenant_id = $8`,
      [name, section, gradeLevel, classTeacherId, roomNumber, capacity, req.params.id, req.user.tenantId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/classes/:id', async (req, res, next) => {
  try {
    await query(`UPDATE classes SET is_active = FALSE WHERE id = $1 AND tenant_id = $2`, 
      [req.params.id, req.user.tenantId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Students Management
// ============================================
router.get('/students', async (req, res, next) => {
  try {
    const { classId, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'u.tenant_id = $1 AND u.role = $2 AND u.is_active = TRUE';
    let params = [req.user.tenantId, 'STUDENT'];

    if (classId) {
      whereClause += ' AND sp.class_id = $' + (params.length + 1);
      params.push(classId);
    }

    if (search) {
      whereClause += ' AND (u.name ILIKE $' + (params.length + 1) + ' OR u.email ILIKE $' + (params.length + 2) + ' OR sp.student_id ILIKE $' + (params.length + 3) + ')';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const students = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.avatar_url,
              sp.student_id, sp.roll_number, sp.class_id,
              c.name as class_name, c.section
       FROM users u
       JOIN student_profiles sp ON u.id = sp.user_id
       JOIN classes c ON sp.class_id = c.id
       WHERE ${whereClause}
       ORDER BY c.grade_level, c.section, sp.roll_number
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [{ total }] = await query(
      `SELECT COUNT(*) as total FROM users u 
       JOIN student_profiles sp ON u.id = sp.user_id 
       WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: students,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: total }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/students/:id', async (req, res, next) => {
  try {
    const student = await query(
      `SELECT u.*, sp.*, c.name as class_name, c.section, c.grade_level
       FROM users u
       JOIN student_profiles sp ON u.id = sp.user_id
       JOIN classes c ON sp.class_id = c.id
       WHERE u.id = $1 AND u.tenant_id = $2`,
      [req.params.id, req.user.tenantId]
    );

    if (!student || student.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: student[0] });
  } catch (error) {
    next(error);
  }
});

router.put('/students/:id', async (req, res, next) => {
  try {
    const { name, email, phone, classId, rollNumber, dateOfBirth, gender, 
            bloodGroup, address, city, state, fatherName, fatherPhone, motherName, motherPhone } = req.body;

    // Update user
    await query(
      `UPDATE users SET name = $1, email = $2, phone = $3, updated_at = NOW()
       WHERE id = $4 AND tenant_id = $5`,
      [name, email, phone, req.params.id, req.user.tenantId]
    );

    // Update student profile
    await query(
      `UPDATE student_profiles SET class_id = $1, roll_number = $2, date_of_birth = $3, gender = $4,
              blood_group = $5, address = $6, city = $7, state = $8, father_name = $9, father_phone = $10,
              mother_name = $11, mother_phone = $12, updated_at = NOW()
       WHERE user_id = $13`,
      [classId, rollNumber, dateOfBirth, gender, bloodGroup, address, city, state,
       fatherName, fatherPhone, motherName, motherPhone, req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/students/:id', async (req, res, next) => {
  try {
    await query(`UPDATE users SET is_active = FALSE WHERE id = $1 AND tenant_id = $2`, 
      [req.params.id, req.user.tenantId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Teachers Management
// ============================================
router.get('/teachers', async (req, res, next) => {
  try {
    const teachers = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.avatar_url,
              tp.teacher_id, tp.qualification, tp.specialization, tp.experience_years,
              tp.subjects
       FROM users u
       JOIN teacher_profiles tp ON u.id = tp.user_id
       WHERE u.tenant_id = $1 AND u.role = 'TEACHER' AND u.is_active = TRUE
       ORDER BY u.name`,
      [req.user.tenantId]
    );

    res.json({ success: true, data: teachers });
  } catch (error) {
    next(error);
  }
});

router.get('/teachers/:id', async (req, res, next) => {
  try {
    const teacher = await query(
      `SELECT u.*, tp.*
       FROM users u
       JOIN teacher_profiles tp ON u.id = tp.user_id
       WHERE u.id = $1 AND u.tenant_id = $2`,
      [req.params.id, req.user.tenantId]
    );

    if (!teacher || teacher.length === 0) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    res.json({ success: true, data: teacher[0] });
  } catch (error) {
    next(error);
  }
});

router.post('/teachers', async (req, res, next) => {
  try {
    const { email, password, name, phone, qualification, experienceYears, specialization, subjects } = req.body;
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await query(
      `INSERT INTO users (id, tenant_id, email, phone, password, name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, 'TEACHER', TRUE)`,
      [userId, req.user.tenantId, email, phone, hashedPassword, name]
    );

    // Generate teacher ID
    const [{ count }] = await query(
      `SELECT COUNT(*) as count FROM teacher_profiles WHERE tenant_id = $1`,
      [req.user.tenantId]
    );
    const teacherId = `TCH-${String(count + 1).padStart(4, '0')}`;

    // Create teacher profile
    await query(
      `INSERT INTO teacher_profiles (id, user_id, tenant_id, teacher_id, qualification, 
              experience_years, specialization, subjects, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
      [uuidv4(), userId, req.user.tenantId, teacherId, qualification, experienceYears, specialization, 
       subjects ? JSON.stringify(subjects) : null]
    );

    res.status(201).json({ success: true, data: { userId, teacherId } });
  } catch (error) {
    next(error);
  }
});

router.put('/teachers/:id', async (req, res, next) => {
  try {
    const { name, email, phone, qualification, experienceYears, specialization, subjects } = req.body;

    await query(
      `UPDATE users SET name = $1, email = $2, phone = $3, updated_at = NOW()
       WHERE id = $4 AND tenant_id = $5`,
      [name, email, phone, req.params.id, req.user.tenantId]
    );

    await query(
      `UPDATE teacher_profiles SET qualification = $1, experience_years = $2, specialization = $3, 
              subjects = $4, updated_at = NOW()
       WHERE user_id = $5`,
      [qualification, experienceYears, specialization, subjects ? JSON.stringify(subjects) : null, req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/teachers/:id', async (req, res, next) => {
  try {
    await query(`UPDATE users SET is_active = FALSE WHERE id = $1 AND tenant_id = $2`, 
      [req.params.id, req.user.tenantId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Subjects Management
// ============================================
router.get('/subjects', async (req, res, next) => {
  try {
    const subjects = await query(
      `SELECT * FROM subjects WHERE tenant_id = $1 AND is_active = TRUE ORDER BY name`,
      [req.user.tenantId]
    );
    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
});

router.post('/subjects', async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    const subjectId = uuidv4();

    await query(
      `INSERT INTO subjects (id, tenant_id, name, code, description, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)`,
      [subjectId, req.user.tenantId, name, code, description]
    );

    res.status(201).json({ success: true, data: { id: subjectId } });
  } catch (error) {
    next(error);
  }
});

router.put('/subjects/:id', async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    await query(
      `UPDATE subjects SET name = $1, code = $2, description = $3, updated_at = NOW()
       WHERE id = $4 AND tenant_id = $5`,
      [name, code, description, req.params.id, req.user.tenantId]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/subjects/:id', async (req, res, next) => {
  try {
    await query(`UPDATE subjects SET is_active = FALSE WHERE id = $1 AND tenant_id = $2`, 
      [req.params.id, req.user.tenantId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// School Contacts
// ============================================
router.get('/contacts', async (req, res, next) => {
  try {
    const contacts = await query(
      `SELECT * FROM school_contacts WHERE tenant_id = $1 AND is_active = TRUE ORDER BY department`,
      [req.user.tenantId]
    );
    res.json({ success: true, data: contacts });
  } catch (error) {
    next(error);
  }
});

router.post('/contacts', async (req, res, next) => {
  try {
    const { department, name, designation, phone, email } = req.body;
    const contactId = uuidv4();

    await query(
      `INSERT INTO school_contacts (id, tenant_id, department, name, designation, phone, email, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
      [contactId, req.user.tenantId, department, name, designation, phone, email]
    );

    res.status(201).json({ success: true, data: { id: contactId } });
  } catch (error) {
    next(error);
  }
});

router.put('/contacts/:id', async (req, res, next) => {
  try {
    const { department, name, designation, phone, email } = req.body;
    await query(
      `UPDATE school_contacts SET department = $1, name = $2, designation = $3, phone = $4, email = $5, updated_at = NOW()
       WHERE id = $6 AND tenant_id = $7`,
      [department, name, designation, phone, email, req.params.id, req.user.tenantId]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/contacts/:id', async (req, res, next) => {
  try {
    await query(`UPDATE school_contacts SET is_active = FALSE WHERE id = $1 AND tenant_id = $2`, 
      [req.params.id, req.user.tenantId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;