/**
 * Admin Dashboard Screen (Premium UI Version)
 * Main dashboard for School Admin - Redesigned with modern, premium aesthetics
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import {
  bookOutline,
  peopleOutline,
  personOutline,
  documentTextOutline,
  statsChartOutline,
  newspaperOutline,
  clipboardOutline,
  calendarOutline,
  logOutOutline,
  refreshOutline,
  schoolOutline,
  timeOutline,
} from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../services/api';
import './DashboardScreen.css';

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  route: string;
  count?: number;
  color: string;
}

const AdminDashboardScreen: React.FC = () => {
  const history = useHistory();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalHomework: 0,
    totalNews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [classesRes, studentsRes, homeworkRes, newsRes] = await Promise.all([
        adminAPI.getClasses(),
        adminAPI.getStudents(1, 1),
        adminAPI.getHomework(1, 1),
        adminAPI.getNews(1, 1),
      ]);

      setStats({
        totalStudents: studentsRes.success ? studentsRes.data?.pagination?.total || 0 : 0,
        totalClasses: classesRes.success ? classesRes.data?.length || 0 : 0,
        totalHomework: homeworkRes.success ? homeworkRes.data?.pagination?.total || 0 : 0,
        totalNews: newsRes.success ? newsRes.data?.pagination?.total || 0 : 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    setRefreshing(true);
    await fetchDashboardData();
    event.detail.complete();
  };

  const handleLogout = async () => {
    await logout();
    history.push('/login');
  };

  const menuItems: MenuItem[] = [
    { 
      id: '1', 
      title: 'Classes', 
      subtitle: 'Manage all classes',
      icon: bookOutline, 
      route: '/admin/classes', 
      count: stats.totalClasses,
      color: 'primary'
    },
    { 
      id: '2', 
      title: 'Teachers', 
      subtitle: 'Faculty management',
      icon: personOutline, 
      route: '/admin/teachers',
      color: 'secondary'
    },
    { 
      id: '3', 
      title: 'Students', 
      subtitle: 'Student records',
      icon: peopleOutline, 
      route: '/admin/students', 
      count: stats.totalStudents,
      color: 'tertiary'
    },
    { 
      id: '4', 
      title: 'Homework', 
      subtitle: 'Assignments & tracking',
      icon: documentTextOutline, 
      route: '/admin/homework', 
      count: stats.totalHomework,
      color: 'success'
    },
    { 
      id: '5', 
      title: 'Marks', 
      subtitle: 'Grades & analytics',
      icon: statsChartOutline, 
      route: '/admin/marks',
      color: 'warning'
    },
    { 
      id: '6', 
      title: 'News', 
      subtitle: 'Announcements',
      icon: newspaperOutline, 
      route: '/admin/admin-news', 
      count: stats.totalNews,
      color: 'danger'
    },
    { 
      id: '7', 
      title: 'Circulars', 
      subtitle: 'Official communications',
      icon: clipboardOutline, 
      route: '/admin/admin-circulars',
      color: 'light'
    },
    { 
      id: '8', 
      title: 'Exams', 
      subtitle: 'Schedule & management',
      icon: calendarOutline, 
      route: '/admin/admin-exams',
      color: 'dark'
    },
  ];

  if (loading) {
    return (
      <IonPage>
        <IonContent className="admin-dashboard-loading ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p className="loading-text">Loading dashboard...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="premium-toolbar">
          <IonTitle>Admin Dashboard</IonTitle>
          <IonButton 
            slot="end"
            fill="clear" 
            onClick={handleLogout} 
            className="logout-button"
            color="danger"
            aria-label="Logout"
            style={{ fontWeight: 'bold', textTransform: 'none' }}
          >
            <IonIcon icon={logOutOutline} slot="start" />
            Logout
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-dashboard">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {/* Profile Summary Banner */}
        <div className="profile-banner">
          <div className="profile-icon-wrapper">
            <IonIcon icon={schoolOutline} className="profile-icon" />
          </div>
          <div className="profile-info">
            <h2 className="welcome-text">Welcome, {user?.name}</h2>
            <p className="role-text">School Administrator</p>
          </div>
          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-value">{stats.totalClasses}</span>
              <span className="stat-label">Classes</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.totalStudents}</span>
              <span className="stat-label">Students</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="quick-actions">
          <IonButton fill="outline" className="quick-action-btn" onClick={() => history.push('/admin/teachers/create')}>
            <IonIcon icon={personOutline} slot="start" />
            Add Teacher
          </IonButton>
          <IonButton fill="outline" className="quick-action-btn" onClick={() => history.push('/admin/students/create')}>
            <IonIcon icon={peopleOutline} slot="start" />
            Add Student
          </IonButton>
          <IonButton fill="outline" className="quick-action-btn" onClick={() => history.push('/admin/classes/create')}>
            <IonIcon icon={bookOutline} slot="start" />
            Create Class
          </IonButton>
        </div>

        {/* Menu Grid */}
        <IonGrid className="menu-grid-container">
          <IonRow>
            {menuItems.map((item) => (
              <IonCol size="12" size-md="6" size-lg="3" key={item.id}>
                <IonCard 
                  className={`menu-item menu-item-${item.color}`}
                  onClick={() => history.push(item.route)}
                >
                  <IonCardContent>
                    <div className="menu-item-content">
                      <div className="menu-icon-wrapper">
                        <IonIcon icon={item.icon} className="menu-icon" />
                        {item.count !== undefined && item.count > 0 && (
                          <span className="count-badge">{item.count}</span>
                        )}
                      </div>
                      <div className="menu-text">
                        <h3 className="menu-title">{item.title}</h3>
                        <p className="menu-subtitle">{item.subtitle}</p>
                      </div>
                    </div>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>

        {/* Recent Activity Section */}
        <div className="recent-section">
          <h3 className="section-title">Recent Activity</h3>
          <div className="activity-cards">
            <IonCard className="activity-card">
              <IonCardContent>
                <div className="activity-icon">
                  <IonIcon icon={timeOutline} />
                </div>
                <div className="activity-content">
                  <h4>System Status</h4>
                  <p>All systems operational</p>
                  <span className="activity-time">Last updated: {new Date().toLocaleTimeString()}</span>
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboardScreen;