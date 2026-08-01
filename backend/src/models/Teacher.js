/**
 * Teacher Model
 * MongoDB schema for teachers - separate from general User collection
 * 
 * Teachers have their own collection for better data isolation
 * and specific teacher-related fields
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const TeacherSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Teacher email is required'],
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
  name: {
    type: String,
    required: [true, 'Teacher name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
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
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  teacherId: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },
  qualification: {
    type: String,
    trim: true
  },
  experienceYears: {
    type: Number,
    min: [0, 'Experience cannot be negative'],
    max: [50, 'Experience cannot exceed 50 years']
  },
  specialization: {
    type: String,
    trim: true
  },
  subjects: {
    type: [String],
    default: []
  },
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
  isActive: {
    type: Boolean,
    default: true
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

// Indexes for efficient queries
// Note: email index is already defined via unique: true in schema
TeacherSchema.index({ tenantId: 1, teacherId: 1 });
TeacherSchema.index({ tenantId: 1, isActive: 1 });

// Hash password before saving
TeacherSchema.pre('save', async function() {
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
TeacherSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    throw new Error('Password field not selected. Use .select("+password") in query.');
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
TeacherSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Static method to find teachers by tenant
TeacherSchema.statics.findByTenant = function(tenantId) {
  return this.find({ tenantId, isActive: true });
};

// Static method to find teachers by school
TeacherSchema.statics.findBySchool = function(tenantId) {
  return this.find({ tenantId, isActive: true });
};

// Static method to find teacher by email
TeacherSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

// Pre-find to exclude inactive teachers by default (can be overridden)
TeacherSchema.pre(/^find/, function() {
  // Only filter if not explicitly requested
  if (!this.getFilter()['isActive']) {
    this.where({ isActive: true });
  }
});

module.exports = mongoose.model('Teacher', TeacherSchema);