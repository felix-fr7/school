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
import { studentAPI } from '../../src/services/api';
import './NewsDetailScreen.css';
import HomeLogoutButtons from '../../../frontend/src/components/HomeLogoutButtons';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const StudentNewsDetailScreen = () => {
  const { newsId } = useParams();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPdfAlert, setShowPdfAlert] = useState(false);

  useEffect(() => {
    fetchNewsDetail();
  }, [newsId]);

  const fetchNewsDetail = async () => {
    try {
      console.log('[NewsDetail] Fetching news by ID:', newsId);
      setLoading(true);
      const response = await studentAPI.getNewsById(newsId);
      console.log('[NewsDetail] Response:', response);
      if (response.success && response.data) {
        setNews(response.data);
      }
    } catch (error) {
      console.error('Error fetching news detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleOpenPdf = () => {
    if (!news?.pdfUrl) return;
    // Construct the full URL for the file
    // Note: We use direct URL instead of blob URL because blob URLs
    // cannot be opened in a new tab (they're scoped to the originating document)
    const baseUrl = API_BASE_URL.replace('/api', '');
    const fullUrl = news.pdfUrl.startsWith('http') 
      ? news.pdfUrl 
      : `${baseUrl}${news.pdfUrl}`;
    // Open in new tab
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenImage = () => {
    if (!news?.imageUrl) return;
    // Construct full URL for image (same approach as PDF)
    const baseUrl = API_BASE_URL.replace('/api', '');
    const fullUrl = news.imageUrl.startsWith('http') 
      ? news.imageUrl 
      : `${baseUrl}${news.imageUrl}`;
    window.open(fullUrl, '_blank');
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/student/news" />
            </IonButtons>
            <IonTitle>Bulletin Details</IonTitle>
          <HomeLogoutButtons />
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
            <IonTitle>Bulletin Details</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="news-detail-content">
          <div className="error-container">
            <IonIcon icon={documentOutline} className="error-icon" />
            <IonText color="medium">
              <h3>Bulletin article not found</h3>
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
          <IonTitle>Bulletin Details</IonTitle>
        <HomeLogoutButtons />
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
            <IonImg 
              src={news.imageUrl.startsWith('http') ? news.imageUrl : `${API_BASE_URL.replace('/api', '')}${news.imageUrl}`} 
              className="news-image" 
              onError={(e) => {
                console.error('Failed to load image:', news.imageUrl);
                e.target.style.opacity = '0.5';
              }}
            />
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
