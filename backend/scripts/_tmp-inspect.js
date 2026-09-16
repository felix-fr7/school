/** TEMPORARY read-only inspection: collections, counts, and full sample docs. */
require('dotenv').config();
const mongoose = require('mongoose');

const COLLECTIONS = [
  'admins', 'users', 'students', 'schools', 'tenants', 'classes', 'studentprofiles',
  'news', 'albums', 'videos', 'photoalbums', 'photos', 'reportcards', 'homeworks',
  'exams', 'timetables', 'weeklylessonlogs', 'classsubjects', 'marks', 'files',
  'messages', 'circulars', 'classcirculars', 'mediagalleries', 'teachers'
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  console.log('DB name:', db.databaseName);

  for (const name of COLLECTIONS) {
    let count = 0;
    try {
      count = await db.collection(name).countDocuments();
    } catch (e) {
      continue;
    }
    console.log(`\n=== ${name} (count: ${count}) ===`);
    if (count === 0) continue;
    const docs = await db.collection(name).find({}).limit(3).toArray();
    docs.forEach((doc, i) => {
      const compact = {};
      Object.keys(doc).forEach((k) => {
        const v = doc[k];
        if (v instanceof Date) compact[k] = v.toISOString();
        else if (Array.isArray(v)) compact[k] = `[${v.length} items]`;
        else if (v && typeof v === 'object') compact[k] = JSON.stringify(v).slice(0, 120);
        else if (typeof v === 'string' && v.length > 70) compact[k] = v.slice(0, 70) + '…';
        else compact[k] = v;
      });
      console.log(`sample[${i}]:`, JSON.stringify(compact));
    });
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error('INSPECT ERROR:', e); process.exit(1); });