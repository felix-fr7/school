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

// ============================================
// Type Definitions (JSDoc for TypeScript support)
// ============================================

/**
 * @typedef {Object} User
 * @property {string} id - Unique user identifier
 * @property {string} name - User's full name
 * @property {string} email - User's email address
 * @property {string} role - User role (SUPER_ADMIN, TENANT_ADMIN, ADMIN, TEACHER, STUDENT)
 * @property {string} [tenantId] - Tenant identifier (for multi-tenant support)
 * @property {string} [phone] - User's phone number
 * @property {string} [studentId] - Student ID (for students)
 * @property {Object} [class] - Class information (for students/teachers)
 * @property {string} [class.name] - Class name
 * @property {string} [class.section] - Class section
 * @property {string} [createdAt] - Account creation timestamp
 * @property {string} [updatedAt] - Last update timestamp
 */

/**
 * @typedef {Object} ClassInfo
 * @property {string} id - Class identifier
 * @property {string} name - Class name
 * @property {string} [section] - Class section
 * @property {string} [classCode] - Class login code
 */

/**
 * @typedef {Object} ClassLoginResponse
 * @property {boolean} success - Whether the login was successful
 * @property {ClassInfo} class - Class information
 * @property {string} token - Authentication token
 */

/**
 * @typedef {Object} AuthContextType
 * @property {User | null} user - Current user object
 * @property {string | null} token - Current auth token
 * @property {ClassInfo | null} currentClass - Current class if logged in as class
 * @property {boolean} isLoading - Whether auth is currently loading
 * @property {string | null} tenantId - Current tenant ID
 * @property {boolean} isTenantAdmin - Whether current user is tenant admin
 * @property {boolean} isTenantSuspended - Whether current tenant is suspended
 * @property {function(string, string): Promise<void>} login - Login function
 * @property {function(string, string): Promise<void>} classLogin - Class login function
 * @property {function(string, string, string): Promise<void>} register - Register function
 * @property {function(): Promise<void>} logout - Logout function
 * @property {function(): boolean} isAuthenticated - Check if authenticated
 * @property {function(): boolean} isSuperAdmin - Check if super admin
 * @property {function(): boolean} isAdmin - Check if admin
 * @property {function(): boolean} isStudent - Check if student
 * @property {function(): boolean} isTeacher - Check if teacher
 * @property {function(): boolean} isClass - Check if logged in as class
 * @property {function(string): Promise<void>} switchTenant - Switch tenant context
 * @property {function(): void} clearCache - Clear cached data
 */

/** @type {User} */
export const User = {};

/** @type {ClassLoginResponse} */
export const ClassLoginResponse = {};

/** @type {AuthContextType} */
export const AuthContextType = {};
