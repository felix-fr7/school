/**
 * Class Bulk Student Import Controller
 *
 * Adds many students to a class in one shot from:
 *  - an uploaded Excel/CSV file (.xlsx / .xls / .csv)
 *  - a Google Sheets link (converted to its CSV export and fetched server-side)
 *  - inline JSON rows (for custom frontends)
 *
 * Every created student belongs to the logged-in class (req.user.classId)
 * and receives an auto-generated internal student ID.
 */

const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');

const User = require('../models/User');
const { getSchoolPrefixById, generateUniqueStudentId } = require('../utils/idGenerator');

// In-memory storage: the sheet is only parsed, never written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (['.xls', '.xlsx', '.csv'].includes(ext)) return cb(null, true);
    cb(new Error('Only Excel (.xls, .xlsx) and CSV (.csv) files are allowed'), false);
  }
});

// Column header aliases so sheets exported from Google/Excel with slightly
// different wording still map onto the student fields.
const HEADER_ALIASES = {
  name: ['name', 'studentname', 'student name', 'student', 'fullname', 'full name', 'nameofstudent'],
  rollNumber: ['rollnumber', 'roll number', 'roll no', 'rollno', 'roll num', 'roll', 'registernumber', 'register number', 'regno', 'reg no', 'slno', 'sl no', 'sno'],
  email: ['email', 'emailaddress', 'email address', 'emailid', 'mail', 'userid', 'user id', 'username'],
  phone: ['phone', 'phonenumber', 'mobile', 'parentmobile', 'parent mobile', 'parent phone', 'contact', 'contactnumber', 'contact number'],
  password: ['password', 'pass', 'login password'],
  admittedDate: ['admitteddate', 'admitted date', 'admissiondate', 'admission date', 'dateofadmission', 'doj', 'date'],
};

// Normalize one raw sheet row into our student fields
const normalizeRow = (row) => {
  const map = {};
  Object.keys(row || {}).forEach((key) => {
    const normalized = String(key).toLowerCase().replace(/[_\-.]/g, ' ').replace(/\s+/g, ' ').trim();
    map[normalized] = row[key];
  });

  const pick = (field) => {
    for (const alias of HEADER_ALIASES[field]) {
      const value = map[alias];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
    return '';
  };

  return {
    name: pick('name'),
    rollNumber: pick('rollNumber'),
    email: pick('email'),
    phone: pick('phone'),
    password: pick('password'),
    admittedDate: pick('admittedDate'),
  };
};

// Convert a Google Sheets share/edit URL into its CSV export URL.
// Returns null when the URL is not a Google Sheets link.
const toGoogleSheetsCsvUrl = (url) => {
  const match = String(url).match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;

  const gidMatch = String(url).match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`;
};

// Parse a workbook buffer into an array of row objects
const parseSheetBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
};

/**
 * Bulk import students into the logged-in class
 * POST /api/class-controller/students/bulk-import
 *   multipart: field "file" (.xlsx / .xls / .csv)
 *   json:      { sheetUrl?: string, rows?: [{...}], defaultPassword?: string }
 */
const bulkImportStudents = async (req, res, next) => {
  try {
    if (!req.user.isClass || !req.user.classId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Class authentication required.' }
      });
    }

    const classId = req.user.classId;
    const tenantId = req.user.tenantId;
    const defaultPassword = (req.body && req.body.defaultPassword) || 'Student@123';

    // ---- Resolve the source data (file > Google Sheets URL > inline rows) ----
    let rawRows = [];
    let source = '';

    if (req.file) {
      rawRows = parseSheetBuffer(req.file.buffer);
      source = `file: ${req.file.originalname}`;
    } else if (req.body && req.body.sheetUrl) {
      const csvUrl = toGoogleSheetsCsvUrl(req.body.sheetUrl);
      if (!csvUrl) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid Google Sheets link. Expected a link like https://docs.google.com/spreadsheets/d/<ID>/edit' }
        });
      }

      const sheetResponse = await fetch(csvUrl);
      if (!sheetResponse.ok) {
        return res.status(400).json({
          success: false,
          error: { message: 'Could not read the Google Sheet. Make sure it is shared as "Anyone with the link - Viewer".' }
        });
      }

      const csvText = await sheetResponse.text();
      const workbook = XLSX.read(csvText, { type: 'string' });
      rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
      source = 'google-sheet';
    } else if (req.body && Array.isArray(req.body.rows)) {
      rawRows = req.body.rows;
      source = 'manual-rows';
    } else {
      // Defensive check: a client that posts FormData with the wrong Content-Type
      // (e.g. application/json) leaves req.body empty and the stream unread, which
      // produces a confusing "No data provided" error. Point at the real cause.
      const contentType = req.headers['content-type'] || '';
      const looksLikeMultipart = contentType.includes('multipart/form-data');

      return res.status(400).json({
        success: false,
        error: {
          message: 'No data provided. Choose a file or paste a Google Sheets link before importing.',
          received: {
            hasFile: false,
            hasSheetUrl: false,
            hasRows: false,
            contentType: contentType || 'none',
          },
          hint: looksLikeMultipart
            ? 'The request looked like a file upload but no file was attached.'
            : 'If you are calling the API directly, send the sheet as multipart/form-data with a "file" field.',
        }
      });
    }

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'The sheet is empty. The first row must contain the column headers.' }
      });
    }

    // ---- Validate + de-duplicate rows before touching the database ----
    const errors = [];
    const seenRollNumbers = new Set();
    const pending = [];

    rawRows.forEach((rawRow, index) => {
      const rowNumber = index + 2; // +2 because row 1 is the header
      const row = normalizeRow(rawRow);

      // Skip completely blank lines
      if (!row.name && !row.rollNumber && !row.email && !row.phone) return;

      if (!row.name) {
        errors.push({ row: rowNumber, name: '', reason: 'Student name is missing' });
        return;
      }
      if (!row.rollNumber) {
        errors.push({ row: rowNumber, name: row.name, reason: 'Roll number is missing' });
        return;
      }
      if (row.password && row.password.length < 6) {
        errors.push({ row: rowNumber, name: row.name, reason: 'Password must be at least 6 characters' });
        return;
      }
      if (seenRollNumbers.has(row.rollNumber.toLowerCase())) {
        errors.push({ row: rowNumber, name: row.name, reason: `Duplicate roll number "${row.rollNumber}" in the sheet` });
        return;
      }

      seenRollNumbers.add(row.rollNumber.toLowerCase());
      pending.push({ rowNumber, ...row });
    });

    if (pending.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No valid rows found. The sheet needs at least the columns "Name" and "Roll Number".' },
        errors
      });
    }

    // Roll numbers must be unique inside this class
    const existing = await User.find({
      classId,
      role: 'Student',
      rollNumber: { $in: pending.map((p) => p.rollNumber) }
    }).select('rollNumber').lean();

    const existingSet = new Set(existing.map((s) => String(s.rollNumber).toLowerCase()));
    const toCreate = pending.filter((p) => {
      if (existingSet.has(p.rollNumber.toLowerCase())) {
        errors.push({ row: p.rowNumber, name: p.name, reason: `Roll number "${p.rollNumber}" already exists in this class` });
        return false;
      }
      return true;
    });

    if (toCreate.length === 0) {
      return res.status(409).json({
        success: false,
        error: { message: 'All rows already exist in this class or contain errors.' },
        errors
      });
    }

    // ---- Create the students ----
    const { prefix } = await getSchoolPrefixById(tenantId);
    const created = [];

    for (const item of toCreate) {
      try {
        const studentId = await generateUniqueStudentId(User, tenantId, prefix);
        const finalPassword = item.password || defaultPassword;

        // Email is unique in the DB. Use the sheet's email when given and free,
        // otherwise generate a stable internal placeholder like the single-add flow.
        let email = item.email ? item.email.toLowerCase() : null;
        if (!email || await User.exists({ email })) {
          email = `stu-${studentId}-${Date.now().toString().slice(-6)}-${created.length}@school.internal`;
        }

        const student = await User.create({
          email,
          password: finalPassword, // hashed by the User model's pre-save hook
          name: item.name,
          role: 'Student',
          schoolId: tenantId,
          studentId,
          rollNumber: item.rollNumber,
          phone: item.phone || undefined,
          classId,
          admittedDate: item.admittedDate ? new Date(item.admittedDate) : new Date(),
          isActive: true,
          // Owner tracking, same as the single "add student" flow
          createdBy: req.user.classId || req.user.id
        });

        created.push({
          id: student._id,
          name: student.name,
          studentId: student.studentId,
          rollNumber: student.rollNumber,
          email: student.email,
          password: finalPassword
        });
      } catch (rowError) {
        errors.push({ row: item.rowNumber, name: item.name, reason: rowError.message });
      }
    }

    res.status(created.length > 0 ? 201 : 400).json({
      success: created.length > 0,
      data: {
        source,
        totalRows: rawRows.length,
        createdCount: created.length,
        failedCount: errors.length,
        students: created
      },
      errors: errors.length > 0 ? errors : undefined,
      message: created.length > 0
        ? `${created.length} student(s) added to the class. ${errors.length} row(s) skipped.`
        : 'No students could be added.'
    });
  } catch (error) {
    console.error('Error in bulk student import:', error);
    next(error);
  }
};

/**
 * Download a ready-to-fill Excel template
 * GET /api/class-controller/students/bulk-import/template
 */
const getBulkTemplate = async (req, res, next) => {
  try {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Name', 'Roll Number', 'Phone', 'Email', 'Password', 'Admitted Date'],
      ['John Doe', '1', '9876543210', '', 'Student@123', ''],
      ['Jane Smith', '2', '9876543211', '', 'Student@123', '']
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Students');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="student-bulk-import-template.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadBulkSheet: upload.single('file'),
  bulkImportStudents,
  getBulkTemplate
};
