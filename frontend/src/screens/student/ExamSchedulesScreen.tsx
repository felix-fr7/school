/**
 * Student Exam Schedules Screen (Ionic React Version)
 * View upcoming exam schedules
 */

import React, { useEffect, useState } from 'react';
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
import { refreshOutline, calendarOutline, timeOutline, locationOutline } from 'ionicons/icons';
import { studentAPI } from '../../services/api';
import './ExamSchedulesScreen.css';

interface ExamScheduleItem {
  id: string;
  subject: string;
  date: string;
  startTime?: string;
  endTime?: string;
  roomNumber?: string;
  createdAt: string;
  class?: { name: string; section?: string };
}

const StudentExamSchedulesScreen: React.FC = () => {
  const [examSchedules, setExamSchedules] = useState<ExamScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExamSchedules = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const response = await studentAPI.getExamSchedules(1, 20);
      if (response.success && response.data) {
        setExamSchedules(response.data.examSchedules);
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

  const onRefresh = async (event: CustomEvent) => {
    await fetchExamSchedules(true);
    event.detail.complete();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            {examSchedules.map((item) => (
              <IonItem key={item.id} className="exam-item">
                <IonCard className="exam-card">
                  <IonCardContent>
                    <div className="exam-header">
                      <span className="exam-subject">{item.subject}</span>
                      <IonText color="secondary" className="exam-date">
                        <IonIcon icon={calendarOutline} /> {formatDate(item.date)}
                      </IonText>
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
                  </IonCardContent>
                </IonCard>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default StudentExamSchedulesScreen;