/**
 * TypeScript Type Definitions
 * Central location for all type definitions used in the app
 * Multi-Tenant School Management System
 */

// ============================================
// User & Role Types
// ============================================

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT';

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  tenantId?: string;
  studentId?: string;
  classId?: string;
  createdAt: string;
  updatedAt: string;
  class?: Class;
  tenant?: Tenant;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Tenant (School) types
export interface Tenant {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantInput {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

// Class types
export interface Class {
  id: string;
  name: string;
  section?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassInput {
  name: string;
  section?: string;
}

// ============================================
// Content Types (Admin-controlled, Student-visible)
// ============================================

export interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  classId: string;
  tenantId: string;
  assignedBy: string;
  dueDate?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  class?: Class;
  assignedByUser?: { id: string; name: string };
}

export interface CreateHomeworkInput {
  title: string;
  description: string;
  subject: string;
  classId: string;
  dueDate?: string;
}

export interface Mark {
  id: string;
  studentId: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  percentage?: number;
  grade?: string;
  examType: string;
  examDate?: string;
  tenantId: string;
  remarks?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  student?: User;
}

export interface CreateMarkInput {
  studentId: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  examType: string;
  examDate?: string;
  remarks?: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category?: string;
  imageUrl?: string;
  tenantId: string;
  postedBy: string;
  isPublished: boolean;
  publishDate?: string;
  createdAt: string;
  updatedAt: string;
  postedByUser?: { id: string; name: string };
}

export interface CreateNewsInput {
  title: string;
  content: string;
  summary?: string;
  category?: string;
  imageUrl?: string;
}

export interface Circular {
  id: string;
  title: string;
  content: string;
  circularNo?: string;
  tenantId: string;
  issuedBy: string;
  isPublished: boolean;
  issueDate: string;
  createdAt: string;
  updatedAt: string;
  issuedByUser?: { id: string; name: string };
}

export interface CreateCircularInput {
  title: string;
  content: string;
  circularNo?: string;
}

export interface ExamSchedule {
  id: string;
  title: string;
  subject: string;
  date: string;
  time: string;
  duration?: number;
  roomNo?: string;
  classId: string;
  tenantId: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  class?: Class;
}

export interface CreateExamScheduleInput {
  title: string;
  subject: string;
  date: string;
  time: string;
  classId: string;
  duration?: number;
  roomNo?: string;
}

// ============================================
// Post Types (Legacy)
// ============================================

export interface Post {
  id: string;
  title: string;
  content: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostInput {
  title: string;
  content: string;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    errors?: Array<{
      field: string;
      message: string;
    }>;
  };
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================
// Form Types
// ============================================

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
}

export interface PostForm {
  title: string;
  content: string;
}

// Student Form
export interface CreateStudentInput {
  name: string;
  email: string;
  password: string;
  studentId: string;
  classId?: string;
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardStats {
  totalHomework: number;
  totalMarks: number;
  totalNews: number;
  totalCirculars: number;
  upcomingExams: number;
}

export interface StudentStatistics {
  totalSubjects: number;
  totalMarksObtained: number;
  totalMaxMarks: number;
  overallPercentage: number;
}

// ============================================
// Navigation Types
// ============================================

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  PostDetail: { postId: string };
  CreatePost: undefined;
  EditPost: { postId: string };
  Profile: undefined;
};

// Super Admin Stack
export type SuperAdminStackParamList = {
  SuperAdminDashboard: undefined;
  SchoolsList: undefined;
  CreateSchool: undefined;
  SchoolDetail: { tenantId: string };
};

// Admin Stack
export type AdminStackParamList = {
  AdminDashboard: undefined;
  ClassesList: undefined;
  CreateClass: undefined;
  ClassDetail: { classId: string };
  TeachersList: undefined;
  TeacherDetail: { teacherId: string };
  EditTeacher: { teacherId: string };
  CreateTeacher: undefined;
  StudentsList: { classId?: string } | undefined;
  CreateStudent: undefined;
  StudentDetail: { studentId: string };
  HomeworkList: { classId?: string } | undefined;
  CreateHomework: undefined;
  MarksList: undefined;
  AddMarks: undefined;
  NewsList: undefined;
  CreateNews: undefined;
  CircularsList: undefined;
  CreateCircular: undefined;
  ExamSchedulesList: { classId?: string } | undefined;
  CreateExamSchedule: undefined;
};

// Student Stack
export type StudentStackParamList = {
  StudentDashboard: undefined;
  StudentHomeworkList: undefined;
  StudentHomeworkDetail: { homeworkId: string };
  StudentMarksList: undefined;
  StudentNewsList: undefined;
  StudentCircularsList: undefined;
  StudentExamSchedules: undefined;
  StudentProfile: undefined;
};

export type RootStackParamList = {
  Auth: AuthStackParamList;
  SuperAdmin: SuperAdminStackParamList;
  Admin: AdminStackParamList;
  Student: StudentStackParamList;
  Main: MainStackParamList;
};

// ============================================
// Context Types
// ============================================

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStudent: boolean;
}

export interface PostContextType {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  fetchPosts: (page?: number, limit?: number, search?: string) => Promise<void>;
  fetchPost: (id: string) => Promise<Post | null>;
  createPost: (data: CreatePostInput) => Promise<Post | null>;
  updatePost: (id: string, data: UpdatePostInput) => Promise<Post | null>;
  deletePost: (id: string) => Promise<boolean>;
}