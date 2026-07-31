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
    // Note: unique: true automatically creates an index
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
ClassSchema.pre('save', async function() {
  if (!this.classCode) {
    // Generate class code like CLS-001, CLS-002, etc.
    const count = await mongoose.model('Class').countDocuments({ tenantId: this.tenantId });
    this.classCode = `CLS-${String(count + 1).padStart(3, '0')}`;
  }
  
  // Hash password if provided
  if (this.isModified('password') && this.password) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }
});

// Method to compare class password
ClassSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for teacher
ClassSchema.virtual('teacher', {
  ref: 'User',
  localField: 'teacherId',
  foreignField: '_id',
  justOne: true
});

// Virtual for students count
ClassSchema.virtual('studentCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'classId',
  count: true
});

// Virtual for homework count
ClassSchema.virtual('homeworkCount', {
  ref: 'Homework',
  localField: '_id',
  foreignField: 'classId',
  count: true
});

// Virtual for exams count
ClassSchema.virtual('examCount', {
  ref: 'Exam',
  localField: '_id',
  foreignField: 'classId',
  count: true
});

module.exports = mongoose.model('Class', ClassSchema);