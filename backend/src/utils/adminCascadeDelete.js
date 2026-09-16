/**
 * Admin Cascade Delete Utility
 * When a Super Admin deletes a School Admin, ALL data created by that admin
 * is permanently removed from the database.
 */

const mongoose = require('mongoose');
const Class = require('../models/Class');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Homework = require('../models/Homework');
const News = require('../models/News');
const Circular = require('../models/Circular');
const Announcement = require('../models/Announcement');
const PhotoAlbum = require('../models/PhotoAlbum');
const Photo = require('../models/Photo');
const File = require('../models/File');
const MediaGallery = require('../models/MediaGallery');
const ReportCard = require('../models/ReportCard');
const Mark = require('../models/Mark');
const Exam = require('../models/Exam');
const ExamSchedule = require('../models/ExamSchedule');
const Timetable = require('../models/Timetable');
const WeeklyLesson = require('../models/WeeklyLesson');
const Video = require('../models/Video');
const { deleteFile } = require('../middleware/fileUpload');

const deleteUploadedFile = async (fileUrl, label) => {
  if (!fileUrl) return { deleted: false, skipped: true };
  try {
    await deleteFile(fileUrl);
    console.log('[Cascade] Deleted: ' + label);
    return { deleted: true, skipped: false };
  } catch (error) {
    console.error('[Cascade] Failed: ' + label, error.message);
    return { deleted: false, skipped: false, error: error.message };
  }
};

const deleteAdminOwnedContent = async ({ adminId, adminEmail }) => {
  const counts = {};
  const filesDeleted = [];
  const filesFailed = [];
  const adminIdObj = adminId instanceof mongoose.Types.ObjectId ? adminId : new mongoose.Types.ObjectId(adminId);
  console.log('[Cascade] Starting for admin: ' + adminIdObj);

  // STEP 1: Delete Homework assigned/created by this admin
  {
    const hwFilter = { $or: [{ teacher: adminIdObj }, { assignedBy: adminIdObj }] };
    const hwResult = await Homework.deleteMany(hwFilter);
    counts.homework = hwResult.deletedCount || 0;
    console.log('[Cascade] Deleted homework: ' + counts.homework);
  }

  // STEP 2: Delete Classes created by admin (deep cascade)
  {
    const classes = await Class.find({ createdBy: adminIdObj }).lean();
    counts.class = classes.length;
    console.log('[Cascade] Found ' + classes.length + ' classes');
    for (const cls of classes) {
      const classId = cls._id;
      // 2a. Delete Homework for this class
      { const r = await Homework.deleteMany({ classId }); counts.homework = (counts.homework||0) + r.deletedCount; }
      // 2b. Deep cascade: Exams -> ExamSchedule
      {
        const exams = await Exam.find({ classId }).lean();
        for (const exam of exams) { const s = await ExamSchedule.deleteMany({ examId: exam._id }); counts.examSchedule = (counts.examSchedule||0)+s.deletedCount; }
        const ed = await Exam.deleteMany({ classId }); counts.exam = (counts.exam||0)+ed.deletedCount;
      }
      // 2c. Timetable and WeeklyLesson
      { const t = await Timetable.deleteMany({ classId }); counts.timetable = (counts.timetable||0)+t.deletedCount; }
      { const w = await WeeklyLesson.deleteMany({ classId }); counts.weeklyLesson = (counts.weeklyLesson||0)+w.deletedCount; }
      // 2d. News, Circular, Announcement for this class
      { const n = await News.deleteMany({ classId }); counts.news = (counts.news||0)+n.deletedCount; }
      { const c = await Circular.deleteMany({ classId }); counts.circular = (counts.circular||0)+c.deletedCount; }
      { const a = await Announcement.deleteMany({ classId }); counts.announcement = (counts.announcement||0)+a.deletedCount; }
      // 2e. ReportCards for this class
      { const r = await ReportCard.deleteMany({ classId }); counts.reportCard = (counts.reportCard||0)+r.deletedCount; }
      // 2f. Unassign students and delete their Marks
      {
        const studentsInClass = await User.find({ classId, role: 'Student' }).lean();
        for (const stu of studentsInClass) { const m = await Mark.deleteMany({ studentId: stu._id }); counts.mark = (counts.mark||0)+m.deletedCount; }
        await User.updateMany({ classId, role: 'Student' }, { $set: { classId: null } });
        counts.studentClassUnassign = (counts.studentClassUnassign||0) + studentsInClass.length;
      }
      await Class.deleteOne({ _id: classId });
    }
    console.log('[Cascade] Classes done');
  }

  // STEP 3: Delete Students created by this admin
  {
    const students = await User.find({ createdBy: adminIdObj, role: 'Student' }).lean();
    counts.student = students.length;
    console.log('[Cascade] Found ' + students.length + ' students');
    for (const student of students) {
      const studentId = student._id;
      await StudentProfile.deleteOne({ userId: studentId });
      const markDel = await Mark.deleteMany({ studentId });
      counts.mark = (counts.mark || 0) + (markDel.deletedCount || 0);
      const rcDel = await ReportCard.deleteMany({ student: studentId });
      counts.reportCard = (counts.reportCard || 0) + (rcDel.deletedCount || 0);
      if (student.classId) {
        await User.updateOne({ _id: studentId }, { $set: { classId: null } });
      }
    }
    await User.deleteMany({ createdBy: adminIdObj, role: 'Student' });
    if (adminEmail) {
      await User.deleteMany({ email: adminEmail.toLowerCase(), role: 'Student' });
    }
    console.log('[Cascade] Students done');
  }

  // STEP 4: Delete News authored by admin
  {
    const n = await News.deleteMany({ authorId: adminIdObj });
    counts.news = (counts.news || 0) + n.deletedCount;
    console.log('[Cascade] Deleted news by author: ' + counts.news);
  }

  // STEP 5: Delete Circulars authored by admin
  {
    const c = await Circular.deleteMany({ authorId: adminIdObj });
    counts.circular = (counts.circular || 0) + c.deletedCount;
    console.log('[Cascade] Deleted circulars by author: ' + counts.circular);
  }

  // STEP 6: Delete Announcements authored by admin
  {
    const a = await Announcement.deleteMany({ authorId: adminIdObj });
    counts.announcement = (counts.announcement || 0) + a.deletedCount;
    console.log('[Cascade] Deleted announcements by author: ' + counts.announcement);
  }
  // STEP 7: Delete Photo Albums (with photos + file cleanup)
  {
    const albums = await PhotoAlbum.find({ createdBy: adminIdObj }).lean();
    counts.photoAlbum = albums.length;
    for (const album of albums) {
      const albumId = album._id;
      const photos = await Photo.find({ albumId }).lean();
      for (const photo of photos) {
        const url = photo.imageUrl || photo.url;
        if (url) { const res = await deleteUploadedFile(url, 'Photo'); if (res.deleted) filesDeleted.push(url); else if (!res.skipped) filesFailed.push(url); }
      }
      const pd = await Photo.deleteMany({ albumId }); counts.photo = (counts.photo||0)+pd.deletedCount;
      await PhotoAlbum.deleteOne({ _id: albumId });
    }
    console.log('[Cascade] Photo albums done: ' + counts.photoAlbum);
  }

  // STEP 8: Delete Files (with file cleanup)
  {
    const files = await File.find({ uploadedBy: adminIdObj }).lean();
    counts.file = files.length;
    for (const f of files) { const res = await deleteUploadedFile(f.url, 'File'); if (res.deleted) filesDeleted.push(f.url); else if (!res.skipped) filesFailed.push(f.url); }
    const fd = await File.deleteMany({ uploadedBy: adminIdObj }); counts.file = (counts.file||0)+fd.deletedCount;
    console.log('[Cascade] Files done: ' + counts.file);
  }

  // STEP 9: Delete Media Gallery (with file cleanup)
  {
    const media = await MediaGallery.find({ uploadedBy: adminIdObj }).lean();
    counts.mediaGallery = media.length;
    for (const m of media) { const res = await deleteUploadedFile(m.url, 'Media'); if (res.deleted) filesDeleted.push(m.url); else if (!res.skipped) filesFailed.push(m.url); }
    const md = await MediaGallery.deleteMany({ uploadedBy: adminIdObj }); counts.mediaGallery = (counts.mediaGallery||0)+md.deletedCount;
    console.log('[Cascade] Media gallery done: ' + counts.mediaGallery);
  }

  // STEP 10: Delete ReportCards and Timetables created by admin
  {
    const rc = await ReportCard.deleteMany({ createdBy: adminIdObj });
    counts.reportCard = (counts.reportCard || 0) + rc.deletedCount;
    console.log('[Cascade] ReportCards by admin: ' + counts.reportCard);
  }
  {
    const tt = await Timetable.deleteMany({ createdBy: adminIdObj });
    counts.timetable = (counts.timetable || 0) + tt.deletedCount;
    console.log('[Cascade] Timetables by admin: ' + counts.timetable);
  }
  // STEP 11: Delete Videos created by admin
  {
    try {
      const videos = await Video.find({ uploadedBy: adminIdObj }).lean();
      counts.video = videos.length;
      for (const v of videos) {
        if (v.url) { const res = await deleteUploadedFile(v.url, 'Video'); if (res.deleted) filesDeleted.push(v.url); else if (!res.skipped) filesFailed.push(v.url); }
      }
      await Video.deleteMany({ uploadedBy: adminIdObj });
      console.log('[Cascade] Videos done: ' + counts.video);
    } catch (e) { console.log('[Cascade] Video model not found'); }
  }

  // STEP 12: Clean homework submissions referencing students of this admin
  {
    try {
      const adminStudents = await User.find({ createdBy: adminIdObj, role: 'Student' }).distinct('_id');
      if (adminStudents.length > 0) {
        const sub = await Homework.updateMany(
          { 'submissions.student': { $in: adminStudents } },
          { $pull: { submissions: { student: { $in: adminStudents } } } }
        );
        counts.homeworkSubmission = sub.modifiedCount || 0;
        console.log('[Cascade] Homework submissions cleaned: ' + counts.homeworkSubmission);
      }
    } catch (e) { console.log('[Cascade] Homework submission cleanup skipped'); }
  }

  // STEP 13: Clean orphaned references (ClassCircular, ClassSubject)
  {
    try {
      const adminClassIds = await Class.find({ createdBy: adminIdObj }).distinct('_id');
      const ClassCircular = mongoose.model('ClassCircular');
      const ClassSubject = mongoose.model('ClassSubject');
      await ClassCircular.deleteMany({ classId: { $in: adminClassIds } });
      await ClassSubject.deleteMany({ classId: { $in: adminClassIds } });
      console.log('[Cascade] Orphaned references cleaned');
    } catch (e) { console.log('[Cascade] Reference cleanup skipped'); }
  }

  console.log('[Cascade] Final Summary:', JSON.stringify(counts, null, 2));
  return { counts, filesDeleted, filesFailed };
};

module.exports = { deleteAdminOwnedContent };



