import axios from 'axios';

const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
const configuredApiUrl = import.meta.env.VITE_API_URL || '';
const defaultBrowserApiUrl = 'http://localhost:3000/api';
const defaultEmulatorApiUrl = 'http://10.0.2.2:3000/api';
const API_BASE_URL = configuredApiUrl || (isNative ? defaultEmulatorApiUrl : defaultBrowserApiUrl);
const storage = {
  getToken: () => localStorage.getItem('authToken') || localStorage.getItem('token'),
  getTenantId: () => localStorage.getItem('tenantId'),
  saveSession: (token, user, tenant) => {
    if (token) localStorage.setItem('authToken', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
    if (tenant?.id) localStorage.setItem('tenantId', tenant.id);
  },
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = storage.getToken();
  const tenantId = storage.getTenantId();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId && !config.url?.includes('/auth/')) {
    config.headers['x-tenant-id'] = tenantId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const resolveMediaUrl = (url) => {
  if (!url || /^https?:\/\//i.test(url) || url.startsWith('data:')) return url || '';
  if (url.startsWith('/')) return `${API_BASE_URL.replace(/\/api\/?$/, '')}${url}`;
  return url;
};

export const fetchFileAsBlobUrl = async (endpoint) => {
  const token = storage.getToken();
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;
  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error(`Unable to open file (${response.status})`);
  return URL.createObjectURL(await response.blob());
};

export const authAPI = {
  async login(usernameOrEmailOrId, password) {
    return (await api.post('/auth/login', { usernameOrEmailOrId, password })).data;
  },
};

export const studentAPI = {
  async getDashboardProfile() { return (await api.get('/profile')).data; },
  async getProfile() { return (await api.get('/student/profile')).data; },
  async getHomework(page = 1, limit = 20) { return (await api.get('/student/homework', { params: { page, limit } })).data; },
  async getMarks(page = 1, limit = 20) { return (await api.get('/student/marks', { params: { page, limit } })).data; },
  async getNews(page = 1, limit = 20, category = '') { return (await api.get('/content/news', { params: { page, limit, category } })).data; },
  async getNewsById(id) { return (await api.get(`/content/news/${id}`)).data; },
  async getCirculars(page = 1, limit = 20) { return (await api.get('/content/circulars', { params: { page, limit } })).data; },
  async getCircularById(id) { return (await api.get(`/content/circulars/${id}`)).data; },
  async getExamSchedules(page = 1, limit = 20) { return (await api.get('/student/exams', { params: { page, limit } })).data; },
  async getExamScheduleById(id) { return (await api.get(`/content/exam-schedules/${id}`)).data; },
  async getReportCards() { return (await api.get('/reportcards/student/my-report-cards')).data; },
  async getCalendarEvents(params = {}) { return (await api.get('/calendar/student/calendar-events', { params })).data; },
};

export const timetableAPI = {
  async getStudentTimetable() { return (await api.get('/student/timetable')).data; },
  async getMyTimetables() { return (await api.get('/timetable')).data; },
};

export const weeklyLessonsAPI = {
  async getWeeklyLessons(classId = '', startDate, endDate) {
    return (await api.get('/weekly-lessons', { params: { classId: classId || undefined, startDate, endDate } })).data;
  },
};

export const albumsAPI = {
  async getAlbums(page = 1, limit = 20, category = '') {
    return (await api.get('/albums', { params: { page, limit, category: category || undefined } })).data;
  },
};

export const schoolContextAPI = {
  async getMySchool() {
    return (await api.get('/school-context/me')).data;
  },
};

export { api };
export default api;
