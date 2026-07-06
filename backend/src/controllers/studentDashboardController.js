/**
 * Student Dashboard Controller
 * Handles the new dashboard profile endpoint for the redesigned student dashboard UI
 */

const db = require('../config/db');

/**
 * Get student dashboard profile
 * Returns aggregated data for the student dashboard including:
 * - Student name, class, and section
 * - School logo URL and school name
 * GET /api/student/dashboard-profile
 */
const getDashboardProfile = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    // Query to fetch student profile with class/section and tenant branding
    const query = `
      SELECT 
        u.id,
        u.name as "studentName",
        u."studentId" as "rollNumber",
        c.name as "className",
        c.section as "sectionName",
        t.id as "tenantId",
        t.name as "schoolName",
        t."schoolLogoUrl" as "schoolLogoUrl",
        t.code as "schoolCode"
      FROM "User" u
      LEFT JOIN "Class" c ON u."classId" = c.id
      LEFT JOIN "Tenant" t ON u."tenantId" = t.id
      WHERE u.id = $1
      LIMIT 1
    `;

    const result = await db.query(query, [studentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found',
        },
      });
    }

    const row = result.rows[0];

    // Format the response
    const dashboardProfile = {
      student: {
        id: row.id,
        name: row.studentName,
        rollNumber: row.rollNumber,
        className: row.className || 'Not Assigned',
        sectionName: row.sectionName || 'Not Assigned',
        // Format as "VIII-TERRA" style
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
    };

    res.status(200).json({
      success: true,
      data: dashboardProfile,
    });
  } catch (error) {
    console.error('GetDashboardProfile Error:', error);
    next(error);
  }
};

module.exports = {
  getDashboardProfile,
};