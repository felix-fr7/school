/**
 * Admin Model
 * MongoDB schema for administrators (Super Admin and School Admin)
 * Separate from the general User collection for better data isolation
 * 
 * Supports roles: Super Admin, School Admin
 * - Super Admin: No schoolId required, manages all schools
 * - School Admin: schoolId required, manages specific school
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Admin name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Admin email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    // Note: uniqueness is handled by schema-level index below to avoid duplicate definitions
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
      values: ['Super Admin', 'School Admin'],
      message: 'Role must be one of: Super Admin, School Admin'
    },
    required: [true, 'Admin role is required'],
    // Automatically formats any casing into proper Title Case
    set: function(v) {
      if (!v) return v;
      return v
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    // Conditional validation: required for School Admin, not for Super Admin
    validate: {
      validator: function(value) {
        // Super Admin doesn't need a schoolId
        if (this.role === 'Super Admin') {
          return true;
        }
        // School Admin requires a schoolId
        return value !== undefined && value !== null;
      },
      message: 'schoolId is required for School Admin role'
    }
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant'
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
  // Emergency contact
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  // Audit fields
  lastLogin: {
    type: Date
  },
  passwordChangedAt: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries (Unique index for email defined cleanly here)
AdminSchema.index({ email: 1 }, { unique: true });
AdminSchema.index({ schoolId: 1, role: 1 });
AdminSchema.index({ role: 1, isActive: 1 });

// Hash password before saving
AdminSchema.pre('save', async function() {
  // Only hash if password was modified
  if (!this.isModified('password')) {
    return;
  }
  
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
  this.password = await bcrypt.hash(this.password, saltRounds);
  this.passwordChangedAt = Date.now();
});

// Method to compare password
// Note: Must use .select('+password') in query to include password field
AdminSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    throw new Error('Password field not selected. Use .select("+password") in query.');
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
AdminSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Static method to find admins by role
AdminSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to find admins by school
AdminSchema.statics.findBySchool = function(schoolId) {
  return this.find({ schoolId, isActive: true });
};

// Static method to find admin by email
AdminSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

// Pre-find to exclude inactive admins by default (can be overridden)
AdminSchema.pre(/^find/, function() {
  // Only filter if not explicitly requested
  if (!this.getFilter()['isActive']) {
    this.where({ isActive: true });
  }
});

module.exports = mongoose.model('Admin', AdminSchema);