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
  // Track authentication status explicitly to avoid async state update issues
  const [authStatus, setAuthStatus] = useState({ isAuthenticated: false, hasRole: false, role: null });

  // Initialize auth state from storage on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  // Multi-tab sync: Listen for storage events from other tabs
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === TENANT_ID_KEY && event.newValue !== event.oldValue) {
        console.log('[AuthContext] Tenant ID changed in another tab:', event.newValue);
        const newTenantId = event.newValue;
        if (newTenantId) {
          setTenantIdState(newTenantId);
          clearTenantCache();
        } else {
          setTenantIdState(null);
          clearTenantCache();
        }
      }
      
      if (event.key === 'authToken' && !event.newValue) {
        console.log('[AuthContext] Auth cleared in another tab');
        setUser(null);
        setToken(null);
        setTenantIdState(null);
        setIsTenantSuspended(false);
        setAuthStatus({ isAuthenticated: false, hasRole: false, role: null });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const initializeAuth = async () => {
    let resolvedToken = null;
    let resolvedUser = null;
    let resolvedClass = null;
    let resolvedTenantId = null;
    let resolvedAuthStatus = { isAuthenticated: false, hasRole: false, role: null };

    try {
      const storedToken = await storage.getToken();
      const storedUser = await storage.getUser();
      const storedClass = await storage.getClass();
      const storedTenantId = getTenantId();

      console.log('[AuthContext] Initializing auth - token:', !!storedToken, 'user:', !!storedUser, 'class:', !!storedClass, 'tenantId:', storedTenantId);

      if (storedToken) {
        if (storedClass) {
          resolvedToken = storedToken;
          resolvedClass = storedClass;
          resolvedTenantId = storedTenantId;
          resolvedAuthStatus = { isAuthenticated: true, hasRole: false, role: null, isClass: true };
          console.log('[AuthContext] Restored class session from storage');
        } else if (storedUser) {
          try {
            console.log('[AuthContext] Verifying token with /auth/me endpoint...');
            const response = await authAPI.getMe();
            
            if (response.success && response.data) {
              const userData = response.data;
              let finalUserData = (!userData.role && storedUser.role) ? storedUser : userData;
              
              resolvedToken = storedToken;
              resolvedUser = finalUserData;
              // Use tenantId if available, otherwise use schoolId as fallback (for students/users without tenantId)
              resolvedTenantId = finalUserData.tenantId || finalUserData.schoolId || storedTenantId;
              resolvedAuthStatus = {
                isAuthenticated: true,
                hasRole: !!finalUserData.role,
                role: finalUserData.role
              };
              
              console.log('[AuthContext] ✓ User session restored successfully', {
                userId: finalUserData._id || finalUserData.id,
                name: finalUserData.name,
                email: finalUserData.email,
                role: finalUserData.role,
                roleType: typeof finalUserData.role,
                tenantId: resolvedTenantId,
                isAuthenticated: true
              });
            } else {
              if (storedUser && storedUser.role) {
                console.log('[AuthContext] getMe() failed but stored user available, using stored data');
                resolvedToken = storedToken;
                resolvedUser = storedUser;
                // Use tenantId if available, otherwise use schoolId as fallback
                resolvedTenantId = storedUser.tenantId || storedUser.schoolId || storedTenantId;
                resolvedAuthStatus = {
                  isAuthenticated: true,
                  hasRole: !!storedUser.role,
                  role: storedUser.role
                };
              } else {
                console.log('[AuthContext] Token invalid and no valid stored user, clearing storage');
                await clearAllData();
                return;
              }
            }
          } catch (verifyError) {
            if (storedUser && storedUser.role) {
              console.log('[AuthContext] getMe() threw error but stored user available, using stored data:', verifyError.message);
              resolvedToken = storedToken;
              resolvedUser = storedUser;
              // Use tenantId if available, otherwise use schoolId as fallback
              resolvedTenantId = storedUser.tenantId || storedUser.schoolId || storedTenantId;
              resolvedAuthStatus = {
                isAuthenticated: true,
                hasRole: !!storedUser.role,
                role: storedUser.role
              };
            } else {
              console.log('[AuthContext] Token verification failed and no valid stored user, clearing auth');
              await clearAllData();
              return;
            }
          }
        } else {
          console.log('[AuthContext] Token exists but no user/class data, clearing');
          await clearAllData();
          return;
        }
      } else {
        console.log('[AuthContext] No stored token, ensuring clean state');
        await clearAllData();
        return;
      }
    } catch (error) {
      console.error('[AuthContext] Error initializing auth:', error);
      await clearAllData();
    } finally {
      if (resolvedToken) setToken(resolvedToken);
      if (resolvedUser) setUser(resolvedUser);
      if (resolvedClass) setCurrentClass(resolvedClass);
      if (resolvedTenantId) {
        setTenantIdState(resolvedTenantId);
        setTenantId(resolvedTenantId);
      }
      setAuthStatus(resolvedAuthStatus);
      setIsLoading(false);

      console.log('[AuthContext] Auth initialization complete', {
        isAuthenticated: resolvedAuthStatus.isAuthenticated,
        userRole: resolvedUser?.role || resolvedAuthStatus.role,
        authStatus: resolvedAuthStatus,
        tokenExists: !!resolvedToken
      });
    }
  };

  const clearCache = useCallback(() => {
    console.log('[AuthContext] Clearing cache for tenant:', tenantId);
    clearTenantCache();
    
    const cacheKeys = [
      'products_cache', 'tenants_cache', 'students_cache',
      'teachers_cache', 'classes_cache', 'homework_cache',
      'news_cache', 'exams_cache'
    ];
    
    cacheKeys.forEach(key => {
      localStorage.removeItem(`${key}_${tenantId}`);
      sessionStorage.removeItem(`${key}_${tenantId}`);
    });
  }, [tenantId]);

  const clearAllData = async () => {
    await storage.clearAuth();
    await storage.clearClass();
    setUser(null);
    setToken(null);
    setCurrentClass(null);
    setTenantIdState(null);
    setTenantId(null);
    setIsTenantSuspended(false);
    setAuthStatus({ isAuthenticated: false, hasRole: false, role: null });
    clearTenantCache();
  };

  const login = async (usernameOrEmailOrId, password) => {
    try {
      const response = await authAPI.login(usernameOrEmailOrId, password);

      if (response.success && response.data) {
        // Backend returns: { success, message, data: { token, user, tenant } }
        // So we need to access response.data.data to get token, user, tenant
        const { user: userData, token: authToken, tenant } = response.data.data || response.data;

        setCurrentClass(null);
        await storage.clearClass();

        await Promise.all([
          storage.saveToken(authToken),
          storage.saveUser(userData),
        ]);

        setUser(userData);
        setToken(authToken);
        
        setAuthStatus({
          isAuthenticated: true,
          hasRole: !!userData.role,
          role: userData.role
        });
        
        // Set tenantId: use tenant.id from response, or fall back to userData fields
        // The backend returns tenant info separately from user info
        const tenantIdValue = tenant?.id || userData.tenantId || userData.schoolId;
        if (tenantIdValue) {
          setTenantIdState(tenantIdValue);
          setTenantId(tenantIdValue);
        } else if (userData.role === 'SUPER_ADMIN' || userData.role === 'Super Admin') {
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

  const classLogin = async (classCode, password) => {
    try {
      const response = await authAPI.classLogin(classCode, password);

      if (response.success && response.data) {
        // Backend returns: { success, message, data: { token, class, teacher } }
        const { class: classData, token: authToken } = response.data.data || response.data;

        setUser(null);
        await storage.clearUser();

        await Promise.all([
          storage.saveToken(authToken),
          storage.saveClass(classData),
        ]);

        setToken(authToken);
        setCurrentClass(classData);
        
        // Set tenantId from class's tenantId
        if (classData?.tenantId) {
          setTenantIdState(classData.tenantId);
          setTenantId(classData.tenantId);
        }
        
        setAuthStatus({
          isAuthenticated: true,
          hasRole: false,
          role: null,
          isClass: true
        });
      } else {
        throw new Error(response.error?.message || 'Class login failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await authAPI.register(name, email, password);

      if (response.success && response.data) {
        const { user: userData, token: authToken } = response.data;

        await Promise.all([
          storage.saveToken(authToken),
          storage.saveUser(userData),
        ]);

        setUser(userData);
        setToken(authToken);
        
        setAuthStatus({
          isAuthenticated: true,
          hasRole: !!userData.role,
          role: userData.role
        });
        
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

  const logout = async () => {
    try {
      clearCache();
      await clearAllData();
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  const switchTenant = async (newTenantId) => {
    if (user?.role !== 'SUPER_ADMIN') {
      console.warn('Only SUPER_ADMIN can switch tenants');
      return;
    }

    if (newTenantId === tenantId) {
      return;
    }

    console.log('[AuthContext] Switching tenant from', tenantId, 'to', newTenantId);
    clearCache();
    setTenantIdState(newTenantId);
    setTenantId(newTenantId);
    
    const newCacheKeys = [
      'products_cache', 'tenants_cache', 'students_cache',
      'teachers_cache', 'classes_cache', 'homework_cache',
      'news_cache', 'exams_cache'
    ];
    
    newCacheKeys.forEach(key => {
      localStorage.removeItem(`${key}_${newTenantId}`);
      sessionStorage.removeItem(`${key}_${newTenantId}`);
    });

    setIsTenantSuspended(false);
  };

  const isAuthenticated = authStatus.isAuthenticated || !!token;

  const isSuperAdmin = user?.role && (
    ['SUPER_ADMIN', 'SUPER ADMIN'].includes(user.role.toUpperCase().replace(/\s+/g, '_')) ||
    user.role.toUpperCase().includes('SUPER')
  );

  const isAdmin = user?.role && (
    ['ADMIN', 'SCHOOL_ADMIN', 'SCHOOL ADMIN'].includes(user.role.toUpperCase().replace(/\s+/g, '_')) ||
    user.role.toUpperCase().includes('ADMIN')
  );

  const isTenantAdmin = user?.role === 'TENANT_ADMIN';

  const isStudent = user?.role && (
    ['STUDENT'].includes(user.role.toUpperCase().replace(/\s+/g, '_')) ||
    user.role.toUpperCase().includes('STUDENT')
  );

  const isTeacher = user?.role && (
    ['TEACHER'].includes(user.role.toUpperCase().replace(/\s+/g, '_')) ||
    user.role.toUpperCase().includes('TEACHER')
  );

  const isClass = !!currentClass;

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;