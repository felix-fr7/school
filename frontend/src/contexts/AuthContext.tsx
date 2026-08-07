/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 * Multi-Tenant School Management System
 * 
 * Features:
 * - Multi-tab sync via localStorage events
 * - Cache invalidation on tenant switch
 * - Suspended tenant handling
 */

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import type { User, ClassLoginResponse, AuthContextType } from '../types';
import { authAPI, storage, setTenantId, getTenantId, clearTenantCache } from '../services/api';

// Extended Auth Context Type with tenant support
export interface ExtendedAuthContextType extends AuthContextType {
  tenantId: string | null;
  isTenantAdmin: boolean;
  switchTenant: (tenantId: string) => Promise<void>;
  isTenantSuspended: boolean;
  clearCache: () => void;
}

// Create context with extended type
const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);

// Storage key for tenant ID
const TENANT_ID_KEY = 'tenantId';

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentClass, setCurrentClass] = useState<ClassLoginResponse['class'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantIdState] = useState<string | null>(null);
  const [isTenantSuspended, setIsTenantSuspended] = useState(false);

  // Initialize auth state from storage on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  // Multi-tab sync: Listen for storage events from other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Only handle tenantId changes
      if (event.key === TENANT_ID_KEY && event.newValue !== event.oldValue) {
        console.log('[AuthContext] Tenant ID changed in another tab:', event.newValue);
        
        const newTenantId = event.newValue;
        
        if (newTenantId) {
          // Sync tenant ID from another tab
          setTenantIdState(newTenantId);
          // Clear cache to prevent stale data
          clearTenantCache();
        } else {
          // Tenant ID was cleared
          setTenantIdState(null);
          clearTenantCache();
        }
      }
      
      // Handle auth clearance from another tab (logout)
      if (event.key === 'authToken' && !event.newValue) {
        console.log('[AuthContext] Auth cleared in another tab');
        setUser(null);
        setToken(null);
        setTenantIdState(null);
        setIsTenantSuspended(false);
      }
    };

    // Add event listener for storage changes
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const initializeAuth = async () => {
    try {
      const storedToken = await storage.getToken();
      const storedUser = await storage.getUser();
      const storedClass = await storage.getClass();
      const storedTenantId = getTenantId();

      // If we have a stored token, verify it with the backend
      if (storedToken) {
        try {
          // Verify token by fetching current user
          const response = await authAPI.getMe();
          
          if (response.success && response.data) {
            // Token is valid, update with fresh user data
            setUser(response.data);
            setToken(storedToken);
            if (storedClass) {
              setCurrentClass(storedClass);
            }
            // Set tenant ID from user data or stored value
            const userTenantId = response.data.tenantId || storedTenantId;
            if (userTenantId) {
              setTenantIdState(userTenantId);
              setTenantId(userTenantId);
            }
          } else {
            // Token invalid or response failed - clear storage
            await clearAllData();
          }
        } catch (verifyError) {
          // Token verification failed - clear storage
          console.log('Token verification failed, clearing stored auth');
          await clearAllData();
        }
      } else {
        // No stored token - ensure clean state
        await clearAllData();
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      await clearAllData();
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all cached data for current tenant
  const clearCache = useCallback(() => {
    console.log('[AuthContext] Clearing cache for tenant:', tenantId);
    clearTenantCache();
    
    // Clear any component-level cached data
    // This can be extended based on your caching strategy
    const cacheKeys = [
      'products_cache',
      'tenants_cache',
      'students_cache',
      'teachers_cache',
      'classes_cache',
      'homework_cache',
      'news_cache',
      'exams_cache'
    ];
    
    cacheKeys.forEach(key => {
      localStorage.removeItem(`${key}_${tenantId}`);
      sessionStorage.removeItem(`${key}_${tenantId}`);
    });
  }, [tenantId]);

  // Clear all auth data
  const clearAllData = async () => {
    await storage.clearAuth();
    await storage.clearClass();
    setUser(null);
    setToken(null);
    setCurrentClass(null);
    setTenantIdState(null);
    setTenantId(null);
    setIsTenantSuspended(false);
    clearTenantCache();
  };

  /**
   * Login user with dual support: email OR studentId (roll number)
   */
  const login = async (usernameOrEmailOrId: string, password: string) => {
    try {
      const response = await authAPI.login(usernameOrEmailOrId, password);

      if (response.success && response.data) {
        const { user: userData, token: authToken } = response.data;

        // Clear class data if any
        setCurrentClass(null);
        await storage.clearClass();

        // Save to storage
        await Promise.all([
          storage.saveToken(authToken),
          storage.saveUser(userData),
        ]);

        // Update state
        setUser(userData);
        setToken(authToken);
        
        // Set tenant ID for multi-tenant support
        if (userData.tenantId) {
          setTenantIdState(userData.tenantId);
          setTenantId(userData.tenantId);
        } else if (userData.role === 'SUPER_ADMIN') {
          // SUPER_ADMIN doesn't have a tenant
          setTenantIdState(null);
          setTenantId(null);
        }
      } else {
        throw new Error(response.error?.message || 'Login failed');
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Login as a class using class code and password
   */
  const classLogin = async (classCode: string, password: string) => {
    try {
      const response = await authAPI.classLogin(classCode, password);

      if (response.success && response.data) {
        const { class: classData, token: authToken } = response.data;

        // Clear user data if any
        setUser(null);
        await storage.clearUser();

        // Save class data and token
        await Promise.all([
          storage.saveToken(authToken),
          storage.saveClass(classData),
        ]);

        // Update state
        setToken(authToken);
        setCurrentClass(classData);
      } else {
        throw new Error(response.error?.message || 'Class login failed');
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Register new user
   */
  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await authAPI.register(name, email, password);

      if (response.success && response.data) {
        const { user: userData, token: authToken } = response.data;

        // Save to storage
        await Promise.all([
          storage.saveToken(authToken),
          storage.saveUser(userData),
        ]);

        // Update state
        setUser(userData);
        setToken(authToken);
        
        // Set tenant ID if available
        if (userData.tenantId) {
          setTenantIdState(userData.tenantId);
          setTenantId(userData.tenantId);
        }
      } else {
        throw new Error(response.error?.message || 'Registration failed');
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Logout user - clears all data and notifies other tabs
   */
  const logout = async () => {
    try {
      // Clear cache first
      clearCache();
      
      // Clear all auth data
      await clearAllData();
      
      // Storage event will automatically notify other tabs
      // since we're removing the authToken
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  /**
   * Switch tenant context (for SUPER_ADMIN only)
   * Clears cache before switching to prevent stale data
   */
  const switchTenant = async (newTenantId: string) => {
    if (user?.role !== 'SUPER_ADMIN') {
      console.warn('Only SUPER_ADMIN can switch tenants');
      return;
    }

    // Don't switch to the same tenant
    if (newTenantId === tenantId) {
      return;
    }

    console.log('[AuthContext] Switching tenant from', tenantId, 'to', newTenantId);

    // Step 1: Clear cache for current tenant BEFORE switching
    clearCache();
    
    // Step 2: Update state
    setTenantIdState(newTenantId);
    
    // Step 3: Update localStorage (this will trigger storage event in other tabs)
    setTenantId(newTenantId);
    
    // Step 4: Clear cache for new tenant to ensure fresh data
    // (In case there's cached data from a previous session)
    const newCacheKeys = [
      'products_cache',
      'tenants_cache',
      'students_cache',
      'teachers_cache',
      'classes_cache',
      'homework_cache',
      'news_cache',
      'exams_cache'
    ];
    
    newCacheKeys.forEach(key => {
      localStorage.removeItem(`${key}_${newTenantId}`);
      sessionStorage.removeItem(`${key}_${newTenantId}`);
    });

    // Reset suspended state
    setIsTenantSuspended(false);
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!token;

  /**
   * Check if user is Super Admin
   */
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  /**
   * Check if user is Admin (School Admin)
   */
  const isAdmin = user?.role === 'ADMIN';

  /**
   * Check if user is Tenant Admin
   */
  const isTenantAdmin = user?.role === 'TENANT_ADMIN';

  /**
   * Check if user is Student
   */
  const isStudent = user?.role === 'STUDENT';

  /**
   * Check if user is Teacher
   */
  const isTeacher = user?.role === 'TEACHER';

  /**
   * Check if currently logged in as a class
   */
  const isClass = !!currentClass;

  // Handle tenant suspended state
  const handleTenantSuspended = useCallback(() => {
    console.log('[AuthContext] Tenant suspended detected');
    setIsTenantSuspended(true);
    // Optionally redirect to suspended page
    // window.location.href = '/tenant-suspended';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        currentClass,
        isLoading,
        login,
        classLogin,
        register,
        logout,
        isAuthenticated,
        isSuperAdmin,
        isAdmin,
        isStudent,
        isTeacher,
        isClass,
        tenantId,
        isTenantAdmin,
        switchTenant,
        isTenantSuspended,
        clearCache,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;