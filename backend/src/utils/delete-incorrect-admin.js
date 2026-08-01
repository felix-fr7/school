/**
 * Delete Incorrect Admin from User Collection
 * 
 * This script deletes the admin account that was incorrectly stored in the User collection.
 * After running this, you should create a new school/admin through the super admin interface.
 * 
 * Run with: node src/utils/delete-incorrect-admin.js (from backend directory)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function deleteIncorrectAdmin() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/macvel_school';
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Connected to MongoDB');

    // Find the incorrect admin
    const incorrectAdmin = await User.findOne({
      email: 'admin@gmail.com',
      role: { $in: ['School Admin', 'Super Admin', 'SCHOOL_ADMIN', 'SUPER_ADMIN'] }
    });

    if (!incorrectAdmin) {
      console.log('No incorrect admin found in User collection.');
      process.exit(0);
    }

    console.log(`Found incorrect admin in User collection:`);
    console.log(`  - Email: ${incorrectAdmin.email}`);
    console.log(`  - Role: ${incorrectAdmin.role}`);
    console.log(`  - ID: ${incorrectAdmin._id}`);

    // Delete the incorrect admin
    await User.deleteOne({ _id: incorrectAdmin._id });
    console.log('\n✓ Deleted incorrect admin from User collection');
    console.log('\nNext step: Create a new school/admin through the super admin interface.');
    console.log('The new admin will be correctly stored in the Admin collection.');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteIncorrectAdmin();