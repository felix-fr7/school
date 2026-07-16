/**
 * Student Dashboard Screen (Ionic React Version)
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
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardContent,
  IonAvatar,
  IonBadge,
  IonText,
  IonImg,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import {
  newspaperOutline,
  chatbubbleEllipsesOutline,
  bookOutline,
  calendarNumberOutline,
  trophyOutline,
  callOutline,
  imagesOutline,
  filmOutline,
  documentTextOutline,
  calendarOutline,
  homeOutline,
  gridOutline,
  clipboardOutline,
  statsChartOutline,
  createOutline,
  timerOutline,
  micOutline,
  cashOutline,
  settingsOutline,
  logOutOutline,
  refreshOutline,
} from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI } from '../../services/api';
import './DashboardScreen.css';

interface DashboardProfile {
  student: {
    id: string;
    name: string;
    rollNumber: string;
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
}

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  iconIonicon?: any;
  route?: string;
}

const StudentDashboardScreen: React.FC = () => {
  const history = useHistory();
  const { logout } = useAuth();

  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardProfile = async () => {
    try {
      const response = await studentAPI.getDashboardProfile();
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

  const menuItems: MenuItem[] = [
    { id: '1', title: 'NEWS', icon: 'newspaper', iconIonicon: newspaperOutline, route: '/student/news' },
    { id: '2', title: 'MESSAGES', icon: 'chat', iconIonicon: chatbubbleEllipsesOutline },
    { id: '3', title: 'HOMEWORK', icon: 'book', iconIonicon: bookOutline, route: '/student/homework' },
    { id: '4', title: 'EXAMS', icon: 'calendar', iconIonicon: calendarNumberOutline, route: '/student/exams' },
    { id: '5', title: 'TOPPERS', icon: 'trophy', iconIonicon: trophyOutline },
    { id: '6', title: 'CONTACT', icon: 'call', iconIonicon: callOutline },
    { id: '7', title: 'ALBUMS', icon: 'images', iconIonicon: imagesOutline },
    { id: '8', title: 'VIDEOS', icon: 'film', iconIonicon: filmOutline },
    { id: '9', title: 'LEAVES', icon: 'document', iconIonicon: documentTextOutline },
    { id: '10', title: 'CALENDAR', icon: 'calendar', iconIonicon: calendarOutline },
    { id: '11', title: 'HOME VIDEOS', icon: 'home', iconIonicon: homeOutline },
    { id: '12', title: 'GALLERY', icon: 'grid', iconIonicon: gridOutline },
    { id: '13', title: 'CIRCULARS', icon: 'clipboard', iconIonicon: clipboardOutline, route: '/student/circulars' },
    { id: '14', title: 'REPORT CARD', icon: 'stats', iconIonicon: statsChartOutline, route: '/student/marks' },
    { id: '15', title: 'PROFILE', icon: 'create', iconIonicon: createOutline, route: '/student/profile' },
    { id: '16', title: 'TIMETABLE', icon: 'timer', iconIonicon: timerOutline, route: '/student/weekly-lessons' },
    { id: '17', title: 'VOICE MSG', icon: 'mic', iconIonicon: micOutline },
    { id: '18', title: 'FEES', icon: 'cash', iconIonicon: cashOutline },
    { id: '19', title: 'SETTINGS', icon: 'settings', iconIonicon: settingsOutline },
    { id: '20', title: 'LOGOUT', icon: 'logout', iconIonicon: logOutOutline },
  ];

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.id === '20') {
      logout();
      history.push('/login');
      return;
    }

    if (item.route) {
      history.push(item.route);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="dashboard-loading">
          <div className="loading-container">
            <div className="loading-spinner">
              <IonSpinner name="crescent" />
            </div>
            <p className="loading-text">Loading dashboard...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Student Dashboard</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => logout()}>
            <IonIcon icon={logOutOutline} slot="icon-only" />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="student-dashboard">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {/* Header Section */}
        <div className="header-section">
          <div className="header-content">
            {profile?.school.logoUrl ? (
              <IonImg src={profile.school.logoUrl} className="school-logo" />
            ) : (
              <div className="school-logo placeholder">
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
                <span>{profile?.student.name?.charAt(0) || 'S'}</span>
              </IonAvatar>
              <div className="profile-info">
                <h3 className="student-name">{profile?.student.name || 'Student'}</h3>
                <IonBadge color="light" className="class-badge">
                  {profile?.student.classSection || 'Class Not Assigned'}
                </IonBadge>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Grid Menu */}
        <div className="grid-container">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="grid-item"
              onClick={() => handleMenuItemPress(item)}
            >
              <div className="grid-item-content">
                <div className="icon-container">
                  <IonIcon icon={item.iconIonicon} />
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

export default StudentDashboardScreen;