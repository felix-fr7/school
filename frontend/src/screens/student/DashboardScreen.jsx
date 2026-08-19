/**
 * Student Dashboard Screen - Premium Redesign
 * Modern, attractive design for students and parents
 * Features: Glass-morphism, gradient accents, smooth animations
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
  calendarOutline,
  clipboardOutline,
  statsChartOutline,
  createOutline,
  timerOutline,
  settingsOutline,
  logOutOutline,
  refreshOutline,
  schoolOutline,
  chevronForwardOutline,
  starOutline,
  timeOutline,
  notificationsOutline,
} from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI } from '../../services/api';
import './DashboardScreen.css';

const StudentDashboardScreen = () => {
  const history = useHistory();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardProfile = async () => {
    try {
      // Try to fetch dashboard profile, fallback to user context if not available
      try {
        const response = await studentAPI.getDashboardProfile();
        if (response.success && response.data) {
          const data = response.data;
          // Map the /api/profile response to the expected format
          setProfile({
            student: {
              name: data.name || user?.name || 'Student',
              classSection: data.classId 
                ? `${data.classId.name || ''}${data.classId.section ? ' - ' + data.classId.section : ''}` 
                : (user?.classSection || 'Not Assigned')
            },
            school: {
              name: data.schoolId?.schoolName || 'School',
              logoUrl: null
            }
          });
        }
      } catch (profileError) {
        console.warn('Dashboard profile endpoint not available, using fallback data');
        // Set fallback profile data from auth context
        setProfile({
          student: {
            name: user?.name || 'Student',
            classSection: user?.classSection || 'Not Assigned'
          },
          school: {
            name: 'School',
            logoUrl: null
          }
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardProfile();
  }, []);

  const onRefresh = async (event) => {
    setRefreshing(true);
    await fetchDashboardProfile();
    event.detail.complete();
  };

  const quickActions = [
    { id: '3', title: 'Homework', icon: bookOutline, route: '/student/homework', color: '#6366f1', count: null },
    { id: '4', title: 'Exams', icon: calendarNumberOutline, route: '/student/exams', color: '#8b5cf6', count: null },
    { id: '14', title: 'Report Card', icon: statsChartOutline, route: '/student/report-cards', color: '#06b6d4', count: null },
    { id: '16', title: 'Timetable', icon: timerOutline, route: '/student/weekly-lessons', color: '#10b981', count: null },
  ];

  const menuItems = [
    { id: '1', title: 'News', subtitle: 'School updates', icon: newspaperOutline, route: '/student/news', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' },
    { id: '2', title: 'Messages', subtitle: 'Chat & announcements', icon: chatbubbleEllipsesOutline, gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
    { id: '13', title: 'Circulars', subtitle: 'Official notices', icon: clipboardOutline, route: '/student/circulars', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
    { id: '10', title: 'Calendar', subtitle: 'Events & dates', icon: calendarOutline, gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' },
    { id: '5', title: 'Toppers', subtitle: 'Achievements', icon: trophyOutline, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
    { id: '7', title: 'Albums', subtitle: 'Photo gallery', icon: imagesOutline, gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
    { id: '6', title: 'Contact', subtitle: 'School directory', icon: callOutline, gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    { id: '15', title: 'Profile', subtitle: 'My information', icon: createOutline, route: '/student/profile', gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' },
    { id: '19', title: 'Settings', subtitle: 'Preferences', icon: settingsOutline, gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' },
  ];

  const handleMenuItemPress = (item) => {
    if (item.id === '20' || item.id === '19') {
      if (item.id === '20') {
        logout();
        history.push('/login');
      } else {
        // Settings - just show alert for now
      }
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
            <div className="loading-spinner-wrapper">
              <div className="loading-ring">
                <IonSpinner name="crescent" />
              </div>
            </div>
            <p className="loading-text">Loading your dashboard...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <IonPage>
      <IonHeader className="modern-header">
        <IonToolbar>
          <IonTitle>
            <div className="header-title-content">
              <IonIcon icon={schoolOutline} className="header-school-icon" />
              <span>{profile?.school.name || 'School'}</span>
            </div>
          </IonTitle>
          <IonButton slot="end" fill="clear" className="notification-btn">
            <IonIcon icon={notificationsOutline} slot="icon-only" />
          </IonButton>
          <IonButton slot="end" fill="clear" onClick={() => logout()} className="logout-btn">
            <IonIcon icon={logOutOutline} slot="icon-only" />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="modern-student-dashboard">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {/* Hero Welcome Section */}
        <div className="hero-section">
          <div className="hero-bg-gradient"></div>
          <div className="hero-content">
            <div className="welcome-text">
              <p className="greeting">{getGreeting()},</p>
              <h1 className="student-name-hero">{profile?.student.name?.split(' ')[0] || 'Student'}</h1>
              <div className="class-info-badge">
                <IonIcon icon={schoolOutline} />
                <span>{profile?.student.classSection || 'Class Not Assigned'}</span>
              </div>
            </div>
            <div className="hero-avatar">
              <IonAvatar className="hero-avatar-img">
                <span>{profile?.student.name?.charAt(0) || 'S'}</span>
              </IonAvatar>
              <div className="avatar-ring"></div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat-item">
              <div className="stat-icon">
                <IonIcon icon={bookOutline} />
              </div>
              <div className="stat-info">
                <span className="stat-value">5</span>
                <span className="stat-label">Subjects</span>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <IonIcon icon={timeOutline} />
              </div>
              <div className="stat-info">
                <span className="stat-value">85%</span>
                <span className="stat-label">Attendance</span>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <IonIcon icon={starOutline} />
              </div>
              <div className="stat-info">
                <span className="stat-value">A</span>
                <span className="stat-label">Grade</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Horizontal Scroll */}
        <div className="quick-actions-section">
          <div className="section-header">
            <h3>Quick Actions</h3>
            <IonButton fill="clear" size="small" className="see-all-btn">
              See All <IonIcon icon={chevronForwardOutline} />
            </IonButton>
          </div>
          <div className="quick-actions-scroll">
            {quickActions.map((action) => (
              <div
                key={action.id}
                className="quick-action-card"
                onClick={() => action.route && history.push(action.route)}
                style={{ '--action-color': action.color }}
              >
                <div className="quick-action-icon">
                  <IonIcon icon={action.icon} />
                </div>
                <span className="quick-action-title">{action.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Menu Grid */}
        <div className="menu-section">
          <div className="section-header">
            <h3>Explore</h3>
          </div>
          <div className="modern-grid-container">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="modern-grid-item"
                onClick={() => handleMenuItemPress(item)}
                style={{ '--item-gradient': item.gradient }}
              >
                <div className="grid-item-content">
                  <div className="grid-item-icon-wrapper">
                    <IonIcon icon={item.icon} />
                  </div>
                  <div className="grid-item-info">
                    <span className="grid-item-title">{item.title}</span>
                    <span className="grid-item-subtitle">{item.subtitle}</span>
                  </div>
                  <IonIcon icon={chevronForwardOutline} className="grid-item-arrow" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="modern-footer">
          <div className="footer-content">
            <IonImg 
              src={profile?.school.logoUrl || ''} 
              className="footer-logo"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="footer-text-content">
              <p className="footer-school-name">{profile?.school.name || 'School'}</p>
              <p className="footer-copyright">© 2024 School Management System</p>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default StudentDashboardScreen;