/**
 * Attendance Controller
 * Handles attendance marking and statistics for teachers and students
 */

const db = require('../config/db');

/**
 * Mark attendance for students in teacher's class (batch)
 * POST /api/teacher/attendance
 */
const markAttendance = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { date, attendanceData } = req.body;

    if (!date || !attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Date and attendance data array are required' },
      });
    }

    // Find teacher's class
    const classQuery = `
      SELECT id FROM "Class" WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No class assigned. Please contact administrator.' },
      });
    }

    const classId = classResult.rows[0].id;
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Validate all students belong to this class
    const studentIds = attendanceData.map(a => a.studentId);
    const placeholders = studentIds.map((_, i) => `$${i + 1}`).join(',');
    const validStudentsQuery = `
      SELECT id FROM "User"
      WHERE id IN (${placeholders}) AND "classId" = $${studentIds.length + 1} AND role = $${studentIds.length + 2}
    `;
    const validStudentsResult = await db.query(validStudentsQuery, [...studentIds, classId, 'STUDENT']);

    if (validStudentsResult.rows.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        error: { message: 'Some students do not belong to your class' },
      });
    }

    // Use INSERT ... ON CONFLICT for upsert
    const results = [];
    for (const entry of attendanceData) {
      const upsertQuery = `
        INSERT INTO "Attendance" (date, "studentId", "classId", "tenantId", status, remarks, "markedBy", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (date, "studentId") 
        DO UPDATE SET 
          status = EXCLUDED.status,
          remarks = EXCLUDED.remarks,
          "markedBy" = EXCLUDED."markedBy",
          "updatedAt" = NOW()
        RETURNING *
      `;

      const result = await db.query(upsertQuery, [
        attendanceDate, entry.studentId, classId, tenantId, entry.status, entry.remarks || null, teacherId
      ]);
      results.push(result.rows[0]);
    }

    res.status(200).json({
      success: true,
      data: {
        marked: results.length,
        date: attendanceDate,
      },
      message: `Attendance marked for ${results.length} students`,
    });
  } catch (error) {
    console.error('MarkAttendance Error:', error);
    next(error);
  }
};

/**
 * Get attendance for teacher's class on a specific date
 * GET /api/teacher/attendance?date=YYYY-MM-DD
 */
const getClassAttendance = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { date } = req.query;

    // Find teacher's class
    const classQuery = `
      SELECT c.id, c.name,
        (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'studentId', u."studentId"))
         FROM "User" u WHERE u."classId" = c.id AND u.role = 'STUDENT') as students
      FROM "Class" c
      WHERE c."teacherId" = $1 AND c."tenantId" = $2
      LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No class assigned' },
      });
    }

    const teacherClass = classResult.rows[0];
    const students = teacherClass.students || [];
    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    // Get existing attendance records
    const existingQuery = `
      SELECT "studentId", status, remarks FROM "Attendance"
      WHERE "classId" = $1 AND date = $2
    `;
    const existingResult = await db.query(existingQuery, [teacherClass.id, attendanceDate]);

    const attendanceMap = {};
    existingResult.rows.forEach(a => {
      attendanceMap[a.studentId] = a;
    });

    // Build response
    const attendanceList = students.map(student => ({
      studentId: student.id,
      name: student.name,
      email: student.email,
      studentCode: student.studentId,
      status: attendanceMap[student.id]?.status || null,
      remarks: attendanceMap[student.id]?.remarks || null,
    }));

    res.status(200).json({
      success: true,
      data: {
        date: attendanceDate,
        className: teacherClass.name,
        attendance: attendanceList,
        summary: {
          total: students.length,
          marked: existingResult.rows.length,
          unmarked: students.length - existingResult.rows.length,
        },
      },
    });
  } catch (error) {
    console.error('GetClassAttendance Error:', error);
    next(error);
  }
};

/**
 * Get student's own attendance statistics
 * GET /api/student/attendance/stats
 */
const getStudentAttendanceStats = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;

    // Get attendance records
    const attendanceQuery = `
      SELECT status, date FROM "Attendance"
      WHERE "studentId" = $1 AND "tenantId" = $2
    `;
    const attendanceResult = await db.query(attendanceQuery, [studentId, tenantId]);
    const attendance = attendanceResult.rows;

    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const absentDays = attendance.filter(a => a.status === 'ABSENT').length;
    const excusedDays = attendance.filter(a => a.status === 'EXCUSED').length;
    const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    // Get last 30 days stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAttendance = attendance.filter(a => new Date(a.date) >= thirtyDaysAgo);
    const recentPresent = recentAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const recentPercentage = recentAttendance.length > 0 ? (recentPresent / recentAttendance.length) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        overall: {
          totalDays,
          presentDays,
          absentDays,
          excusedDays,
          percentage: Math.round(percentage * 100) / 100,
        },
        last30Days: {
          totalDays: recentAttendance.length,
          presentDays: recentPresent,
          percentage: Math.round(recentPercentage * 100) / 100,
        },
      },
    });
  } catch (error) {
    console.error('GetStudentAttendanceStats Error:', error);
    next(error);
  }
};

module.exports = {
  markAttendance,
  getClassAttendance,
  getStudentAttendanceStats,
};