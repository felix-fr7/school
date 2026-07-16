/**
 * Teacher Dashboard Screen (Ionic React Version)
 * Clean, professional grid layout with luxury minimalism
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonAvatar,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardContent,
  IonBadge,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { logOutOutline, refreshOutline } from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import { teacherAPI } from '../../services/api';
import './TeacherDashboardScreen.css';

interface DashboardProfile {
  teacher: {
    id: string;
    name: string;
    classId: string | null;
    className: string;
    sectionName: string;
    classSection: string;
  };
  school: {
    id: string;
    name: string;
    logoUrl: string | null;
    code: string;
  };
  stats: {
    totalStudents: number;
    totalHomework: number;
    totalExams: number;
  };
}

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  route?: string;
}

const TeacherDashboardScreen: React.FC = () => {
  const history = useHistory();
  const { logout } = useAuth();

  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardProfile = async () => {
    try {
      const response = await teacherAPI.getDashboardProfile();
      if (response.success && response.data) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardProfile();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    setRefreshing(true);
    await fetchDashboardProfile();
    event.detail.complete();
  };

  // All 20 menu items with clean configuration
  const menuItems: MenuItem[] = [
    { id: '1', title: 'NEWS', icon: 'newspaper-outline', route: '/teacher/news' },
    { id: '2', title: 'MESSAGES', icon: 'chatbubble-ellipses-outline' },
    { id: '3', title: 'HOME WORK', icon: 'book-outline', route: '/teacher/weekly-lessons' },
    { id: '4', title: 'EXAMS', icon: 'calendar-outline', route: '/teacher/attendance' },
    { id: '5', title: 'TOPPERS', icon: 'trophy-outline' },
    { id: '6', title: 'CONTACT', icon: 'call-outline' },
    { id: '7', title: 'ALBUMS', icon: 'images-outline' },
    { id: '8', title: 'VIDEOS', icon: 'videocam-outline' },
    { id: '9', title: 'ATTENDANCE', icon: 'clipboard-outline', route: '/teacher/attendance' },
    { id: '10', title: 'CALENDAR', icon: 'calendar-number-outline' },
    { id: '11', title: 'STUDENTS', icon: 'people-outline', route: '/teacher/students' },
    { id: '12', title: 'GALLERY', icon: 'image-outline' },
    { id: '13', title: 'CIRCULARS', icon: 'document-text-outline', route: '/teacher/circulars' },
    { id: '14', title: 'MARKS', icon: 'bar-chart-outline', route: '/teacher/marks' },
    { id: '15', title: 'PROFILE', icon: 'person-outline' },
    { id: '16', title: 'SETTINGS', icon: 'settings-outline' },
    { id: '17', title: 'VOICE MSG', icon: 'mic-outline' },
    { id: '18', title: 'FEES', icon: 'cash-outline' },
    { id: '19', title: 'REPORTS', icon: 'analytics-outline' },
    { id: '20', title: 'LOGOUT', icon: 'log-out-outline' },
  ];

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.id === '20') {
      logout();
      return;
    }

    if (item.route) {
      history.push(item.route);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Loading dashboard...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  if (!profile || !profile.teacher.classId) {
    return (
      <IonPage>
        <IonContent className="teacher-dashboard-content">
          <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
            <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
          </IonRefresher>

          <div className="no-class-container">
            <div className="no-class-icon">
              <span>🏫</span>
            </div>
            <h2 className="no-class-title">No Class Assigned Yet</h2>
            <p className="no-class-description">
              The administrator has not assigned you to a class yet.<br />
              Please contact your school admin for assistance.
            </p>
            <IonButton onClick={fetchDashboardProfile}>Refresh Status</IonButton>
          </div>
          <IonButton expand="block" color="danger" onClick={logout} className="logout-button">
            Logout
          </IonButton>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Teacher Dashboard</IonTitle>
          <IonButton slot="end" fill="clear" onClick={logout}>
            <IonIcon icon={logOutOutline} slot="icon-only" />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="teacher-dashboard-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {/* Header Section */}
        <div className="header-section">
          <div className="header-content">
            {profile?.school.logoUrl ? (
              <img src={profile.school.logoUrl} alt="School Logo" className="school-logo" />
            ) : (
              <div className="school-logo logo-placeholder">
                <span>{profile?.school.name?.charAt(0) || 'S'}</span>
              </div>
            )}
            <div className="school-info">
              <h2 className="school-name">{profile?.school.name || 'School'}</h2>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <IonCard className="profile-card">
          <IonCardContent>
            <div className="profile-content">
              <IonAvatar className="avatar">
                <span>{profile?.teacher.name?.charAt(0) || 'T'}</span>
              </IonAvatar>
              <div className="profile-info">
                <h3 className="teacher-name">{profile?.teacher.name || 'Teacher'}</h3>
                <IonBadge color="light" className="class-badge">
                  Class: {profile?.teacher.classSection || 'Not Assigned'}
                </IonBadge>
              </div>
            </div>
            {/* Stats Row */}
            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-value">{profile?.stats.totalStudents || 0}</span>
                <span className="stat-label">Students</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-value">{profile?.stats.totalHomework || 0}</span>
                <span className="stat-label">Homework</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-value">{profile?.stats.totalExams || 0}</span>
                <span className="stat-label">Exams</span>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Clean 2-Column Grid */}
        <div className="grid-container">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`grid-item ${item.id === '20' ? 'logout-item' : ''}`}
              onClick={() => handleMenuItemPress(item)}
            >
              <div className="grid-item-content">
                <div className="icon-container">
                  <IonIcon icon={item.icon as any} />
                </div>
                <span className="item-title">{item.title}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="footer">
          <IonText color="medium" className="footer-text">
            {profile?.school.name ? `${profile.school.name.toUpperCase()} SCHOOL SYSTEM` : 'SCHOOL SYSTEM'}
          </IonText>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default TeacherDashboardScreen;