/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 * Multi-Tenant School Management System
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, AuthContextType, UserRole } from '../types';
import { authAPI, storage } from '../services/api';

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from storage on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        storage.getToken(),
        storage.getUser(),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login user
   */
  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);

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
        throw new Error(response.error?.message || 'Login failed');
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
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!token && !!user;

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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated,
        isSuperAdmin,
        isAdmin,
        isStudent,
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