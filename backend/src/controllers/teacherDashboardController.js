/**
 * Teacher Dashboard Controller
 * Handles the new dashboard profile endpoint for the redesigned teacher dashboard UI
 */

const db = require('../config/db');

/**
 * Get teacher dashboard profile
 * Returns aggregated data for the teacher dashboard including:
 * - Teacher name and assigned class/section
 * - School logo URL and school name
 * - Class statistics (students count, homework count, exam schedules count)
 * GET /api/teacher/dashboard-profile
 */
const getDashboardProfile = async (req, res, next) => {
  try {
    const teacherId = req.user.id;

    // Query to fetch teacher profile with assigned class and tenant branding
    const query = `
      SELECT 
        u.id,
        u.name as "teacherName",
        c.id as "classId",
        c.name as "className",
        c.section as "sectionName",
        t.id as "tenantId",
        t.name as "schoolName",
        t."schoolLogoUrl" as "schoolLogoUrl",
        t.code as "schoolCode",
        (SELECT COUNT(*) FROM "User" WHERE "classId" = c.id AND role = 'STUDENT') as "studentCount",
        (SELECT COUNT(*) FROM "Homework" WHERE "classId" = c.id) as "homeworkCount",
        (SELECT COUNT(*) FROM "ExamSchedule" WHERE "classId" = c.id) as "examCount"
      FROM "User" u
      LEFT JOIN "Class" c ON u."classId" = c.id
      LEFT JOIN "Tenant" t ON u."tenantId" = t.id
      WHERE u.id = $1 AND u.role = 'TEACHER'
      LIMIT 1
    `;

    const result = await db.query(query, [teacherId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Teacher not found or no class assigned',
        },
      });
    }

    const row = result.rows[0];

    // Format the response
    const dashboardProfile = {
      teacher: {
        id: row.id,
        name: row.teacherName,
        classId: row.classId,
        className: row.className || 'Not Assigned',
        sectionName: row.sectionName || '',
        classSection: row.className && row.sectionName 
          ? `${row.className}-${row.sectionName}` 
          : row.className || 'Not Assigned',
      },
      school: {
        id: row.tenantId,
        name: row.schoolName || 'School',
        logoUrl: row.schoolLogoUrl || null,
        code: row.schoolCode,
      },
      stats: {
        totalStudents: parseInt(row.studentCount) || 0,
        totalHomework: parseInt(row.homeworkCount) || 0,
        totalExams: parseInt(row.examCount) || 0,
      },
    };

    res.status(200).json({
      success: true,
      data: dashboardProfile,
    });
  } catch (error) {
    console.error('GetTeacherDashboardProfile Error:', error);
    next(error);
  }
};

module.exports = {
  getDashboardProfile,
};