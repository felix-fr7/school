/**
 * Report Card Controller
 * Handles report card uploads and management for teachers/admins
 * and retrieval for students
 */

const mongoose = require('mongoose');
const ReportCard = require('../models/ReportCard');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Class = require('../models/Class');
const School = require('../models/School');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const XLSX = require('xlsx');
const { uploadSingle } = require('../middleware/fileUpload');

// ============================================
// ADMIN/TEACHER ENDPOINTS
// ============================================

/**
 * Upload a report card file (image or PDF) for a student
 * POST /api/reportcards/upload
 */
exports.uploadReportCard = async (req, res, next) => {
  try {
    const { 
      studentId, 
      term, 
      academicYear, 
      teacherRemarks, 
      principalRemarks 
    } = req.body;
    
    const tenantId = req.user.tenantId;
    const uploadedBy = req.user.id;

    // Validate required fields
    if (!studentId || !term || !academicYear) {
      return res.status(400).json({
        success: false,
        error: { message: 'Student ID, term, and academic year are required' }
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'Report card file (image or PDF) is required' }
      });
    }

    // Determine file type
    const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'pdf';
    
    // Build file URL
    const fileUrl = `${process.env.API_URL || 'http://localhost:3000'}/uploads/${req.file.filename}`;

    // Get student's class information
    let studentClassId = null;
    let className = null;
    let classSection = null;
    try {
      console.log('[uploadReportCard] Looking for student profile:', {
        tenantId,
        studentId,
        isValid: mongoose.Types.ObjectId.isValid(tenantId)
      });
      
      // Note: StudentProfile uses schoolId, not tenantId. Also no isActive field in schema
      const studentProfile = await StudentProfile.findOne({
        schoolId: mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId,
        userId: studentId
      }).populate('classId', 'name section');
      
      console.log('[uploadReportCard] Found student profile:', studentProfile ? {
        hasProfile: true,
        profileId: studentProfile._id,
        classId: studentProfile.classId,
        className: studentProfile.classId?.name,
        section: studentProfile.classId?.section
      } : { hasProfile: false });
      
      if (studentProfile && studentProfile.classId) {
        studentClassId = studentProfile.classId;
        className = studentProfile.classId.name;
        classSection = studentProfile.classId.section;
        console.log('[uploadReportCard] Setting class info:', { studentClassId, className, classSection });
      } else {
        console.warn('[uploadReportCard] Student profile found but no classId assigned');
      }
    } catch (profileError) {
      console.warn('[uploadReportCard] Could not fetch student profile for class info:', profileError.message);
    }

    // Check if report card already exists for this student/term/year
    let reportCard = await ReportCard.findOne({
      student: studentId,
      term,
      academicYear
    });

    if (reportCard) {
      // Update existing report card
      reportCard.reportCardFileUrl = fileUrl;
      reportCard.reportCardFileType = fileType;
      reportCard.teacherRemarks = teacherRemarks || reportCard.teacherRemarks;
      reportCard.principalRemarks = principalRemarks || reportCard.principalRemarks;
      // Update classId and createdBy if not set
      if (!reportCard.classId && studentClassId) {
        reportCard.classId = studentClassId;
      }
      if (!reportCard.createdBy) {
        reportCard.createdBy = uploadedBy;
      }
      // Do not auto-publish - admin must manually send
      reportCard.isPublished = false;
      reportCard.publishedAt = undefined;
      reportCard.issuedDate = undefined;
    } else {
      // Create new report card (file-only version)
      reportCard = new ReportCard({
        student: studentId,
        schoolId: tenantId,
        classId: studentClassId,
        className: className,
        classSection: classSection,
        createdBy: uploadedBy,
        term,
        academicYear,
        reportCardFileUrl: fileUrl,
        reportCardFileType: fileType,
        teacherRemarks,
        principalRemarks,
        totalPercentage: 0,  // Required field - will be updated if subjects are added later
        overallGrade: 'N/A',  // Required field - will be updated if subjects are added later
        isPublished: false,
        publishedAt: undefined,
        issuedDate: undefined
      });
    }

    await reportCard.save();

    res.status(201).json({
      success: true,
      message: 'Report card uploaded successfully',
      data: reportCard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a digital report card with marks
 * POST /api/reportcards
 */
exports.createReportCard = async (req, res, next) => {
  try {
    const {
      studentId,
      classId,  // Get classId from request body (sent from frontend)
      term,
      academicYear,
      subjects,
      teacherRemarks,
      principalRemarks
    } = req.body;

    // Get tenantId from user or header
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    const currentUserId = req.user?.id;
    
    console.log('[createReportCard] tenantId:', tenantId, 'user:', req.user);
    console.log('[createReportCard] Received classId:', classId);

    // Validate required fields
    if (!studentId || !term || !academicYear || !subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Student ID, term, academic year, and at least one subject are required' }
      });
    }

    // Check if report card already exists
    let existingReportCard = await ReportCard.findOne({
      student: studentId,
      term,
      academicYear
    });

    if (existingReportCard) {
      return res.status(409).json({
        success: false,
        error: { message: 'Report card already exists for this student, term, and academic year' }
      });
    }

    // Get student's class information
    // Priority: 1. classId from request body, 2. StudentProfile lookup
    let studentClassId = null;
    let className = null;
    let classSection = null;

    if (classId) {
      // Use classId from request body (preferred method)
      console.log('[createReportCard] Using classId from request body:', classId);
      studentClassId = classId;
      
      // Get class name and section from Class model
      try {
        const classDoc = await Class.findById(classId).select('name section');
        if (classDoc) {
          className = classDoc.name;
          classSection = classDoc.section;
          console.log('[createReportCard] Found class:', { className, classSection });
        } else {
          console.warn('[createReportCard] Class not found for classId:', classId);
        }
      } catch (classError) {
        console.warn('[createReportCard] Error fetching class details:', classError.message);
      }
    } else {
      // Fallback: Try to get class from StudentProfile
      console.log('[createReportCard] No classId in request, trying StudentProfile lookup');
      try {
        const studentProfile = await StudentProfile.findOne({
          schoolId: mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId,
          userId: studentId
        }).populate('classId', 'name section');
        
        if (studentProfile && studentProfile.classId) {
          studentClassId = studentProfile.classId;
          className = studentProfile.classId.name;
          classSection = studentProfile.classId.section;
          console.log('[createReportCard] Found class from StudentProfile:', { studentClassId, className, classSection });
        } else {
          console.warn('[createReportCard] Student profile found but no classId assigned');
        }
      } catch (profileError) {
        console.warn('[createReportCard] Could not fetch student profile for class info:', profileError.message);
      }
    }

    // Process subjects - calculate grade for each subject
    const processedSubjects = subjects.map(subject => {
      const marksObtained = parseFloat(subject.marksObtained);
      const totalMarks = parseFloat(subject.totalMarks);
      
      if (!totalMarks || totalMarks <= 0) {
        throw new Error(`Total marks must be greater than 0 for ${subject.subjectName}`);
      }
      
      if (marksObtained < 0 || marksObtained > totalMarks) {
        throw new Error(`Marks obtained must be between 0 and ${totalMarks} for ${subject.subjectName}`);
      }

      const percentage = (marksObtained / totalMarks) * 100;
      const grade = calculateGrade(percentage);
      const remarks = getGradeRemark(grade);

      return {
        subjectName: subject.subjectName,
        marksObtained,
        totalMarks,
        grade,
        remarks
      };
    });

    // Calculate overall percentage and grade
    const totalObtained = processedSubjects.reduce((sum, s) => sum + s.marksObtained, 0);
    const totalMax = processedSubjects.reduce((sum, s) => sum + s.totalMarks, 0);
    const overallPercentage = totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
    const overallGrade = calculateGrade(overallPercentage);

    // Create new report card with classId, className, classSection and createdBy
    const reportCard = new ReportCard({
      student: studentId,
      schoolId: tenantId,
      classId: studentClassId,
      className: className,
      classSection: classSection,
      createdBy: currentUserId,
      term,
      academicYear,
      subjects: processedSubjects,
      totalPercentage: overallPercentage,
      overallGrade,
      teacherRemarks,
      principalRemarks,
      isPublished: false,
      publishedAt: undefined,
      issuedDate: undefined
    });

    await reportCard.save();

    res.status(201).json({
      success: true,
      message: 'Report card created successfully',
      data: reportCard
    });
  } catch (error) {
    console.error('Create Report Card Error:', error);
    next(error);
  }
};

/**
 * Get all report cards for admin/teacher view
 * GET /api/reportcards?classId=xxx&term=xxx&academicYear=xxx&className=xxx&classSection=xxx
 */
exports.getReportCards = async (req, res, next) => {
  try {
    const { classId, term, academicYear, page = 1, limit = 100, search, className, classSection } = req.query;
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];

    console.log('[ReportCards] getReportCards - tenantId:', tenantId, 'type:', typeof tenantId);
    console.log('[ReportCards] getReportCards - user:', req.user);
    console.log('[ReportCards] getReportCards - query params:', { classId, term, academicYear, page, limit, search, className, classSection });

    // Admin can see all report cards (published and unpublished)
    // Use lean() and manually construct the query to bypass the pre-find hook
    let query = {};
    
    // Only filter by schoolId if tenantId is available
    if (tenantId) {
      // Convert to ObjectId if it's a valid string
      const mongoose = require('mongoose');
      query.schoolId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId;
    }

    if (term) query.term = term;
    if (academicYear) query.academicYear = academicYear;
    
    // Filter by class - use classId if provided, otherwise use className and classSection
    if (classId) {
      // Convert classId to ObjectId for proper matching
      const mongoose = require('mongoose');
      const classIdQuery = mongoose.Types.ObjectId.isValid(classId) 
        ? new mongoose.Types.ObjectId(classId) 
        : classId;
      
      console.log('[ReportCards] Filtering by classId:', classIdQuery);
      
      // Filter report cards by classId stored in the report card itself
      // This ensures only report cards created for this class are returned
      query.classId = classIdQuery;
      
      console.log('[ReportCards] Report cards query will filter by classId:', classIdQuery);
    }

    if (search) {
      const Student = require('../models/User');
      const mongoose = require('mongoose');
      
      console.log('[ReportCards] Searching for students with:', search);
      console.log('[ReportCards] tenantId:', tenantId);
      
      // Search students by name, email, or roll number
      const students = await Student.find({
        tenantId: mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId,
        role: 'Student',
        isActive: true,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { rollNumber: { $regex: search, $options: 'i' } }
        ]
      }).select('_id name email rollNumber');
      
      console.log('[ReportCards] Search found', students.length, 'students matching:', search);
      if (students.length > 0) {
        console.log('[ReportCards] Matching students:', students.map(s => ({ id: s._id, name: s.name, rollNumber: s.rollNumber })));
      }
      
      const studentIds = students.map(s => s._id);
      if (studentIds.length > 0) {
        // When searching, show ALL report cards for matching students (ignore class/term/year filters)
        query.student = { $in: studentIds };
        // Remove class-based student filtering when searching
        delete query.schoolId; // Keep schoolId for multi-tenant security
        // Re-add schoolId for security
        if (tenantId) {
          query.schoolId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId;
        }
        console.log('[ReportCards] Search mode: Query for report cards:', JSON.stringify(query));
        
        // Also search report cards directly to verify
        const reportCardsCheck = await ReportCard.collection.find({
          student: { $in: studentIds },
          schoolId: mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId
        }).toArray();
        console.log('[ReportCards] Direct check - Found', reportCardsCheck.length, 'report cards for these students');
      } else {
        // No students found matching search, return empty
        console.log('[ReportCards] No students found matching search:', search);
        // Log all students to help debug
        const allStudents = await Student.find({
          tenantId: mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId,
          role: 'Student',
          isActive: true
        }).select('name email rollNumber').limit(10);
        console.log('[ReportCards] Sample students in system:', allStudents.map(s => ({ name: s.name, rollNumber: s.rollNumber, email: s.email })));
      }
    }

    console.log('[ReportCards] Final query:', JSON.stringify(query, null, 2));

    const skip = (page - 1) * limit;

    // Use ReportCard.collection.find() to bypass mongoose pre-find hooks
    // This allows admins to see all report cards including unpublished ones
    const mongoQuery = { ...query }; // Create a copy to avoid modifying the original
    
    // Get report cards directly from MongoDB collection (bypass pre-find hook)
    const reportCardsData = await ReportCard.collection.find(mongoQuery)
      .sort({ academicYear: -1, term: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    console.log('[ReportCards] Found', reportCardsData.length, 'report cards');

    // Populate student data manually
    const User = require('../models/User');
    const studentIds = [...new Set(reportCardsData.map(rc => rc.student.toString()))];
    const students = await User.find({ _id: { $in: studentIds } }).select('name email rollNumber');
    const studentMap = {};
    students.forEach(s => { studentMap[s._id.toString()] = s; });
    
    // Convert MongoDB documents to Mongoose documents and add populated student
    const reportCards = reportCardsData.map(data => {
      const doc = new ReportCard(data);
      doc.student = studentMap[data.student] || null;
      return doc;
    });

    const total = await ReportCard.collection.countDocuments(mongoQuery);

    res.json({
      success: true,
      data: reportCards,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[ReportCards] Error in getReportCards:', error);
    next(error);
  }
};

/**
 * Update a report card
 * PUT /api/reportcards/:id
 */
exports.updateReportCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const tenantId = req.user.tenantId;

    const reportCard = await ReportCard.findOne({
      _id: id,
      schoolId: tenantId
    });

    if (!reportCard) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report card not found' }
      });
    }

    // Update fields
    Object.assign(reportCard, updateData);
    
    await reportCard.save();

    res.json({
      success: true,
      message: 'Report card updated successfully',
      data: reportCard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a report card
 * DELETE /api/reportcards/:id
 */
exports.deleteReportCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const reportCard = await ReportCard.findOne({
      _id: id,
      schoolId: tenantId
    });

    if (!reportCard) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report card not found' }
      });
    }

    // Delete file if it exists
    if (reportCard.reportCardFileUrl) {
      const relativePath = reportCard.reportCardFileUrl.replace(`${process.env.API_URL || 'http://localhost:3000'}/`, '');
      const fullPath = path.join(__dirname, '../../', relativePath);
      
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await ReportCard.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Report card deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single report card by ID with school and student details
 * GET /api/reportcards/:id
 */
exports.getReportCardById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const reportCard = await ReportCard.findOne({
      _id: id,
      schoolId: tenantId
    }).populate('student', 'name email rollNumber class');

    if (!reportCard) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report card not found' }
      });
    }

    // Fetch school information
    const school = await School.findById(tenantId).select('schoolName schoolCode address contactEmail contactPhone');

    // Get class information from StudentProfile
    let classInfo = null;
    if (reportCard.student) {
      const studentProfile = await StudentProfile.findOne({
        tenantId,
        userId: reportCard.student._id,
        isActive: true
      }).populate('classId', 'name section');
      
      if (studentProfile && studentProfile.classId) {
        classInfo = studentProfile.classId;
      }
    }

    // Prepare response with all details
    const reportCardData = reportCard.toObject();
    reportCardData.school = school;
    reportCardData.classInfo = classInfo;

    res.json({
      success: true,
      data: reportCardData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get school information for report cards
 * GET /api/reportcards/school-info
 */
exports.getSchoolInfo = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    const school = await School.findById(tenantId).select('schoolName schoolCode address contactEmail contactPhone');

    if (!school) {
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' }
      });
    }

    res.json({
      success: true,
      data: school
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// STUDENT ENDPOINTS
// ============================================

/**
 * Get student's own report cards
 * GET /api/reportcards/student/my-report-cards
 */
exports.getMyReportCards = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { term, academicYear } = req.query;
    
    console.log('[getMyReportCards] Student ID:', studentId);
    console.log('[getMyReportCards] Query params:', { term, academicYear });

    let query = { 
      student: studentId,
      isPublished: true 
    };

    if (term) query.term = term;
    if (academicYear) query.academicYear = academicYear;

    console.log('[getMyReportCards] Query:', JSON.stringify(query));
    
    // Debug: Check total report cards for this student (including unpublished)
    const allCardsForStudent = await ReportCard.countDocuments({ student: studentId });
    console.log('[getMyReportCards] Total report cards for student (all):', allCardsForStudent);
    
    const publishedCardsForStudent = await ReportCard.countDocuments({ student: studentId, isPublished: true });
    console.log('[getMyReportCards] Published report cards for student:', publishedCardsForStudent);

    const reportCards = await ReportCard.find(query)
      .sort({ academicYear: -1, term: 1, issuedDate: -1 });

    console.log('[getMyReportCards] Found', reportCards.length, 'report cards');

    res.json({
      success: true,
      data: reportCards
    });
  } catch (error) {
    console.error('[getMyReportCards] Error:', error);
    next(error);
  }
};

/**
 * Get a single report card for student
 * GET /api/reportcards/student/:id
 */
exports.getStudentReportCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const reportCard = await ReportCard.findOne({
      _id: id,
      student: studentId,
      isPublished: true
    });

    if (!reportCard) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report card not found or not accessible' }
      });
    }

    res.json({
      success: true,
      data: reportCard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Publish/Send a report card to a student
 * This makes the report card visible to the student
 * PUT /api/reportcards/:id/publish
 */
exports.publishReportCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const currentUserId = req.user.id;

    const reportCard = await ReportCard.findOne({
      _id: id,
      schoolId: tenantId
    }).populate('student', 'name email rollNumber');

    if (!reportCard) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report card not found' }
      });
    }

    // Update the report card to published state
    reportCard.isPublished = true;
    reportCard.publishedAt = new Date();
    reportCard.issuedDate = new Date();
    // Set sentBy to the current user (admin) who is sending the report card
    reportCard.sentBy = currentUserId;
    
    await reportCard.save();

    res.json({
      success: true,
      message: `Report card sent to ${reportCard.student?.name || 'student'} successfully`,
      data: reportCard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Publish all unpublished report cards for a specific class
 * This sends report cards to all students in the class at once
 * PUT /api/reportcards/class/:classId/publish-all
 */
exports.publishAllReportCardsForClass = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const tenantId = req.user.tenantId;

    if (!classId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Class ID is required' }
      });
    }

    // Get all students in this class
    const StudentProfile = require('../models/StudentProfile');
    const studentProfiles = await StudentProfile.find({ 
      tenantId, 
      classId, 
      isActive: true 
    }).select('userId');
    
    if (studentProfiles.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No students found in this class' }
      });
    }

    const studentIds = studentProfiles.map(sp => sp.userId);

    // Find all unpublished report cards for students in this class
    const unpublishedReportCards = await ReportCard.find({
      student: { $in: studentIds },
      schoolId: tenantId,
      isPublished: false
    });

    if (unpublishedReportCards.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No unpublished report cards found for this class' }
      });
    }

    // Publish all found report cards
    const updatePromises = unpublishedReportCards.map(reportCard => {
      reportCard.isPublished = true;
      reportCard.publishedAt = new Date();
      reportCard.issuedDate = new Date();
      return reportCard.save();
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: `Successfully sent ${unpublishedReportCards.length} report card(s) to students in this class`,
      data: {
        publishedCount: unpublishedReportCards.length,
        studentCount: studentProfiles.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Acknowledge report card (parent acknowledgment)
 * PUT /api/reportcards/student/:id/acknowledge
 */
exports.acknowledgeReportCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { parentSignature } = req.body;
    const studentId = req.user.id;

    const reportCard = await ReportCard.findOne({
      _id: id,
      student: studentId,
      isPublished: true
    });

    if (!reportCard) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report card not found' }
      });
    }

    reportCard.parentAcknowledgment = true;
    reportCard.parentSignature = parentSignature || null;
    
    await reportCard.save();

    res.json({
      success: true,
      message: 'Report card acknowledged successfully',
      data: reportCard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get report cards by student name and roll number
 * This endpoint allows admin to search for a student by name and roll number
 * and retrieve all report cards created for that student
 * GET /api/reportcards/by-student?name=xxx&rollNumber=xxx
 */
exports.getReportCardsByStudent = async (req, res, next) => {
  try {
    const { name, rollNumber } = req.query;
    const tenantId = req.user.tenantId;

    // Validate input - at least one parameter is required
    if (!name && !rollNumber) {
      return res.status(400).json({
        success: false,
        error: { message: 'Student name or roll number is required' }
      });
    }

    console.log('[ReportCards] getReportCardsByStudent - name:', name, 'rollNumber:', rollNumber, 'tenantId:', tenantId);

    // Build query to find the student
    const studentQuery = {
      role: 'Student',
      isActive: true
    };

    // Only filter by schoolId if tenantId is available
    if (tenantId) {
      const mongoose = require('mongoose');
      studentQuery.schoolId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId;
    }

    // Add name and/or rollNumber filters
    if (name) {
      studentQuery.name = { $regex: name, $options: 'i' };
    }
    if (rollNumber) {
      studentQuery.rollNumber = rollNumber; // Exact match for roll number
    }

    // Find the student
    const student = await User.findOne(studentQuery).select('_id name email rollNumber');

    if (!student) {
      return res.status(404).json({
        success: false,
        error: { message: 'Student not found with the provided name and roll number' }
      });
    }

    console.log('[ReportCards] Found student:', student._id, student.name, student.rollNumber);

    // Now find all report cards for this student
    const reportCardQuery = {
      student: student._id
    };

    // Only filter by schoolId if tenantId is available
    if (tenantId) {
      const mongoose = require('mongoose');
      reportCardQuery.schoolId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId;
    }

    // Get all report cards for this student (bypass pre-find hook)
    const reportCardsData = await ReportCard.collection.find(reportCardQuery)
      .sort({ academicYear: -1, term: 1, createdAt: -1 })
      .toArray();

    console.log('[ReportCards] Found', reportCardsData.length, 'report cards for student');

    // Return the results
    res.json({
      success: true,
      data: {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber
        },
        reportCards: reportCardsData,
        count: reportCardsData.length
      }
    });
  } catch (error) {
    console.error('[ReportCards] Error in getReportCardsByStudent:', error);
    next(error);
  }
};

/**
 * Calculate grade based on percentage
 */
const calculateGrade = (percentage) => {
  if (percentage >= 90) return 'A1';
  if (percentage >= 80) return 'A2';
  if (percentage >= 70) return 'B1';
  if (percentage >= 60) return 'B2';
  if (percentage >= 50) return 'C1';
  if (percentage >= 40) return 'C2';
  if (percentage >= 33) return 'D';
  return 'E';
};

/**
 * Get grade remark based on grade
 */
const getGradeRemark = (grade) => {
  const remarks = {
    'A1': 'Excellent',
    'A2': 'Very Good',
    'B1': 'Good',
    'B2': 'Above Average',
    'C1': 'Average',
    'C2': 'Below Average',
    'D': 'Needs Improvement',
    'E': 'Fail'
  };
  return remarks[grade] || '';
};

/**
 * Bulk upload report cards via Excel file
 * POST /api/reportcards/bulk-upload
 * 
 * Excel format (two supported formats):
 * 
 * Format 1 - Marks Entry (Subject-wise):
 * | Student Name | Roll Number | Subject | Max Marks | Marks Obtained |
 * 
 * Format 2 - File Upload (Legacy):
 * | Student Name | Roll Number | PDF Filename |
 */
exports.bulkUploadReportCards = async (req, res, next) => {
  try {
    const { term, academicYear, classId } = req.body;
    const tenantId = req.user.tenantId;

    // Validate required fields
    if (!term || !academicYear || !classId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Term, academic year, and class ID are required' }
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'Excel file is required' }
      });
    }

    // Read Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Validate Excel format - skip header row
    if (data.length < 2) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: { message: 'Excel file must have at least a header row and one data row' }
      });
    }

    // Get header row and normalize
    const headerRow = data[0].map(h => String(h || '').toLowerCase().trim());
    
    // Detect format based on headers
    const hasSubjectColumn = headerRow.includes('subject');
    const hasMarksColumn = headerRow.includes('marks obtained') || headerRow.includes('marks');
    const hasMaxMarksColumn = headerRow.includes('max marks') || headerRow.includes('total marks');
    const hasPdfFilename = headerRow.includes('pdf filename') || headerRow.includes('filename');

    // Get all students in the specified class with their roll numbers
    const studentProfiles = await StudentProfile.find({
      tenantId,
      classId,
      isActive: true
    }).populate('userId', 'name rollNumber');

    // Create a map of rollNumber -> student data
    const studentMap = {};
    studentProfiles.forEach(profile => {
      if (profile.userId && profile.userId.rollNumber) {
        studentMap[String(profile.userId.rollNumber).trim()] = profile.userId;
      }
    });

    const results = {
      success: [],
      failed: [],
      notFound: []
    };

    // Format 1: Marks Entry (Subject-wise)
    if (hasSubjectColumn && hasMarksColumn) {
      // Group data by student (roll number)
      const studentMarksMap = {};
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 4) continue;

        // Map columns based on header positions
        const rowObj = {};
        headerRow.forEach((header, idx) => {
          rowObj[header] = row[idx] !== undefined ? String(row[idx] || '').trim() : '';
        });

        const rollNumber = rowObj['roll number'] || rowObj['roll no'] || rowObj['rollno'];
        if (!rollNumber) continue;

        if (!studentMarksMap[rollNumber]) {
          studentMarksMap[rollNumber] = {
            studentName: rowObj['student name'] || rowObj['name'] || '',
            subjects: []
          };
        }

        const subjectName = rowObj['subject'] || rowObj['subject name'];
        const marksObtained = parseFloat(rowObj['marks obtained'] || rowObj['marks'] || '0');
        const maxMarks = parseFloat(rowObj['max marks'] || rowObj['total marks'] || '100');

        if (subjectName && !isNaN(marksObtained) && !isNaN(maxMarks) && maxMarks > 0) {
          const percentage = (marksObtained / maxMarks) * 100;
          const grade = calculateGrade(percentage);
          
          studentMarksMap[rollNumber].subjects.push({
            subjectName,
            marksObtained,
            totalMarks: maxMarks,
            grade,
            remarks: getGradeRemark(grade)
          });
        }
      }

      // Create/update report cards for each student
      for (const [rollNumber, studentData] of Object.entries(studentMarksMap)) {
        const student = studentMap[rollNumber];
        
        if (!student) {
          results.notFound.push({
            rollNumber,
            studentName: studentData.studentName,
            reason: 'Student not found in this class'
          });
          continue;
        }

        try {
          // Calculate overall percentage and grade
          const totalObtained = studentData.subjects.reduce((sum, s) => sum + s.marksObtained, 0);
          const totalMax = studentData.subjects.reduce((sum, s) => sum + s.totalMarks, 0);
          const overallPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
          const overallGrade = calculateGrade(overallPercentage);

          // Check if report card already exists
          let reportCard = await ReportCard.findOne({
            student: student._id,
            term,
            academicYear
          });

          if (reportCard) {
            // Update existing
            reportCard.subjects = studentData.subjects;
            reportCard.totalPercentage = parseFloat(overallPercentage.toFixed(2));
            reportCard.overallGrade = overallGrade;
            reportCard.isPublished = false;
            reportCard.publishedAt = undefined;
            reportCard.issuedDate = undefined;
          } else {
            // Create new
            reportCard = new ReportCard({
              student: student._id,
              schoolId: tenantId,
              term,
              academicYear,
              subjects: studentData.subjects,
              totalPercentage: parseFloat(overallPercentage.toFixed(2)),
              overallGrade: overallGrade,
              isPublished: false,
              publishedAt: undefined,
              issuedDate: undefined
            });
          }

          await reportCard.save();
          results.success.push({
            rollNumber,
            studentName: student.name,
            reportCardId: reportCard._id,
            percentage: reportCard.totalPercentage,
            grade: reportCard.overallGrade
          });
        } catch (err) {
          results.failed.push({
            rollNumber,
            studentName: studentData.studentName,
            reason: err.message
          });
        }
      }
    } 
    // Format 2: File Upload (Legacy)
    else if (hasPdfFilename) {
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 3) continue;

        const rowObj = {};
        headerRow.forEach((header, idx) => {
          rowObj[header] = row[idx] !== undefined ? String(row[idx] || '').trim() : '';
        });

        const studentName = rowObj['student name'] || rowObj['name'];
        const rollNumber = rowObj['roll number'] || rowObj['roll no'];
        const pdfFilename = rowObj['pdf filename'] || rowObj['filename'];

        if (!studentName || !rollNumber || !pdfFilename) {
          results.failed.push({
            row: i + 1,
            data: { studentName, rollNumber, pdfFilename },
            reason: 'Missing required fields'
          });
          continue;
        }

        const student = studentMap[rollNumber];
        if (!student) {
          results.notFound.push({
            row: i + 1,
            rollNumber,
            studentName,
            reason: 'Student not found in this class'
          });
          continue;
        }

        const pdfPath = path.join(__dirname, '../../uploads/reportcards', pdfFilename);
        if (!fs.existsSync(pdfPath)) {
          results.failed.push({
            row: i + 1,
            rollNumber,
            studentName,
            pdfFilename,
            reason: `PDF file not found: ${pdfFilename}`
          });
          continue;
        }

        const fileType = pdfFilename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
        const fileUrl = `${process.env.API_URL || 'http://localhost:3000'}/uploads/reportcards/${pdfFilename}`;

        try {
          let reportCard = await ReportCard.findOne({
            student: student._id,
            term,
            academicYear
          });

          if (reportCard) {
            reportCard.reportCardFileUrl = fileUrl;
            reportCard.reportCardFileType = fileType;
            reportCard.isPublished = false;
            reportCard.publishedAt = undefined;
            reportCard.issuedDate = undefined;
          } else {
            reportCard = new ReportCard({
              student: student._id,
              schoolId: tenantId,
              term,
              academicYear,
              reportCardFileUrl: fileUrl,
              reportCardFileType: fileType,
              totalPercentage: 0,
              overallGrade: 'N/A',
              isPublished: false,
              publishedAt: undefined,
              issuedDate: undefined
            });
          }

          await reportCard.save();
          results.success.push({
            row: i + 1,
            rollNumber,
            studentName: student.name,
            reportCardId: reportCard._id
          });
        } catch (err) {
          results.failed.push({
            row: i + 1,
            rollNumber,
            studentName,
            reason: err.message
          });
        }
      }
    } else {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid Excel format. Please use either Marks Entry format (Student Name, Roll Number, Subject, Max Marks, Marks Obtained) or File Upload format (Student Name, Roll Number, PDF Filename)' }
      });
    }

    // Delete uploaded Excel file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Processed bulk upload`,
      data: {
        successCount: results.success.length,
        failedCount: results.failed.length,
        notFoundCount: results.notFound.length,
        results
      }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};
