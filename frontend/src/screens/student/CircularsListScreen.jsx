/**
 * Student Circulars Screen (Ionic React Version)
 * View school circulars and official notices
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
  IonBadge,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
} from '@ionic/react';
import { refreshOutline, clipboardOutline } from 'ionicons/icons';
import { studentAPI } from '../../services/api';
import './CircularsListScreen.css';

const StudentCircularsListScreen = () => {
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCirculars = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const response = await studentAPI.getCirculars(1, 20);
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

  const onRefresh = async (event) => {
    await fetchCirculars(true);
    event.detail.complete();
  };

  const formatDate = (dateStr) => {
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
            <IonTitle>Circulars</IonTitle>
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
          <IonTitle>Circulars</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="circulars-list-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {circulars.length === 0 ? (
          <div className="empty-container">
            <IonIcon icon={clipboardOutline} className="empty-icon" />
            <IonText color="medium">
              <h3>No circulars or notices available</h3>
            </IonText>
          </div>
        ) : (
          <IonList>
            {circulars.map((item) => (
              <IonItem key={item.id} className="circular-item">
                <IonCard className="circular-card">
                  <IonCardContent>
                    <div className="circular-header">
                      {item.circularNo && (
                        <IonBadge color="secondary" className="circular-no-badge">
                          {item.circularNo}
                        </IonBadge>
                      )}
                      <IonText color="medium" className="circular-date">
                        Issued: {formatDate(item.issueDate)}
                      </IonText>
                    </div>
                    <h3 className="circular-title">{item.title}</h3>
                    <p className="circular-content">
                      {item.content.length > 200
                        ? `${item.content.substring(0, 200)}...`
                        : item.content}
                    </p>
                    <IonText color="medium" className="circular-author">
                      Issued by: {item.issuedByUser?.name || 'Admin'}
                    </IonText>
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

export default StudentCircularsListScreen;