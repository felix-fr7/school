/**
 * Class Dashboard Screen (Ionic React Version)
 * Displays detailed information about a specific class
 */

import React, { useEffect, useState } from 'react';
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
  IonList,
  IonItem,
  IonBadge,
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
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import { Class, Homework, ExamSchedule, News } from '../../types';
import './ClassDashboardScreen.css';

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

  const [dashboardData, setDashboardData] = useState<ClassDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classPassword, setClassPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showPasswordAlert, setShowPasswordAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const fetchDashboardData = async () => {
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

  useEffect(() => {
    fetchDashboardData();
  }, [classId]);

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

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/classes" />
            </IonButtons>
            <IonTitle>Class Dashboard</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Loading class dashboard...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  if (!dashboardData) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/classes" />
            </IonButtons>
            <IonTitle>Class Dashboard</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="class-dashboard-content">
          <div className="error-container">
            <IonText color="danger">
              <h3>Failed to load class data</h3>
            </IonText>
            <IonButton onClick={fetchDashboardData}>Retry</IonButton>
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
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/classes" />
          </IonButtons>
          <IonTitle>Class Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="class-dashboard-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {/* Class Header Card */}
        <div className="header-card">
          <h2 className="class-name">{classFullName}</h2>
          {classData.teacher && (
            <div className="teacher-info">
              <p className="teacher-label">Class Teacher</p>
              <p className="teacher-name">{classData.teacher.name}</p>
              {classData.teacher.email && <p className="teacher-email">{classData.teacher.email}</p>}
            </div>
          )}
        </div>

        {/* Class ID Bento Card */}
        <IonCard className="class-id-bento-card">
          <IonCardContent>
            <div className="bento-header">
              <IonIcon icon={keyOutline} className="bento-icon" />
              <span className="bento-title">Class Login ID</span>
            </div>
            <div className="bento-value-container">
              <span className="bento-value">{classData.classCode || classData.class_code || 'Not yet generated'}</span>
            </div>
            <p className="bento-note">Share this ID with students/parents for class login</p>
          </IonCardContent>
        </IonCard>

        {/* Password Management Card */}
        <IonCard className="password-bento-card">
          <IonCardContent>
            <div className="bento-header">
              <IonIcon icon={lockClosedOutline} className="bento-icon" />
              <span className="bento-title">Class Password Management</span>
            </div>
            <p className="bento-note">Reset the class login password if students/parents have forgotten it.</p>
            <div className="password-input-row">
              <IonInput
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={classPassword}
                onIonInput={(e) => setClassPassword(e.detail.value || '')}
                autocapitalize="off"
                className="password-input-field"
              />
              <IonButton
                color="warning"
                onClick={handleUpdatePassword}
                disabled={!classPassword || classPassword.length < 6 || updatingPassword}
                className="reset-password-button"
              >
                {updatingPassword ? <IonSpinner name="crescent" /> : 'Reset Password'}
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Edit Class Button */}
        <IonCard className="edit-class-card" button onClick={() => history.push(`/admin/classes/${classId}/edit`)}>
          <IonCardContent>
            <IonIcon icon={createOutline} className="edit-icon" />
            <span className="edit-text">Edit Class Details</span>
          </IonCardContent>
        </IonCard>

        {/* Quick Metrics */}
        <IonCard className="section">
          <IonCardContent>
            <h3 className="section-title">Quick Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <span className="metric-value">{metrics.totalStudents}</span>
                <span className="metric-label">Total Students</span>
              </div>
              <div className="metric-card">
                <span className="metric-value">{metrics.attendanceRate}%</span>
                <span className="metric-label">Attendance Rate</span>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Quick Actions */}
        <IonCard className="section">
          <IonCardContent>
            <h3 className="section-title">Quick Actions</h3>
            <div className="actions-grid">
              <div className="action-button" onClick={() => history.push(`/admin/students?classId=${classId}`)}>
                <IonIcon icon={peopleOutline} className="action-icon" />
                <span className="action-text">View Students</span>
              </div>
              <div className="action-button" onClick={() => history.push(`/admin/exams?classId=${classId}`)}>
                <IonIcon icon={calendarNumberOutline} className="action-icon" />
                <span className="action-text">Manage Schedule</span>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Recent Homework */}
        <IonCard className="section">
          <IonCardContent>
            <div className="section-header">
              <h3 className="section-title">Recent Homework</h3>
              <IonButton fill="clear" size="small" onClick={() => history.push(`/admin/homework?classId=${classId}`)}>
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
                      <span className="list-item-meta">Due: {formatDate(homework.dueDate)}</span>
                    )}
                  </div>
                  <IonButton fill="outline" size="small" onClick={() => history.push(`/admin/homework?classId=${classId}`)}>
                    View
                  </IonButton>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <IonIcon icon={bookOutline} className="empty-icon" />
                <IonText color="medium">No homework assigned yet</IonText>
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Upcoming Exams */}
        <IonCard className="section">
          <IonCardContent>
            <div className="section-header">
              <h3 className="section-title">Upcoming Exams</h3>
              <IonButton fill="clear" size="small" onClick={() => history.push(`/admin/exams?classId=${classId}`)}>
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
                      {formatDate(exam.date)} • {exam.time}
                    </span>
                    {exam.roomNo && <span className="list-item-meta">Room: {exam.roomNo}</span>}
                  </div>
                  <IonButton fill="outline" size="small" onClick={() => history.push(`/admin/exams?classId=${classId}`)}>
                    View
                  </IonButton>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <IonIcon icon={calendarNumberOutline} className="empty-icon" />
                <IonText color="medium">No upcoming exams</IonText>
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Recent Announcements */}
        <IonCard className="section">
          <IonCardContent>
            <div className="section-header">
              <h3 className="section-title">Recent Announcements</h3>
              <IonButton fill="clear" size="small" onClick={() => history.push('/admin/news')}>
                See All <IonIcon icon={chevronForwardOutline} />
              </IonButton>
            </div>
            {recentAnnouncements.length > 0 ? (
              recentAnnouncements.slice(0, 3).map((news) => (
                <div key={news.id} className="announcement-item">
                  <span className="announcement-title">{news.title}</span>
                  <span className="announcement-summary">
                    {news.summary || news.content.substring(0, 100)}...
                  </span>
                  <span className="announcement-date">
                    {news.publishDate ? formatDate(news.publishDate) : formatDate(news.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <IonIcon icon={newspaperOutline} className="empty-icon" />
                <IonText color="medium">No announcements yet</IonText>
              </div>
            )}
          </IonCardContent>
        </IonCard>

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