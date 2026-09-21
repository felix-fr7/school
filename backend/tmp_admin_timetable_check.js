/**
 * TEMPORARY end-to-end check for the admin "Upload Timetable" flow.
 * Run against an isolated server instance:
 *   PORT=3001 node src/server.js   (in another shell)
 *   node tmp_admin_timetable_check.js
 *
 * Covers: upload file -> create for a class -> list -> edit (title/class/file)
 * -> invalid class guard (400 instead of 500) -> publish toggle -> delete
 * (record + uploaded file removed).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { connectDB } = require('./src/config/db');
const Admin = require('./src/models/Admin');

const BASE = process.env.CHECK_BASE || 'http://localhost:3001/api';
let pass = 0;
let fail = 0;

const check = (label, ok, extra) => {
  if (ok) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label + (extra ? ' -> ' + JSON.stringify(extra) : '')); }
};

const json = async (res) => {
  try { return await res.json(); } catch { return {}; }
};

(async () => {
  await connectDB();

  const admin = await Admin.findOne({ role: 'School Admin' }).lean();
  if (!admin) {
    console.log('No School Admin found in DB');
    process.exit(0);
  }

  const token = jwt.sign(
    { userId: String(admin._id), email: admin.email, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  const auth = { Authorization: 'Bearer ' + token };
  const authJson = { ...auth, 'Content-Type': 'application/json' };

  // --- 1. classes ------------------------------------------------------------
  const clsRes = await fetch(BASE + '/admin/classes', { headers: auth });
  const clsBody = await json(clsRes);
  const classes = clsBody.data || [];
  console.log('\n[1] GET /admin/classes -> ' + clsRes.status + ', count=' + classes.length);
  check('classes listed', clsRes.status === 200 && classes.length > 0);
  if (!classes.length) process.exit(0);
  const classId = String(classes[0]._id || classes[0].id);
  console.log('    using class:', classId, classes[0].name, classes[0].section || '');

  // --- 2. upload the file ----------------------------------------------------
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'base64'
  );
  const fd = new FormData();
  fd.append('file', new Blob([png], { type: 'image/png' }), 'tmp-timetable.png');
  const upRes = await fetch(BASE + '/admin-content/upload-exam', { method: 'POST', headers: auth, body: fd });
  const upBody = await json(upRes);
  const uploadedUrl = upBody.data && upBody.data.url;
  console.log('\n[2] POST /admin-content/upload-exam -> ' + upRes.status + ' url=' + uploadedUrl);
  check('file uploaded', upRes.status === 200 && !!uploadedUrl);
  const diskPath = uploadedUrl ? path.join(__dirname, uploadedUrl.replace(/^\//, '')) : null;

  // --- 3. create the timetable for the selected class ------------------------
  let createdId = null;
  {
    const res = await fetch(BASE + '/admin/content/exams', {
      method: 'POST',
      headers: authJson,
      body: JSON.stringify({ title: 'TMP CHECK Class Timetable', classId, fileUrl: uploadedUrl }),
    });
    const body = await json(res);
    createdId = body.data && body.data.id;
    console.log('\n[3] POST /admin/content/exams (classId=' + classId + ') -> ' + res.status);
    console.log('    ' + JSON.stringify(body.data));
    check('timetable created', res.status === 201 && !!createdId, body);
    check('class kept on create', body.data && String(body.data.classId) === String(classId), body.data);
    check('fileUrl stored', body.data && body.data.fileUrl === uploadedUrl, body.data);
  }

  // --- 4. it must appear in the admin list with class + fileUrl --------------
  {
    const res = await fetch(BASE + '/admin/exams?page=1&limit=100', { headers: auth });
    const body = await json(res);
    const mine = (body.data && body.data.exams || []).find((x) => String(x.id) === String(createdId));
    console.log('\n[4] GET /admin/exams found=' + !!mine);
    console.log('    ' + JSON.stringify(mine && { id: mine.id, classId: mine.classId, class: mine.class, fileUrl: mine.fileUrl }));
    check('record listed', !!mine);
    check('list returns class', !!mine && String(mine.classId) === String(classId));
    check('list returns fileUrl', !!mine && mine.fileUrl === uploadedUrl);
  }

  // --- 5. edit title + move to school-wide ----------------------------------
  {
    const res = await fetch(BASE + '/admin/content/exams/' + createdId, {
      method: 'PUT',
      headers: authJson,
      body: JSON.stringify({ title: 'TMP CHECK Renamed', classId: '' }),
    });
    const body = await json(res);
    console.log('\n[5] PUT title + classId="" -> ' + res.status + ' ' + JSON.stringify(body.data));
    check('edit accepted', res.status === 200, body);
    check('title updated', body.data && body.data.title === 'TMP CHECK Renamed', body.data);
    check('moved to school-wide', body.data && !body.data.classId, body.data);
  }

  // --- 6. move it back to the class ----------------------------------------
  {
    const res = await fetch(BASE + '/admin/content/exams/' + createdId, {
      method: 'PUT',
      headers: authJson,
      body: JSON.stringify({ classId }),
    });
    const body = await json(res);
    console.log('\n[6] PUT classId back -> ' + res.status + ' ' + JSON.stringify(body.data));
    check('class assigned again', res.status === 200 && String(body.data.classId) === String(classId), body.data);
  }

  // --- 7. invalid class id must be a clean 400 (used to be a 500) -----------
  {
    const res = await fetch(BASE + '/admin/content/exams/' + createdId, {
      method: 'PUT',
      headers: authJson,
      body: JSON.stringify({ classId: 'c1a2b3c4-0000-1111-2222-333344445555' }),
    });
    const body = await json(res);
    console.log('\n[7] PUT invalid classId -> ' + res.status + ' ' + JSON.stringify(body.error));
    check('invalid class rejected with 400', res.status === 400 && !!body.error, body);
  }

  // --- 8. publish toggle ----------------------------------------------------
  {
    const res = await fetch(BASE + '/admin/content/exams/' + createdId, {
      method: 'PUT',
      headers: authJson,
      body: JSON.stringify({ isPublished: false }),
    });
    const body = await json(res);
    console.log('\n[8] PUT unpublish -> ' + res.status + ' ' + JSON.stringify(body.data));
    check('unpublished', res.status === 200 && body.data.isPublished === false, body.data);
  }

  // --- 9. delete + file cleanup --------------------------------------------
  {
    const res = await fetch(BASE + '/admin/content/exams/' + createdId, { method: 'DELETE', headers: auth });
    const body = await json(res);
    console.log('\n[9] DELETE -> ' + res.status + ' ' + JSON.stringify(body));
    check('deleted', res.status === 200, body);
    check('uploaded file removed from disk', !!diskPath && !fs.existsSync(diskPath), diskPath);

    const listRes = await fetch(BASE + '/admin/exams?page=1&limit=100', { headers: auth });
    const listBody = await json(listRes);
    const stillThere = (listBody.data && listBody.data.exams || []).some((x) => String(x.id) === String(createdId));
    check('record no longer listed', !stillThere);
  }

  console.log('\n===== RESULT: ' + pass + ' passed, ' + fail + ' failed =====');
  process.exit(0);
})().catch((e) => {
  console.error('CHECK_ERROR:', e);
  process.exit(1);
});
