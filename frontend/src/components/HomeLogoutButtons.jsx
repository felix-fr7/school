/**
 * Shared Header Navigation Buttons - Pure React Web
 * Provides "Home" and "Logout" buttons on screen toolbars.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomeLogoutButtons = () => {
  const history = useHistory();
  const { logout, isSuperAdmin, isAdmin, isTeacher, isStudent, isClass } = useAuth();

  const getHomePath = () => {
    if (isSuperAdmin) return '/superadmin/dashboard';
    if (isAdmin) return '/admin/dashboard';
    if (isTeacher) return '/teacher/dashboard';
    if (isStudent) return '/student/dashboard';
    if (isClass) return '/class-controller/dashboard';
    return '/login';
  };

  const handleHome = () => {
    history.push(getHomePath());
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
    history.push('/login');
  };

  return (
    <div className="home-logout-buttons" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <button
        type="button"
        onClick={handleHome}
        title="Home"
        className="app-nav-home"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: 600,
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          color: '#1e293b',
          cursor: 'pointer',
        }}
      >
        <span>🏠</span>
        <span>Home</span>
      </button>
      <button
        type="button"
        onClick={handleLogout}
        title="Logout"
        className="app-nav-signout"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: 600,
          borderRadius: '8px',
          border: '1px solid #fee2e2',
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          cursor: 'pointer',
        }}
      >
        <span>🚪</span>
        <span>Sign Out</span>
      </button>
    </div>
  );
};

export default HomeLogoutButtons;
