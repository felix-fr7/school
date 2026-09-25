/**
 * Student Exam Schedules Screen (Ionic React Version)
 * View upcoming exam schedules
 * Click on an exam to view details and attached files
 */

import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonBackButton,
  IonButtons,
  IonList,
  IonItem,
  IonCard,
  IonCardContent,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
} from '@ionic/react';
import { refreshOutline, calendarOutline, timeOutline, locationOutline, chevronForwardOutline, documentTextOutline } from 'ionicons/icons';
import { studentAPI } from '../../src/services/api';
import './ExamSchedulesScreen.css';
import HomeLogoutButtons from '../../src/components/HomeLogoutButtons';

const StudentExamSchedulesScreen = () => {
  const history = useHistory();
  const [examSchedules, setExamSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExamSchedules = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const response = await studentAPI.getExamSchedules(1, 20);
      if (response.success && response.data) {
        // Handle both array response and wrapped response
        const scheduleData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.examSchedules || []);
        setExamSchedules(scheduleData);
      }
    } catch (error) {
      console.error('Error fetching exam schedules:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExamSchedules();
  }, []);

  const onRefresh = async (event) => {
    await fetchExamSchedules(true);
    event.detail.complete();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Check if exam has a file attachment
  const hasAttachment = (item) => {
    return item.fileUrl || item.file_url || item.pdfUrl || item.pdf_url || item.imageUrl || item.image_url;
  };

  // Navigate to exam detail page
  const handleExamClick = (examId) => {
    history.push(`/student/exams/${examId}`);
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/student/dashboard" />
            </IonButtons>
            <IonTitle>Exam Schedules</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/student/dashboard" />
          </IonButtons>
          <IonTitle>Exam Schedules</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>
      <IonContent className="exam-schedules-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {examSchedules.length === 0 ? (
          <div className="empty-container">
            <IonIcon icon={calendarOutline} className="empty-icon" />
            <IonText color="medium">
              <h3>No upcoming exam schedules</h3>
            </IonText>
          </div>
        ) : (
          <IonList>
            {examSchedules.map((item) => {
              const itemHasAttachment = hasAttachment(item);
              return (
                <IonItem 
                  key={item.id} 
                  className="exam-item"
                  button
                  onClick={() => handleExamClick(item.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <IonCard className="exam-card">
                    <IonCardContent>
                      <div className="exam-header">
                        <span className="exam-subject">{item.subject}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {itemHasAttachment && (
                            <IonIcon 
                              icon={documentTextOutline} 
                              style={{ color: '#6366f1', fontSize: '16px' }}
                              title="Has attachment"
                            />
                          )}
                          <IonText color="secondary" className="exam-date">
                            <IonIcon icon={calendarOutline} /> {formatDate(item.date)}
                          </IonText>
                          <IonIcon icon={chevronForwardOutline} style={{ color: '#94a3b8', fontSize: '16px' }} />
                        </div>
                      </div>
                      {item.startTime && item.endTime && (
                        <p className="exam-detail">
                          <IonIcon icon={timeOutline} /> {item.startTime} - {item.endTime}
                        </p>
                      )}
                      {item.roomNumber && (
                        <p className="exam-detail">
                          <IonIcon icon={locationOutline} /> Room: {item.roomNumber}
                        </p>
                      )}
                      {item.class && (
                        <p className="exam-class">
                          {item.class.name}{item.class.section ? ` - ${item.class.section}` : ''}
                        </p>
                      )}
                      {itemHasAttachment && (
                        <p style={{ fontSize: '12px', color: '#6366f1', marginTop: '8px', fontStyle: 'italic' }}>
                          ðŸ“Ž Tap to view attachment
                        </p>
                      )}
                    </IonCardContent>
                  </IonCard>
                </IonItem>
              );
            })}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default StudentExamSchedulesScreen;
