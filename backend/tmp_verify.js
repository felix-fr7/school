/**
 * TEMPORARY read-only verification for the 4 requested fixes.
 * Does not create/update/delete anything.
 */
require('dotenv').config();
const { connectDB } = require('./src/config/db');
const User = require('./src/models/User');
const Class = require('./src/models/Class');
const { getSchoolPrefixById, generateUniqueStudentId } = require('./src/utils/idGenerator');
const adminRouter = require('./src/routes/admin');

(async () => {
  await connectDB();

  // 1) Route registration order for the new next-id preview endpoint
  const routes = adminRouter.stack
    .filter((l) => l.route)
    .map((l) => `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`);
  const nextIdx = routes.indexOf('GET /students/next-id');
  const idIdx = routes.indexOf('GET /students/:id');
  console.log('[1] GET /students/next-id registered:', nextIdx !== -1, 'index:', nextIdx);
  console.log('[1] GET /students/:id  registered index:', idIdx, '=> correct order:', nextIdx !== -1 && nextIdx < idIdx);

  // 2) Shape of GET /api/admin/classes/:id -> teacherId (Edit Class fix)
  const cls = await Class.findOne({ teacherId: { $ne: null } })
    .populate('teacherId', 'name email phone')
    .lean();
  if (cls) {
    console.log('[2] class:', cls.name, '| teacherId is object:', typeof cls.teacherId === 'object' && cls.teacherId !== null);
    console.log('[2] teacherId keys:', cls.teacherId ? Object.keys(cls.teacherId).join(',') : 'none', '| name:', cls.teacherId && cls.teacherId.name);
  } else {
    console.log('[2] no class with an assigned teacher found');
  }

  // 3) Student payload fields used by the Edit Student screen
  const stu = await User.findOne({ role: 'Student', rollNumber: { $ne: null } }).populate('classId', 'name section').lean();
  if (stu) {
    console.log('[3] student:', stu.name);
    console.log('[3] rollNumber:', JSON.stringify(stu.rollNumber), '| studentId (login id):', JSON.stringify(stu.studentId));
    console.log('[3] classId:', stu.classId ? stu.classId.name : 'none', '| schoolId:', String(stu.schoolId));
  } else {
    console.log('[3] no student with rollNumber found');
  }

  // 4) Roll number uniqueness scope (per class, not per school)
  if (stu && stu.classId) {
    const otherClass = await Class.findOne({ _id: { $ne: stu.classId._id }, tenantId: stu.schoolId }).lean();
    if (otherClass) {
      const oldGlobal = await User.findOne({ rollNumber: stu.rollNumber, role: 'Student' }).lean();
      const newOtherClass = await User.findOne({ rollNumber: stu.rollNumber, schoolId: stu.schoolId, role: 'Student', classId: otherClass._id }).lean();
      const newSameClass = await User.findOne({ rollNumber: stu.rollNumber, schoolId: stu.schoolId, role: 'Student', classId: stu.classId._id }).lean();
      console.log('[4] roll', stu.rollNumber, '| OLD global check matched (blocked):', !!oldGlobal);
      console.log('[4] NEW check in another class (', otherClass.name, ') matched:', !!newOtherClass, '(allowed to reuse when false)');
      console.log('[4] NEW check in same class matched:', !!newSameClass, '(conflict detected when true)');
    }
  }

  // 4b) Evidence: same roll numbers already used by different classes in the live data
  const dupes = await User.aggregate([
    { $match: { role: 'Student', rollNumber: { $nin: [null, ''] } } },
    { $group: { _id: { rollNumber: '$rollNumber', classId: '$classId' } } },
    { $group: { _id: '$_id.rollNumber', classes: { $sum: 1 } } },
    { $match: { classes: { $gt: 1 } } },
    { $limit: 5 },
  ]);
  console.log('[4b] roll numbers used by more than one class:', JSON.stringify(dupes));

  // 5) Next Student ID preview generation (read-only)
  if (stu && stu.schoolId) {
    const { prefix } = await getSchoolPrefixById(stu.schoolId);
    const nextId = await generateUniqueStudentId(User, stu.schoolId, prefix);
    console.log('[5] school prefix:', prefix, '| next student id preview:', nextId);
  }

  process.exit(0);
})().catch((e) => {
  console.error('VERIFY_ERROR:', e.message);
  process.exit(0);
});
