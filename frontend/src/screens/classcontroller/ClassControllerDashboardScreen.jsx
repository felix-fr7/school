/**
 * Class Controller / Teacher Dashboard Screen (Ionic React Version)
 * Professional Layout with Clear Header Sign-Out Button
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
  checkmarkCircleOutline,
  shieldCheckmarkOutline,
  albumsOutline,
  ribbonOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { classControllerAPI, resolveMediaUrl } from '../../services/api';
import { useSchoolBranding } from '../../services/useSchoolBranding';
import './ClassControllerDashboardScreen.css';

const ClassControllerDashboardScreen = () => {
  const history = useHistory();
  const { currentClass, user, logout } = useAuth();
  const { schoolName: brandSchoolName, resolvedLogoUrl: brandSchoolLogo } = useSchoolBranding();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [recentHomework, setRecentHomework] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const response = await classControllerAPI.getDashboard();
      if (response.success && response.data) {
        const data = response.data;
        const transformedData = {
          class: data.class,
          stats: {
            totalStudents: data.class.studentCount || 0,
            totalHomework: data.class.homeworkCount || 0,
            upcomingExams: data.class.examCount || 0,
          },
          students: data.students || [],
          homework: data.homework || [],
          exams: data.exams || [],
          news: data.news || [],
          circulars: data.circulars || [],
        };
        setDashboardData(transformedData);
      }
      
      // Also fetch recent homework
      try {
        const homeworkResponse = await classControllerAPI.getHomework(1, 5);
        if (homeworkResponse.success && homeworkResponse.data) {
          setRecentHomework(homeworkResponse.data.homework || []);
        }
      } catch (homeworkError) {
        console.error('Error fetching recent homework:', homeworkError);
      }
    } catch (error) {
      console.error('Error fetching teacher dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHomeworkCreated = () => {
    // Refresh dashboard data after homework creation
    fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = async (event) => {
    await fetchDashboardData();
    event.detail.complete();
  };

  const copyClassCode = (code) => {
    navigator.clipboard.writeText(code);
    setToastMessage('Class Code copied to clipboard!');
  };

  const menuItems = [
    {
      id: 'students',
      title: 'Class Roster',
      subtitle: `${dashboardData?.stats?.totalStudents ?? 0} Active Students`,
      iconIon: peopleOutline,
      iconColorClass: 'icon-blue',
      route: '/class-controller/students',
    },
    {
      id: 'homework',
      title: 'Homework & Tasks',
      subtitle: `${dashboardData?.stats?.totalHomework ?? 0} Assignments`,
      iconIon: bookOutline,
      iconColorClass: 'icon-indigo',
      route: '/class-controller/homework',
    },
    {
      id: 'exams',
      title: 'Exams & Schedule',
      subtitle: `${dashboardData?.stats?.upcomingExams ?? 0} Scheduled`,
      iconIon: calendarOutline,
      iconColorClass: 'icon-purple',
      route: '/class-controller/exams',
    },
    {
      id: 'report-cards',
      title: 'Report Cards',
      subtitle: 'Send student report cards',
      iconIon: ribbonOutline,
      iconColorClass: 'icon-rose',
      route: '/class-controller/report-cards',
    },
    {
      id: 'news',
      title: 'School Bulletin',
      subtitle: 'Announcements',
      iconIon: newspaperOutline,
      iconColorClass: 'icon-teal',
      route: '/class-controller/news',
    },
    {
      id: 'circulars',
      title: 'Class Circulars',
      subtitle: 'Official Notices',
      iconIon: documentTextOutline,
      iconColorClass: 'icon-cyan',
      route: '/class-controller/circulars',
    },
    {
      id: 'calendar',
      title: 'School Calendar',
      subtitle: 'Events & Dates',
      iconIon: calendarOutline,
      iconColorClass: 'icon-rose',
      route: '/class-controller/calendar',
    },
    {
      id: 'albums',
      title: 'Albums',
      subtitle: 'Admin published albums',
      iconIon: albumsOutline,
      iconColorClass: 'icon-orange',
      route: '/class-controller/albums',
    },
    {
      id: 'timetable',
      title: 'Timetable',
      subtitle: 'Weekly classwork & homework',
      iconIon: calendarOutline,
      iconColorClass: 'icon-indigo',
      route: '/class-controller/timetable',
    },
    {
      id: 'add-student',
      title: 'New Admission',
      subtitle: 'Enroll Student',
      iconIon: personAddOutline,
      iconColorClass: 'icon-emerald',
      route: '/class-controller/students/add',
    },
    {
      id: 'settings',
      title: 'Class Settings',
      subtitle: 'Preferences & Info',
      iconIon: settingsOutline,
      iconColorClass: 'icon-slate',
      route: '/class-controller/profile',
    },
  ];

  if (loading) {
    return (
      <IonPage>
        <IonContent className="teacher-loading-bg">
          <div className="loading-container">
            <IonSpinner name="crescent" color="primary" />
            <p>Loading Workspace...</p>
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
        <IonToolbar className="teacher-toolbar">
          <div className="custom-nav-container">
            <div className="brand-box">
              {(brandSchoolLogo || resolveMediaUrl(currentClass?.schoolLogoUrl)) ? (
                <img
                  src={brandSchoolLogo || resolveMediaUrl(currentClass?.schoolLogoUrl)}
                  alt={brandSchoolName || currentClass?.schoolName || 'School logo'}
                  className="class-brand-logo"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <IonIcon icon={schoolOutline} className="toolbar-main-icon" />
              )}
              <span className="brand-text">{brandSchoolName || currentClass?.schoolName || 'Teacher Portal'}</span>
            </div>
            <button 
              className="nav-signout-btn" 
              onClick={() => setShowLogoutAlert(true)}
            >
              <IonIcon icon={logOutOutline} />
              <span>Sign Out</span>
            </button>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="teacher-content-bg" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshCircleOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        <div className="teacher-container">
          {/* Professional Clean Hero Card */}
          <div className="teacher-hero-card">
            <div className="hero-top-row">
              <div className="teacher-role-badge">
                <IonIcon icon={shieldCheckmarkOutline} />
                <span>Class In-Charge</span>
              </div>
              <button className="code-badge-btn" onClick={() => copyClassCode(classCode)}>
                <span className="code-label-text">CODE:</span>
                <span className="code-value-text">{classCode}</span>
                <IonIcon icon={copyOutline} />
              </button>
            </div>

            <div className="hero-body">
              {(brandSchoolName || currentClass?.schoolName) && (
                <p className="hero-school-name" style={{ fontWeight: 700, opacity: 0.95, margin: '0 0 4px' }}>
                  {brandSchoolName || currentClass?.schoolName}
                </p>
              )}
              <h1 className="hero-class-name">{className}</h1>
              {classSection && <span className="hero-section-tag">Section {classSection}</span>}
              <p className="hero-welcome-text">
                Welcome, <strong>{user?.name || dashboardData?.class?.teacher?.name || 'Teacher'}</strong>
              </p>
            </div>
          </div>

          {/* Clean Metric Blocks */}
          <div className="metrics-grid">
            <div className="metric-box">
              <span className="metric-digit">{dashboardData?.stats?.totalStudents ?? 0}</span>
              <span className="metric-label">Total Students</span>
            </div>
            <div className="metric-box">
              <span className="metric-digit">{dashboardData?.stats?.totalHomework ?? 0}</span>
              <span className="metric-label">Active Homework</span>
            </div>
            <div className="metric-box">
              <span className="metric-digit">{dashboardData?.stats?.upcomingExams ?? 0}</span>
              <span className="metric-label">Upcoming Exams</span>
            </div>
          </div>

          {/* Quick Share Code Banner */}
          <IonCard className="quick-access-card">
            <IonCardContent className="quick-card-inner">
              <div className="quick-info">
                <h3>Class Code Sharing</h3>
                <p>Share code <strong>{classCode}</strong> with students to let them join this room.</p>
              </div>
              <IonButton 
                size="small" 
                fill="outline" 
                className="copy-action-btn"
                onClick={() => copyClassCode(classCode)}
              >
                <IonIcon icon={copyOutline} slot="start" />
                Copy Code
              </IonButton>
            </IonCardContent>
          </IonCard>

          {/* Menu Options Grid */}
          {/* Quick Actions Section */}
          <div className="quick-actions-section">
            <h2 className="group-heading">Quick Actions</h2>
          <IonCard className="quick-action-card" onClick={() => history.push('/class-controller/homework/create')}>
              <IonCardContent>
                <div className="quick-action-icon">
                  <IonIcon icon={bookOutline} />
                </div>
                <div className="quick-action-text">
                  <h3>Create Homework</h3>
                  <p>Assign new homework to your class</p>
                </div>
              </IonCardContent>
            </IonCard>
          </div>

          {/* Recent Homework Section */}
          {recentHomework.length > 0 && (
            <div className="recent-homework-section">
              <h2 className="group-heading">Recent Homework</h2>
              <div className="homework-list">
                {recentHomework.map((hw) => (
                  <IonCard key={hw.id} className="homework-card">
                    <IonCardContent>
                      <div className="homework-info">
                        <div className="homework-header">
                          <span className="homework-subject-badge">{hw.subject}</span>
                          <div className="homework-dates">
                            <span className="homework-date">
                              Given: {hw.givenDate ? new Date(hw.givenDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              }) : 'N/A'}
                            </span>
                            <span className="homework-date due">
                              Due: {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              }) : 'N/A'}
                            </span>
                          </div>
                        </div>
                        <h4 className="homework-title">{hw.title}</h4>
                        {hw.description && (
                          <p className="homework-description">
                            {hw.description.length > 100 
                              ? hw.description.substring(0, 100) + '...' 
                              : hw.description}
                          </p>
                        )}
                      </div>
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>
            </div>
          )}

          <div className="control-section">
            <h2 className="group-heading">Management Dashboard</h2>

            <IonGrid className="ion-no-padding">
              <IonRow className="grid-row-gap">
                {menuItems.map((item, index) => (
                  <IonCol size="12" sizeSm="6" sizeMd="4" sizeLg="3" key={item.id} className="grid-col-pad">
                    <div 
                      className="teacher-menu-card"
                      style={{ animationDelay: `${index * 0.05}s` }}
                      onClick={() => history.push(item.route)}
                    >
                      <div className={`menu-icon-wrapper ${item.iconColorClass}`}>
                        <IonIcon icon={item.iconIon} />
                      </div>
                      <div className="menu-text-content">
                        <h3>{item.title}</h3>
                        <p>{item.subtitle}</p>
                      </div>
                    </div>
                  </IonCol>
                ))}
              </IonRow>
            </IonGrid>
          </div>
        </div>

        {/* Toast */}
        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage || ''}
          duration={2000}
          onDidDismiss={() => setToastMessage(null)}
          icon={checkmarkCircleOutline}
          color="dark"
        />

        {/* Alert */}
        <IonAlert
          isOpen={showLogoutAlert}
          onDidDismiss={() => setShowLogoutAlert(false)}
          header="Sign Out"
          message="Are you sure you want to end your current session?"
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { text: 'Sign Out', role: 'destructive', handler: () => { logout(); history.push('/login'); } }
          ]}
        />

      </IonContent>
    </IonPage>
  );
};

export default ClassControllerDashboardScreen;
