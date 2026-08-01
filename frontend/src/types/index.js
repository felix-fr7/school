/**
 * Application Constants, Initial States & Helper Functions
 * Multi-Tenant School Management System
 */

// ============================================
// Weekday Constants & Helpers
// ============================================

export const WEEKDAYS = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

/**
 * Helper utility to get weekday name by ID
 * @param {number} id 
 * @returns {string}
 */
export const getWeekdayName = (id) => {
  const day = WEEKDAYS.find((d) => d.id === id);
  return day ? day.name : '';
};

// ============================================
// Form Initializers & Default Schemas
// ============================================

export const INITIAL_LOGIN_FORM = {
  email: '',
  password: '',
};

export const INITIAL_REGISTER_FORM = {
  name: '',
  email: '',
  password: '',
};

export const INITIAL_STUDENT_INPUT = {
  name: '',
  email: '',
  password: '',
  studentId: '',
  classId: '',
};

export const INITIAL_CLASS_INPUT = {
  name: '',
  section: '',
  password: '',
  assignedTeacherId: '',
};

export const INITIAL_HOMEWORK_INPUT = {
  title: '',
  description: '',
  subject: '',
  classId: '',
  dueDate: '',
};

export const INITIAL_NEWS_INPUT = {
  title: '',
  content: '',
  summary: '',
  category: '',
  imageUrl: '',
  pdfUrl: '',
  visibility: 'ALL',
  classId: '',
};

export const INITIAL_CIRCULAR_INPUT = {
  title: '',
  content: '',
  message: '',
  circularNo: '',
  imageUrl: '',
  visibility: 'ALL',
};

export const INITIAL_EXAM_SCHEDULE_INPUT = {
  title: '',
  subject: '',
  date: '',
  time: '',
  classId: '',
  duration: 60,
  roomNo: '',
};

export const INITIAL_LESSON_INPUT = {
  lessonDate: '',
  subject: '',
  classworkText: '',
  homeworkText: '',
};