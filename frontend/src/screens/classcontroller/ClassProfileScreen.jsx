import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
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
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { 
  personOutline, 
  keyOutline, 
  downloadOutline,
  helpCircleOutline,
  logOutOutline,
  refreshOutline,
  chevronForwardOutline,
  schoolOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import './ClassProfileScreen.css';

const ClassProfileScreen = () => {
  const history = useHistory();
  const { currentClass, logout } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dynamic Alert Control
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    header: '',
    message: '',
    onConfirm: null,
  });

  const fetchProfile = async () => {
    try {
      console.log('Fetching class profile...');
      
      // Auth context à®…à®²à¯à®²à®¤à¯ Backend API à®¤à®°à®µà¯
      if (currentClass) {
        setProfile({
          id: currentClass.id || 'cls-101',
          classCode: currentClass.classCode || '10-A-2026',
          name: currentClass.name || 'Grade 10',
          section: currentClass.section || 'A',
          academicYear: '2025 - 2026',
          teacher: {
            name: 'K. Rajkumar',
            email: 'rajkumar.teacher@school.edu',
          },
        });
      } else {
        // Fallback profile data for demo
        setProfile({
          id: 'cls-101',
          classCode: '10-A-2026',
          name: 'Grade 10',
          section: 'Section A',
          academicYear: '2025 - 2026',
          teacher: {
            name: 'K. Rajkumar',
            email: 'rajkumar.teacher@school.edu',
          },
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
  }, [currentClass]);

  const onRefresh = async (event) => {
    setRefreshing(true);
    await fetchProfile();
    event.detail.complete();
  };

  const handleLogout = () => {
    setAlertConfig({
      isOpen: true,
      header: 'Logout Confirmation',
      message: 'Are you sure you want to log out of this class controller account?',
      onConfirm: () => {
        logout();
        history.push('/login');
      },
    });
  };

  const handleResetPassword = () => {
    setAlertConfig({
      isOpen: true,
      header: 'Reset Class Password',
      message: 'Are you sure you want to reset the password? A reset link will be sent to the class teacher\'s email.',
      onConfirm: () => {
        console.log('Password reset initiated');
      },
    });
  };

  const handleExportData = () => {
    setAlertConfig({
      isOpen: true,
      header: 'Export Class Data',
      message: 'Class attendance and activity logs will be downloaded as a CSV file.',
      onConfirm: () => {
        console.log('Exporting data...');
      },
    });
  };

  const handleHelp = () => {
    setAlertConfig({
      isOpen: true,
      header: 'Help & Support',
      message: 'Need help? Contact system administrator at support@schoolapp.com',
    });
  };

  if (loading && !refreshing) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar className="light-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/class-controller/dashboard" />
            </IonButtons>
            <IonTitle>Class Profile</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center profile-loading">
          <IonSpinner name="crescent" color="primary" />
          <IonText color="medium">
            <p className="loading-text">Loading profile details...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="light-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/dashboard" />
          </IonButtons>
          <IonTitle>Class Profile</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="profile-content" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} />
        </IonRefresher>

        <div className="profile-container">
          
          {/* Main Hero Header Card */}
          <div className="header-card">
            <div className="class-code-badge">
              <span className="class-code-label">CLASS CODE</span>
              <span className="class-code-value">
                {profile?.classCode || 'N/A'}
              </span>
            </div>
            <div className="class-info">
              <h2 className="class-name">{profile?.name || 'Class Controller'}</h2>
              {profile?.section && (
                <p className="class-section">Section {profile.section}</p>
              )}
            </div>
          </div>

          {/* Quick Class Stats */}
          <IonCard className="stats-card">
            <IonCardContent>
              <h3 className="card-section-title">Class Overview</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <IonIcon icon={schoolOutline} className="stat-icon" />
                  <div className="stat-value">
                    {profile?.classCode || 'N/A'}
                  </div>
                  <div className="stat-label">Class ID</div>
                </div>
                <div className="stat-item">
                  <IonIcon icon={sparklesOutline} className="stat-icon" />
                  <div className="stat-value">
                    {profile?.academicYear || `${new Date().getFullYear()}`}
                  </div>
                  <div className="stat-label">Academic Year</div>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Teacher Info Card */}
          {profile?.teacher && (
            <IonCard className="info-card">
              <IonCardContent>
                <h3 className="card-section-title">Class In-Charge Teacher</h3>
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

          {/* Settings Section */}
          <IonCard className="settings-card">
            <IonCardContent>
              <h3 className="card-section-title">Account & Actions</h3>
              
              <IonList lines="none" className="settings-list">
                <IonItem button onClick={handleResetPassword} className="setting-item">
                  <div className="setting-icon-container" slot="start">
                    <IonIcon icon={keyOutline} />
                  </div>
                  <IonLabel>
                    <h4 className="setting-title">Reset Password</h4>
                    <p className="setting-subtitle">Update class access credentials</p>
                  </IonLabel>
                  <IonIcon icon={chevronForwardOutline} slot="end" className="setting-arrow" />
                </IonItem>

                <IonItem button onClick={handleExportData} className="setting-item">
                  <div className="setting-icon-container" slot="start">
                    <IonIcon icon={downloadOutline} />
                  </div>
                  <IonLabel>
                    <h4 className="setting-title">Export Class Records</h4>
                    <p className="setting-subtitle">Download reports as CSV file</p>
                  </IonLabel>
                  <IonIcon icon={chevronForwardOutline} slot="end" className="setting-arrow" />
                </IonItem>

                <IonItem button onClick={handleHelp} className="setting-item">
                  <div className="setting-icon-container" slot="start">
                    <IonIcon icon={helpCircleOutline} />
                  </div>
                  <IonLabel>
                    <h4 className="setting-title">Help & Admin Support</h4>
                    <p className="setting-subtitle">Get system guides or contact IT</p>
                  </IonLabel>
                  <IonIcon icon={chevronForwardOutline} slot="end" className="setting-arrow" />
                </IonItem>
              </IonList>

            </IonCardContent>
          </IonCard>

          {/* App Info Card */}
          <IonCard className="about-card">
            <IonCardContent>
              <h3 className="about-title">School Class Controller Portal</h3>
              <p className="about-version">Version 1.2.0 â€¢ Build 2026</p>
              <p className="about-copyright">Â© 2026 School Management System</p>
            </IonCardContent>
          </IonCard>

          {/* Logout Action */}
          <div className="logout-wrapper">
            <IonButton
              expand="block"
              color="danger"
              fill="outline"
              className="logout-button"
              onClick={handleLogout}
            >
              <IonIcon icon={logOutOutline} slot="start" />
              Sign Out Class Portal
            </IonButton>
          </div>

        </div>

        {/* Global Action Alert */}
        <IonAlert
          isOpen={alertConfig.isOpen}
          onDidDismiss={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
          header={alertConfig.header}
          message={alertConfig.message}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { 
              text: 'Confirm', 
              handler: () => {
                if (alertConfig.onConfirm) {
                  alertConfig.onConfirm();
                }
              }
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassProfileScreen;
