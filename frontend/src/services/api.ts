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
  CreateStudentInput,
  DashboardStats,
  StudentStatistics,
} from '../types';

// API Base URL - configure based on environment
const API_BASE_URL = process.env.API_URL || 'https://unadvised-tribunal-mutate.ngrok-free.dev/api';

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
  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
      email,
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
  async getAllTenants(page = 1, limit = 10, search = '', isActive = true): Promise<ApiResponse<{ tenants: Tenant[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ tenants: Tenant[]; pagination: any }>>('/tenants', {
      params: { page, limit, search, isActive },
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
};

export default api;
