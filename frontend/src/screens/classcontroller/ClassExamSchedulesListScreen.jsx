/**
 * Class Exam Schedules List Screen (Ionic React Version - READ-ONLY)
 * View Admin-published exam timetables (PDF/Image based)
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonIcon,
  IonBadge,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonButton,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { 
  calendarOutline, 
  schoolOutline, 
  globeOutline, 
  documentTextOutline, 
  refreshOutline,
  informationCircleOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { classControllerAPI } from '../../services/api';
import './ClassExamSchedulesListScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const ClassExamSchedulesListScreen = () => {
  const history = useHistory();
  
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use classControllerAPI.getExamSchedules to fetch published exam schedules
      const response = await classControllerAPI.getExamSchedules(1, 50);
      console.log('Exam Schedules API Response:', response);

      // Safely parse response data
      let rawData = [];
      if (response && response.success && response.data && response.data.examSchedules) {
        rawData = response.data.examSchedules;
      } else if (response && response.data && Array.isArray(response.data.examSchedules)) {
        rawData = response.data.examSchedules;
      }

      // The backend already filters by published and class, so we just use the data as-is
      setExams(rawData);
    } catch (err) {
      console.error('Error fetching exam schedules API:', err);
      // Detailed error fallback
      const errorMsg = 
        err?.response?.data?.message || 
        err?.response?.data?.error?.message || 
        err?.message || 
        'Unable to connect to server. Please check your network or API endpoint.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const onRefresh = async (event) => {
    await fetchExams();
    event.detail.complete();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const navigateToExam = (examId) => {
    history.push(`/class-controller/exams/${examId}`);
  };

  return (
    <IonPage>
      {/* Light Theme Header Navigation Toolbar with Back Button */}
      <IonHeader className="ion-no-border">
        <IonToolbar className="exams-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/dashboard" text="" color="dark" />
          </IonButtons>
          <IonTitle className="toolbar-title">Exam Schedules</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="exams-list-content" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        <div className="content-container">
          {/* Info Banner */}
          <div className="info-banner">
            <IonIcon icon={informationCircleOutline} className="info-banner-icon" />
            <span className="info-banner-text">
              Exam schedules are published by school administration. Tap an exam to view details.
            </span>
          </div>

          {/* Header Section */}
          <div className="header-section">
            <h1 className="header-title">Exam Schedules</h1>
            <p className="header-subtitle">
              {exams.length} exam{exams.length !== 1 ? 's' : ''} published by Admin
            </p>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="loading-state">
              <IonSpinner name="crescent" color="primary" />
              <p>Loading exam schedules...</p>
            </div>
          ) : error ? (
            /* Error Box */
            <div className="error-box">
              <p>{error}</p>
              <IonButton fill="outline" size="small" onClick={fetchExams}>
                RETRY
              </IonButton>
            </div>
          ) : exams.length === 0 ? (
            /* Empty State */
            <div className="empty-state">
              <div className="empty-icon-wrapper">
                <IonIcon icon={calendarOutline} />
              </div>
              <h2>No exam schedules</h2>
              <p>Admin has not published any exams yet</p>
              <IonButton 
                fill="solid" 
                size="small" 
                onClick={fetchExams}
                className="refresh-btn"
              >
                Check for Updates
              </IonButton>
            </div>
          ) : (
            /* Published Exam Cards List */
            <div className="exams-grid">
              {exams.map((item) => {
                const title = item.title || item.examName || item.name || 'Exam Schedule';
                const date = item.dueDate || item.examDate || item.createdAt;

                return (
                  <IonCard 
                    key={item.id} 
                    className="exam-card"
                    onClick={() => navigateToExam(item.id)}
                  >
                    <IonCardContent className="exam-card-content">
                      <div className="card-left">
                        <div className="exam-icon-container">
                          <IonIcon icon={documentTextOutline} />
                        </div>

                        <div className="exam-info">
                          <h3 className="exam-title">{title}</h3>

                          <div className="exam-meta">
                            <div className="meta-item">
                              <IonIcon icon={calendarOutline} />
                              <span>{formatDate(date)}</span>
                            </div>

                            {item.class ? (
                              <div className="meta-item">
                                <IonIcon icon={schoolOutline} />
                                <span>{item.class.name} {item.class.section ? `(${item.class.section})` : ''}</span>
                              </div>
                            ) : (
                              <div className="meta-item">
                                <IonIcon icon={globeOutline} />
                                <span>School-wide</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="card-right">
                        <IonBadge color="primary" className="view-badge">
                          View
                        </IonBadge>
                        <IonIcon icon={chevronForwardOutline} className="arrow-icon" />
                      </div>
                    </IonCardContent>
                  </IonCard>
                );
              })}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ClassExamSchedulesListScreen;
