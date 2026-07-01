/**
 * Fee Controller
 * Handles student fee management for admins and students
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get student's own fee ledger
 * GET /api/student/fees
 */
const getStudentFees = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;

    const fee = await prisma.fee.findFirst({
      where: { studentId, tenantId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
            class: {
              select: { name: true, section: true },
            },
          },
        },
      },
    });

    if (!fee) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No fee record found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...fee,
        student: fee.student,
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
    const student = await prisma.user.findFirst({
      where: { id: studentId, tenantId, role: 'STUDENT' },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: { message: 'Student not found' },
      });
    }

    // Get existing fee record or create new one
    let fee = await prisma.fee.findFirst({
      where: { studentId, tenantId },
    });

    if (!fee) {
      // Create new fee record
      const newTotal = totalAmount || 0;
      const newPaid = paidAmount || 0;
      const balance = Math.max(0, newTotal - newPaid);
      const newStatus = status || (balance === 0 ? 'PAID' : balance < newTotal ? 'PARTIAL' : 'UNPAID');

      fee = await prisma.fee.create({
        data: {
          studentId,
          tenantId,
          totalAmount: newTotal,
          paidAmount: newPaid,
          balanceAmount: balance,
          status: newStatus,
          dueDate: dueDate ? new Date(dueDate) : null,
          remarks,
          paymentDate: balance === 0 ? new Date() : null,
        },
      });
    } else {
      // Update existing fee
      const updateData = {};
      
      if (totalAmount !== undefined) {
        updateData.totalAmount = totalAmount;
      }
      
      if (paidAmount !== undefined) {
        updateData.paidAmount = paidAmount;
      }

      // Recalculate balance
      const total = updateData.totalAmount !== undefined ? updateData.totalAmount : fee.totalAmount;
      const paid = updateData.paidAmount !== undefined ? updateData.paidAmount : fee.paidAmount;
      const balance = Math.max(0, total - paid);
      updateData.balanceAmount = balance;

      // Auto-determine status if not provided
      if (status) {
        updateData.status = status;
      } else {
        if (balance === 0) updateData.status = 'PAID';
        else if (paid > 0) updateData.status = 'PARTIAL';
        else updateData.status = 'UNPAID';
      }

      if (dueDate !== undefined) {
        updateData.dueDate = dueDate ? new Date(dueDate) : null;
      }

      if (remarks !== undefined) {
        updateData.remarks = remarks;
      }

      // If now fully paid, set payment date
      if (balance === 0 && fee.balanceAmount > 0) {
        updateData.paymentDate = new Date();
      }

      fee = await prisma.fee.update({
        where: { id: fee.id },
        data: updateData,
      });
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

    const where = { tenantId };
    if (status) where.status = status;

    // If classId provided, filter by students in that class
    if (classId) {
      where.student = { classId };
    }

    const total = await prisma.fee.count({ where });

    const fees = await prisma.fee.findMany({
      where,
      skip,
      take,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
            class: {
              select: { name: true, section: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary
    const totalAmount = fees.reduce((sum, f) => sum + f.totalAmount, 0);
    const paidAmount = fees.reduce((sum, f) => sum + f.paidAmount, 0);
    const balanceAmount = fees.reduce((sum, f) => sum + f.balanceAmount, 0);

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

    const fees = await prisma.fee.findMany({
      where: { tenantId },
      select: {
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        status: true,
      },
    });

    const totalStudents = fees.length;
    const paidStudents = fees.filter(f => f.status === 'PAID').length;
    const partialStudents = fees.filter(f => f.status === 'PARTIAL').length;
    const unpaidStudents = fees.filter(f => f.status === 'UNPAID').length;
    const totalAmount = fees.reduce((sum, f) => sum + f.totalAmount, 0);
    const totalPaid = fees.reduce((sum, f) => sum + f.paidAmount, 0);
    const totalBalance = fees.reduce((sum, f) => sum + f.balanceAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        students: {
          total: totalStudents,
          paid: paidStudents,
          partial: partialStudents,
          unpaid: unpaidStudents,
        },
        amounts: {
          total: totalAmount,
          paid: totalPaid,
          balance: totalBalance,
          collectionRate: totalAmount > 0 ? ((totalPaid / totalAmount) * 100).toFixed(1) : '0',
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