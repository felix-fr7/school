/**
 * API Service
 * Centralized API client with Axios
 * Multi-Tenant School Management System
 * 
 * Ionic React / Web Version (JavaScript Version)
 */

import axios from 'axios';

// API Base URL Configuration
const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.EXPO_PUBLIC_API_URL || 
  'http://localhost:3000/api';

console.log('[API] Using base URL:', API_BASE_URL);

// ============================================
// Storage Service (Web - localStorage)
// ============================================

export const storage = {
  async getToken() {
    try {
      return localStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting token from storage:', error);
      return null;
    }
  },

  async saveToken(token) {
    try {
      localStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error saving token to storage:', error);
    }
  },

  async getUser() {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return null;
      return JSON.parse(userData);
    } catch (error) {
      console.error('Error parsing user data from storage:', error);
      return null;
    }
  },

  async saveUser(user) {
    try {
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  },

  async clearUser() {
    try {
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error clearing user from storage:', error);
    }
  },

  async getClass() {
    try {
      const classData = localStorage.getItem('currentClass');
      if (!classData) return null;
      return JSON.parse(classData);
    } catch (error) {
      console.error('Error parsing class data from storage:', error);
      return null;
    }
  },

  async saveClass(classData) {
    try {
      localStorage.setItem('currentClass', JSON.stringify(classData));
    } catch (error) {
      console.error('Error saving class to storage:', error);
    }
  },

  async clearClass() {
    try {
      localStorage.removeItem('currentClass');
    } catch (error) {
      console.error('Error clearing class from storage:', error);
    }
  },

  async clearAuth() {
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

export const fetchFileAsBlobUrl = async (endpoint) => {
  const token = await storage.getToken();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'ngrok-skip-browser-warning': 'true',
    },
    credentials: 'include',
  });

  if (!response.ok) {
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
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const openFileInNewTab = async (endpoint) => {
  try {
    const blobUrl = await fetchFileAsBlobUrl(endpoint);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error('Error opening file:', error);
    throw error;
  }
};

export const getImageSrc = async (endpoint) => {
  return fetchFileAsBlobUrl(endpoint);
};

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Tenant ID storage for multi-tenant support
let currentTenantId = null;

export const setTenantId = (tenantId) => {
  currentTenantId = tenantId;
  if (tenantId) {
    localStorage.setItem('tenantId', tenantId);
  } else {
    localStorage.removeItem('tenantId');
  }
};

export const getTenantId = () => {
  if (currentTenantId) return currentTenantId;
  return localStorage.getItem('tenantId');
};

const tenantCache = new Map();

export const clearTenantCache = () => {
  const tenantId = getTenantId();
  if (tenantId) {
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

export const registerCacheKey = (cacheKey) => {
  const tenantId = getTenantId();
  if (tenantId) {
    if (!tenantCache.has(tenantId)) {
      tenantCache.set(tenantId, new Set());
    }
    tenantCache.get(tenantId).add(cacheKey);
  }
};

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getToken();
      if (token && typeof token === 'string' && token.trim()) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
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

let onTenantSuspended = null;

export const setTenantSuspendedCallback = (callback) => {
  onTenantSuspended = callback;
};

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    
    if (status === 401) {
      try {
        await storage.clearAuth();
      } catch (storageError) {
        console.error('Error clearing auth storage:', storageError);
      }
    } else if (status === 403) {
      const errorMessage = error.response?.data?.message || '';
      const isTenantSuspended = 
        errorMessage.toLowerCase().includes('suspended') ||
        errorMessage.toLowerCase().includes('tenant is suspended') ||
        error.response?.data?.code === 'TENANT_SUSPENDED';
      
      if (isTenantSuspended) {
        clearTenantCache();
        if (onTenantSuspended) {
          onTenantSuspended();
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// ============================================
// Auth API
// ============================================

export const authAPI = {
  async login(usernameOrEmailOrId, password) {
    const response = await api.post('/auth/login', {
      usernameOrEmailOrId,
      password,
    });
    return response.data;
  },

  async register(name, email, password) {
    const response = await api.post('/auth/register', {
      name,
      email,
      password,
    });
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async updateProfile(name) {
    const response = await api.put('/auth/me', { name });
    return response.data;
  },

  async updatePassword(currentPassword, newPassword) {
    const response = await api.put('/auth/password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  async classLogin(classCode, password) {
    const response = await api.post('/auth/class-login', {
      classCode,
      password,
    });
    return response.data;
  },

  async getClassDashboard() {
    const response = await api.get('/auth/class/dashboard');
    return response.data;
  },
};

// ============================================
// Posts API (Legacy)
// ============================================

export const postsAPI = {
  async getAllPosts(page = 1, limit = 10, search = '') {
    const response = await api.get('/posts', {
      params: { page, limit, search },
    });
    return response.data;
  },

  async getPost(id) {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  },

  async getMyPosts(page = 1, limit = 10) {
    const response = await api.get('/posts/my-posts', {
      params: { page, limit },
    });
    return response.data;
  },

  async createPost(data) {
    const response = await api.post('/posts', data);
    return response.data;
  },

  async updatePost(id, data) {
    const response = await api.put(`/posts/${id}`, data);
    return response.data;
  },

  async deletePost(id) {
    const response = await api.delete(`/posts/${id}`);
    return response.data;
  },
};

// ============================================
// Tenants API (Super Admin)
// ============================================

export const tenantsAPI = {
  async getAllTenants(page = 1, limit = 10, search = '') {
    const response = await api.get('/tenants', {
      params: { page, limit, search },
    });
    return response.data;
  },

  async getTenant(id) {
    const response = await api.get(`/tenants/${id}`);
    return response.data;
  },

  async createTenant(data) {
    const response = await api.post('/tenants', data);
    return response.data;
  },

  async updateTenant(id, data) {
    const response = await api.put(`/tenants/${id}`, data);
    return response.data;
  },

  async deleteTenant(id) {
    const response = await api.delete(`/tenants/${id}`);
    return response.data;
  },

  async getTenantStats(id) {
    const response = await api.get(`/tenants/${id}/stats`);
    return response.data;
  },

  // School Admin Management Methods (Super Admin only)
  // These routes are under /api/super-admin/schools/:schoolId/admins
  async getSchoolAdmins(schoolId) {
    const response = await api.get(`/super-admin/schools/${schoolId}/admins`);
    return response.data;
  },

  async updateSchoolAdmin(schoolId, adminId, data) {
    const response = await api.put(`/super-admin/schools/${schoolId}/admins/${adminId}`, data);
    return response.data;
  },

  async resetSchoolAdminPassword(schoolId, adminId, password) {
    const response = await api.post(`/super-admin/schools/${schoolId}/admins/${adminId}/reset-password`, { password });
    return response.data;
  },
};

// ============================================
// Admin API (School Admin)
// ============================================

export const adminAPI = {
  async getClasses() {
    const response = await api.get('/admin/classes');
    return response.data;
  },

  async getClassDashboard(id) {
    const response = await api.get(`/admin/classes/${id}/dashboard`);
    return response.data;
  },

  async getClass(id) {
    const response = await api.get(`/admin/classes/${id}`);
    return response.data;
  },

  async createClass(data) {
    const response = await api.post('/admin/classes', data);
    return response.data;
  },

  async updateClass(id, data) {
    const response = await api.put(`/admin/classes/${id}`, data);
    return response.data;
  },

  async deleteClass(id) {
    const response = await api.delete(`/admin/classes/${id}`);
    return response.data;
  },

  async resetClassCodeCounter(password) {
    const response = await api.post('/admin/reset-class-code-counter', { password });
    return response.data;
  },

  async resetClassPassword(id, password) {
    const response = await api.post(`/admin/classes/${id}/reset-password`, { password });
    return response.data;
  },

  async getStudents(page = 1, limit = 10, search = '', classId = '') {
    const response = await api.get('/admin/students', {
      params: { page, limit, search, classId },
    });
    return response.data;
  },

  async getStudent(id) {
    const response = await api.get(`/admin/students/${id}`);
    return response.data;
  },

  async createStudent(data) {
    const response = await api.post('/admin/students', data);
    return response.data;
  },

  async updateStudent(id, data) {
    const response = await api.put(`/admin/students/${id}`, data);
    return response.data;
  },

  async deleteStudent(id) {
    const response = await api.delete(`/admin/students/${id}`);
    return response.data;
  },

  async getStudentTemplate() {
    const response = await api.get('/admin/students/template');
    return response.data;
  },

  async createStudentManual(data) {
    const response = await api.post('/admin/students/manual', data);
    return response.data;
  },

  async bulkImportStudents(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/admin/students/bulk', formData);
    return response.data;
  },

  async bulkUploadStudentsCSV(file, classId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('classId', classId);
    const response = await api.post('/admin/students/bulk-upload', formData);
    return response.data;
  },

  async getHomework(page = 1, limit = 10, classId = '', isPublished = '') {
    const response = await api.get('/homework', {
      params: { page, limit, classId, isPublished },
    });
    return response.data;
  },

  async getHomeworkById(id) {
    const response = await api.get(`/admin/homework/${id}`);
    return response.data;
  },

  async createHomework(data) {
    const response = await api.post('/admin/homework', data);
    return response.data;
  },

  async updateHomework(id, data) {
    const response = await api.put(`/admin/homework/${id}`, data);
    return response.data;
  },

  async deleteHomework(id) {
    const response = await api.delete(`/admin/homework/${id}`);
    return response.data;
  },

  async getNews(page = 1, limit = 10, visibility = '', isPublished = '') {
    const response = await api.get('/admin-content/news', {
      params: { page, limit, visibility, isPublished },
    });
    return response.data;
  },

  async createNews(data) {
    const response = await api.post('/admin-content/news', data);
    return response.data;
  },

  async createNewsWithFiles(formData) {
    const token = await storage.getToken();
    const response = await fetch(`${API_BASE_URL}/admin-content/news`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'x-tenant-id': getTenantId(),
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { response: { status: response.status, data: errorData } };
    }
    
    return await response.json();
  },

  async updateNews(id, data) {
    const response = await api.put(`/admin-content/news/${id}`, data);
    return response.data;
  },

  async deleteNews(id) {
    const response = await api.delete(`/admin-content/news/${id}`);
    return response.data;
  },

  async getCirculars(page = 1, limit = 10, isPublished = '') {
    const response = await api.get('/circulars', {
      params: { page, limit, isPublished },
    });
    return response.data;
  },

  async createCircular(data) {
    const response = await api.post('/circulars', data);
    return response.data;
  },

  async updateCircular(id, data) {
    const response = await api.put(`/circulars/${id}`, data);
    return response.data;
  },

  async createCircularWithFiles(formData) {
    const token = await storage.getToken();
    const response = await fetch(`${API_BASE_URL}/circulars`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'x-tenant-id': getTenantId(),
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { response: { status: response.status, data: errorData } };
    }
    
    return await response.json();
  },

  async deleteCircular(id) {
    const response = await api.delete(`/circulars/${id}`);
    return response.data;
  },

  async getExamSchedules(page = 1, limit = 10, classId = '', isPublished = '') {
    const response = await api.get('/admin/exam-schedules', {
      params: { page, limit, classId, isPublished },
    });
    return response.data;
  },

  async getExams(page = 1, limit = 50) {
    const response = await api.get('/admin/exams', {
      params: { page, limit },
    });
    return response.data;
  },

  async createExamSchedule(data) {
    const response = await api.post('/admin/exam-schedules', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return response.data;
  },

  async deleteExamSchedule(id) {
    const response = await api.delete(`/admin/exam-schedules/${id}`);
    return response.data;
  },

  async updateExamSchedule(id, data) {
    const response = await api.put(`/admin/exam-schedules/${id}`, data);
    return response.data;
  },

  async getAvailableTeachers(classId, search = '', page = 1, limit = 100) {
    const response = await api.get('/admin/teachers/available', {
      params: { page, limit, classId, search },
    });
    return response.data;
  },

  async getTeachers(page = 1, limit = 10, classId = '', search = '') {
    const response = await api.get('/admin/teachers', {
      params: { page, limit, classId, search },
    });
    return response.data;
  },

  async getTeacher(id) {
    const response = await api.get(`/admin/teachers/${id}`);
    return response.data;
  },

  async createTeacher(data) {
    const response = await api.post('/admin/teachers', data);
    return response.data;
  },

  async updateTeacher(id, data) {
    const response = await api.put(`/admin/teachers/${id}`, data);
    return response.data;
  },

  async deleteTeacher(id) {
    const response = await api.delete(`/admin/teachers/${id}`);
    return response.data;
  },
};

// ============================================
// Student API
// ============================================

export const studentAPI = {
  async getDashboard() {
    const response = await api.get('/student/dashboard');
    return response.data;
  },

  async getHomework(page = 1, limit = 10, subject = '') {
    const response = await api.get('/student/homework', {
      params: { page, limit, subject },
    });
    return response.data;
  },

  async getHomeworkById(id) {
    const response = await api.get(`/student/homework/${id}`);
    return response.data;
  },

  async getMarks(page = 1, limit = 10, subject = '', examType = '') {
    const response = await api.get('/student/marks', {
      params: { page, limit, subject, examType },
    });
    return response.data;
  },

  async getMarkById(id) {
    const response = await api.get(`/student/marks/${id}`);
    return response.data;
  },

  async getNews(page = 1, limit = 10, category = '') {
    const response = await api.get('/content/news', {
      params: { page, limit, category },
    });
    return response.data;
  },

  async getNewsById(id) {
    const response = await api.get(`/content/news/${id}`);
    return response.data;
  },

  async getCirculars(page = 1, limit = 10) {
    const response = await api.get('/student/circulars', {
      params: { page, limit },
    });
    return response.data;
  },

  async getCircularById(id) {
    const response = await api.get(`/student/circulars/${id}`);
    return response.data;
  },

  async getExamSchedules(page = 1, limit = 10) {
    const response = await api.get('/student/exam-schedules', {
      params: { page, limit },
    });
    return response.data;
  },

  async getExamScheduleById(id) {
    const response = await api.get(`/student/exam-schedules/${id}`);
    return response.data;
  },

  async getDashboardProfile() {
    const response = await api.get('/student/dashboard-profile');
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/student/profile');
    return response.data;
  },
};

// ============================================
// Teacher API
// ============================================

export const teacherAPI = {
  async getWeeklyLessons(classId, startDate) {
    const response = await api.get(`/teacher/classes/${classId}/lessons`, {
      params: { startDate },
    });
    return response.data;
  },

  async createOrUpdateLesson(data) {
    const response = await api.post('/teacher/lessons', data);
    return response.data;
  },

  async deleteLesson(id) {
    const response = await api.delete(`/teacher/lessons/${id}`);
    return response.data;
  },

  async uploadLessonAttachment(lessonId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/teacher/lessons/${lessonId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteLessonAttachment(attachmentId) {
    const response = await api.delete(`/teacher/lessons/attachments/${attachmentId}`);
    return response.data;
  },
};

// ============================================
// Class Controller API
// ============================================

export const classControllerAPI = {
  async getDashboard() {
    const response = await api.get('/class-controller/dashboard');
    return response.data;
  },

  async getStudents(classId, page = 1, limit = 10, search = '') {
    const response = await api.get('/class-controller/students', {
      params: { classId, page, limit, search },
    });
    return response.data;
  },

  async getExams(page = 1, limit = 20) {
    const response = await api.get('/class-controller/exams', {
      params: { page, limit },
    });
    return response.data;
  },

  async getExamById(id) {
    const response = await api.get(`/class-controller/exams/${id}`);
    return response.data;
  },
};

// ============================================
// Weekly Lessons API
// ============================================

export const weeklyLessonsAPI = {
  async getWeeklyLessons(classId, startDate, endDate) {
    const response = await api.get(`/weekly-lessons`, {
      params: { classId, startDate, endDate },
    });
    return response.data;
  },

  async createWeeklyLesson(classId, data) {
    const response = await api.post(`/weekly-lessons?classId=${classId}`, data);
    return response.data;
  },

  async updateWeeklyLesson(id, data) {
    const response = await api.put(`/weekly-lessons/${id}`, data);
    return response.data;
  },

  async deleteWeeklyLesson(id) {
    const response = await api.delete(`/weekly-lessons/${id}`);
    return response.data;
  },

  async uploadAttachment(lessonId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/weekly-lessons/${lessonId}/attachments`, formData);
    return response.data;
  },

  async deleteAttachment(lessonId, attachmentId) {
    const response = await api.delete(`/weekly-lessons/${lessonId}/attachments/${attachmentId}`);
    return response.data;
  },
};

// ============================================
// Products API
// ============================================

export const productsAPI = {
  async getStats() {
    const response = await api.get('/products/stats');
    return response.data;
  },

  async getAllProducts(params) {
    const response = await api.get('/products', { params });
    return response.data;
  },

  async getProduct(id) {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  async createProduct(data) {
    const response = await api.post('/products', data);
    return response.data;
  },

  async updateProduct(id, data) {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },

  async deleteProduct(id) {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },
};

export { api };
export default api;