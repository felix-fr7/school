/**
 * Attendance Controller
 * Handles attendance marking and statistics for teachers and students
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Mark attendance for students in teacher's class (batch)
 * POST /api/teacher/attendance
 * Accepts array of { studentId, status, remarks? }
 */
const markAttendance = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { date, attendanceData } = req.body; // [{ studentId, status, remarks? }]

    if (!date || !attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Date and attendance data array are required' },
      });
    }

    // Find teacher's class
    const teacherClass = await prisma.class.findFirst({
      where: { teacherId, tenantId },
      select: { id: true },
    });

    if (!teacherClass) {
      return res.status(404).json({
        success: false,
        error: { message: 'No class assigned. Please contact administrator.' },
      });
    }

    const classId = teacherClass.id;
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Validate all students belong to this class
    const studentIds = attendanceData.map(a => a.studentId);
    const validStudents = await prisma.user.findMany({
      where: {
        id: { in: studentIds },
        classId,
        role: 'STUDENT',
      },
      select: { id: true },
    });

    if (validStudents.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        error: { message: 'Some students do not belong to your class' },
      });
    }

    // Use upsert for each attendance record
    const results = await prisma.$transaction(
      attendanceData.map(entry =>
        prisma.attendance.upsert({
          where: {
            date_studentId: {
              date: attendanceDate,
              studentId: entry.studentId,
            },
          },
          update: {
            status: entry.status,
            remarks: entry.remarks || null,
            markedBy: teacherId,
          },
          create: {
            date: attendanceDate,
            studentId: entry.studentId,
            classId,
            tenantId,
            status: entry.status,
            remarks: entry.remarks || null,
            markedBy: teacherId,
          },
        })
      )
    );

    res.status(200).json({
      success: true,
      data: {
        marked: results.length,
        date: attendanceDate,
        className: teacherClass.name,
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
    const teacherClass = await prisma.class.findFirst({
      where: { teacherId, tenantId },
      select: { id: true, students: true },
    });

    if (!teacherClass) {
      return res.status(404).json({
        success: false,
        error: { message: 'No class assigned' },
      });
    }

    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    // Get all students in class
    const students = teacherClass.students.filter(s => s.role === 'STUDENT');

    // Get existing attendance records
    const existingAttendance = await prisma.attendance.findMany({
      where: {
        classId: teacherClass.id,
        date: attendanceDate,
      },
      select: { studentId: true, status: true, remarks: true },
    });

    const attendanceMap = {};
    existingAttendance.forEach(a => {
      attendanceMap[a.studentId] = a;
    });

    // Build response with student data and attendance status
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
          marked: existingAttendance.length,
          unmarked: students.length - existingAttendance.length,
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

    // Get attendance records for this student
    const attendance = await prisma.attendance.findMany({
      where: {
        studentId,
        tenantId,
      },
      select: { status: true, date: true },
    });

    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const absentDays = attendance.filter(a => a.status === 'ABSENT').length;
    const excusedDays = attendance.filter(a => a.status === 'EXCUSED').length;
    const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    // Get monthly breakdown (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAttendance = attendance.filter(a => a.date >= thirtyDaysAgo);
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