/**
 * Student Circular Detail Screen
 * Displays a single circular with full content for students
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
} from '@ionic/react';
import { useHistory, useParams } from 'react-router-dom';
import { 
  calendarOutline, 
  documentOutline,
  informationCircleOutline,
  globeOutline,
  listOutline,
} from 'ionicons/icons';
import { studentAPI } from '../../services/api';
import './CircularDetailScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

// Get API base URL for constructing attachment URLs
const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.EXPO_PUBLIC_API_URL || 
  'http://localhost:3000/api';

const StudentCircularDetailScreen = () => {
  const history = useHistory();
  const { id: circularId } = useParams();
  
  const [circular, setCircular] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (circularId) {
      fetchCircularDetail();
    }
  }, [circularId]);

  const fetchCircularDetail = async () => {
    try {
      setLoading(true);
      console.log('Fetching circular detail for ID:', circularId);
      
      const response = await studentAPI.getCircularById(circularId);
      if (response && response.success && response.data) {
        const c = response.data;
        setCircular({
          id: c._id || c.id,
          title: c.title,
          content: c.content,
          visibility: c.visibility || 'ALL',
          className: c.classId?.name || null,
          issueDate: c.createdAt || c.publishedAt,
          imageUrl: c.imageUrl,
          attachmentUrl: c.attachmentUrl,
          author: c.issuedByUser?.name || 'Admin',
        });
      } else {
        throw new Error('Circular not found');
      }
    } catch (error) {
      console.error('Error fetching circular detail:', error);
      setCircular(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleOpenAttachment = async () => {
    if (!circular?.imageUrl && !circular?.attachmentUrl) return;
    
    const url = circular.imageUrl || circular.attachmentUrl;
    try {
      const { fetchFileAsBlobUrl } = await import('../../services/api');
      const blobUrl = await fetchFileAsBlobUrl(url);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening attachment:', error);
      // Fallback: try direct URL
      const fullUrl = url.startsWith('http') 
        ? url 
        : `${API_BASE_URL.replace('/api', '')}${url}`;
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar color="primary">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/student/circulars" />
            </IonButtons>
            <IonTitle>Circular Detail</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center circular-detail-loading">
          <IonSpinner name="crescent" color="primary" />
          <IonText color="medium">
            <p className="loading-text">Loading circular...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  if (!circular) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar color="primary">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/student/circulars" />
            </IonButtons>
            <IonTitle>Circular Detail</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <div className="error-state">
            <div className="error-icon">📋</div>
            <IonText color="dark">
              <h3>Circular Not Found</h3>
              <p>The requested circular might have been deleted or moved.</p>
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
            <IonBackButton defaultHref="/student/circulars" />
          </IonButtons>
          <IonTitle>Circular Detail</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="circular-detail-content" fullscreen>
        <div className="circular-container">
          
          {/* Header Image / Banner - Only show if image exists */}
          {circular.imageUrl && (
            <div className="banner-wrapper">
              <img 
                src={circular.imageUrl.startsWith('http') ? circular.imageUrl : `${API_BASE_URL.replace('/api', '')}${circular.imageUrl}`} 
                alt={circular.title} 
                className="circular-banner" 
                onError={(e) => {
                  console.error('Failed to load circular image:', circular.imageUrl);
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="circular-body">
            {/* Visibility Badge & Date Meta */}
            <div className="meta-header">
              <IonBadge 
                className={`visibility-badge ${circular.visibility === 'ALL' ? 'visibility-all' : 'visibility-specific'}`}
              >
                <IonIcon icon={circular.visibility === 'ALL' ? globeOutline : listOutline} slot="start" />
                {circular.visibility === 'ALL' ? 'All Classes' : `Class: ${circular.className || 'Specific'}`}
              </IonBadge>
              <div className="meta-item">
                <IonIcon icon={calendarOutline} />
                <span>{formatDate(circular.issueDate)}</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="circular-title">{circular.title}</h1>

            {/* Author Info */}
            {circular.author && (
              <div className="author-info">
                <span className="author-label">Issued by</span>
                <span className="author-name">{circular.author}</span>
              </div>
            )}

            {/* Main Content */}
            <IonCard className="content-card">
              <IonCardContent>
                <div className="circular-content-text">
                  {circular.content && circular.content.split('\n').map((paragraph, index) => (
                    paragraph.trim() && <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </IonCardContent>
            </IonCard>

            {/* Attachment Section - Only show if there's an attachment */}
            {(circular.imageUrl || circular.attachmentUrl) && (
              <div className="attachment-section">
                <h3 className="section-title">
                  <IonIcon icon={documentOutline} className="section-icon" />
                  Attachments
                </h3>
                {circular.imageUrl && (
                  <div className="attachment-card" onClick={handleOpenAttachment}>
                    <div className="attachment-icon-wrapper">
                      <IonIcon icon={informationCircleOutline} />
                    </div>
                    <div className="attachment-info">
                      <span className="attachment-name">Image Attachment</span>
                      <span className="attachment-subtext">Click to view image</span>
                    </div>
                  </div>
                )}
                {circular.attachmentUrl && (
                  <div className="attachment-card" onClick={handleOpenAttachment}>
                    <div className="attachment-icon-wrapper pdf">
                      <IonIcon icon={documentOutline} />
                    </div>
                    <div className="attachment-info">
                      <span className="attachment-name">PDF Document</span>
                      <span className="attachment-subtext">Click to view or download PDF</span>
                    </div>
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

export default StudentCircularDetailScreen;