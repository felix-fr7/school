/**
 * Application Type Definitions
 * Multi-Tenant School Management System
 */

// ============================================
// User Types
// ============================================

export interface ClassInfo {
  id: string;
  name: string;
  section?: string;
  classCode?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT';
  tenantId?: string;
  phone?: string;
  studentId?: string;
  class?: ClassInfo;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// Auth Response Types
// ============================================

export interface ClassLoginResponse {
  success: boolean;
  class: ClassInfo;
  token: string;
}

// ============================================
// Auth Context Types
// ============================================

export interface AuthContextType {
  user: User | null;
  token: string | null;
  currentClass: ClassInfo | null;
  isLoading: boolean;
  tenantId: string | null;
  isTenantAdmin: boolean;
  isTenantSuspended: boolean;
  login: (usernameOrEmailOrId: string, password: string) => Promise<void>;
  classLogin: (classCode: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
  isStudent: () => boolean;
  isTeacher: () => boolean;
  isClass: () => boolean;
  switchTenant: (tenantId: string) => Promise<void>;
  clearCache: () => void;
}