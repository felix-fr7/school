/**
 * Teacher News Screen (Ionic React Version)
 * View school news and announcements
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
import { refreshOutline, newspaperOutline } from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import './TeacherNewsScreen.css';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category?: string;
  imageUrl?: string;
  createdAt: string;
  postedByUser?: { name: string };
}

const TeacherNewsScreen: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const response = await adminAPI.getNews(1, 20, '');
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

  const onRefresh = async (event: CustomEvent) => {
    await fetchNews(true);
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
            <p>Loading news...</p>
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
          <IonTitle>School News</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="teacher-news-content">
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
              <IonCard key={item.id} className="news-card">
                {item.imageUrl && (
                  <div className="news-image-placeholder">
                    <span>📷</span>
                  </div>
                )}
                <IonCardContent>
                  <div className="news-header">
                    {item.category && (
                      <IonBadge color="secondary" className="category-badge">
                        {item.category}
                      </IonBadge>
                    )}
                    <span className="news-date">{formatDate(item.createdAt)}</span>
                  </div>
                  <h3 className="news-title">{item.title}</h3>
                  {item.summary && (
                    <p className="news-summary">{item.summary}</p>
                  )}
                  <p className="news-author">By: {item.postedByUser?.name || 'Admin'}</p>
                </IonCardContent>
              </IonCard>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default TeacherNewsScreen;