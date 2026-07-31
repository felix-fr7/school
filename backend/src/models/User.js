/**
 * User Model
 * MongoDB schema for users with multi-tenant support
 * Phase 2 Implementation
 * 
 * Supports roles: Super Admin, School Admin, Teacher, Student, Parent
 * - Super Admin: No schoolId required
 * - All other roles: schoolId is required
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'User name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'User email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Never return password in queries by default
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\d\s\-\+\(\)]+$/, 'Please provide a valid phone number']
  },
  profileImage: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: {
      values: ['Super Admin', 'School Admin', 'Teacher', 'Student', 'Parent'],
      message: 'Role must be one of: Super Admin, School Admin, Teacher, Student, Parent'
    },
    required: [true, 'User role is required'],
    default: 'Student'
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    // Conditional validation: required for all roles except Super Admin
    validate: {
      validator: function(value) {
        // Super Admin doesn't need a schoolId
        if (this.role === 'Super Admin') {
          return true;
        }
        // All other roles require a schoolId
        return value !== undefined && value !== null;
      },
      message: 'schoolId is required for all roles except Super Admin'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Additional profile fields
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', '']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  // Student-specific fields
  studentId: {
    type: String,
    trim: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  rollNumber: {
    type: String,
    trim: true
  },
  // Parent-specific fields
  parentOf: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Emergency contact
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries (email index is already defined via unique: true)
UserSchema.index({ schoolId: 1, role: 1 });
UserSchema.index({ schoolId: 1, studentId: 1 });
UserSchema.index({ role: 1, isActive: 1 });

// Hash password before saving
UserSchema.pre('save', async function() {
  // Only hash if password was modified
  if (!this.isModified('password')) {
    return;
  }
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  } catch (error) {
    throw error;
  }
});

// Method to compare password
// Note: Must use .select('+password') in query to include password field
UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    throw new Error('Password field not selected. Use .select("+password") in query.');
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for school reference
UserSchema.virtual('school', {
  ref: 'School',
  localField: 'schoolId',
  foreignField: '_id',
  justOne: true
});

// Virtual for class reference
UserSchema.virtual('class', {
  ref: 'Class',
  localField: 'classId',
  foreignField: '_id',
  justOne: true
});

// Static method to find users by role
UserSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to find users by school
UserSchema.statics.findBySchool = function(schoolId) {
  return this.find({ schoolId, isActive: true });
};

// Static method to find admins for a school
UserSchema.statics.findSchoolAdmins = function(schoolId) {
  return this.find({ 
    schoolId, 
    role: 'School Admin', 
    isActive: true 
  });
};

// Pre-find to exclude inactive users by default (can be overridden)
UserSchema.pre(/^find/, function() {
  // Only filter if not explicitly requested
  if (!this.getFilter()['isActive']) {
    this.where({ isActive: true });
  }
});

module.exports = mongoose.model('User', UserSchema);
