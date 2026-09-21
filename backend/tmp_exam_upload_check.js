/**
 * TEMPORARY end-to-end check for the admin "Upload Timetable" flow.
 * 1. logs in as an existing School Admin (token signed with the same JWT secret)
 * 2. POST /api/admin-content/upload-exam   (multipart file upload)
 * 3. POST /api/admin/content/exams         (create exam record)
 * 4. GET  /api/admin/exams
 * 5. DELETE /api/admin/content/exams/:id   (cleanup of the record created in step 3)
 *
 * Read-only apart from the temporary record which is deleted at the end.
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { connectDB, closeDB } = require('./src/config/db');
const Admin = require('./src/models/Admin');

const BASE = process.env.API_URL || 'http://localhost:3000/api';

const log = (label, data) => {
  console.log('\n=== ' + label + ' ===');
  console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
};

(async () => {
  await connectDB();

  const admin = await Admin.findOne({ role: 'School Admin' }).lean();
  if (!admin) {
    log('NO ADMIN', 'No School Admin found in DB');
    process.exit(0);
  }
  log('ADMIN USED', { email: admin.email, id: String(admin._id), schoolId: String(admin.schoolId), tenantId: String(admin.tenantId) });

  const token = jwt.sign(
    { userId: String(admin._id), email: admin.email, role: admin.role, schoolId: admin.schoolId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  const authHeaders = { Authorization: 'Bearer ' + token };

  // --- 1. Health/tenant check -------------------------------------------------
  try {
    const meRes = await fetch(BASE + '/admin/exams?page=1&limit=5', { headers: authHeaders });
    const meBody = await meRes.json();
    log('GET /admin/exams (existing timetables)', { status: meRes.status, count: (meBody.data && meBody.data.exams || []).length, body: meBody });
  } catch (e) {
    log('GET /admin/exams FAILED', e.message);
  }

  // --- 2. File upload --------------------------------------------------------
  // 1x1 transparent PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'base64'
  );
  let uploadedUrl = null;
  try {
    const fd = new FormData();
    fd.append('file', new Blob([png], { type: 'image/png' }), 'test-timetable.png');
    const upRes = await fetch(BASE + '/admin-content/upload-exam', { method: 'POST', headers: authHeaders, body: fd });
    const upBody = await upRes.json().catch(() => ({}));
    uploadedUrl = upBody.data && upBody.data.url;
    log('POST /admin-content/upload-exam', { status: upRes.status, body: upBody });
  } catch (e) {
    log('POST /admin-content/upload-exam FAILED', e.message);
  }

  // --- 3. Create exam record -------------------------------------------------
  let createdId = null;
  try {
    const createRes = await fetch(BASE + '/admin/content/exams', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'TMP CHECK Timetable', fileUrl: uploadedUrl }),
    });
    const createBody = await createRes.json().catch(() => ({}));
    createdId = createBody.data && createBody.data.id;
    log('POST /admin/content/exams', { status: createRes.status, body: createBody });
  } catch (e) {
    log('POST /admin/content/exams FAILED', e.message);
  }

  // --- 4. Verify it is listed ------------------------------------------------
  if (createdId) {
    try {
      const listRes = await fetch(BASE + '/admin/exams?page=1&limit=100', { headers: authHeaders });
      const listBody = await listRes.json();
      const mine = (listBody.data && listBody.data.exams || []).find((x) => String(x.id) === String(createdId));
      log('GET /admin/exams contains new record', { found: !!mine, record: mine });
    } catch (e) {
      log('GET /admin/exams (verify) FAILED', e.message);
    }

    // --- 5. Cleanup --------------------------------------------------------
    try {
      const delRes = await fetch(BASE + '/admin/content/exams/' + createdId, { method: 'DELETE', headers: authHeaders });
      const delBody = await delRes.json().catch(() => ({}));
      log('DELETE /admin/content/exams/:id (cleanup)', { status: delRes.status, body: delBody });
    } catch (e) {
      log('DELETE cleanup FAILED', e.message);
    }
  }

  await closeDB();
  process.exit(0);
})().catch(async (e) => {
  console.error('CHECK_ERROR:', e.message);
  try { await closeDB(); } catch (_) { /* ignore */ }
  process.exit(0);
});
