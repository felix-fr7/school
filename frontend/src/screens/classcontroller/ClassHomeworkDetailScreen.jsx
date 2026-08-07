/**
 * Class Homework Detail Screen
 * Shows homework details in read-only mode
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
  IonIcon,
  IonChip,
  IonBadge,
  IonButton,
  IonToast,
} from '@ionic/react';
import {
  calendarOutline,
  bookOutline,
  documentTextOutline,
  attachOutline,
  documentOutline,
  imageOutline,
  checkmarkCircleOutline,
  timeOutline,
  createOutline,
  arrowForwardOutline,
} from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { classControllerAPI } from '../../services/api';
import './ClassHomeworkDetailScreen.css';

// API Base URL for file links
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const ClassHomeworkDetailScreen = () => {
  const { id } = useParams();
  const history = useHistory();

  const [homework, setHomework] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchHomeworkDetail();
  }, [id]);

  const fetchHomeworkDetail = async () => {
    try {
      setLoading(true);
      // Fetch all homework and find the specific one
      // TODO: Create a getHomeworkById endpoint
      const response = await classControllerAPI.getHomework(1, 100);
      if (response.success && response.data) {
        const foundHomework = response.data.homework.find(h => h.id === id || h._id === id);
        if (foundHomework) {
          setHomework(foundHomework);
        } else {
          setToastMessage('Homework not found');
        }
      }
    } catch (error) {
      console.error('Error fetching homework:', error);
      setToastMessage('Failed to load homework');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getFileIcon = (url) => {
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return imageOutline;
    }
    return documentOutline;
  };

  const getFileName = (url) => {
    return url.substring(url.lastIndexOf('/') + 1);
  };

  const getFileUrl = (url) => {
    // If it's a relative path, prepend the API base URL
    if (url.startsWith('/')) {
      return `${API_BASE_URL}${url}`;
    }
    return url;
  };

  const handleOpenAttachment = async (url) => {
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
        <IonContent className="ion-padding ion-text-center">
          <IonSpinner name="crescent" color="primary" />
          <p style={{ marginTop: '20px' }}>Loading homework...</p>
        </IonContent>
      </IonPage>
    );
  }

  if (!homework) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/class-controller/homework" />
            </IonButtons>
            <IonTitle>Homework Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <IonText>
            <h2>Homework not found</h2>
            <p>The homework you're looking for doesn't exist or has been removed.</p>
          </IonText>
          <IonButton expand="block" onClick={() => history.push('/class-controller/homework')}>
            Back to Homework List
          </IonButton>
        </IonContent>
      </IonPage>
    );
  }

  const overdue = isOverdue(homework.dueDate);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/homework" />
          </IonButtons>
          <IonTitle>Homework Details</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push(`/class-controller/homework/edit/${homework.id}`)}>
              <IonIcon icon={createOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="homework-detail-content" fullscreen>
        <div className="detail-container">
          {/* Header Section */}
          <div className="header-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <IonChip style={{ backgroundColor: 'var(--ion-color-primary)', color: '#fff' }}>
                <IonIcon icon={bookOutline} />
                <ion-label>{homework.subject}</ion-label>
              </IonChip>
              {homework.isPublished ? (
                <IonBadge color="success" style={{ padding: '8px 12px' }}>
                  <IonIcon icon={checkmarkCircleOutline} /> Published
                </IonBadge>
              ) : (
                <IonBadge color="warning" style={{ padding: '8px 12px' }}>
                  <IonIcon icon={timeOutline} /> Draft
                </IonBadge>
              )}
            </div>
            <h1 className="title">{homework.title}</h1>
          </div>

          {/* Due Date Card */}
          <div className={`due-date-card ${overdue ? 'overdue' : ''}`}>
            <IonIcon icon={calendarOutline} className="date-icon" />
            <div className="date-info">
              <span className="date-label">Due Date</span>
              <span className="date-value">
                {formatDate(homework.dueDate)}
                {overdue && <span className="overdue-badge">Overdue</span>}
              </span>
            </div>
          </div>

          {/* Description Section */}
          <div className="section">
            <h3 className="section-title">
              <IonIcon icon={documentTextOutline} /> Instructions & Notes
            </h3>
            <div className="description">
              {homework.description || 'No instructions provided.'}
            </div>
          </div>

          {/* Attachments Section */}
          {homework.attachments && homework.attachments.length > 0 && (
            <div className="section">
              <h3 className="section-title">
                <IonIcon icon={attachOutline} /> Attachments ({homework.attachments.length})
              </h3>
              <div className="attachments-list">
                {homework.attachments.map((url, index) => (
                  <IonChip
                    key={index}
                    className="attachment-chip"
                    onClick={() => handleOpenAttachment(url)}
                    button
                  >
                    <IonIcon icon={getFileIcon(url)} />
                    <ion-label>{getFileName(url)}</ion-label>
                    <IonIcon icon={arrowForwardOutline} slot="end" />
                  </IonChip>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="section info-section">
            <div className="info-row">
              <span className="info-label">Class/Grade</span>
              <span className="info-value">{homework.classGrade}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Max Marks</span>
              <span className="info-value">{homework.maxMarks || 100}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Given Date</span>
              <span className="info-value">{formatDate(homework.givenDate)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <IonButton
              expand="block"
              color="primary"
              onClick={() => history.push(`/class-controller/homework/edit/${homework.id}`)}
              style={{ marginBottom: '10px' }}
            >
              <IonIcon icon={createOutline} slot="start" />
              Edit Homework
            </IonButton>
            <IonButton
              expand="block"
              fill="outline"
              color="medium"
              onClick={() => history.push('/class-controller/homework')}
            >
              Back to List
            </IonButton>
          </div>
        </div>
      </IonContent>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        position="bottom"
      />
    </IonPage>
  );
};

export default ClassHomeworkDetailScreen;