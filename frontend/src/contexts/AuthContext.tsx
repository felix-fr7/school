/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 * Multi-Tenant School Management System
 * Now supports both User login and Class-based login
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, ClassLoginResponse, AuthContextType } from '../types';
import { authAPI, storage } from '../services/api';

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentClass, setCurrentClass] = useState<ClassLoginResponse['class'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from storage on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // TEMPORARY: Clear stored auth on boot for testing login flow
      // This ensures we always start fresh to test the login screen
      await storage.clearAuth();
      await storage.clearClass();
      
      const storedToken = await storage.getToken();
      const storedUser = await storage.getUser();
      const storedClass = await storage.getClass();

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
          } else {
            // Token invalid or response failed - clear storage
            await storage.clearAuth();
            await storage.clearClass();
            setUser(null);
            setToken(null);
            setCurrentClass(null);
          }
        } catch (verifyError) {
          // Token verification failed - clear storage
          console.log('Token verification failed, clearing stored auth');
          await storage.clearAuth();
          await storage.clearClass();
          setUser(null);
          setToken(null);
          setCurrentClass(null);
        }
      } else {
        // No stored token - ensure clean state
        setUser(null);
        setToken(null);
        setCurrentClass(null);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      // On any error, ensure clean state
      setUser(null);
      setToken(null);
      setCurrentClass(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login user with dual support: email OR studentId (roll number)
   * @param usernameOrEmailOrId - Email address or Student ID/Roll Number
   * @param password - User password
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
      } else {
        throw new Error(response.error?.message || 'Login failed');
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Login as a class using class code and password
   * @param classCode - Class code (e.g., CLS-1)
   * @param password - Class password
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
      } else {
        throw new Error(response.error?.message || 'Registration failed');
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await storage.clearAuth();
      await storage.clearClass();
      setUser(null);
      setToken(null);
      setCurrentClass(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
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