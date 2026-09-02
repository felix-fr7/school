/**
 * Purge Script: Permanently Delete an Admin from the Database
 *
 * Removes a School Admin account from BOTH the "Admin" and "User"
 * collections (any role variant: 'School Admin', 'SCHOOL_ADMIN', etc.)
 * and verifies that no record remains afterwards.
 *
 * Usage (from the backend directory):
 *   node src/utils/delete-admin-by-email.js admin@example.com
 *   node src/utils/delete-admin-by-email.js admin@example.com --id <mongoId>
 *
 * If --id is provided, the record with that MongoDB _id is also removed.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Admin = require('../models/Admin');

async function purgeAdmin() {
  try {
    const args = process.argv.slice(2);
    const emailArg = args.find((a) => !a.startsWith('--'));
    const idIndex = args.indexOf('--id');
    const idArg = idIndex !== -1 ? args[idIndex + 1] : null;

    if (!emailArg && !idArg) {
      console.error('Usage: node src/utils/delete-admin-by-email.js <email> [--id <mongoId>]');
      process.exit(1);
    }

    // Connect to MongoDB using the same URI as the main server
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/macvel_school';
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Connected to MongoDB');

    // Show what exists before deleting
    const adminRecords = emailArg
      ? await Admin.find({ email: emailArg.toLowerCase() })
      : [];
    const userRecords = [];
    if (emailArg) {
      const byEmail = await User.find({ email: emailArg.toLowerCase() });
      userRecords.push(...byEmail);
    }
    if (idArg && mongoose.Types.ObjectId.isValid(idArg)) {
      const byId = await User.findOne({ _id: idArg });
      if (byId && !userRecords.some((u) => u._id.toString() === byId._id.toString())) {
        userRecords.push(byId);
      }
    }

    console.log('\nRecords found before deletion:');
    adminRecords.forEach((a) => console.log(`  [Admin collection] ${a.email} (${a.role}) _id=${a._id}`));
    userRecords.forEach((u) => console.log(`  [User collection]  ${u.email} (${u.role}) _id=${u._id}`));

    if (adminRecords.length === 0 && userRecords.length === 0) {
      console.log('\nNo admin records found. Nothing to delete.');
      process.exit(0);
    }

    // Delete from Admin collection (by email)
    let adminDeletedCount = 0;
    if (emailArg) {
      const adminResult = await Admin.deleteMany({ email: emailArg.toLowerCase() });
      adminDeletedCount = adminResult.deletedCount || 0;
    }
    console.log(`\nAdmin collection: ${adminDeletedCount} record(s) deleted.`);

    // Delete from User collection (by email and/or _id — any role variant,
    // admin accounts may be stored with roles like 'SCHOOL_ADMIN')
    const userConditions = [];
    if (emailArg) userConditions.push({ email: emailArg.toLowerCase() });
    if (idArg && mongoose.Types.ObjectId.isValid(idArg)) userConditions.push({ _id: idArg });
    const userResult = userConditions.length
      ? await User.deleteMany(userConditions.length > 1 ? { $or: userConditions } : userConditions[0])
      : { deletedCount: 0 };
    console.log(`User collection: ${userResult.deletedCount} record(s) deleted.`);

    // Verify nothing remains
    const stillAdmin = emailArg ? await Admin.findOne({ email: emailArg.toLowerCase() }) : null;
    const stillUser = emailArg ? await User.findOne({ email: emailArg.toLowerCase() }) : null;
    const stillUserById = idArg && mongoose.Types.ObjectId.isValid(idArg)
      ? await User.findById(idArg)
      : null;

    if (stillAdmin || stillUser || stillUserById) {
      console.error('\n✗ VERIFICATION FAILED — records still exist in the database!');
      process.exit(1);
    }

    console.log('\n✓ Verified: the admin has been completely removed from the database.');
    process.exit(0);
  } catch (error) {
    console.error('Error during purge:', error);
    process.exit(1);
  }
}

purgeAdmin();