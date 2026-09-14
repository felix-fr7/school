/**
 * Class Model
 * MongoDB schema for classes
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ClassSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  section: {
    type: String,
    trim: true
  },
  classCode: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    index: true
  },
  password: {
    type: String,
    select: false
  },
  gradeLevel: {
    type: Number,
    min: 1,
    max: 12
  },
  roomNumber: {
    type: String,
    trim: true
  },
  capacity: {
    type: Number,
    default: 30
  },
  academicYear: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
ClassSchema.index({ tenantId: 1, name: 1 });
ClassSchema.index({ tenantId: 1, section: 1 });

// Generate class code before saving if not provided
// New logic: <SCHOOL_FIRST_3_LETTERS><NUMBER> e.g. GRE001 (no dash)
// Old logic CLS-001 still valid for existing records, but new records use school prefix
ClassSchema.pre('save', async function() {
  if (!this.classCode) {
    const { getSchoolPrefixById, generateUniqueClassCode } = require('../utils/idGenerator');
    const Class = mongoose.model('Class');
    const { prefix } = await getSchoolPrefixById(this.tenantId);
    this.classCode = await generateUniqueClassCode(Class, this.tenantId, prefix);
  }
  
  // Hash password if provided
  if (this.isModified('password') && this.password) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }
});

ClassSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

ClassSchema.virtual('teacher', {
  ref: 'Teacher',
  localField: 'teacherId',
  foreignField: '_id',
  justOne: true
});

ClassSchema.virtual('studentCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'classId',
  count: true
});

ClassSchema.virtual('homeworkCount', {
  ref: 'Homework',
  localField: '_id',
  foreignField: 'classId',
  count: true
});

ClassSchema.virtual('examCount', {
  ref: 'Exam',
  localField: '_id',
  foreignField: 'classId',
  count: true
});

module.exports = mongoose.model('Class', ClassSchema);