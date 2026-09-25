import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI, api } from '../services/api';

const AuthContext = createContext(undefined);
const TOKEN_KEY = 'authToken';
const USER_KEY = 'user';

const readUser = () => {
  try {
    const value = localStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readUser);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token || user) return;
    api.get('/auth/me').then(({ data }) => {
      if (data?.success && data.data) {
        setUser(data.data);
        localStorage.setItem(USER_KEY, JSON.stringify(data.data));
      }
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, [token, user]);

  const login = async (username, password) => {
    const response = await authAPI.login(username, password);
    const payload = response?.data?.data || response?.data || response;
    if (!payload?.token || !payload?.user) throw new Error(response?.message || 'Login failed');
    localStorage.setItem(TOKEN_KEY, payload.token);
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    if (payload.tenant?.id) localStorage.setItem('tenantId', payload.tenant.id);
    setToken(payload.token);
    setUser(payload.user);
    return payload.user;
  };

  const logout = async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('tenantId');
    setToken(null);
    setUser(null);
  };

  const role = String(user?.role || '').toUpperCase().replace(/[-\s]+/g, '_');
  const isAuthenticated = !!token;
  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    isStudent: role === 'STUDENT',
    isAdmin: role.includes('ADMIN'),
    isSuperAdmin: role === 'SUPER_ADMIN',
    isTeacher: role === 'TEACHER',
    isClass: false,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
