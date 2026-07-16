/**
 * Class Controller Dashboard Screen (Ionic React Version)
 * Management dashboard for Class ID (CLS-X) login users
 * Full control over their specific class only
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
  IonButton,
  IonIcon,
  IonBadge,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
} from '@ionic/react';
import {
  peopleOutline,
  bookOutline,
  calendarOutline,
  newspaperOutline,
  documentTextOutline,
  personAddOutline,
  settingsOutline,
  logOutOutline,
  refreshCircleOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { classControllerAPI } from '../../services/api';
import './ClassControllerDashboardScreen.css';

interface DashboardData {
  class: {
    id: string;
    classCode: string;
    name: string;
    section: string;
    teacher?: {
      name: string;
      email: string;
    } | null;
    studentCount?: number;
    homeworkCount?: number;
    examCount?: number;
  };
  stats?: {
    totalStudents: number;
    totalHomework: number;
    upcomingExams: number;
    attendanceRate: number;
  };
  recentActivity?: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    createdAt: string;
  }>;
  students?: any[];
  homework?: any[];
  exams?: any[];
  news?: any[];
  circulars?: any[];
  weeklyLessons?: any[] | null;
}

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconIon: string;
  color: string;
  route: string;
  badge?: number;
}

const ClassControllerDashboardScreen: React.FC = () => {
  const history = useHistory();
  const { currentClass, logout } = useAuth();
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await classControllerAPI.getDashboard();
      if (response.success && response.data) {
        const data = response.data;
        // Transform API response to match our DashboardData structure
        const transformedData: DashboardData = {
          class: data.class,
          stats: {
            totalStudents: data.class.studentCount || 0,
            totalHomework: data.class.homeworkCount || 0,
            upcomingExams: data.class.examCount || 0,
            attendanceRate: 0, // Not available in API response
          },
          recentActivity: [],
          students: data.students || [],
          homework: data.homework || [],
          exams: data.exams || [],
          news: data.news || [],
          circulars: data.circulars || [],
          weeklyLessons: data.weeklyLessons || null,
        };
        setDashboardData(transformedData);
      }
    } catch (error) {
      console.error('Error fetching class controller dashboard:', error);
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

  // Menu items for class management
  const menuItems: MenuItem[] = [
    {
      id: '1',
      title: 'Students',
      subtitle: `${dashboardData?.stats?.totalStudents ?? 0} students`,
      icon: '👥',
      iconIon: peopleOutline,
      color: '#4CAF50',
      route: '/class-controller/students',
    },
    {
      id: '2',
      title: 'Homework',
      subtitle: `${dashboardData?.stats?.totalHomework ?? 0} assigned`,
      icon: '📚',
      iconIon: bookOutline,
      color: '#2196F3',
      route: '/class-controller/homework',
    },
    {
      id: '3',
      title: 'Exams',
      subtitle: `${dashboardData?.stats?.upcomingExams ?? 0} upcoming`,
      icon: '📅',
      iconIon: calendarOutline,
      color: '#9C27B0',
      route: '/class-controller/exams',
    },
    {
      id: '4',
      title: 'News',
      subtitle: 'School updates',
      icon: '📰',
      iconIon: newspaperOutline,
      color: '#FF5722',
      route: '/class-controller/news',
    },
    {
      id: '5',
      title: 'Circulars',
      subtitle: 'Class notices',
      icon: '📋',
      iconIon: documentTextOutline,
      color: '#00BCD4',
      route: '/class-controller/circulars',
    },
    {
      id: '6',
      title: 'Add Student',
      subtitle: 'New enrollment',
      icon: '➕',
      iconIon: personAddOutline,
      color: '#E91E63',
      route: '/class-controller/students/add',
    },
    {
      id: '7',
      title: 'Profile',
      subtitle: 'Class settings',
      icon: '⚙️',
      iconIon: settingsOutline,
      color: '#607D8B',
      route: '/class-controller/profile',
    },
  ];

  const handleMenuItemPress = (route: string) => {
    history.push(route);
  };

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center class-controller-loading">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p className="loading-text">Loading class dashboard...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Class Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="class-controller-dashboard" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent
            pullingIcon={refreshCircleOutline}
            refreshingSpinner="crescent"
          />
        </IonRefresher>

        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Class Dashboard</IonTitle>
          </IonToolbar>
        </IonHeader>

        {/* Header Section */}
        <div className="header-section">
          <div className="header-content">
            <div className="class-code-badge">
              <span className="class-code-text">
                {dashboardData?.class.classCode || currentClass?.classCode || 'CLS-X'}
              </span>
            </div>
            <div className="class-info">
              <h2 className="class-name">
                {dashboardData?.class.name || currentClass?.name || 'Class'}
              </h2>
              {dashboardData?.class.section && (
                <p className="class-section">
                  Section: {dashboardData.class.section}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="stats-row">
          <IonCard className="stat-card">
            <IonCardContent>
              <div className="stat-value">{dashboardData?.stats?.totalStudents ?? 0}</div>
              <div className="stat-label">Students</div>
            </IonCardContent>
          </IonCard>
          <IonCard className="stat-card">
            <IonCardContent>
              <div className="stat-value">{dashboardData?.stats?.totalHomework ?? 0}</div>
              <div className="stat-label">Homework</div>
            </IonCardContent>
          </IonCard>
          <IonCard className="stat-card">
            <IonCardContent>
              <div className="stat-value">{dashboardData?.stats?.upcomingExams ?? 0}</div>
              <div className="stat-label">Exams</div>
            </IonCardContent>
          </IonCard>
          <IonCard className="stat-card">
            <IonCardContent>
              <div className="stat-value">{dashboardData?.stats?.attendanceRate ?? 0}%</div>
              <div className="stat-label">Attendance</div>
            </IonCardContent>
          </IonCard>
        </div>

        {/* Class ID Display */}
        <IonCard className="class-id-card">
          <IonCardContent>
            <IonText color="secondary">
              <small className="class-id-label">Class Login ID</small>
            </IonText>
            <h2 className="class-id-value">
              {dashboardData?.class.classCode || currentClass?.classCode || 'Not available'}
            </h2>
            <IonText color="medium">
              <small className="class-id-note">
                <IonIcon icon={informationCircleOutline} slot="start" />
                Share this ID with students for class access
              </small>
            </IonText>
          </IonCardContent>
        </IonCard>

        {/* Management Menu Grid */}
        <div className="section">
          <h3 className="section-title">Class Management</h3>
          <IonGrid fixed>
            <IonRow>
              {menuItems.map((item) => (
                <IonCol size="6" sizeMd="3" key={item.id}>
                  <IonCard
                    className={`menu-card menu-card-${item.id}`}
                    onClick={() => handleMenuItemPress(item.route)}
                  >
                    <IonCardContent>
                      {item.badge !== undefined && item.badge > 0 && (
                        <IonBadge
                          color="danger"
                          className="menu-badge"
                          style={{ '--background': item.color }}
                        >
                          {item.badge}
                        </IonBadge>
                      )}
                      <div
                        className="menu-icon-container"
                        style={{ backgroundColor: `${item.color}15` }}
                      >
                        <IonIcon
                          icon={item.iconIon}
                          className="menu-icon"
                          style={{ color: item.color }}
                        />
                      </div>
                      <h4 className="menu-title">{item.title}</h4>
                      <p className="menu-subtitle">{item.subtitle}</p>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>
        </div>

        {/* Logout Button */}
        <div className="logout-section">
          <IonButton
            expand="block"
            className="logout-button"
            color="danger"
            fill="outline"
            onClick={() => setShowLogoutAlert(true)}
          >
            <IonIcon icon={logOutOutline} slot="start" />
            Logout
          </IonButton>
        </div>

        {/* Footer */}
        <div className="footer">
          <IonText color="medium">
            <small>Class Controller Dashboard</small>
          </IonText>
        </div>
      </IonContent>

      <IonAlert
        isOpen={showLogoutAlert}
        onDidDismiss={() => setShowLogoutAlert(false)}
        header="Logout"
        message="Are you sure you want to logout?"
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Logout',
            role: 'destructive',
            handler: handleLogout,
          },
        ]}
      />
    </IonPage>
  );
};

export default ClassControllerDashboardScreen;