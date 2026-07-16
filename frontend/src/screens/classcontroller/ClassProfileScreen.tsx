/**
 * Class Profile Screen (Ionic React Version)
 * View and manage class profile and settings
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSpinner,
  IonText,
  IonCard,
  IonCardContent,
  IonIcon,
  IonButton,
  IonAlert,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { 
  personOutline, 
  mailOutline, 
  keyOutline, 
  downloadOutline,
  helpCircleOutline,
  logOutOutline,
  refreshOutline,
} from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import './ClassProfileScreen.css';

interface ClassProfile {
  id: string;
  classCode: string;
  name: string;
  section: string;
  teacher?: {
    name: string;
    email: string;
  } | null;
}

const ClassProfileScreen: React.FC = () => {
  const history = useHistory();
  const { currentClass, logout } = useAuth();
  
  const [profile, setProfile] = useState<ClassProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const fetchProfile = async () => {
    try {
      // Note: classControllerAPI.getDashboard not available, using console.log fallback
      console.log('Fetching class profile...');
      
      // Use currentClass from auth context if available
      if (currentClass) {
        setProfile({
          id: currentClass.id,
          classCode: currentClass.classCode,
          name: currentClass.name,
          section: currentClass.section,
        });
      }
    } catch (error) {
      console.error('Error fetching class profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    setRefreshing(true);
    await fetchProfile();
    event.detail.complete();
  };

  const handleLogout = () => {
    setAlertHeader('Logout');
    setAlertMessage('Are you sure you want to logout?');
    setShowAlert(true);
  };

  const handleConfirmLogout = () => {
    logout();
    history.push('/login');
  };

  const handleResetPassword = () => {
    setAlertHeader('Reset Class Password');
    setAlertMessage('Are you sure you want to reset the class password? This will set it back to the default password.');
    setShowAlert(true);
  };

  const handleExportData = () => {
    console.log('Export data requested');
    setAlertHeader('Info');
    setAlertMessage('Export feature coming soon');
    setShowAlert(true);
  };

  const handleHelp = () => {
    console.log('Help requested');
    setAlertHeader('Info');
    setAlertMessage('Help feature coming soon');
    setShowAlert(true);
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Profile</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center profile-loading">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p className="loading-text">Loading profile...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="profile-content" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} />
        </IonRefresher>

        {/* Header with Class Code */}
        <div className="header-card">
          <div className="class-code-container">
            <span className="class-code-label">Class ID</span>
            <span className="class-code-value">
              {profile?.classCode || currentClass?.classCode || 'N/A'}
            </span>
          </div>
          <div className="class-info">
            <h2 className="class-name">
              {profile?.name || currentClass?.name || 'Class'}
            </h2>
            {profile?.section && (
              <p className="class-section">Section: {profile.section}</p>
            )}
          </div>
        </div>

        {/* Teacher Info */}
        {profile?.teacher && (
          <IonCard className="info-card">
            <IonCardContent>
              <h3 className="info-card-title">Class Teacher</h3>
              <div className="teacher-info">
                <div className="teacher-avatar">
                  {profile.teacher.name.charAt(0).toUpperCase()}
                </div>
                <div className="teacher-details">
                  <div className="teacher-name">{profile.teacher.name}</div>
                  <div className="teacher-email">{profile.teacher.email}</div>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {/* Quick Stats */}
        <IonCard className="stats-card">
          <IonCardContent>
            <h3 className="info-card-title">Class Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">
                  CLS-{(profile?.id || '').slice(-4).toUpperCase()}
                </div>
                <div className="stat-label">Class Code</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{new Date().getFullYear()}</div>
                <div className="stat-label">Academic Year</div>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Settings Section */}
        <IonCard className="settings-card">
          <IonCardContent>
            <h3 className="info-card-title">Settings</h3>
            
            <div className="setting-item" onClick={handleResetPassword}>
              <div className="setting-icon-container">
                <IonIcon icon={keyOutline} />
              </div>
              <div className="setting-content">
                <div className="setting-title">Reset Password</div>
                <div className="setting-subtitle">Reset class login password</div>
              </div>
              <IonIcon icon={personOutline} className="setting-arrow" />
            </div>

            <div className="setting-item" onClick={handleExportData}>
              <div className="setting-icon-container">
                <IonIcon icon={downloadOutline} />
              </div>
              <div className="setting-content">
                <div className="setting-title">Export Data</div>
                <div className="setting-subtitle">Download class data as CSV</div>
              </div>
              <IonIcon icon={personOutline} className="setting-arrow" />
            </div>

            <div className="setting-item" onClick={handleHelp}>
              <div className="setting-icon-container">
                <IonIcon icon={helpCircleOutline} />
              </div>
              <div className="setting-content">
                <div className="setting-title">Help & Support</div>
                <div className="setting-subtitle">Get help with using the app</div>
              </div>
              <IonIcon icon={personOutline} className="setting-arrow" />
            </div>
          </IonCardContent>
        </IonCard>

        {/* About Section */}
        <IonCard className="about-card">
          <IonCardContent>
            <h3 className="about-title">Class Controller</h3>
            <p className="about-version">Version 1.0.0</p>
            <p className="about-copyright">© 2026 School Management System</p>
          </IonCardContent>
        </IonCard>

        {/* Logout Button */}
        <IonButton
          expand="block"
          className="logout-button"
          onClick={handleLogout}
        >
          <IonIcon icon={logOutOutline} slot="start" />
          Logout
        </IonButton>

        {/* Alert */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={alertHeader}
          message={alertMessage}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { 
              text: 'OK', 
              handler: alertHeader === 'Logout' ? handleConfirmLogout : undefined
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassProfileScreen;