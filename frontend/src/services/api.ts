/**
 * API Service
 * Centralized API client with Axios
 * Multi-Tenant School Management System
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiResponse,
  AuthResponse,
  User,
  Post,
  CreatePostInput,
  UpdatePostInput,
  Tenant,
  CreateTenantInput,
  Class,
  CreateClassInput,
  ClassLoginResponse,
  Homework,
  CreateHomeworkInput,
  Mark,
  CreateMarkInput,
  News,
  CreateNewsInput,
  Circular,
  CreateCircularInput,
  ExamSchedule,
  CreateExamScheduleInput,
  Exam,
  CreateExamInput,
  CreateStudentInput,
  DashboardStats,
  StudentStatistics,
  WeeklyLessonGridResponse,
  WeeklyLesson,
  LessonAttachment,
  CreateUpdateLessonInput,
} from '../types';

// API Base URL Configuration
// Uses EXPO_PUBLIC_API_URL environment variable for Expo compatibility
// Fallback to 10.0.2.2 (Android emulator special address) for development if env var is not set
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api';

// Log the API URL in development mode (will be stripped in production builds)
if (__DEV__) {
  console.log('[API] Using base URL:', API_BASE_URL);
}

// ============================================
// Storage Service
// ============================================

export const storage = {
  async getToken(): Promise<string | null> {
    const token = await AsyncStorage.getItem('authToken');
    // Handle ReadableNativeMap on Android - convert to string if needed
    if (token === null) return null;
    if (typeof token === 'string') return token;
    // Convert ReadableNativeMap or other objects to string
    return String(token);
  },

  async saveToken(token: string): Promise<void> {
    await AsyncStorage.setItem('authToken', String(token));
  },

  async getUser(): Promise<User | null> {
    const userData = await AsyncStorage.getItem('user');
    // Handle ReadableNativeMap on Android
    if (userData === null) return null;
    const userStr = typeof userData === 'string' ? userData : String(userData);
    try {
      return JSON.parse(userStr);
    } catch (e) {
      console.error('Error parsing user data from storage:', e);
      return null;
    }
  },

  async saveUser(user: User): Promise<void> {
    await AsyncStorage.setItem('user', JSON.stringify(user));
  },

  async clearUser(): Promise<void> {
    await AsyncStorage.removeItem('user');
  },

  // Class storage methods
  async getClass(): Promise<ClassLoginResponse['class'] | null> {
    const classData = await AsyncStorage.getItem('currentClass');
    if (classData === null) return null;
    const classStr = typeof classData === 'string' ? classData : String(classData);
    try {
      return JSON.parse(classStr);
    } catch (e) {
      console.error('Error parsing class data from storage:', e);
      return null;
    }
  },

  async saveClass(classData: ClassLoginResponse['class']): Promise<void> {
    await AsyncStorage.setItem('currentClass', JSON.stringify(classData));
  },

  async clearClass(): Promise<void> {
    await AsyncStorage.removeItem('currentClass');
  },

  async clearAuth(): Promise<void> {
    await AsyncStorage.multiRemove(['authToken', 'user']);
  },
};

// Create Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    // Ngrok free tier bypass header - prevents browser warning page interception
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      // Use storage.getToken() which handles ReadableNativeMap on Android
      const token = await storage.getToken();
      if (token && typeof token === 'string' && token.trim()) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token from storage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle common errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      try {
        await AsyncStorage.multiRemove(['authToken', 'user']);
        // Note: CustomEvent is not available in React Native
        // Components should handle 401 responses directly or use navigation
        console.warn('[API] Session expired - user should be redirected to login');
      } catch (storageError) {
        console.error('Error clearing auth storage:', storageError);
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// Auth API
// ============================================

export const authAPI = {
  /**
   * Login user with dual support: email OR studentId (roll number)
   * @param usernameOrEmailOrId - Can be email address or student ID/roll number
   * @param password - User password
   */
  async login(usernameOrEmailOrId: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
      usernameOrEmailOrId,
      password,
    });
    return response.data;
  },

  async register(name: string, email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', {
      name,
      email,
      password,
    });
    return response.data;
  },

  async getMe(): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },

  async updateProfile(name: string): Promise<ApiResponse<User>> {
    const response = await api.put<ApiResponse<User>>('/auth/me', { name });
    return response.data;
  },

  async updatePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    const response = await api.put<ApiResponse<void>>('/auth/password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  /**
   * Login as a class using class code and password
   * @param classCode - Class code (e.g., CLS-1)
   * @param password - Class password
   */
  async classLogin(classCode: string, password: string): Promise<ApiResponse<ClassLoginResponse>> {
    const response = await api.post<ApiResponse<ClassLoginResponse>>('/auth/class-login', {
      classCode,
      password,
    });
    return response.data;
  },

  /**
   * Get class dashboard data (for logged-in class)
   */
  async getClassDashboard(): Promise<ApiResponse<{
    class: ClassLoginResponse['class'] & { teacher?: { name: string; email: string; phone?: string; qualification?: string; subjectSpecialization?: string } | null };
    students: User[];
    homework: Homework[];
    exams: ExamSchedule[];
    news: News[];
    circulars: Circular[];
    weeklyLessons: any[] | null;
  }>> {
    const response = await api.get<ApiResponse<{
      class: ClassLoginResponse['class'] & { teacher?: { name: string; email: string; phone?: string; qualification?: string; subjectSpecialization?: string } | null };
      students: User[];
      homework: Homework[];
      exams: ExamSchedule[];
      news: News[];
      circulars: Circular[];
      weeklyLessons: any[] | null;
    }>>('/auth/class/dashboard');
    return response.data;
  },
};

// ============================================
// Posts API (Legacy)
// ============================================

export const postsAPI = {
  async getAllPosts(page = 1, limit = 10, search = ''): Promise<ApiResponse<{ posts: Post[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ posts: Post[]; pagination: any }>>('/posts', {
      params: { page, limit, search },
    });
    return response.data;
  },

  async getPost(id: string): Promise<ApiResponse<Post>> {
    const response = await api.get<ApiResponse<Post>>(`/posts/${id}`);
    return response.data;
  },

  async getMyPosts(page = 1, limit = 10): Promise<ApiResponse<{ posts: Post[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ posts: Post[]; pagination: any }>>('/posts/my-posts', {
      params: { page, limit },
    });
    return response.data;
  },

  async createPost(data: CreatePostInput): Promise<ApiResponse<Post>> {
    const response = await api.post<ApiResponse<Post>>('/posts', data);
    return response.data;
  },

  async updatePost(id: string, data: UpdatePostInput): Promise<ApiResponse<Post>> {
    const response = await api.put<ApiResponse<Post>>(`/posts/${id}`, data);
    return response.data;
  },

  async deletePost(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/posts/${id}`);
    return response.data;
  },
};

// ============================================
// Tenants API (Super Admin)
// ============================================

export const tenantsAPI = {
  async getAllTenants(page = 1, limit = 10, search = ''): Promise<ApiResponse<{ tenants: Tenant[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ tenants: Tenant[]; pagination: any }>>('/tenants', {
      params: { page, limit, search },
    });
    return response.data;
  },

  async getTenant(id: string): Promise<ApiResponse<Tenant>> {
    const response = await api.get<ApiResponse<Tenant>>(`/tenants/${id}`);
    return response.data;
  },

  async createTenant(data: CreateTenantInput): Promise<ApiResponse<{ tenant: Tenant; admin: User & { token: string } }>> {
    const response = await api.post<ApiResponse<{ tenant: Tenant; admin: User & { token: string } }>>('/tenants', data);
    return response.data;
  },

  async updateTenant(id: string, data: Partial<CreateTenantInput>): Promise<ApiResponse<Tenant>> {
    const response = await api.put<ApiResponse<Tenant>>(`/tenants/${id}`, data);
    return response.data;
  },

  async deleteTenant(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/tenants/${id}`);
    return response.data;
  },

  async getTenantStats(id: string): Promise<ApiResponse<any>> {
    const response = await api.get<ApiResponse<any>>(`/tenants/${id}/stats`);
    return response.data;
  },
};

// ============================================
// Admin API (School Admin)
// ============================================

export const adminAPI = {
  // Classes
  async getClasses(): Promise<ApiResponse<Class[]>> {
    const response = await api.get<ApiResponse<Class[]>>('/admin/classes');
    return response.data;
  },

  async getClassDashboard(id: string): Promise<ApiResponse<{
    class: Class & { teacher?: { id: string; name: string; email: string; phone?: string } };
    metrics: { totalStudents: number; attendanceRate: number };
    recentHomework: Homework[];
    upcomingExams: ExamSchedule[];
    recentAnnouncements: News[];
  }>> {
    const response = await api.get<ApiResponse<{
      class: Class & { teacher?: { id: string; name: string; email: string; phone?: string } };
      metrics: { totalStudents: number; attendanceRate: number };
      recentHomework: Homework[];
      upcomingExams: ExamSchedule[];
      recentAnnouncements: News[];
    }>>(`/admin/classes/${id}/dashboard`);
    return response.data;
  },

  async getClass(id: string): Promise<ApiResponse<Class>> {
    const response = await api.get<ApiResponse<Class>>(`/admin/classes/${id}`);
    return response.data;
  },

  async createClass(data: CreateClassInput & { teacherName?: string; teacherEmail?: string; teacherPhone?: string; teacherPassword?: string }): Promise<ApiResponse<Class>> {
    const response = await api.post<ApiResponse<Class>>('/admin/classes', data);
    return response.data;
  },

  async updateClass(id: string, data: CreateClassInput): Promise<ApiResponse<void>> {
    const response = await api.put<ApiResponse<void>>(`/admin/classes/${id}`, data);
    return response.data;
  },

  async deleteClass(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/admin/classes/${id}`);
    return response.data;
  },

  /**
   * Reset class password (for class-based login)
   * POST /api/admin/classes/:id/reset-password
   */
  async resetClassPassword(id: string, password: string): Promise<ApiResponse<{ id: string; classCode: string; name: string; section: string }>> {
    const response = await api.post<ApiResponse<{ id: string; classCode: string; name: string; section: string }>>(
      `/admin/classes/${id}/reset-password`,
      { password }
    );
    return response.data;
  },

  // Students
  async getStudents(page = 1, limit = 10, search = '', classId = ''): Promise<ApiResponse<{ students: User[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ students: User[]; pagination: any }>>('/admin/students', {
      params: { page, limit, search, classId },
    });
    return response.data;
  },

  async getStudent(id: string): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>(`/admin/students/${id}`);
    return response.data;
  },

  async createStudent(data: CreateStudentInput): Promise<ApiResponse<User>> {
    const response = await api.post<ApiResponse<User>>('/admin/students', data);
    return response.data;
  },

  async updateStudent(id: string, data: Partial<CreateStudentInput>): Promise<ApiResponse<void>> {
    const response = await api.put<ApiResponse<void>>(`/admin/students/${id}`, data);
    return response.data;
  },

  async deleteStudent(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/admin/students/${id}`);
    return response.data;
  },

  // Student Import
  async getStudentTemplate(): Promise<ApiResponse<{ columns: string[]; sampleData: any[] }>> {
    const response = await api.get<ApiResponse<{ columns: string[]; sampleData: any[] }>>('/admin/students/template');
    return response.data;
  },

  async createStudentManual(data: {
    rollNumber: string;
    studentName: string;
    classAndSection?: string;
    parentMobile?: string;
    bloodGroup?: string;
    studentAddress?: string;
    userId: string;
    password: string;
    className?: string;
  }): Promise<ApiResponse<User>> {
    const response = await api.post<ApiResponse<User>>('/admin/students/manual', data);
    return response.data;
  },

  async bulkImportStudents(file: File): Promise<ApiResponse<{ totalProcessed: number; successfullyCreated: number; duplicates: number; students: User[] }>> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<{ totalProcessed: number; successfullyCreated: number; duplicates: number; students: User[] }>>('/admin/students/bulk', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async bulkUploadStudentsCSV(file: File, classId: string): Promise<ApiResponse<{
    totalProcessed: number;
    successfullyCreated: number;
    duplicates: number;
    students: Array<{ id: string; email: string; name: string; studentId: string; createdAt: string }>;
  }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('classId', classId);
    const response = await api.post<ApiResponse<{
      totalProcessed: number;
      successfullyCreated: number;
      duplicates: number;
      students: Array<{ id: string; email: string; name: string; studentId: string; createdAt: string }>;
    }>>('/admin/students/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Homework
  async getHomework(page = 1, limit = 10, classId = '', isPublished = ''): Promise<ApiResponse<{ homeworks: Homework[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ homeworks: Homework[]; pagination: any }>>('/admin/homework', {
      params: { page, limit, classId, isPublished },
    });
    return response.data;
  },

  async getHomeworkById(id: string): Promise<ApiResponse<Homework>> {
    const response = await api.get<ApiResponse<Homework>>(`/admin/homework/${id}`);
    return response.data;
  },

  async createHomework(data: CreateHomeworkInput): Promise<ApiResponse<Homework>> {
    const response = await api.post<ApiResponse<Homework>>('/admin/homework', data);
    return response.data;
  },

  async updateHomework(id: string, data: Partial<CreateHomeworkInput> & { isPublished?: boolean }): Promise<ApiResponse<void>> {
    const response = await api.put<ApiResponse<void>>(`/admin/homework/${id}`, data);
    return response.data;
  },

  async deleteHomework(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/admin/homework/${id}`);
    return response.data;
  },

  // Marks
  async getMarks(page = 1, limit = 10, studentId = '', examType = ''): Promise<ApiResponse<{ marks: Mark[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ marks: Mark[]; pagination: any }>>('/admin/marks', {
      params: { page, limit, studentId, examType },
    });
    return response.data;
  },

  async createMark(data: CreateMarkInput): Promise<ApiResponse<Mark>> {
    const response = await api.post<ApiResponse<Mark>>('/admin/marks', data);
    return response.data;
  },

  async updateMark(id: string, data: Partial<CreateMarkInput> & { grade?: string; isPublished?: boolean }): Promise<ApiResponse<void>> {
    const response = await api.put<ApiResponse<void>>(`/admin/marks/${id}`, data);
    return response.data;
  },

  async deleteMark(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/admin/marks/${id}`);
    return response.data;
  },

  // News
  async getNews(page = 1, limit = 10, category = '', isPublished = ''): Promise<ApiResponse<{ news: News[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ news: News[]; pagination: any }>>('/admin/news', {
      params: { page, limit, category, isPublished },
    });
    return response.data;
  },

  async createNews(data: CreateNewsInput): Promise<ApiResponse<News>> {
    const response = await api.post<ApiResponse<News>>('/admin/news', data);
    return response.data;
  },

  async updateNews(id: string, data: Partial<CreateNewsInput> & { isPublished?: boolean }): Promise<ApiResponse<void>> {
    const response = await api.put<ApiResponse<void>>(`/admin/news/${id}`, data);
    return response.data;
  },

  async deleteNews(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/admin/news/${id}`);
    return response.data;
  },

  // Circulars
  async getCirculars(page = 1, limit = 10, isPublished = ''): Promise<ApiResponse<{ circulars: Circular[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ circulars: Circular[]; pagination: any }>>('/admin/circulars', {
      params: { page, limit, isPublished },
    });
    return response.data;
  },

  async createCircular(data: CreateCircularInput): Promise<ApiResponse<Circular>> {
    const response = await api.post<ApiResponse<Circular>>('/admin/circulars', data);
    return response.data;
  },

  async deleteCircular(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/admin/circulars/${id}`);
    return response.data;
  },

  // Exam Schedules
  async getExamSchedules(page = 1, limit = 10, classId = '', isPublished = ''): Promise<ApiResponse<{ examSchedules: ExamSchedule[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ examSchedules: ExamSchedule[]; pagination: any }>>('/admin/exam-schedules', {
      params: { page, limit, classId, isPublished },
    });
    return response.data;
  },

  async createExamSchedule(data: CreateExamScheduleInput): Promise<ApiResponse<ExamSchedule>> {
    const response = await api.post<ApiResponse<ExamSchedule>>('/admin/exam-schedules', data);
    return response.data;
  },

  async deleteExamSchedule(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/admin/exam-schedules/${id}`);
    return response.data;
  },

  // Teachers
  async getAvailableTeachers(classId?: string, search = '', page = 1, limit = 100): Promise<ApiResponse<{ teachers: User[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ teachers: User[]; pagination: any }>>('/admin/teachers/available', {
      params: { page, limit, classId, search },
    });
    return response.data;
  },

  async getTeachers(page = 1, limit = 10, classId = '', search = ''): Promise<ApiResponse<{ teachers: User[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ teachers: User[]; pagination: any }>>('/admin/teachers', {
      params: { page, limit, classId, search },
    });
    return response.data;
  },

  async getTeacher(id: string): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>(`/admin/teachers/${id}`);
    return response.data;
  },

  async createTeacher(data: { name: string; email: string; password: string; phone?: string; classId?: string }): Promise<ApiResponse<User>> {
    const response = await api.post<ApiResponse<User>>('/admin/teachers', data);
    return response.data;
  },

  async updateTeacher(id: string, data: { name?: string; email?: string; phone?: string; classId?: string }): Promise<ApiResponse<void>> {
    const response = await api.put<ApiResponse<void>>(`/admin/teachers/${id}`, data);
    return response.data;
  },

  async deleteTeacher(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/admin/teachers/${id}`);
    return response.data;
  },
};

// ============================================
// Student API
// ============================================

export const studentAPI = {
  // Dashboard
  async getDashboard(): Promise<ApiResponse<{ stats: DashboardStats; recentHomework: Homework[]; recentNews: News[]; upcomingExams: ExamSchedule[] }>> {
    const response = await api.get<ApiResponse<{ stats: DashboardStats; recentHomework: Homework[]; recentNews: News[]; upcomingExams: ExamSchedule[] }>>('/student/dashboard');
    return response.data;
  },

  // Homework
  async getHomework(page = 1, limit = 10, subject = ''): Promise<ApiResponse<{ homeworks: Homework[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ homeworks: Homework[]; pagination: any }>>('/student/homework', {
      params: { page, limit, subject },
    });
    return response.data;
  },

  async getHomeworkById(id: string): Promise<ApiResponse<Homework>> {
    const response = await api.get<ApiResponse<Homework>>(`/student/homework/${id}`);
    return response.data;
  },

  // Marks
  async getMarks(page = 1, limit = 10, subject = '', examType = ''): Promise<ApiResponse<{ marks: Mark[]; statistics: StudentStatistics; pagination: any }>> {
    const response = await api.get<ApiResponse<{ marks: Mark[]; statistics: StudentStatistics; pagination: any }>>('/student/marks', {
      params: { page, limit, subject, examType },
    });
    return response.data;
  },

  async getMarkById(id: string): Promise<ApiResponse<Mark>> {
    const response = await api.get<ApiResponse<Mark>>(`/student/marks/${id}`);
    return response.data;
  },

  // News
  async getNews(page = 1, limit = 10, category = ''): Promise<ApiResponse<{ news: News[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ news: News[]; pagination: any }>>('/student/news', {
      params: { page, limit, category },
    });
    return response.data;
  },

  async getNewsById(id: string): Promise<ApiResponse<News>> {
    const response = await api.get<ApiResponse<News>>(`/student/news/${id}`);
    return response.data;
  },

  // Circulars
  async getCirculars(page = 1, limit = 10): Promise<ApiResponse<{ circulars: Circular[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ circulars: Circular[]; pagination: any }>>('/student/circulars', {
      params: { page, limit },
    });
    return response.data;
  },

  async getCircularById(id: string): Promise<ApiResponse<Circular>> {
    const response = await api.get<ApiResponse<Circular>>(`/student/circulars/${id}`);
    return response.data;
  },

  // Exam Schedules
  async getExamSchedules(page = 1, limit = 10): Promise<ApiResponse<{ examSchedules: ExamSchedule[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ examSchedules: ExamSchedule[]; pagination: any }>>('/student/exam-schedules', {
      params: { page, limit },
    });
    return response.data;
  },

  async getExamScheduleById(id: string): Promise<ApiResponse<ExamSchedule>> {
    const response = await api.get<ApiResponse<ExamSchedule>>(`/student/exam-schedules/${id}`);
    return response.data;
  },

  // Dashboard Profile (New UI)
  async getDashboardProfile(): Promise<ApiResponse<{
    student: {
      id: string;
      name: string;
      rollNumber: string;
      className: string;
      sectionName: string;
      classSection: string;
    };
    school: {
      id: string;
      name: string;
      logoUrl: string | null;
      code: string;
    };
  }>> {
    const response = await api.get<ApiResponse<{
      student: {
        id: string;
        name: string;
        rollNumber: string;
        className: string;
        sectionName: string;
        classSection: string;
      };
      school: {
        id: string;
        name: string;
        logoUrl: string | null;
        code: string;
      };
    }>>('/student/dashboard-profile');
    return response.data;
  },

  // Profile
  async getProfile(): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>('/student/profile');
    return response.data;
  },
};

// ============================================
// Teacher API
// ============================================

export const teacherAPI = {
  // Dashboard Profile (New UI)
  async getDashboardProfile(): Promise<ApiResponse<{
    teacher: {
      id: string;
      name: string;
      classId: string | null;
      className: string;
      sectionName: string;
      classSection: string;
    };
    school: {
      id: string;
      name: string;
      logoUrl: string | null;
      code: string;
    };
    stats: {
      totalStudents: number;
      totalHomework: number;
      totalExams: number;
    };
  }>> {
    const response = await api.get<ApiResponse<{
      teacher: {
        id: string;
        name: string;
        classId: string | null;
        className: string;
        sectionName: string;
        classSection: string;
      };
      school: {
        id: string;
        name: string;
        logoUrl: string | null;
        code: string;
      };
      stats: {
        totalStudents: number;
        totalHomework: number;
        totalExams: number;
      };
    }>>('/teacher/dashboard-profile');
    return response.data;
  },

  // Dashboard - Get teacher's assigned class
  async getMyClass(): Promise<ApiResponse<{
    id: string;
    name: string;
    section?: string;
    students: User[];
    homeworks: Homework[];
    examSchedules: ExamSchedule[];
    _count: { students: number; homeworks: number; examSchedules: number };
  }>> {
    const response = await api.get<ApiResponse<{
      id: string;
      name: string;
      section?: string;
      students: User[];
      homeworks: Homework[];
      examSchedules: ExamSchedule[];
      _count: { students: number; homeworks: number; examSchedules: number };
    }>>('/teacher/my-class');
    return response.data;
  },

  // Students
  async getMyStudents(page = 1, limit = 10, search = ''): Promise<ApiResponse<{ students: User[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ students: User[]; pagination: any }>>('/teacher/students', {
      params: { page, limit, search },
    });
    return response.data;
  },

  // Homework
  async getHomework(page = 1, limit = 10): Promise<ApiResponse<{ homeworks: Homework[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ homeworks: Homework[]; pagination: any }>>('/teacher/homework', {
      params: { page, limit },
    });
    return response.data;
  },

  async createHomework(data: Omit<CreateHomeworkInput, 'classId'>): Promise<ApiResponse<Homework>> {
    const response = await api.post<ApiResponse<Homework>>('/teacher/homework', data);
    return response.data;
  },

  // Marks
  async getMarks(page = 1, limit = 10, studentId = '', examType = ''): Promise<ApiResponse<{ marks: Mark[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ marks: Mark[]; pagination: any }>>('/teacher/marks', {
      params: { page, limit, studentId, examType },
    });
    return response.data;
  },

  async createMarks(marksData: Array<{
    studentId: string;
    subject: string;
    marksObtained: number;
    totalMarks: number;
    examType: string;
    examDate?: string;
    remarks?: string;
  }>): Promise<ApiResponse<Mark[]>> {
    const response = await api.post<ApiResponse<Mark[]>>('/teacher/marks', { marksData });
    return response.data;
  },

  async updateMark(id: string, data: Partial<CreateMarkInput> & { isPublished?: boolean }): Promise<ApiResponse<Mark>> {
    const response = await api.put<ApiResponse<Mark>>(`/teacher/marks/${id}`, data);
    return response.data;
  },

  async deleteMark(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/teacher/marks/${id}`);
    return response.data;
  },

  async updateHomework(id: string, data: Partial<CreateHomeworkInput> & { isPublished?: boolean }): Promise<ApiResponse<Homework>> {
    const response = await api.put<ApiResponse<Homework>>(`/teacher/homework/${id}`, data);
    return response.data;
  },

  async deleteHomework(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/teacher/homework/${id}`);
    return response.data;
  },

  async updateStudent(id: string, data: { name?: string; email?: string; studentId?: string }): Promise<ApiResponse<void>> {
    const response = await api.put<ApiResponse<void>>(`/teacher/students/${id}`, data);
    return response.data;
  },

  async createStudentManual(data: {
    name: string;
    email: string;
    studentId: string;
    phone?: string;
    password?: string;
  }): Promise<ApiResponse<{
    id: string;
    email: string;
    name: string;
    studentId: string;
    phone?: string;
    createdAt: string;
  }>> {
    const response = await api.post<ApiResponse<{
      id: string;
      email: string;
      name: string;
      studentId: string;
      phone?: string;
      createdAt: string;
    }>>('/teacher/students/manual', data);
    return response.data;
  },

  async bulkUploadStudents(file: File): Promise<ApiResponse<{
    totalProcessed: number;
    successfullyCreated: number;
    duplicates: number;
    students: Array<{ id: string; email: string; name: string; studentId: string; createdAt: string }>;
  }>> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<{
      totalProcessed: number;
      successfullyCreated: number;
      duplicates: number;
      students: Array<{ id: string; email: string; name: string; studentId: string; createdAt: string }>;
    }>>('/teacher/students/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async markAttendance(date: string, attendanceData: Array<{ studentId: string; status: string; remarks?: string }>): Promise<ApiResponse<{ marked: number; date: string; className: string }>> {
    const response = await api.post<ApiResponse<{ marked: number; date: string; className: string }>>('/teacher/attendance', {
      date,
      attendanceData,
    });
    return response.data;
  },

  async getClassAttendance(date?: string): Promise<ApiResponse<{
    date: string;
    className: string;
    attendance: Array<{ studentId: string; name: string; email: string; studentCode: string; status: string | null; remarks?: string }>;
    summary: { total: number; marked: number; unmarked: number };
  }>> {
    const response = await api.get<ApiResponse<{
      date: string;
      className: string;
      attendance: Array<{ studentId: string; name: string; email: string; studentCode: string; status: string | null; remarks?: string }>;
      summary: { total: number; marked: number; unmarked: number };
    }>>('/teacher/attendance', { params: { date } });
    return response.data;
  },
};

// ============================================
// Student API (Extended)
// ============================================

export const studentAPIExtended = {
  async getAttendanceStats(): Promise<ApiResponse<{
    overall: { totalDays: number; presentDays: number; absentDays: number; excusedDays: number; percentage: number };
    last30Days: { totalDays: number; presentDays: number; percentage: number };
  }>> {
    const response = await api.get<ApiResponse<{
      overall: { totalDays: number; presentDays: number; absentDays: number; excusedDays: number; percentage: number };
      last30Days: { totalDays: number; presentDays: number; percentage: number };
    }>>('/student/attendance/stats');
    return response.data;
  },

  async getFees(): Promise<ApiResponse<{
    id: string;
    studentId: string;
    tenantId: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
    dueDate?: string;
    paymentDate?: string;
    remarks?: string;
    student: { id: string; name: string; studentId: string; class: { name: string; section: string | null } };
  } | null>> {
    const response = await api.get<ApiResponse<{
      id: string;
      studentId: string;
      tenantId: string;
      totalAmount: number;
      paidAmount: number;
      balanceAmount: number;
      status: string;
      dueDate?: string;
      paymentDate?: string;
      remarks?: string;
      student: { id: string; name: string; studentId: string; class: { name: string; section: string | null } };
    } | null>>('/student/fees');
    return response.data;
  },

  async getDashboardExtended(): Promise<ApiResponse<{
    stats: { totalHomework: number; totalMarks: number; totalNews: number; totalCirculars: number; upcomingExams: number };
    attendance: { totalDays: number; presentDays: number; percentage: number };
    fee: { totalAmount: number; paidAmount: number; balanceAmount: number; status: string; dueDate?: string } | null;
    recentHomework: any[];
    recentNews: any[];
    upcomingExams: any[];
  }>> {
    const response = await api.get<ApiResponse<{
      stats: { totalHomework: number; totalMarks: number; totalNews: number; totalCirculars: number; upcomingExams: number };
      attendance: { totalDays: number; presentDays: number; percentage: number };
      fee: { totalAmount: number; paidAmount: number; balanceAmount: number; status: string; dueDate?: string } | null;
      recentHomework: any[];
      recentNews: any[];
      upcomingExams: any[];
    }>>('/student/dashboard-extended');
    return response.data;
  },
};

// ============================================
// Admin API (Extended)
// ============================================

export const adminAPIExtended = {
  async getFeeStats(): Promise<ApiResponse<{
    students: { total: number; paid: number; partial: number; unpaid: number };
    amounts: { total: number; paid: number; balance: number; collectionRate: string };
  }>> {
    const response = await api.get<ApiResponse<{
      students: { total: number; paid: number; partial: number; unpaid: number };
      amounts: { total: number; paid: number; balance: number; collectionRate: string };
    }>>('/admin/fees/stats');
    return response.data;
  },

  async updateStudentFee(studentId: string, data: { totalAmount?: number; paidAmount?: number; status?: string; dueDate?: string; remarks?: string }): Promise<ApiResponse<any>> {
    const response = await api.put<ApiResponse<any>>(`/admin/fees/${studentId}`, data);
    return response.data;
  },
};

// ============================================
// Class Controller API
// For Class ID (CLS-X) login users - Management dashboard
// ============================================

export const classControllerAPI = {
  /**
   * Get Class Controller Dashboard Data
   * GET /api/class-controller/dashboard
   */
  async getDashboard(): Promise<ApiResponse<{
    class: {
      id: string;
      classCode: string;
      name: string;
      section: string;
      teacher?: {
        name: string;
        email: string;
      } | null;
    };
    stats: {
      totalStudents: number;
      totalHomework: number;
      upcomingExams: number;
      attendanceRate: number;
    };
    recentActivity: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      createdAt: string;
    }>;
  }>> {
    const response = await api.get<ApiResponse<{
      class: {
        id: string;
        classCode: string;
        name: string;
        section: string;
        teacher?: {
          name: string;
          email: string;
        } | null;
      };
      stats: {
        totalStudents: number;
        totalHomework: number;
        upcomingExams: number;
        attendanceRate: number;
      };
      recentActivity: Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        createdAt: string;
      }>;
    }>>('/class-controller/dashboard');
    return response.data;
  },

  /**
   * Get students for the logged-in class
   * GET /api/class-controller/students
   */
  async getStudents(page = 1, limit = 50, search = ''): Promise<ApiResponse<{ students: User[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ students: User[]; pagination: any }>>('/class-controller/students', {
      params: { page, limit, search },
    });
    return response.data;
  },

  /**
   * Get next available student ID (auto-generated)
   * GET /api/class-controller/students/next-id
   */
  async getNextStudentId(): Promise<ApiResponse<{ nextStudentId: string }>> {
    const response = await api.get<ApiResponse<{ nextStudentId: string }>>('/class-controller/students/next-id');
    return response.data;
  },

  /**
   * Create a new student for the class (with auto-generated ID)
   * POST /api/class-controller/students
   */
  async createStudent(data: {
    name: string;
    email: string;
    password?: string;
    studentId?: string;
  }): Promise<ApiResponse<{
    id: string;
    email: string;
    name: string;
    studentId: string;
    createdAt: string;
    temporaryPassword?: string;
  }>> {
    const response = await api.post<ApiResponse<{
      id: string;
      email: string;
      name: string;
      studentId: string;
      createdAt: string;
      temporaryPassword?: string;
    }>>('/class-controller/students', data);
    return response.data;
  },

  /**
   * Update a student in the class
   * PUT /api/class-controller/students/:id
   */
  async updateStudent(studentId: string, data: { name?: string; email?: string; studentId?: string }): Promise<ApiResponse<void>> {
    const response = await api.put<ApiResponse<void>>(`/class-controller/students/${studentId}`, data);
    return response.data;
  },

  /**
   * Reset student password
   * POST /api/class-controller/students/:id/reset-password
   */
  async resetStudentPassword(studentId: string): Promise<ApiResponse<{ temporaryPassword: string }>> {
    const response = await api.post<ApiResponse<{ temporaryPassword: string }>>(
      `/class-controller/students/${studentId}/reset-password`
    );
    return response.data;
  },

  /**
   * Delete a student from the class
   * DELETE /api/class-controller/students/:id
   */
  async deleteStudent(studentId: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/class-controller/students/${studentId}`);
    return response.data;
  },

  /**
   * Get homework for the class
   * GET /api/class-controller/homework
   */
  async getHomework(page = 1, limit = 20): Promise<ApiResponse<{ homeworks: Homework[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ homeworks: Homework[]; pagination: any }>>('/class-controller/homework', {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Create homework for the class
   * POST /api/class-controller/homework
   */
  async createHomework(data: CreateHomeworkInput): Promise<ApiResponse<Homework>> {
    const response = await api.post<ApiResponse<Homework>>('/class-controller/homework', data);
    return response.data;
  },

  /**
   * Update homework
   * PUT /api/class-controller/homework/:id
   */
  async updateHomework(id: string, data: Partial<CreateHomeworkInput> & { isPublished?: boolean }): Promise<ApiResponse<void>> {
    const response = await api.put<ApiResponse<void>>(`/class-controller/homework/${id}`, data);
    return response.data;
  },

  /**
   * Delete homework
   * DELETE /api/class-controller/homework/:id
   */
  async deleteHomework(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/class-controller/homework/${id}`);
    return response.data;
  },

  /**
   * Get attendance for the class
   * GET /api/class-controller/attendance
   */
  async getAttendance(date?: string): Promise<ApiResponse<{
    date: string;
    className: string;
    attendance: Array<{ studentId: string; name: string; email: string; status: string | null; remarks?: string }>;
    summary: { total: number; marked: number; unmarked: number };
  }>> {
    const response = await api.get<ApiResponse<{
      date: string;
      className: string;
      attendance: Array<{ studentId: string; name: string; email: string; status: string | null; remarks?: string }>;
      summary: { total: number; marked: number; unmarked: number };
    }>>('/class-controller/attendance', { params: { date } });
    return response.data;
  },

  /**
   * Mark attendance for the class
   * POST /api/class-controller/attendance
   */
  async markAttendance(date: string, attendanceData: Array<{ studentId: string; status: string; remarks?: string }>): Promise<ApiResponse<{ marked: number; date: string; className: string }>> {
    const response = await api.post<ApiResponse<{ marked: number; date: string; className: string }>>(
      '/class-controller/attendance',
      { date, attendanceData }
    );
    return response.data;
  },

  /**
   * Get exam schedules for the class
   * GET /api/class-controller/exam-schedules
   */
  async getExamSchedules(page = 1, limit = 20): Promise<ApiResponse<{ examSchedules: ExamSchedule[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ examSchedules: ExamSchedule[]; pagination: any }>>('/class-controller/exam-schedules', {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Create exam schedule for the class
   * POST /api/class-controller/exam-schedules
   */
  async createExamSchedule(data: CreateExamScheduleInput): Promise<ApiResponse<ExamSchedule>> {
    const response = await api.post<ApiResponse<ExamSchedule>>('/class-controller/exam-schedules', data);
    return response.data;
  },

  /**
   * Delete exam schedule
   * DELETE /api/class-controller/exam-schedules/:id
   */
  async deleteExamSchedule(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/class-controller/exam-schedules/${id}`);
    return response.data;
  },

  /**
   * Get circulars for the class
   * GET /api/class-controller/circulars
   */
  async getCirculars(page = 1, limit = 20): Promise<ApiResponse<{ circulars: Circular[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ circulars: Circular[]; pagination: any }>>('/class-controller/circulars', {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Create circular for the class
   * POST /api/class-controller/circulars
   */
  async createCircular(data: CreateCircularInput): Promise<ApiResponse<Circular>> {
    const response = await api.post<ApiResponse<Circular>>('/class-controller/circulars', data);
    return response.data;
  },

  /**
   * Delete circular
   * DELETE /api/class-controller/circulars/:id
   */
  async deleteCircular(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/class-controller/circulars/${id}`);
    return response.data;
  },
};

// ============================================
// Admin Content API (News, Circulars, Exams with Visibility)
// ============================================

export const adminContentAPI = {
  // ===== News with Visibility =====
  async getNews(page = 1, limit = 10, visibility?: 'ALL' | 'TEACHERS_ONLY', isPublished?: boolean): Promise<ApiResponse<{ news: News[]; pagination: any }>> {
    const params: any = { page, limit };
    if (visibility) params.visibility = visibility;
    if (isPublished !== undefined) params.isPublished = isPublished;
    const response = await api.get<ApiResponse<{ news: News[]; pagination: any }>>('/admin/content/news', { params });
    return response.data;
  },

  async createNews(data: CreateNewsInput): Promise<ApiResponse<News>> {
    const response = await api.post<ApiResponse<News>>('/admin/content/news', data);
    return response.data;
  },

  async updateNews(id: string, data: Partial<CreateNewsInput> & { isPublished?: boolean }): Promise<ApiResponse<News>> {
    const response = await api.put<ApiResponse<News>>(`/admin/content/news/${id}`, data);
    return response.data;
  },

  async deleteNews(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/admin/content/news/${id}`);
    return response.data;
  },

  // ===== Circulars with Visibility =====
  async getCirculars(page = 1, limit = 10, visibility?: 'ALL' | 'TEACHERS_ONLY', isPublished?: boolean): Promise<ApiResponse<{ circulars: Circular[]; pagination: any }>> {
    const params: any = { page, limit };
    if (visibility) params.visibility = visibility;
    if (isPublished !== undefined) params.isPublished = isPublished;
    const response = await api.get<ApiResponse<{ circulars: Circular[]; pagination: any }>>('/admin/content/circulars', { params });
    return response.data;
  },

  async createCircular(data: CreateCircularInput): Promise<ApiResponse<Circular>> {
    const response = await api.post<ApiResponse<Circular>>('/admin/content/circulars', data);
    return response.data;
  },

  async updateCircular(id: string, data: Partial<CreateCircularInput> & { isPublished?: boolean }): Promise<ApiResponse<Circular>> {
    const response = await api.put<ApiResponse<Circular>>(`/admin/content/circulars/${id}`, data);
    return response.data;
  },

  async deleteCircular(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/admin/content/circulars/${id}`);
    return response.data;
  },

  // ===== Exams (Timetables) =====
  async getExams(page = 1, limit = 10, classId?: string): Promise<ApiResponse<{ exams: Exam[]; pagination: any }>> {
    const params: any = { page, limit };
    if (classId) params.classId = classId;
    const response = await api.get<ApiResponse<{ exams: Exam[]; pagination: any }>>('/admin/content/exams', { params });
    return response.data;
  },

  async createExam(data: CreateExamInput): Promise<ApiResponse<Exam>> {
    const response = await api.post<ApiResponse<Exam>>('/admin/content/exams', data);
    return response.data;
  },

  async updateExam(id: string, data: Partial<CreateExamInput>): Promise<ApiResponse<Exam>> {
    const response = await api.put<ApiResponse<Exam>>(`/admin/content/exams/${id}`, data);
    return response.data;
  },

  async deleteExam(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/admin/content/exams/${id}`);
    return response.data;
  },
};

// ============================================
// Content API (Shared - News, Circulars, Exams)
// Accessible by Students, Teachers, and Admins
// ============================================

export const contentAPI = {
  // ===== News =====
  async getNews(page = 1, limit = 10, category = ''): Promise<ApiResponse<{ news: News[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ news: News[]; pagination: any }>>('/content/news', {
      params: { page, limit, category },
    });
    return response.data;
  },

  async getNewsById(id: string): Promise<ApiResponse<News>> {
    const response = await api.get<ApiResponse<News>>(`/content/news/${id}`);
    return response.data;
  },

  // ===== Circulars =====
  async getCirculars(page = 1, limit = 10): Promise<ApiResponse<{ circulars: Circular[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ circulars: Circular[]; pagination: any }>>('/content/circulars', {
      params: { page, limit },
    });
    return response.data;
  },

  async getCircularById(id: string): Promise<ApiResponse<Circular>> {
    const response = await api.get<ApiResponse<Circular>>(`/content/circulars/${id}`);
    return response.data;
  },

  // ===== Exams (New Exam Table) =====
  async getExams(page = 1, limit = 10, classId = ''): Promise<ApiResponse<{ exams: Exam[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ exams: Exam[]; pagination: any }>>('/content/exams', {
      params: { page, limit, classId },
    });
    return response.data;
  },

  async getExamById(id: string): Promise<ApiResponse<Exam>> {
    const response = await api.get<ApiResponse<Exam>>(`/content/exams/${id}`);
    return response.data;
  },

  // ===== Exam Schedules (Legacy ExamSchedule Table) =====
  async getExamSchedules(page = 1, limit = 10): Promise<ApiResponse<{ examSchedules: ExamSchedule[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ examSchedules: ExamSchedule[]; pagination: any }>>('/content/exam-schedules', {
      params: { page, limit },
    });
    return response.data;
  },

  async getExamScheduleById(id: string): Promise<ApiResponse<ExamSchedule>> {
    const response = await api.get<ApiResponse<ExamSchedule>>(`/content/exam-schedules/${id}`);
    return response.data;
  },
};

// ============================================
// Utils API (Shared Utilities)
// ============================================

export const utilsAPI = {
  /**
   * Get the URL for downloading the sample CSV template
   * This can be used with Linking.openUrl() or expo-file-system
   */
  getSampleCSVUrl(): string {
    return `${API_BASE_URL}/utils/download-sample-csv`;
  },

  /**
   * Download the sample CSV template as a blob
   * Useful for saving to device storage
   */
  async downloadSampleCSV(): Promise<Blob> {
    const response = await api.get('/utils/download-sample-csv', {
      responseType: 'blob',
    });
    return response.data;
  },
};

// ============================================
// Weekly Lessons API (New - Homework & Classwork Grid)
// ============================================

export const weeklyLessonsAPI = {
  // ==========================================
  // Teacher Endpoints
  // ==========================================

  /**
   * Get weekly lesson grid for teacher's assigned class
   * GET /api/teacher/weekly-lessons
   */
  async getTeacherWeeklyLessons(): Promise<ApiResponse<WeeklyLessonGridResponse>> {
    const response = await api.get<ApiResponse<WeeklyLessonGridResponse>>('/teacher/weekly-lessons');
    return response.data;
  },

  /**
   * Create or update a weekly lesson entry (UPSERT)
   * POST /api/teacher/weekly-lessons
   */
  async upsertWeeklyLesson(data: CreateUpdateLessonInput): Promise<ApiResponse<WeeklyLesson>> {
    const response = await api.post<ApiResponse<WeeklyLesson>>('/teacher/weekly-lessons', data);
    return response.data;
  },

  /**
   * Delete a weekly lesson entry
   * DELETE /api/teacher/weekly-lessons/:id
   */
  async deleteWeeklyLesson(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/teacher/weekly-lessons/${id}`);
    return response.data;
  },

  /**
   * Upload attachment to a lesson entry
   * POST /api/teacher/weekly-lessons/:id/attachments
   * @param id - Lesson UUID
   * @param file - File to upload (from document picker)
   */
  async uploadLessonAttachment(id: string, file: { uri: string; name: string; type: string }): Promise<ApiResponse<{ lesson: WeeklyLesson; attachment: LessonAttachment }>> {
    const formData = new FormData();
    
    // Create file object for FormData
    const fileToUpload = {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any;

    formData.append('file', fileToUpload);

    const response = await api.post<ApiResponse<{ lesson: WeeklyLesson; attachment: LessonAttachment }>>(
      `/teacher/weekly-lessons/${id}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Delete an attachment from a lesson entry
   * DELETE /api/teacher/weekly-lessons/:id/attachments/:index
   */
  async deleteLessonAttachment(id: string, attachmentIndex: number): Promise<ApiResponse<WeeklyLesson>> {
    const response = await api.delete<ApiResponse<WeeklyLesson>>(
      `/teacher/weekly-lessons/${id}/attachments/${attachmentIndex}`
    );
    return response.data;
  },

  // ==========================================
  // Student Endpoints
  // ==========================================

  /**
   * Get weekly lesson grid for student's assigned class (READ-ONLY)
   * GET /api/student/weekly-lessons
   */
  async getStudentWeeklyLessons(): Promise<ApiResponse<WeeklyLessonGridResponse>> {
    const response = await api.get<ApiResponse<WeeklyLessonGridResponse>>('/student/weekly-lessons');
    return response.data;
  },

  /**
   * Get lessons for a specific date (READ-ONLY)
   * GET /api/student/weekly-lessons/by-date?date=2026-07-06
   */
  async getLessonsByDate(date: string): Promise<ApiResponse<{ date: string; lessons: WeeklyLesson[] }>> {
    const response = await api.get<ApiResponse<{ date: string; lessons: WeeklyLesson[] }>>(
      `/student/weekly-lessons/by-date`,
      { params: { date } }
    );
    return response.data;
  },
};

export default api;
