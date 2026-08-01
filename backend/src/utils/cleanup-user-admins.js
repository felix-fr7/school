/**
 * Cleanup Script: Remove School Admins from User Collection
 * 
 * This script removes any School Admin or Super Admin accounts that were
 * incorrectly stored in the User collection instead of the Admin collection.
 * 
 * Run with: node src/utils/cleanup-user-admins.js (from backend directory)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Admin = require('../models/Admin');

async function cleanupUserAdmins() {
  try {
    // Connect to MongoDB using the same URI as the main server
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/macvel_school';
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Connected to MongoDB');

    // Find all admins in User collection
    const userAdmins = await User.find({
      role: { $in: ['School Admin', 'Super Admin', 'SCHOOL_ADMIN', 'SUPER_ADMIN'] }
    });

    if (userAdmins.length === 0) {
      console.log('No admin accounts found in User collection. Nothing to clean up.');
      process.exit(0);
    }

    console.log(`Found ${userAdmins.length} admin accounts in User collection:`);
    userAdmins.forEach(admin => {
      console.log(`  - ${admin.email} (${admin.role})`);
    });

    // Check if these admins exist in Admin collection
    for (const userAdmin of userAdmins) {
      const adminExists = await Admin.findOne({ email: userAdmin.email.toLowerCase() });
      
      if (adminExists) {
        console.log(`\nAdmin ${userAdmin.email} exists in Admin collection. Removing duplicate from User collection...`);
        await User.deleteOne({ _id: userAdmin._id });
        console.log(`  ✓ Removed duplicate from User collection`);
      } else {
        console.log(`\nAdmin ${userAdmin.email} only exists in User collection (not in Admin collection).`);
        console.log('  ⚠ Skipping - manual intervention may be needed');
      }
    }

    console.log('\nCleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupUserAdmins();