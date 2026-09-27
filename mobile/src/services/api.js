import axios from 'axios';

const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
const defaultBrowserApiUrl = 'http://localhost:3000/api';
const defaultEmulatorApiUrl = 'http://10.0.2.2:3000/api';
const defaultIosSimulatorApiUrl = 'http://localhost:3000/api';

/**
 * API base URL resolution order
 * ---------------------------
 * 1. `VITE_API_URL`          - the deployed API (used by production/native builds)
 * 2. `VITE_DEV_API_URL`      - local backend used while running `npm run dev`
 * 3. platform fallback       - localhost for browser / iOS sim, 10.0.2.2 for Android emu
 *
 * NOTE: `VITE_API_URL` points at the live Render backend, so in `npm run dev`
 * we must prefer the LOCAL backend, otherwise features that only exist on the
 * new backend (e.g. portal branding) will 401 and silently fall back to defaults.
 */
const resolveApiBaseUrl = () => {
  const configured = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const devOverride = (import.meta.env.VITE_DEV_API_URL || '').replace(/\/+$/, '');

  // Vite dev server running in a browser -> always talk to the local backend.
  if (!isNative && import.meta.env.DEV) {
    return devOverride || defaultBrowserApiUrl;
  }

  // Native app: the emulator/simulator cannot reach "localhost" on the host
  // unless a dev override is set, so prefer the configured (deployed) URL.
  if (isNative) {
    if (devOverride) return devOverride;
    if (configured) return configured;
    return /android/i.test(navigator.userAgent) ? defaultEmulatorApiUrl : defaultIosSimulatorApiUrl;
  }

  return configured || defaultBrowserApiUrl;
};

const API_BASE_URL = resolveApiBaseUrl();
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
    // The branding endpoint is PUBLIC - a 401/403 there is a config problem
    // (wrong API host), not an expired session. Never log the user out for it.
    const isPublicBranding = error.config?.url?.includes('/portal-branding');

    if (error.response?.status === 401 && !isPublicBranding) {
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

// ============================================
// Portal Branding API (Login page logo + heading + sub heading)
// Same values the Super Admin edits on the web admin screen.
// GET is public, so this works on the login page before the user has a token.
// ============================================

export const portalBrandingAPI = {
  async getBranding() {
    return (await api.get('/portal-branding')).data;
  },
};

// Hosts to retry against when the primary API host does not serve
// /portal-branding (e.g. the deployed backend has not been redeployed yet).
const BRANDING_FALLBACK_HOSTS = [
  'http://localhost:3000/api',
  'http://10.0.2.2:3000/api',
];

export const fetchPortalBranding = async () => {
  try {
    return await portalBrandingAPI.getBranding();
  } catch (primaryError) {
    const status = primaryError?.response?.status;
    // Only worth retrying on another host when the route is missing/blocked.
    if (![401, 403, 404, 502, 503].includes(status)) throw primaryError;

    for (const host of BRANDING_FALLBACK_HOSTS) {
      if (host === API_BASE_URL) continue;
      try {
        return (await api.get(`${host}/portal-branding`, { timeout: 8000 })).data;
      } catch {
        // try the next host
      }
    }
    throw primaryError;
  }
};

export { api };
export default api;
