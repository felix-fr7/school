/**
 * Admin Dashboard Screen (Pure Modern Light Theme)
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
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
  addCircleOutline,
  sparklesOutline,
  pulseOutline,
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
  gradient: string;
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
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
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
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
    },
    { 
      id: '2', 
      title: 'Teachers', 
      subtitle: 'Faculty management',
      icon: personOutline, 
      route: '/admin/teachers',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
    },
    { 
      id: '3', 
      title: 'Students', 
      subtitle: 'Student records',
      icon: peopleOutline, 
      route: '/admin/students', 
      count: stats.totalStudents,
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
    },
    { 
      id: '4', 
      title: 'Homework', 
      subtitle: 'Assignments & tracking',
      icon: documentTextOutline, 
      route: '/admin/homework', 
      count: stats.totalHomework,
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    { 
      id: '6', 
      title: 'News', 
      subtitle: 'Announcements',
      icon: newspaperOutline, 
      route: '/admin/admin-news', 
      count: stats.totalNews,
      gradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)'
    },
    { 
      id: '7', 
      title: 'Circulars', 
      subtitle: 'Official communications',
      icon: clipboardOutline, 
      route: '/admin/admin-circulars',
      gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
    },
    { 
      id: '8', 
      title: 'Exams', 
      subtitle: 'Schedule & management',
      icon: calendarOutline, 
      route: '/admin/admin-exams',
      gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
    },
  ];

  if (loading) {
    return (
      <IonPage>
        <IonContent className="pure-light-dashboard-content ion-padding ion-text-center">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
            <IonSpinner name="crescent" color="primary" />
            <p style={{ color: '#64748b', fontWeight: 600 }}>Loading Dashboard...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      {/* SaaS Glass Floating Nav Header */}
      <IonHeader className="ultra-light-nav-header">
        <IonToolbar className="ultra-light-nav-toolbar">
          <div className="light-nav-pill">
            <div className="nav-brand">
              <div className="brand-logo-light">
                <IonIcon icon={schoolOutline} />
              </div>
              <div className="brand-text-container">
                <span className="brand-title-light">ADMIN PORTAL</span>
                <span className="brand-badge-light">
                  <span className="mini-pulse-dot"></span>
                  School Console
                </span>
              </div>
            </div>

            <div className="nav-user-actions">
              <div className="admin-chip-light">
                <div className="avatar-ring-light">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <span className="admin-name-light">{user?.name || 'Administrator'}</span>
              </div>

              <button className="nextgen-logout-btn-light" onClick={handleLogout}>
                <IonIcon icon={logOutOutline} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pure-light-dashboard-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        <div className="dashboard-wrapper">
          {/* Light Hero Banner */}
          <div className="light-hero-card">
            <div className="hero-bg-shapes"></div>
            <div className="hero-left-content">
              <div className="live-status-pill-light">
                <span className="green-dot-pulse-light"></span>
                SYSTEM OPERATIONAL
              </div>
              <h1 className="hero-title-light">Welcome back, {user?.name || 'Administrator'}</h1>
              <p className="hero-subtitle-light">Manage school classes, faculty, and academic records easily.</p>
            </div>

            <div className="hero-stats-group">
              <div className="light-stat-box">
                <span className="stat-number-light">{stats.totalClasses}</span>
                <span className="stat-label-light">Classes</span>
              </div>
              <div className="light-stat-box">
                <span className="stat-number-light">{stats.totalStudents}</span>
                <span className="stat-label-light">Students</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="section-title-light">
            <IonIcon icon={sparklesOutline} />
            QUICK ACTIONS
          </div>
          <div className="quick-actions-grid">
            <button className="quick-btn-light" onClick={() => history.push('/admin/teachers/create')}>
              <IonIcon icon={addCircleOutline} className="btn-icon-light" />
              Add Teacher
            </button>
            <button className="quick-btn-light" onClick={() => history.push('/admin/classes/create')}>
              <IonIcon icon={addCircleOutline} className="btn-icon-light" />
              Create Class
            </button>
          </div>

          {/* Modules Grid */}
          <div className="section-title-light">
            <IonIcon icon={pulseOutline} />
            ACADEMIC MODULES
          </div>
          <IonGrid className="academic-modules-grid">
            <IonRow>
              {menuItems.map((item) => (
                <IonCol size="12" size-md="6" size-lg="3" key={item.id} className="module-col-wrapper">
                  <div 
                    className="light-menu-card-item"
                    onClick={() => history.push(item.route)}
                  >
                    <div className="card-header-flex">
                      <div className="icon-orb-light" style={{ background: item.gradient }}>
                        <IonIcon icon={item.icon} />
                      </div>
                      {item.count !== undefined && item.count > 0 && (
                        <span className="count-pill-light">{item.count}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="card-title-light">{item.title}</h3>
                      <p className="card-sub-light">{item.subtitle}</p>
                    </div>
                  </div>
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>

          {/* System Status Bar */}
          <div className="status-light-bar">
            <div className="status-left">
              <span className="green-dot-pulse-light"></span>
              <div className="status-txt-light">
                <h5>All Systems Synchronized</h5>
                <p>Database and academic services running smoothly.</p>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboardScreen;