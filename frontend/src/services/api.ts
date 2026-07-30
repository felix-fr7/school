/**
 * API Service
 * Centralized API client with Axios
 * Multi-Tenant School Management System
 * 
 * Ionic React / Web Version
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Import types
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
// Uses environment variable for web compatibility
// Fallback to localhost for development if env var is not set
const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.EXPO_PUBLIC_API_URL || 
  'http://localhost:3000/api';

// Log the API URL in development mode
console.log('[API] Environment variables loaded:');
console.log('[API] - VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('[API] - EXPO_PUBLIC_API_URL:', import.meta.env.EXPO_PUBLIC_API_URL);
console.log('[API] Using base URL:', API_BASE_URL);

// ============================================
// Storage Service (Web - localStorage)
// ============================================

export const storage = {
  async getToken(): Promise<string | null> {
    try {
      return localStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting token from storage:', error);
      return null;
    }
  },

  async saveToken(token: string): Promise<void> {
    try {
      localStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error saving token to storage:', error);
    }
  },

  async getUser(): Promise<User | null> {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return null;
      return JSON.parse(userData);
    } catch (error) {
      console.error('Error parsing user data from storage:', error);
      return null;
    }
  },

  async saveUser(user: User): Promise<void> {
    try {
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  },

  async clearUser(): Promise<void> {
    try {
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error clearing user from storage:', error);
    }
  },

  // Class storage methods
  async getClass(): Promise<ClassLoginResponse['class'] | null> {
    try {
      const classData = localStorage.getItem('currentClass');
      if (!classData) return null;
      return JSON.parse(classData);
    } catch (error) {
      console.error('Error parsing class data from storage:', error);
      return null;
    }
  },

  async saveClass(classData: ClassLoginResponse['class']): Promise<void> {
    try {
      localStorage.setItem('currentClass', JSON.stringify(classData));
    } catch (error) {
      console.error('Error saving class to storage:', error);
    }
  },

  async clearClass(): Promise<void> {
    try {
      localStorage.removeItem('currentClass');
    } catch (error) {
      console.error('Error clearing class from storage:', error);
    }
  },

  async clearAuth(): Promise<void> {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error clearing auth storage:', error);
    }
  },
};

// ============================================
// File Service - Authenticated file fetching
// ============================================

/**
 * Fetch a file from the API with authentication and return as blob URL
 * This allows opening files in new tabs while maintaining auth
 * @param endpoint - The file endpoint (e.g., '/files/exam/123')
 * @returns Promise<string> - Object URL for the file
 */
export const fetchFileAsBlobUrl = async (endpoint: string): Promise<string> => {
  const token = await storage.getToken();
  
  console.log(`[API] Fetching file from: ${endpoint}`);
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'ngrok-skip-browser-warning': 'true',
    },
    credentials: 'include',
  });

  console.log(`[API] File response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    // Try to get error message from response
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.text();
      if (errorData) {
        try {
          const parsed = JSON.parse(errorData);
          errorMessage = parsed.error?.message || parsed.message || errorData;
        } catch {
          errorMessage = errorData;
        }
      }
    } catch {
      // Ignore parsing errors
    }
    console.error(`[API] File fetch error: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  console.log(`[API] File fetched successfully, size: ${blob.size} bytes`);
  return URL.createObjectURL(blob);
};

/**
 * Open a file in a new tab with authentication
 * @param endpoint - The file endpoint (e.g., '/files/exam/123')
 */
export const openFileInNewTab = async (endpoint: string): Promise<void> => {
  try {
    const blobUrl = await fetchFileAsBlobUrl(endpoint);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error('Error opening file:', error);
    throw error;
  }
};

/**
 * Get image src with authentication (returns blob URL)
 * @param endpoint - The image endpoint (e.g., '/files/news/123/image')
 * @returns Promise<string> - Object URL for the image
 */
export const getImageSrc = async (endpoint: string): Promise<string> => {
  return fetchFileAsBlobUrl(endpoint);
};

// Create Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Enable cookies/sessions across origins (required for CORS with credentials)
  headers: {
    'Content-Type': 'application/json',
    // Ngrok free tier bypass header - prevents browser warning page interception
    'ngrok-skip-browser-warning': 'true',
  },
});

// Tenant ID storage for multi-tenant support
let currentTenantId: string | null = null;

// Set tenant ID (called when user logs in or switches tenant)
export const setTenantId = (tenantId: string | null) => {
  currentTenantId = tenantId;
  // Also persist to localStorage for page refreshes
  if (tenantId) {
    localStorage.setItem('tenantId', tenantId);
  } else {
    localStorage.removeItem('tenantId');
  }
};

// Get tenant ID from memory or localStorage
export const getTenantId = (): string | null => {
  if (currentTenantId) return currentTenantId;
  return localStorage.getItem('tenantId');
};

// Cache invalidation for multi-tenant support
const tenantCache = new Map<string, Set<string>>();

/**
 * Clear all cached data for the current tenant
 * This is called when switching tenants to prevent stale data
 */
export const clearTenantCache = (): void => {
  const tenantId = getTenantId();
  if (tenantId) {
    console.log('[API] Clearing cache for tenant:', tenantId);
    
    // Clear any cached API responses
    // This is a simple implementation - you can extend this based on your caching strategy
    const cacheKeys = tenantCache.get(tenantId);
    if (cacheKeys) {
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      tenantCache.delete(tenantId);
    }
  }
};

/**
 * Register a cache key for a tenant
 * This allows the cache to be cleared when switching tenants
 */
export const registerCacheKey = (cacheKey: string): void => {
  const tenantId = getTenantId();
  if (tenantId) {
    if (!tenantCache.has(tenantId)) {
      tenantCache.set(tenantId, new Set());
    }
    tenantCache.get(tenantId)!.add(cacheKey);
  }
};

/**
 * Get cached data for a key
 */
export const getCachedData = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp, ttl } = JSON.parse(cached);
      // Check if cache is still valid (default TTL: 5 minutes)
      if (ttl && Date.now() - timestamp < ttl) {
        return data as T;
      }
      // Cache expired, remove it
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('[API] Error reading cache:', error);
  }
  return null;
};

/**
 * Set cached data for a key
 */
export const setCachedData = <T>(key: string, data: T, ttl: number = 300000): void => {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      ttl
    };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
    registerCacheKey(key);
  } catch (error) {
    console.error('[API] Error writing cache:', error);
  }
};

// Request interceptor - add auth token and tenant ID
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getToken();
      if (token && typeof token === 'string' && token.trim()) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add tenant ID header for multi-tenant support
      // Skip for auth endpoints and superadmin endpoints (they don't need tenant context)
      const skipTenantHeader = [
        '/auth/',
        '/superadmin/',
        '/health'
      ].some(prefix => config.url?.includes(prefix));
      
      if (!skipTenantHeader) {
        const tenantId = getTenantId();
        if (tenantId) {
          config.headers['x-tenant-id'] = tenantId;
        }
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

// Event callback for tenant suspended - can be set by AuthContext
let onTenantSuspended: (() => void) | null = null;

/**
 * Set callback for tenant suspended event
 * This is called when a 403 response indicates tenant suspension
 */
export const setTenantSuspendedCallback = (callback: (() => void) | null) => {
  onTenantSuspended = callback;
};

// Response interceptor - handle common errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    
    if (status === 401) {
      // Token expired or invalid - clear storage
      try {
        await storage.clearAuth();
        console.warn('[API] Session expired - user should be redirected to login');
      } catch (storageError) {
        console.error('Error clearing auth storage:', storageError);
      }
    } else if (status === 403) {
      // Check if it's a tenant suspension error
      const errorMessage = error.response?.data?.message || '';
      const isTenantSuspended = 
        errorMessage.toLowerCase().includes('suspended') ||
        errorMessage.toLowerCase().includes('tenant is suspended') ||
        error.response?.data?.code === 'TENANT_SUSPENDED';
      
      if (isTenantSuspended) {
        console.error('[API] Tenant suspended - redirecting user');
        
        // Clear tenant-specific cache
        clearTenantCache();
        
        // Trigger callback if set
        if (onTenantSuspended) {
          onTenantSuspended();
        }
        
        // Optionally redirect to suspended page
        // window.location.href = '/tenant-suspended';
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

  async updateStudent(id: string, data: { name?: string; email?: string; phone?: string; classId?: string | null }): Promise<ApiResponse<{ id: string; name: string; email: string; phone?: string; studentId: string; classId: string | null; updatedAt: string }>> {
    const response = await api.put<ApiResponse<{ id: string; name: string; email: string; phone?: string; studentId: string; classId: string | null; updatedAt: string }>>(`/admin/students/${id}`, data);
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
    const response = await api.post<ApiResponse<{ totalProcessed: number; successfullyCreated: number; duplicates: number; students: User[] }>>('/admin/students/bulk', formData);
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
    }>>('/admin/students/bulk-upload', formData);
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

  // New Exam table (PDF/Image based timetables)
  async getExams(page = 1, limit = 50): Promise<ApiResponse<{ exams: ExamSchedule[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ exams: ExamSchedule[]; pagination: any }>>('/admin/exams', {
      params: { page, limit },
    });
    return response.data;
  },

  async createExamSchedule(data: FormData | CreateExamScheduleInput): Promise<ApiResponse<ExamSchedule>> {
    const response = await api.post<ApiResponse<ExamSchedule>>('/admin/exam-schedules', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return response.data;
  },

  async deleteExamSchedule(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/admin/exam-schedules/${id}`);
    return response.data;
  },

  async updateExamSchedule(id: string, data: { title?: string; classId?: string | null }): Promise<ApiResponse<void>> {
    const response = await api.put<ApiResponse<void>>(`/admin/exam-schedules/${id}`, data);
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
// Class Controller API
// ============================================

export const classControllerAPI = {
  // Dashboard
  async getDashboard(): Promise<ApiResponse<{
    class: ClassLoginResponse['class'] & { teacher?: { name: string; email: string; phone?: string } | null };
    students: User[];
    homework: Homework[];
    exams: ExamSchedule[];
    news: News[];
    circulars: Circular[];
    weeklyLessons: any[] | null;
  }>> {
    const response = await api.get<ApiResponse<{
      class: ClassLoginResponse['class'] & { teacher?: { name: string; email: string; phone?: string } | null };
      students: User[];
      homework: Homework[];
      exams: ExamSchedule[];
      news: News[];
      circulars: Circular[];
      weeklyLessons: any[] | null;
    }>>('/class-controller/dashboard');
    return response.data;
  },

  // Students
  async getStudents(classId: string, page = 1, limit = 10, search = ''): Promise<ApiResponse<{ students: User[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ students: User[]; pagination: any }>>('/class-controller/students', {
      params: { classId, page, limit, search },
    });
    return response.data;
  },

  // Exams (New Exam table - PDF/Image based timetables)
  async getExams(page = 1, limit = 20): Promise<ApiResponse<{ exams: ExamSchedule[]; pagination: any }>> {
    const response = await api.get<ApiResponse<{ exams: ExamSchedule[]; pagination: any }>>('/class-controller/exams', {
      params: { page, limit },
    });
    return response.data;
  },

  async getExamById(id: string): Promise<ApiResponse<ExamSchedule>> {
    const response = await api.get<ApiResponse<ExamSchedule>>(`/class-controller/exams/${id}`);
    return response.data;
  },
};

// ============================================
// Weekly Lessons API
// ============================================

export const weeklyLessonsAPI = {
  async getWeeklyLessons(classId: string, startDate?: string, endDate?: string): Promise<ApiResponse<WeeklyLessonGridResponse>> {
    const response = await api.get<ApiResponse<WeeklyLessonGridResponse>>(`/weekly-lessons`, {
      params: { classId, startDate, endDate },
    });
    return response.data;
  },

  async createWeeklyLesson(classId: string, data: CreateUpdateLessonInput): Promise<ApiResponse<WeeklyLesson>> {
    const response = await api.post<ApiResponse<WeeklyLesson>>(`/weekly-lessons?classId=${classId}`, data);
    return response.data;
  },

  async updateWeeklyLesson(id: string, data: Partial<CreateUpdateLessonInput>): Promise<ApiResponse<WeeklyLesson>> {
    const response = await api.put<ApiResponse<WeeklyLesson>>(`/weekly-lessons/${id}`, data);
    return response.data;
  },

  async deleteWeeklyLesson(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/weekly-lessons/${id}`);
    return response.data;
  },

  async uploadAttachment(lessonId: string, file: File): Promise<ApiResponse<LessonAttachment>> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<LessonAttachment>>(`/weekly-lessons/${lessonId}/attachments`, formData);
    return response.data;
  },

  async deleteAttachment(lessonId: string, attachmentId: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/weekly-lessons/${lessonId}/attachments/${attachmentId}`);
    return response.data;
  },
};

// ============================================
// SuperAdmin API (System-wide tenant management)
// ============================================

export const superadminAPI = {
  /**
   * Get system-wide statistics
   */
  async getStats(): Promise<ApiResponse<{
    tenants: { total: number; active: number; suspended: number };
    users: { total: number; super_admins: number };
  }>> {
    const response = await api.get<ApiResponse<{
      tenants: { total: number; active: number; suspended: number };
      users: { total: number; super_admins: number };
    }>>('/superadmin/stats');
    return response.data;
  },

  /**
   * Create a new tenant
   */
  async createTenant(data: {
    name: string;
    domain_slug: string;
    subscription_plan?: string;
    max_users?: number;
    max_students?: number;
    settings?: Record<string, any>;
  }): Promise<ApiResponse<Tenant>> {
    const response = await api.post<ApiResponse<Tenant>>('/superadmin/tenants', data);
    return response.data;
  },

  /**
   * Get all tenants with pagination and filtering
   */
  async getAllTenants(params?: {
    page?: number;
    limit?: number;
    status?: 'ACTIVE' | 'SUSPENDED';
    subscription_plan?: string;
    search?: string;
  }): Promise<ApiResponse<{
    tenants: Tenant[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>> {
    const response = await api.get<ApiResponse<{
      tenants: Tenant[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }>>('/superadmin/tenants', { params });
    return response.data;
  },

  /**
   * Get single tenant by ID with stats
   */
  async getTenant(id: string): Promise<ApiResponse<Tenant & {
    stats: {
      total_users: number;
      total_admins: number;
    };
  }>> {
    const response = await api.get<ApiResponse<Tenant & {
      stats: {
        total_users: number;
        total_admins: number;
      };
    }>>(`/superadmin/tenants/${id}`);
    return response.data;
  },

  /**
   * Update tenant details
   */
  async updateTenant(id: string, data: Partial<{
    name: string;
    domain_slug: string;
    subscription_plan: string;
    max_users: number;
    max_students: number;
    settings: Record<string, any>;
  }>): Promise<ApiResponse<Tenant>> {
    const response = await api.patch<ApiResponse<Tenant>>(`/superadmin/tenants/${id}`, data);
    return response.data;
  },

  /**
   * Update tenant status (suspend/activate)
   */
  async updateTenantStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<ApiResponse<Tenant>> {
    const response = await api.patch<ApiResponse<Tenant>>(`/superadmin/tenants/${id}/status`, { status });
    return response.data;
  },

  /**
   * Delete tenant (soft delete)
   */
  async deleteTenant(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/superadmin/tenants/${id}`);
    return response.data;
  },
};

// ============================================
// Products API (Tenant-isolated example)
// ============================================

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  stock_quantity: number;
  category?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  created_by_email?: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  sku?: string;
  price?: number;
  stock_quantity?: number;
  category?: string;
  metadata?: Record<string, any>;
}

export const productsAPI = {
  /**
   * Get product statistics for current tenant
   */
  async getStats(): Promise<ApiResponse<{
    total_products: number;
    active_products: number;
    inventory_value: number;
    low_stock: number;
    out_of_stock: number;
    categories: Array<{ category: string; count: number; total_stock: number }>;
  }>> {
    const response = await api.get<ApiResponse<{
      total_products: number;
      active_products: number;
      inventory_value: number;
      low_stock: number;
      out_of_stock: number;
      categories: Array<{ category: string; count: number; total_stock: number }>;
    }>>('/products/stats');
    return response.data;
  },

  /**
   * Get all products for current tenant with pagination and filtering
   */
  async getAllProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    is_active?: boolean;
    min_price?: number;
    max_price?: number;
  }): Promise<ApiResponse<{
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>> {
    const response = await api.get<ApiResponse<{
      products: Product[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }>>('/products', { params });
    return response.data;
  },

  /**
   * Get single product by ID
   */
  async getProduct(id: string): Promise<ApiResponse<Product>> {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data;
  },

  /**
   * Create a new product (automatically assigns tenant_id)
   */
  async createProduct(data: CreateProductInput): Promise<ApiResponse<Product>> {
    const response = await api.post<ApiResponse<Product>>('/products', data);
    return response.data;
  },

  /**
   * Update a product
   */
  async updateProduct(id: string, data: Partial<CreateProductInput> & { is_active?: boolean }): Promise<ApiResponse<Product>> {
    const response = await api.put<ApiResponse<Product>>(`/products/${id}`, data);
    return response.data;
  },

  /**
   * Delete a product (soft delete)
   */
  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/products/${id}`);
    return response.data;
  },
};

// Export the api instance for direct access if needed
export { api };
