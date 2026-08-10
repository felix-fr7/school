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
} from '@ionic/react';
import { useHistory, useParams } from 'react-router-dom';
import { 
  calendarOutline, 
  personOutline, 
  documentTextOutline, 
  imageOutline,
  openOutline,
  shareSocialOutline,
} from 'ionicons/icons';
import { classControllerAPI } from '../../services/api';
import './ClassNewsDetailScreen.css';

// API Base URL for file links
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const ClassNewsDetailScreen = () => {
  const history = useHistory();
  const { newsId } = useParams();
  
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNewsDetail();
  }, [newsId]);

  const fetchNewsDetail = async () => {
    try {
      setLoading(true);
      const response = await classControllerAPI.getNewsById(newsId);
      console.log('News detail response:', response);
      
      if (response.success && response.data) {
        console.log('News data:', response.data);
        console.log('PDF URL:', response.data.pdfUrl);
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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getFileName = (url) => {
    return url.substring(url.lastIndexOf('/') + 1) || 'Document.pdf';
  };

  const handleOpenPdf = () => {
    if (!news?.pdfUrl) {
      console.warn('No PDF URL available');
      return;
    }

    console.log('Opening PDF:', news.pdfUrl);

    // Construct the full URL for the file
    // Note: We use direct URL instead of blob URL because blob URLs
    // cannot be opened in a new tab (they're scoped to the originating document)
    const fullUrl = news.pdfUrl.startsWith('http') 
      ? news.pdfUrl 
      : `${API_BASE_URL.replace('/api', '')}${news.pdfUrl}`;
    
    console.log('Full PDF URL:', fullUrl);
    
    // Open in new tab - the browser will handle authentication via cookies
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenImage = () => {
    if (!news?.imageUrl) {
      console.warn('No image URL available');
      return;
    }

    console.log('Opening image:', news.imageUrl);

    // Construct the full URL for the image
    const fullUrl = news.imageUrl.startsWith('http') 
      ? news.imageUrl 
      : `${API_BASE_URL.replace('/api', '')}${news.imageUrl}`;
    
    console.log('Full image URL:', fullUrl);
    
    // Open in new tab
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShare = () => {
    if (navigator.share && news) {
      navigator.share({
        title: news.title,
        text: news.content?.substring(0, 200) || news.title,
        url: window.location.href,
      }).catch(console.error);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar color="primary">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/class-controller/news" />
            </IonButtons>
            <IonTitle>News Detail</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center news-detail-loading">
          <IonSpinner name="crescent" color="primary" />
          <IonText color="medium">
            <p className="loading-text">Loading announcement...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  if (!news) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar color="primary">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/class-controller/news" />
            </IonButtons>
            <IonTitle>News Detail</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <div className="error-state">
            <div className="error-icon">📰</div>
            <IonText color="dark">
              <h3>Announcement Not Found</h3>
              <p>The requested news article might have been deleted or moved.</p>
            </IonText>
            <IonButton color="primary" fill="outline" onClick={() => history.goBack()}>
              Go Back
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/news" />
          </IonButtons>
          <IonTitle>News Detail</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleShare}>
              <IonIcon slot="icon-only" icon={shareSocialOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="news-detail-content" fullscreen>
        <div className="news-container">
          
          {/* Header Image / Banner - Clickable to view full image */}
          {news.imageUrl && (
            <div className="banner-wrapper" onClick={handleOpenImage} style={{ cursor: 'pointer' }}>
              <img 
                src={news.imageUrl.startsWith('http') ? news.imageUrl : `${API_BASE_URL.replace('/api', '')}${news.imageUrl}`} 
                alt={news.title} 
                className="news-banner"
                onError={(e) => {
                  console.error('Failed to load news image:', news.imageUrl);
                  e.target.style.display = 'none';
                }}
              />
              <div className="image-zoom-hint">Click to view full image</div>
            </div>
          )}

          <div className="news-body">
            {/* Category & Date Meta */}
            <div className="meta-header">
              {news.type && (
                <IonBadge color="primary" className="category-badge">
                  {news.type}
                </IonBadge>
              )}
              <div className="meta-item">
                <IonIcon icon={calendarOutline} />
                <span>{formatDate(news.createdAt)}</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="news-title">{news.title}</h1>

            {/* Author */}
            {news.postedByUser && (
              <div className="author-card">
                <div className="author-avatar">
                  <IonIcon icon={personOutline} />
                </div>
                <div className="author-info">
                  <span className="author-label">Posted by</span>
                  <span className="author-name">{news.postedByUser.name}</span>
                </div>
              </div>
            )}

            {/* Main Content */}
            <IonCard className="content-card">
              <IonCardContent>
                <div className="news-content-text">
                  {news.content?.split('\n').map((paragraph, index) => (
                    paragraph.trim() && <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </IonCardContent>
            </IonCard>

            {/* Attachments Section */}
            {(news.pdfUrl || news.imageUrl) && (
              <div className="attachment-section">
                <h3 className="section-title">Attachments</h3>
                {news.pdfUrl && (
                  <div className="attachment-card" onClick={handleOpenPdf}>
                    <div className="pdf-icon-wrapper">
                      <IonIcon icon={documentTextOutline} />
                    </div>
                    <div className="attachment-info">
                      <span className="attachment-name">{getFileName(news.pdfUrl)}</span>
                      <span className="attachment-subtext">Click to view or download</span>
                    </div>
                    <IonIcon icon={openOutline} className="open-icon" />
                  </div>
                )}
                {news.imageUrl && (
                  <div className="attachment-card" onClick={handleOpenImage}>
                    <div className="pdf-icon-wrapper">
                      <IonIcon icon={imageOutline} />
                    </div>
                    <div className="attachment-info">
                      <span className="attachment-name">{getFileName(news.imageUrl)}</span>
                      <span className="attachment-subtext">Click to view full image</span>
                    </div>
                    <IonIcon icon={openOutline} className="open-icon" />
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ClassNewsDetailScreen;