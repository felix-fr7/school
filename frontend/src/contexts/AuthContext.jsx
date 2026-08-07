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

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authAPI, storage, setTenantId, getTenantId, clearTenantCache } from '../services/api';

// Create context
const AuthContext = createContext(undefined);

// Storage key for tenant ID
const TENANT_ID_KEY = 'tenantId';

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [currentClass, setCurrentClass] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantIdState] = useState(null);
  const [isTenantSuspended, setIsTenantSuspended] = useState(false);

  // Initialize auth state from storage on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  // Multi-tab sync: Listen for storage events from other tabs
  useEffect(() => {
    const handleStorageChange = (event) => {
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
        // Check if this is a class login token (stored class data exists)
        if (storedClass) {
          // Class login - restore class state without calling /auth/me
          // Class tokens don't work with /auth/me endpoint
          setToken(storedToken);
          setCurrentClass(storedClass);
          if (storedTenantId) {
            setTenantIdState(storedTenantId);
            setTenantId(storedTenantId);
          }
          console.log('[AuthContext] Restored class session from storage');
        } else if (storedUser) {
          try {
            // User login - verify token by fetching current user
            const response = await authAPI.getMe();
            
            if (response.success && response.data) {
              // Token is valid, update with fresh user data
              setUser(response.data);
              setToken(storedToken);
              // Set tenant ID from user data or stored value
              const userTenantId = response.data.tenantId || storedTenantId;
              if (userTenantId) {
                setTenantIdState(userTenantId);
                setTenantId(userTenantId);
              }
              console.log('[AuthContext] Restored user session from storage');
            } else {
              // Token invalid or response failed - clear storage
              console.log('[AuthContext] Token invalid, clearing storage');
              await clearAllData();
            }
          } catch (verifyError) {
            // Token verification failed - clear storage
            console.log('Token verification failed, clearing stored auth');
            await clearAllData();
          }
        } else {
          // Token exists but no user or class data - clear storage
          console.log('[AuthContext] Token exists but no user/class data, clearing');
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
  const login = async (usernameOrEmailOrId, password) => {
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
  const classLogin = async (classCode, password) => {
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
  const register = async (name, email, password) => {
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
  const switchTenant = async (newTenantId) => {
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
   * Handles both 'SUPER_ADMIN' and 'Super Admin' formats
   */
  const isSuperAdmin = user?.role && 
    ['SUPER_ADMIN', 'Super Admin'].includes(user.role.toUpperCase().replace(/\s+/g, '_'));

  /**
   * Check if user is Admin (School Admin)
   * Handles both 'ADMIN' and 'School Admin' formats
   */
  const isAdmin = user?.role && 
    ['ADMIN', 'SCHOOL_ADMIN', 'School Admin'].includes(user.role.toUpperCase().replace(/\s+/g, '_'));

  /**
   * Check if user is Tenant Admin
   */
  const isTenantAdmin = user?.role === 'TENANT_ADMIN';

  /**
   * Check if user is Student
   * Handles both 'STUDENT' and 'Student' formats
   */
  const isStudent = user?.role && 
    ['STUDENT', 'Student'].includes(user.role.toUpperCase().replace(/\s+/g, '_'));

  /**
   * Check if user is Teacher
   * Handles both 'TEACHER' and 'Teacher' formats
   */
  const isTeacher = user?.role && 
    ['TEACHER', 'Teacher'].includes(user.role.toUpperCase().replace(/\s+/g, '_'));

  /**
   * Check if currently logged in as a class
   */
  const isClass = !!currentClass;

  // Handle tenant suspended state
  const handleTenantSuspended = useCallback(() => {
    console.log('[AuthContext] Tenant suspended detected');
    setIsTenantSuspended(true);
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