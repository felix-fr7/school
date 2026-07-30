/**
 * Class Controller / Teacher Dashboard Screen (Ionic React Version)
 * Bright Light Theme with Spacious Colorful Cards
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSpinner,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
  IonToast,
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
  copyOutline,
  schoolOutline,
  sparklesOutline,
  checkmarkCircleOutline,
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
  students?: any[];
  homework?: any[];
  exams?: any[];
  news?: any[];
  circulars?: any[];
}

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  iconIon: string;
  bgGradient: string;
  accentColor: string;
  route: string;
}

const ClassControllerDashboardScreen: React.FC = () => {
  const history = useHistory();
  const { currentClass, user, logout } = useAuth();
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const response = await classControllerAPI.getDashboard();
      if (response.success && response.data) {
        const data = response.data;
        const transformedData: DashboardData = {
          class: data.class,
          stats: {
            totalStudents: data.class.studentCount || 0,
            totalHomework: data.class.homeworkCount || 0,
            upcomingExams: data.class.examCount || 0,
            attendanceRate: 94,
          },
          students: data.students || [],
          homework: data.homework || [],
          exams: data.exams || [],
          news: data.news || [],
          circulars: data.circulars || [],
        };
        setDashboardData(transformedData);
      }
    } catch (error) {
      console.error('Error fetching teacher dashboard:', error);
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

  const copyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setToastMessage('Class Code copied to clipboard!');
  };

  // Colorful Vibrant Menu Items for Light Theme
  const menuItems: MenuItem[] = [
    {
      id: 'students',
      title: 'Class Roster',
      subtitle: `${dashboardData?.stats?.totalStudents ?? 0} Active Students`,
      iconIon: peopleOutline,
      bgGradient: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
      accentColor: '#10B981',
      route: '/class-controller/students',
    },
    {
      id: 'homework',
      title: 'Homework & Tasks',
      subtitle: `${dashboardData?.stats?.totalHomework ?? 0} Assignments`,
      iconIon: bookOutline,
      bgGradient: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
      accentColor: '#3B82F6',
      route: '/class-controller/homework',
    },
    {
      id: 'exams',
      title: 'Exams & Schedule',
      subtitle: `${dashboardData?.stats?.upcomingExams ?? 0} Scheduled`,
      iconIon: calendarOutline,
      bgGradient: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
      accentColor: '#8B5CF6',
      route: '/class-controller/exams',
    },
    {
      id: 'news',
      title: 'School Bulletin',
      subtitle: 'Announcements',
      iconIon: newspaperOutline,
      bgGradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
      accentColor: '#D97706',
      route: '/class-controller/news',
    },
    {
      id: 'circulars',
      title: 'Class Circulars',
      subtitle: 'Official Notices',
      iconIon: documentTextOutline,
      bgGradient: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
      accentColor: '#0284C7',
      route: '/class-controller/circulars',
    },
    {
      id: 'add-student',
      title: 'New Admission',
      subtitle: 'Enroll Student',
      iconIon: personAddOutline,
      bgGradient: 'linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 100%)',
      accentColor: '#DB2777',
      route: '/class-controller/students/add',
    },
    {
      id: 'settings',
      title: 'Class Settings',
      subtitle: 'Preferences & Info',
      iconIon: settingsOutline,
      bgGradient: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
      accentColor: '#475569',
      route: '/class-controller/profile',
    },
  ];

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="light-loading-container">
          <div className="loading-wrapper">
            <IonSpinner name="crescent" color="primary" />
            <p>Loading Dashboard...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const classCode = dashboardData?.class.classCode || currentClass?.classCode || 'CLS-X';
  const className = dashboardData?.class.name || currentClass?.name || 'Class Room';
  const classSection = dashboardData?.class.section || currentClass?.section || '';

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="light-toolbar">
          <IonTitle>
            <div className="brand-header">
              <IonIcon icon={schoolOutline} className="brand-icon" />
              <span>Teacher Workspace</span>
            </div>
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="light-dashboard-content" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshCircleOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        <div className="main-wrapper">
          {/* Header Card */}
          <div className="light-hero-card">
            <div className="hero-top">
              <div className="teacher-badge">
                <IonIcon icon={sparklesOutline} />
                <span>Class In-Charge</span>
              </div>
              <button className="code-pill" onClick={() => copyClassCode(classCode)}>
                <span className="code-label">CODE:</span>
                <span className="code-value">{classCode}</span>
                <IonIcon icon={copyOutline} />
              </button>
            </div>

            <div className="hero-main">
              <h1 className="class-title">{className}</h1>
              {classSection && <span className="class-section-pill">Section {classSection}</span>}
              <p className="teacher-greeting">
                Welcome back, <strong>{user?.name || dashboardData?.class?.teacher?.name || 'Teacher'}</strong> 👋
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="stats-container">
            <div className="stat-box blue">
              <span className="stat-number">{dashboardData?.stats?.totalStudents ?? 0}</span>
              <span className="stat-desc">Students</span>
            </div>

            <div className="stat-box purple">
              <span className="stat-number">{dashboardData?.stats?.totalHomework ?? 0}</span>
              <span className="stat-desc">Homeworks</span>
            </div>

            <div className="stat-box orange">
              <span className="stat-number">{dashboardData?.stats?.upcomingExams ?? 0}</span>
              <span className="stat-desc">Exams</span>
            </div>

            <div className="stat-box green">
              <span className="stat-number">{dashboardData?.stats?.attendanceRate ?? 94}%</span>
              <span className="stat-desc">Attendance</span>
            </div>
          </div>

          {/* Share Key Card */}
          <IonCard className="share-code-card">
            <IonCardContent className="share-card-content">
              <div className="share-info">
                <h3>Class Access Key</h3>
                <p>Students use code <strong>{classCode}</strong> to access this classroom</p>
              </div>
              <IonButton 
                size="small" 
                fill="solid" 
                className="copy-btn"
                onClick={() => copyClassCode(classCode)}
              >
                <IonIcon icon={copyOutline} slot="start" />
                Copy
              </IonButton>
            </IonCardContent>
          </IonCard>

          {/* Control Panel Grid (With Extra Space & Colors) */}
          <div className="management-section">
            <h2 className="section-heading">Class Control Panel</h2>

            <IonGrid className="ion-no-padding">
              <IonRow className="custom-row-gap">
                {menuItems.map((item) => (
                  <IonCol size="12" sizeSm="6" sizeMd="4" sizeLg="3" key={item.id} className="custom-col-padding">
                    <div 
                      className="color-action-card"
                      style={{ 
                        background: item.bgGradient,
                        borderColor: `${item.accentColor}40`
                      }}
                      onClick={() => history.push(item.route)}
                    >
                      <div 
                        className="color-icon-box"
                        style={{ background: item.accentColor }}
                      >
                        <IonIcon icon={item.iconIon} />
                      </div>
                      <div className="color-action-details">
                        <h3 style={{ color: '#0F172A' }}>{item.title}</h3>
                        <p style={{ color: '#475569' }}>{item.subtitle}</p>
                      </div>
                    </div>
                  </IonCol>
                ))}
              </IonRow>
            </IonGrid>
          </div>

          {/* Logout Section */}
          <div className="logout-wrapper">
            <IonButton
              expand="block"
              fill="outline"
              color="danger"
              className="logout-btn"
              onClick={() => setShowLogoutAlert(true)}
            >
              <IonIcon icon={logOutOutline} slot="start" />
              Sign Out Session
            </IonButton>
          </div>
        </div>

        {/* Toast */}
        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage || ''}
          duration={2000}
          onDidDismiss={() => setToastMessage(null)}
          icon={checkmarkCircleOutline}
          color="success"
        />

        {/* Alert */}
        <IonAlert
          isOpen={showLogoutAlert}
          onDidDismiss={() => setShowLogoutAlert(false)}
          header="End Session?"
          message="Are you sure you want to sign out?"
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { text: 'Sign Out', role: 'destructive', handler: handleLogout },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassControllerDashboardScreen;