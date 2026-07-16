/**
 * Teacher Circulars Screen (Ionic React Version)
 * View school circulars and official notices
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
  IonIcon,
  IonText,
  IonSpinner,
  IonList,
  IonCard,
  IonCardContent,
  IonRefresher,
  IonRefresherContent,
  IonBadge,
} from '@ionic/react';
import { refreshOutline, documentTextOutline } from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import './TeacherCircularsScreen.css';

interface CircularItem {
  id: string;
  title: string;
  content: string;
  circularNo?: string;
  issueDate: string;
  createdAt: string;
  issuedByUser?: { name: string };
}

const TeacherCircularsScreen: React.FC = () => {
  const [circulars, setCirculars] = useState<CircularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCirculars = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const response = await adminAPI.getCirculars(1, 20);
      if (response.success && response.data) {
        setCirculars(response.data.circulars);
      }
    } catch (error) {
      console.error('Error fetching circulars:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCirculars();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    await fetchCirculars(true);
    event.detail.complete();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Loading circulars...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/teacher/dashboard" />
          </IonButtons>
          <IonTitle>School Circulars</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="teacher-circulars-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {circulars.length === 0 ? (
          <div className="empty-container">
            <IonIcon icon={documentTextOutline} className="empty-icon" />
            <IonText color="medium">
              <h3>No circulars or notices available</h3>
            </IonText>
          </div>
        ) : (
          <IonList>
            {circulars.map((item) => (
              <IonCard key={item.id} className="circular-card">
                <IonCardContent>
                  <div className="circular-header">
                    {item.circularNo && (
                      <IonBadge color="secondary" className="circular-no-badge">
                        {item.circularNo}
                      </IonBadge>
                    )}
                    <span className="circular-date">Issued: {formatDate(item.issueDate)}</span>
                  </div>
                  <h3 className="circular-title">{item.title}</h3>
                  <p className="circular-content">{item.content}</p>
                  <p className="circular-author">Issued by: {item.issuedByUser?.name || 'Admin'}</p>
                </IonCardContent>
              </IonCard>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default TeacherCircularsScreen;