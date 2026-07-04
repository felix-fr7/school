/**
 * Fee Controller
 * Handles student fee management for admins and students
 */

const db = require('../config/db');

/**
 * Get student's own fee ledger
 * GET /api/student/fees
 */
const getStudentFees = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;

    const feeQuery = `
      SELECT 
        f.*,
        u.id as "studentId", u.name as "studentName", u."studentId" as "studentCode",
        c.id as "classId", c.name as "className", c.section as "classSection"
      FROM "Fee" f
      JOIN "User" u ON f."studentId" = u.id
      LEFT JOIN "Class" c ON u."classId" = c.id
      WHERE f."studentId" = $1 AND f."tenantId" = $2
      LIMIT 1
    `;

    const feeResult = await db.query(feeQuery, [studentId, tenantId]);

    if (feeResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No fee record found',
      });
    }

    const fee = feeResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        ...fee,
        student: {
          id: fee.studentId,
          name: fee.studentName,
          studentId: fee.studentCode,
          class: fee.classId ? {
            id: fee.classId,
            name: fee.className,
            section: fee.classSection,
          } : null,
        },
      },
    });
  } catch (error) {
    console.error('GetStudentFees Error:', error);
    next(error);
  }
};

/**
 * Update student fee (Admin only)
 * PUT /api/admin/fees/:studentId
 */
const updateStudentFee = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const tenantId = req.user.tenantId;
    const { totalAmount, paidAmount, status, dueDate, remarks } = req.body;

    // Verify student exists and belongs to this tenant
    const studentCheckQuery = `
      SELECT id FROM "User" WHERE id = $1 AND "tenantId" = $2 AND role = $3
    `;
    const studentCheckResult = await db.query(studentCheckQuery, [studentId, tenantId, 'STUDENT']);

    if (studentCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Student not found' },
      });
    }

    // Get existing fee record
    const feeCheckQuery = `SELECT * FROM "Fee" WHERE "studentId" = $1 AND "tenantId" = $2`;
    const feeCheckResult = await db.query(feeCheckQuery, [studentId, tenantId]);

    let fee;

    if (feeCheckResult.rows.length === 0) {
      // Create new fee record
      const newTotal = totalAmount || 0;
      const newPaid = paidAmount || 0;
      const balance = Math.max(0, newTotal - newPaid);
      const newStatus = status || (balance === 0 ? 'PAID' : balance < newTotal ? 'PARTIAL' : 'UNPAID');

      const createQuery = `
        INSERT INTO "Fee" ("studentId", "tenantId", "totalAmount", "paidAmount", "balanceAmount", status, "dueDate", remarks, "paymentDate", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `;

      const createResult = await db.query(createQuery, [
        studentId, tenantId, newTotal, newPaid, balance, newStatus,
        dueDate ? new Date(dueDate) : null, remarks || null, balance === 0 ? new Date() : null
      ]);

      fee = createResult.rows[0];
    } else {
      // Update existing fee
      const existingFee = feeCheckResult.rows[0];
      const updateFields = [];
      const updateParams = [];
      let paramIndex = 1;

      let total = existingFee.totalAmount;
      let paid = existingFee.paidAmount;

      if (totalAmount !== undefined) {
        updateFields.push(`"totalAmount" = $${paramIndex}`);
        updateParams.push(totalAmount);
        total = totalAmount;
        paramIndex++;
      }

      if (paidAmount !== undefined) {
        updateFields.push(`"paidAmount" = $${paramIndex}`);
        updateParams.push(paidAmount);
        paid = paidAmount;
        paramIndex++;
      }

      // Recalculate balance
      const balance = Math.max(0, total - paid);
      updateFields.push(`"balanceAmount" = $${paramIndex}`);
      updateParams.push(balance);
      paramIndex++;

      // Auto-determine status if not provided
      let feeStatus = status;
      if (!feeStatus) {
        if (balance === 0) feeStatus = 'PAID';
        else if (paid > 0) feeStatus = 'PARTIAL';
        else feeStatus = 'UNPAID';
      }
      updateFields.push(`status = $${paramIndex}`);
      updateParams.push(feeStatus);
      paramIndex++;

      if (dueDate !== undefined) {
        updateFields.push(`"dueDate" = $${paramIndex}`);
        updateParams.push(dueDate ? new Date(dueDate) : null);
        paramIndex++;
      }

      if (remarks !== undefined) {
        updateFields.push(`remarks = $${paramIndex}`);
        updateParams.push(remarks);
        paramIndex++;
      }

      // If now fully paid, set payment date
      if (balance === 0 && existingFee.balanceAmount > 0) {
        updateFields.push(`"paymentDate" = $${paramIndex}`);
        updateParams.push(new Date());
        paramIndex++;
      }

      updateFields.push(`"updatedAt" = NOW()`);
      updateParams.push(existingFee.id);

      const updateQuery = `
        UPDATE "Fee"
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const updateResult = await db.query(updateQuery, updateParams);
      fee = updateResult.rows[0];
    }

    res.status(200).json({
      success: true,
      data: fee,
      message: 'Fee record updated successfully',
    });
  } catch (error) {
    console.error('UpdateStudentFee Error:', error);
    next(error);
  }
};

/**
 * Get all fees for admin's school
 * GET /api/admin/fees?status=UNPAID&page=1&limit=10
 */
const getAllFees = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { status, page = 1, limit = 10, classId } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    let whereClause = 'f."tenantId" = $1';
    let params = [tenantId];
    let paramIndex = 2;

    if (status) {
      params.push(status);
      whereClause += ` AND f.status = $${paramIndex}`;
      paramIndex++;
    }

    if (classId) {
      params.push(classId);
      whereClause += ` AND u."classId" = $${paramIndex}`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Fee" f WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get fees
    const feesQuery = `
      SELECT 
        f.*,
        u.id as "studentId", u.name as "studentName", u."studentId" as "studentCode",
        c.id as "classId", c.name as "className", c.section as "classSection"
      FROM "Fee" f
      JOIN "User" u ON f."studentId" = u.id
      LEFT JOIN "Class" c ON u."classId" = c.id
      WHERE ${whereClause}
      ORDER BY f."createdAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const feesParams = [...params, take, skip];
    const feesResult = await db.query(feesQuery, feesParams);

    const fees = feesResult.rows.map(fee => ({
      ...fee,
      student: {
        id: fee.studentId,
        name: fee.studentName,
        studentId: fee.studentCode,
        class: fee.classId ? {
          id: fee.classId,
          name: fee.className,
          section: fee.classSection,
        } : null,
      },
    }));

    // Calculate summary
    const totalAmount = fees.reduce((sum, f) => sum + parseFloat(f.totalAmount), 0);
    const paidAmount = fees.reduce((sum, f) => sum + parseFloat(f.paidAmount), 0);
    const balanceAmount = fees.reduce((sum, f) => sum + parseFloat(f.balanceAmount), 0);

    res.status(200).json({
      success: true,
      data: {
        fees,
        summary: {
          totalRecords: total,
          totalAmount,
          paidAmount,
          balanceAmount,
          collectionRate: totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(1) : '0',
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('GetAllFees Error:', error);
    next(error);
  }
};

/**
 * Get fee statistics for dashboard
 * GET /api/admin/fees/stats
 */
const getFeeStats = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    const statsQuery = `
      SELECT 
        COUNT(*) as "totalStudents",
        COUNT(*) FILTER (WHERE status = 'PAID') as "paidStudents",
        COUNT(*) FILTER (WHERE status = 'PARTIAL') as "partialStudents",
        COUNT(*) FILTER (WHERE status = 'UNPAID') as "unpaidStudents",
        COALESCE(SUM("totalAmount"), 0) as "totalAmount",
        COALESCE(SUM("paidAmount"), 0) as "totalPaid",
        COALESCE(SUM("balanceAmount"), 0) as "totalBalance"
      FROM "Fee"
      WHERE "tenantId" = $1
    `;

    const statsResult = await db.query(statsQuery, [tenantId]);
    const stats = statsResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        students: {
          total: parseInt(stats.totalStudents),
          paid: parseInt(stats.paidStudents),
          partial: parseInt(stats.partialStudents),
          unpaid: parseInt(stats.unpaidStudents),
        },
        amounts: {
          total: parseFloat(stats.totalAmount),
          paid: parseFloat(stats.totalPaid),
          balance: parseFloat(stats.totalBalance),
          collectionRate: parseFloat(stats.totalAmount) > 0 
            ? ((parseFloat(stats.totalPaid) / parseFloat(stats.totalAmount)) * 100).toFixed(1) 
            : '0',
        },
      },
    });
  } catch (error) {
    console.error('GetFeeStats Error:', error);
    next(error);
  }
};

module.exports = {
  getStudentFees,
  updateStudentFee,
  getAllFees,
  getFeeStats,
};