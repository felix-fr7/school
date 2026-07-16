/**
 * Student News Detail Screen (Ionic React Version)
 * Displays full news article with content, images, and PDF attachments
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
  IonBadge,
  IonText,
  IonSpinner,
  IonIcon,
  IonButton,
  IonImg,
  IonAlert,
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { documentOutline, imageOutline, personOutline, calendarOutline, downloadOutline } from 'ionicons/icons';
import { studentAPI } from '../../services/api';
import './NewsDetailScreen.css';

interface NewsDetailParams {
  newsId: string;
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category?: string;
  imageUrl?: string;
  pdfUrl?: string;
  createdAt: string;
  postedByUser?: { name: string };
}

const StudentNewsDetailScreen: React.FC = () => {
  const { newsId } = useParams<NewsDetailParams>();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPdfAlert, setShowPdfAlert] = useState(false);

  useEffect(() => {
    fetchNewsDetail();
  }, [newsId]);

  const fetchNewsDetail = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getNews(1, 20, '');
      if (response.success && response.data) {
        const foundNews = response.data.news.find((n: NewsItem) => n.id === newsId);
        if (foundNews) {
          setNews(foundNews);
        }
      }
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
    // Open PDF in new tab (web) or show alert for mobile
    window.open(news.pdfUrl, '_blank');
  };

  const handleOpenImage = () => {
    if (!news?.imageUrl) return;
    // Open image in new tab
    window.open(news.imageUrl, '_blank');
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/student/news" />
            </IonButtons>
            <IonTitle>News Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
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
              <IonBackButton defaultHref="/student/news" />
            </IonButtons>
            <IonTitle>News Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="news-detail-content">
          <div className="error-container">
            <IonIcon icon={documentOutline} className="error-icon" />
            <IonText color="medium">
              <h3>News article not found</h3>
            </IonText>
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
            <IonBackButton defaultHref="/student/news" />
          </IonButtons>
          <IonTitle>News Details</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="news-detail-content">
        {/* Category Badge */}
        {news.category && (
          <div className="category-badge">
            <IonBadge color="secondary">{news.category}</IonBadge>
          </div>
        )}

        {/* Title */}
        <h1 className="news-title">{news.title}</h1>

        {/* Meta Information */}
        <div className="meta-container">
          <IonText color="medium" className="meta-date">
            <IonIcon icon={calendarOutline} /> {formatDate(news.createdAt)}
          </IonText>
          {news.postedByUser && (
            <IonText color="medium" className="meta-author">
              <IonIcon icon={personOutline} /> By: {news.postedByUser.name}
            </IonText>
          )}
        </div>

        {/* Image */}
        {news.imageUrl && (
          <div className="image-container" onClick={handleOpenImage}>
            <IonImg src={news.imageUrl} className="news-image" />
            <div className="image-overlay">
              <IonIcon icon={imageOutline} />
              <span>Click to view full image</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="content-container">
          <p className="news-content">{news.content}</p>
        </div>

        {/* PDF Attachment */}
        {news.pdfUrl && (
          <div className="pdf-container">
            <h4 className="pdf-label">
              <IonIcon icon={documentOutline} /> Attachment
            </h4>
            <IonButton
              expand="block"
              color="secondary"
              onClick={handleOpenPdf}
              className="pdf-button"
            >
              <IonIcon icon={downloadOutline} /> Open PDF Document
            </IonButton>
          </div>
        )}

        {/* Summary */}
        {news.summary && news.summary !== news.content && (
          <div className="summary-container">
            <h4 className="summary-label">Summary</h4>
            <p className="summary-text">{news.summary}</p>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default StudentNewsDetailScreen;