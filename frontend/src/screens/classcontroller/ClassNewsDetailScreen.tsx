/**
 * Class News Detail Screen (Ionic React Version)
 * Displays full news article with content, images, and PDF attachments for Class Controllers
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonSpinner,
  IonText,
  IonBadge,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonImg,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { 
  calendarOutline, 
  personOutline, 
  documentOutline, 
  imageOutline,
  openOutline,
} from 'ionicons/icons';
import { News } from '../../types';
import './ClassNewsDetailScreen.css';

const ClassNewsDetailScreen: React.FC = () => {
  const history = useHistory();
  const newsId = (window.location.pathname.match(/news\/([^/]+)$/) || [])[1];
  
  const [news, setNews] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNewsDetail();
  }, [newsId]);

  const fetchNewsDetail = async () => {
    try {
      setLoading(true);
      // Note: contentAPI.getNewsById not available, using console.log fallback
      console.log('Fetching news detail for:', newsId);
      
      // Simulate news data for demo
      setNews({
        id: newsId,
        title: 'Sample News Article',
        content: 'This is the full content of the news article. In a production environment, this would be fetched from the backend API. The content can include rich text, images, and other media.',
        summary: 'A brief summary of the news article.',
        category: 'School Event',
        imageUrl: 'https://via.placeholder.com/600x300?text=News+Image',
        pdfUrl: 'https://example.com/document.pdf',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        visibility: 'ALL',
        tenantId: '1',
        postedBy: '1',
        isPublished: true,
        postedByUser: { id: '1', name: 'School Admin' },
      });
    } catch (error) {
      console.error('Error fetching news detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleOpenPdf = () => {
    if (!news?.pdfUrl) return;
    window.open(news.pdfUrl, '_blank');
  };

  const handleOpenImage = () => {
    if (!news?.imageUrl) return;
    window.open(news.imageUrl, '_blank');
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/class-controller/news" />
            </IonButtons>
            <IonTitle>News Detail</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center news-detail-loading">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p className="loading-text">Loading news article...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  if (!news) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/class-controller/news" />
            </IonButtons>
            <IonTitle>News Detail</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <div className="error-state">
            <div className="error-icon">📰</div>
            <IonText>
              <h3>News article not found</h3>
            </IonText>
            <IonButton color="secondary" onClick={() => history.goBack()}>
              Go Back
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/news" />
          </IonButtons>
          <IonTitle>News Detail</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="news-detail-content">
        {/* Category Badge */}
        {news.category && (
          <div className="category-badge-container">
            <IonBadge color="secondary" className="category-badge">
              {news.category}
            </IonBadge>
          </div>
        )}

        {/* Title */}
        <h1 className="news-title">{news.title}</h1>

        {/* Meta Information */}
        <div className="meta-container">
          <div className="meta-item">
            <IonIcon icon={calendarOutline} />
            <span>{formatDate(news.createdAt)}</span>
          </div>
          {news.postedByUser && (
            <div className="meta-item">
              <IonIcon icon={personOutline} />
              <span className="author">By: {news.postedByUser.name}</span>
            </div>
          )}
        </div>

        {/* Image */}
        {news.imageUrl && (
          <div className="image-container">
            <IonImg 
              src={news.imageUrl} 
              alt={news.title} 
              className="news-detail-image"
              onClick={handleOpenImage}
            />
          </div>
        )}

        {/* Content */}
        <IonCard className="content-card">
          <IonCardContent>
            <p className="news-content">{news.content}</p>
          </IonCardContent>
        </IonCard>

        {/* PDF Attachment */}
        {news.pdfUrl && (
          <div className="pdf-container">
            <IonText color="dark">
              <p className="pdf-label">📎 Attachment</p>
            </IonText>
            <IonButton
              expand="block"
              fill="outline"
              onClick={handleOpenPdf}
              className="pdf-button"
            >
              <IonIcon icon={documentOutline} slot="start" />
              Open PDF Document
            </IonButton>
          </div>
        )}

        {/* Summary */}
        {news.summary && news.summary !== news.content && (
          <div className="summary-container">
            <IonText color="dark">
              <h3 className="summary-label">Summary</h3>
            </IonText>
            <p className="summary-text">{news.summary}</p>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ClassNewsDetailScreen;