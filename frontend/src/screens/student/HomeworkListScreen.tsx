/**
 * Student Homework List Screen (Ionic React Version)
 * Displays all homework assignments for the student's class
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
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
  IonBadge,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { bookOutline, calendarOutline, timeOutline, refreshOutline } from 'ionicons/icons';
import { studentAPI } from '../../services/api';
import { Homework } from '../../types';
import './HomeworkListScreen.css';

const StudentHomeworkListScreen: React.FC = () => {
  const history = useHistory();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHomework = async () => {
    try {
      const response = await studentAPI.getHomework(1, 20);
      if (response.success && response.data) {
        setHomeworks(response.data.homeworks);
      }
    } catch (error) {
      console.error('Error fetching homework:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHomework();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    setRefreshing(true);
    await fetchHomework();
    event.detail.complete();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/student/dashboard" />
            </IonButtons>
            <IonTitle>Homework</IonTitle>
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
          <IonTitle>Homework</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="homework-list-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {homeworks.length === 0 ? (
          <div className="empty-container">
            <IonIcon icon={bookOutline} className="empty-icon" />
            <IonText color="medium">
              <h3>No homework assigned yet</h3>
            </IonText>
          </div>
        ) : (
          <IonList>
            {homeworks.map((item) => (
              <IonItem
                key={item.id}
                button
                onClick={() => history.push(`/student/homework/${item.id}`)}
                className="homework-item"
              >
                <IonCard className="homework-card">
                  <IonCardHeader>
                    <div className="card-header">
                      <IonCardSubtitle className="subject">
                        <IonIcon icon={bookOutline} /> {item.subject}
                      </IonCardSubtitle>
                      {item.dueDate && (
                        <IonBadge color="danger" className="due-badge">
                          <IonIcon icon={calendarOutline} /> Due: {formatDate(item.dueDate)}
                        </IonBadge>
                      )}
                    </div>
                    <IonCardTitle>{item.title}</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <p className="description">
                      {item.description.length > 100
                        ? `${item.description.substring(0, 100)}...`
                        : item.description}
                    </p>
                    {item.class && (
                      <IonText color="medium" className="class-info">
                        <IonIcon icon={timeOutline} /> {item.class.name}
                        {item.class.section ? ` - ${item.class.section}` : ''}
                      </IonText>
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

export default StudentHomeworkListScreen;