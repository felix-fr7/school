/**
 * Shared Header Navigation Buttons
 * Provides "Home" (role-aware dashboard) and "Logout" (back to Login page)
 * buttons on every screen's toolbar.
 */

import React from 'react';
import { IonButtons, IonButton, IonIcon } from '@ionic/react';
import { homeOutline, logOutOutline } from 'ionicons/icons';
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
    <IonButtons slot="end">
      <IonButton onClick={handleHome} title="Home">
        <IonIcon slot="icon-only" icon={homeOutline} />
      </IonButton>
      <IonButton onClick={handleLogout} title="Logout">
        <IonIcon slot="icon-only" icon={logOutOutline} />
      </IonButton>
    </IonButtons>
  );
};

export default HomeLogoutButtons;
