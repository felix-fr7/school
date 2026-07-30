/**
 * Class Dashboard Screen (Ionic React - Modern Admin UI)
 * Displays detailed information about a specific class
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonText,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonInput,
  IonAlert,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import {
  refreshOutline,
  keyOutline,
  lockClosedOutline,
  createOutline,
  peopleOutline,
  calendarNumberOutline,
  bookOutline,
  newspaperOutline,
  chevronForwardOutline,
  schoolOutline,
  timeOutline,
  sparklesOutline,
  arrowForwardOutline,
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import { Class, Homework, ExamSchedule, News } from '../../types';
import './AdminTheme.css';

interface ClassDashboardParams {
  classId: string;
}

interface ClassDashboardData {
  class: Class & { teacher?: { id: string; name: string; email: string; phone?: string } };
  metrics: { totalStudents: number; attendanceRate: number };
  recentHomework: Homework[];
  upcomingExams: ExamSchedule[];
  recentAnnouncements: News[];
}

const ClassDashboardScreen: React.FC = () => {
  const { classId } = useParams<ClassDashboardParams>();
  const history = useHistory();
  const redirectAttemptedRef = useRef(false);

  // 1️⃣ HOOKS
  const [dashboardData, setDashboardData] = useState<ClassDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classPassword, setClassPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showPasswordAlert, setShowPasswordAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Redirect if classId is 'create'
  useEffect(() => {
    if (classId === 'create' && !redirectAttemptedRef.current) {
      redirectAttemptedRef.current = true;
      history.replace('/admin/classes/create');
    }
  }, [classId, history]);

  // Fetch Dashboard Data
  useEffect(() => {
    if (classId === 'create') return;
    fetchDashboardData();
  }, [classId]);

  // 2️⃣ HELPER FUNCTIONS
  const fetchDashboardData = async () => {
    if (!classId || classId.length < 36) {
      console.error('Invalid classId:', classId);
      setLoading(false);
      return;
    }

    try {
      const response = await adminAPI.getClassDashboard(classId);
      if (response.success && response.data) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Error fetching class dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async (event: CustomEvent) => {
    setRefreshing(true);
    await fetchDashboardData();
    event.detail.complete();
  };

  const handleUpdatePassword = async () => {
    if (!classPassword || classPassword.length < 6) {
      setAlertMessage('Password must be at least 6 characters long');
      setIsSuccess(false);
      setShowPasswordAlert(true);
      return;
    }

    try {
      setUpdatingPassword(true);
      const response = await adminAPI.resetClassPassword(classId, classPassword);

      if (response.success) {
        setAlertMessage('Class password reset successfully!');
        setIsSuccess(true);
        setShowPasswordAlert(true);
        setClassPassword('');
      } else {
        setAlertMessage(response.error?.message || 'Failed to update password');
        setIsSuccess(false);
        setShowPasswordAlert(true);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update password';
      setAlertMessage(errorMessage);
      setIsSuccess(false);
      setShowPasswordAlert(true);
    } finally {
      setUpdatingPassword(false);
    }
  };

  // 3️⃣ CONDITIONAL RENDERS
  if (classId === 'create') return null;

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar className="admin-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/classes" className="admin-back-btn" />
            </IonButtons>
            <IonTitle className="admin-title">Class Dashboard</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="admin-loading-container">
          <IonSpinner name="crescent" color="primary" />
          <IonText className="loading-text">Loading class dashboard...</IonText>
        </IonContent>
      </IonPage>
    );
  }

  if (!dashboardData) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar className="admin-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/classes" className="admin-back-btn" />
            </IonButtons>
            <IonTitle className="admin-title">Class Dashboard</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="class-dashboard-content">
          <div className="error-container">
            <IonText color="danger">
              <h3>Failed to load class data</h3>
            </IonText>
            <IonButton color="primary" className="btn-retry" onClick={fetchDashboardData}>Retry</IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const { class: classData, metrics, recentHomework, upcomingExams, recentAnnouncements } = dashboardData;
  const classFullName = classData.section ? `${classData.name} - ${classData.section}` : classData.name;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="admin-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/classes" className="admin-back-btn" />
          </IonButtons>
          <IonTitle className="admin-title">Class Dashboard</IonTitle>
          <IonButtons slot="end">
            <IonButton className="edit-header-btn" onClick={() => history.push(`/admin/classes/${classId}/edit`)}>
              <IonIcon icon={createOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="class-dashboard-content" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        <div className="dashboard-container">
          {/* Class Header Banner */}
          <div className="header-card">
            <div className="header-title-container">
              <span className="badge-pill">Active Class</span>
              <h2 className="class-name">{classFullName}</h2>
            </div>
            {classData.teacher && (
              <div className="teacher-info">
                <span className="teacher-label">Class Teacher</span>
                <span className="teacher-name">{classData.teacher.name}</span>
                {classData.teacher.email && <span className="teacher-email">{classData.teacher.email}</span>}
              </div>
            )}
          </div>

          {/* Quick Metrics Section */}
          <div className="metrics-grid">
            <IonCard className="metric-card border-blue">
              <IonCardContent>
                <span className="metric-value">{metrics.totalStudents}</span>
                <span className="metric-label">Total Students</span>
              </IonCardContent>
            </IonCard>
            <IonCard className="metric-card border-emerald">
              <IonCardContent>
                <span className="metric-value">{metrics.attendanceRate}%</span>
                <span className="metric-label">Attendance Rate</span>
              </IonCardContent>
            </IonCard>
          </div>

          {/* Class Login Credentials (Bento Style) */}
          <IonCard className="admin-card bento-card">
            <IonCardContent>
              <div className="bento-header">
                <IonIcon icon={keyOutline} className="bento-icon-blue" />
                <span className="bento-title-blue">Class Login ID</span>
              </div>
              <div className="bento-value-container">
                <span className="bento-value">{classData.classCode || classData.class_code || 'Not generated'}</span>
              </div>
              <p className="bento-note">Share this ID with students/parents for portal authentication.</p>
            </IonCardContent>
          </IonCard>

          {/* Password Management */}
          <IonCard className="admin-card bento-card">
            <IonCardContent>
              <div className="bento-header">
                <IonIcon icon={lockClosedOutline} className="bento-icon-dark" />
                <span className="bento-title-dark">Password Management</span>
              </div>
              <p className="bento-note-left">Reset class access password in case of forgotten credentials.</p>
              <div className="password-input-row">
                <IonInput
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={classPassword}
                  onIonInput={(e) => setClassPassword(e.detail.value || '')}
                  autocapitalize="off"
                  className="admin-input password-input-field"
                />
                <IonButton
                  color="warning"
                  onClick={handleUpdatePassword}
                  disabled={!classPassword || classPassword.length < 6 || updatingPassword}
                  className="reset-password-button"
                >
                  {updatingPassword ? <IonSpinner name="crescent" size="small" /> : 'Reset'}
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Quick Navigation Actions */}
          <div className="section-block">
            <h3 className="section-title">Quick Actions</h3>
            <div className="actions-grid">
              <div className="action-button" onClick={() => history.push(`/admin/students?classId=${classId}`)}>
                <div className="action-icon-wrap bg-blue-light">
                  <IonIcon icon={peopleOutline} className="action-icon text-blue" />
                </div>
                <span className="action-text">View Students</span>
              </div>
              <div className="action-button" onClick={() => history.push(`/admin/exams?classId=${classId}`)}>
                <div className="action-icon-wrap bg-purple-light">
                  <IonIcon icon={calendarNumberOutline} className="action-icon text-purple" />
                </div>
                <span className="action-text">Schedule</span>
              </div>
            </div>
          </div>

          {/* Recent Homework */}
          <IonCard className="admin-card section-card">
            <IonCardContent>
              <div className="section-header">
                <div className="section-header-title">
                  <IonIcon icon={bookOutline} className="section-header-icon text-blue" />
                  <h3 className="section-title">Recent Homework</h3>
                </div>
                <IonButton fill="clear" size="small" className="see-all-btn" onClick={() => history.push(`/admin/homework?classId=${classId}`)}>
                  See All <IonIcon icon={chevronForwardOutline} />
                </IonButton>
              </div>

              {recentHomework.length > 0 ? (
                recentHomework.slice(0, 3).map((homework) => (
                  <div key={homework.id} className="list-item">
                    <div className="list-item-content">
                      <span className="list-item-title">{homework.title}</span>
                      <span className="list-item-subtitle">{homework.subject}</span>
                      {homework.dueDate && (
                        <span className="list-item-meta">
                          <IonIcon icon={timeOutline} /> Due: {formatDate(homework.dueDate)}
                        </span>
                      )}
                    </div>
                    <IonButton fill="outline" size="small" className="item-action-btn" onClick={() => history.push(`/admin/homework?classId=${classId}`)}>
                      View
                    </IonButton>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <IonIcon icon={bookOutline} className="empty-icon" />
                  <IonText className="empty-text">No homework assigned yet</IonText>
                </div>
              )}
            </IonCardContent>
          </IonCard>

          {/* Upcoming Exams */}
          <IonCard className="admin-card section-card">
            <IonCardContent>
              <div className="section-header">
                <div className="section-header-title">
                  <IonIcon icon={calendarNumberOutline} className="section-header-icon text-purple" />
                  <h3 className="section-title">Upcoming Exams</h3>
                </div>
                <IonButton fill="clear" size="small" className="see-all-btn" onClick={() => history.push(`/admin/exams?classId=${classId}`)}>
                  See All <IonIcon icon={chevronForwardOutline} />
                </IonButton>
              </div>

              {upcomingExams.length > 0 ? (
                upcomingExams.slice(0, 3).map((exam) => (
                  <div key={exam.id} className="list-item">
                    <div className="list-item-content">
                      <span className="list-item-title">{exam.title}</span>
                      <span className="list-item-subtitle">{exam.subject}</span>
                      <span className="list-item-meta">
                        <IonIcon icon={timeOutline} /> {formatDate(exam.date)} • {exam.time}
                      </span>
                    </div>
                    <IonButton fill="outline" size="small" className="item-action-btn" onClick={() => history.push(`/admin/exams?classId=${classId}`)}>
                      View
                    </IonButton>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <IonIcon icon={calendarNumberOutline} className="empty-icon" />
                  <IonText className="empty-text">No upcoming exams</IonText>
                </div>
              )}
            </IonCardContent>
          </IonCard>

          {/* Recent Announcements */}
          <IonCard className="admin-card section-card">
            <IonCardContent>
              <div className="section-header">
                <div className="section-header-title">
                  <IonIcon icon={newspaperOutline} className="section-header-icon text-emerald" />
                  <h3 className="section-title">Announcements</h3>
                </div>
                <IonButton fill="clear" size="small" className="see-all-btn" onClick={() => history.push('/admin/news')}>
                  See All <IonIcon icon={chevronForwardOutline} />
                </IonButton>
              </div>

              {recentAnnouncements.length > 0 ? (
                recentAnnouncements.slice(0, 3).map((news) => (
                  <div key={news.id} className="announcement-item">
                    <span className="announcement-title">{news.title}</span>
                    <span className="announcement-summary">
                      {news.summary || news.content.substring(0, 90)}...
                    </span>
                    <span className="announcement-date">
                      {news.publishDate ? formatDate(news.publishDate) : formatDate(news.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <IonIcon icon={newspaperOutline} className="empty-icon" />
                  <IonText className="empty-text">No announcements yet</IonText>
                </div>
              )}
            </IonCardContent>
          </IonCard>

        </div>

        <IonAlert
          isOpen={showPasswordAlert}
          onDidDismiss={() => setShowPasswordAlert(false)}
          header={isSuccess ? 'Success' : 'Error'}
          message={alertMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassDashboardScreen;