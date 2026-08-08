/**
 * Student News Screen (Ionic React Version)
 * View school news and announcements
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
  IonBadge,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
  IonImg,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { newspaperOutline, calendarOutline, personOutline, imageOutline, refreshOutline } from 'ionicons/icons';
import { studentAPI } from '../../services/api';
import './NewsListScreen.css';

const StudentNewsListScreen = () => {
  const history = useHistory();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async () => {
    try {
      const response = await studentAPI.getNews(1, 20, '');
      if (response.success && response.data) {
        setNews(response.data.news);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const onRefresh = async (event) => {
    setRefreshing(true);
    await fetchNews();
    event.detail.complete();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleNewsPress = (newsId) => {
    history.push(`/student/news/${newsId}`);
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/student/dashboard" />
            </IonButtons>
            <IonTitle>News</IonTitle>
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
          <IonTitle>News</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="news-list-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {news.length === 0 ? (
          <div className="empty-container">
            <IonIcon icon={newspaperOutline} className="empty-icon" />
            <IonText color="medium">
              <h3>No news or announcements available</h3>
            </IonText>
          </div>
        ) : (
          <IonList>
            {news.map((item) => (
              <IonItem
                key={item.id}
                button
                onClick={() => handleNewsPress(item.id)}
                className="news-item"
              >
                <IonCard className="news-card">
                  {item.imageUrl ? (
                    <IonImg src={item.imageUrl} className="news-image" />
                  ) : (
                    <div className="news-image-placeholder">
                      <IonIcon icon={imageOutline} />
                    </div>
                  )}
                  <IonCardContent>
                    <div className="news-header">
                      {item.category && (
                        <IonBadge color="secondary" className="category-badge">
                          {item.category}
                        </IonBadge>
                      )}
                      <IonText color="medium" className="news-date">
                        <IonIcon icon={calendarOutline} /> {formatDate(item.createdAt)}
                      </IonText>
                    </div>
                    <h3 className="news-title">{item.title}</h3>
                    {item.summary && (
                      <p className="news-summary">
                        {item.summary.length > 150
                          ? `${item.summary.substring(0, 150)}...`
                          : item.summary}
                      </p>
                    )}
                    {item.postedByUser && (
                      <IonText color="medium" className="news-author">
                        <IonIcon icon={personOutline} /> By: {item.postedByUser.name}
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

export default StudentNewsListScreen;