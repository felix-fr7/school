/**
 * Class Controller Exam Detail Screen (Ionic React Version)
 * Styled with Class Royal Blue Theme
 */

import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonText,
  IonSpinner,
  IonButtons,
  IonBackButton,
  IonImg,
  IonAlert,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { 
  documentOutline, 
  imageOutline, 
  calendarOutline, 
  schoolOutline, 
  globeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  arrowBackOutline,
  openOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { classControllerAPI } from '../../services/api';
import './ClassExamDetailScreen.css';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const BASE_URL = API_BASE_URL.replace('/api', '');

const ClassExamDetailScreen = () => {
  const history = useHistory();
  const examId = (window.location.pathname.match(/exams\/([^/]+)$/) || [])[1];
  
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    fetchExamDetails();
  }, [examId]);

  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching exam details for:', examId);
      
      // Use the exam schedule specific endpoint
      const response = await classControllerAPI.getExamScheduleById(examId);
      if (response && response.success && response.data) {
        setExam(response.data);
      } else {
        setError('Exam schedule not found');
      }
    } catch (err) {
      console.error('Error fetching exam details:', err);
      setError(err.response?.data?.error?.message || 'Failed to load exam details');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocument = async () => {
    if (!exam) return;

    const displayFileUrl = exam.fileUrl || exam.pdfUrl || exam.imageUrl;

    if (!displayFileUrl) {
      setAlertHeader('No Attachment');
      setAlertMessage('No PDF or image file is attached to this exam.');
      setShowAlert(true);
      return;
    }

    try {
      // Use the API service's file opening utility which handles authentication
      // and both relative paths and full URLs
      const { openFileInNewTab } = await import('../../services/api');
      await openFileInNewTab(displayFileUrl);
    } catch (error) {
      console.error('Error opening attachment:', error);
      // Fallback: try direct window.open
      try {
        window.open(displayFileUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.error('Fallback open failed:', e);
        setAlertHeader('Error');
        setAlertMessage('Unable to open the document. Please try again.');
        setShowAlert(true);
      }
    }
  };

  // Normalize date field (exam schedules use 'date', exams use 'dueDate')
  const getExamDate = () => {
    return exam.dueDate || exam.date || exam.createdAt;
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar color="primary" className="class-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/class-controller/exams" />
            </IonButtons>
            <IonTitle>Exam Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center exam-detail-loading">
          <IonSpinner name="crescent" color="primary" />
          <IonText color="medium">
            <p className="loading-text">Loading Class Exam Details...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  if (error || !exam) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar color="primary" className="class-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/class-controller/exams" />
            </IonButtons>
            <IonTitle>Exam Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="error-state">
            <IonIcon icon={alertCircleOutline} className="error-icon" />
            <IonText color="danger">
              <h2>{error || 'Exam record not found'}</h2>
            </IonText>
            <IonButton onClick={fetchExamDetails} color="primary" className="retry-btn">
              Try Again
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const displayTitle = exam.title || exam.examName || 'Exam Schedule';
  const displayFileUrl = exam.fileUrl || exam.pdfUrl || exam.imageUrl;
  const hasAttachment = !!displayFileUrl;
  const isPDF = displayFileUrl?.toLowerCase().endsWith('.pdf');

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar color="primary" className="class-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/exams" />
          </IonButtons>
          <IonTitle>Exam Details</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="exam-detail-content" fullscreen>
        <div className="exam-detail-wrapper">
          {/* Main Info Card */}
          <IonCard className="exam-info-card">
            <IonCardHeader>
              <div className="title-row">
                <IonCardTitle className="exam-title">
                  {displayTitle}
                </IonCardTitle>
                {exam.isPublished && (
                  <IonBadge color="success" className="published-badge">
                    <IonIcon icon={checkmarkCircleOutline} />
                    Published
                  </IonBadge>
                )}
              </div>
            </IonCardHeader>

            <IonCardContent>
              {/* Metadata Details Grid */}
              <div className="metadata-grid">
                <div className="info-row">
                  <IonIcon icon={schoolOutline} className="info-icon" />
                  <div className="info-text">
                    <span className="info-label">Assigned Target</span>
                    <p className="info-val">
                      {exam.class ? `${exam.class.name} - ${exam.class.section}` : 'School-wide (All Classes)'}
                    </p>
                  </div>
                </div>

                {getExamDate() && (
                  <div className="info-row">
                    <IonIcon icon={calendarOutline} className="info-icon" />
                    <div className="info-text">
                      <span className="info-label">Exam Date / Deadline</span>
                      <p className="info-val highlight">{formatDate(getExamDate())}</p>
                    </div>
                  </div>
                )}

                <div className="info-row">
                  <IonIcon icon={globeOutline} className="info-icon" />
                  <div className="info-text">
                    <span className="info-label">Created Date</span>
                    <p className="info-val">{formatDate(exam.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Attachment Section */}
              <div className="attachment-status-card">
                {hasAttachment ? (
                  <div className="attachment-header">
                    <IonIcon 
                      icon={isPDF ? documentOutline : imageOutline} 
                      className="attachment-icon"
                    />
                    <div>
                      <h4 className="attachment-title">{isPDF ? 'PDF Time Table Attached' : 'Schedule Image Attached'}</h4>
                      <p className="attachment-sub">Ready for view or download</p>
                    </div>
                  </div>
                ) : (
                  <div className="attachment-header empty">
                    <IonIcon icon={alertCircleOutline} className="attachment-icon warning" />
                    <div>
                      <h4 className="attachment-title">No Document Attached</h4>
                      <p className="attachment-sub">No timetable PDF or image uploaded</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {hasAttachment && (
                <IonButton 
                  expand="block" 
                  onClick={handleOpenDocument}
                  className="open-doc-button"
                >
                  <IonIcon icon={openOutline} slot="start" />
                  View Schedule / Open Document
                </IonButton>
              )}

              {/* Preview Image */}
              {exam.imageUrl && (
                <div className="preview-section">
                  <p className="preview-label">Document Preview:</p>
                  <IonImg 
                    src={exam.imageUrl.startsWith('http') ? exam.imageUrl : `${BASE_URL}${exam.imageUrl}`} 
                    className="preview-image" 
                    alt="Exam preview"
                    onError={(e) => {
                      console.error('Failed to load exam image:', exam.imageUrl);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </IonCardContent>
          </IonCard>

          {/* Info Banner */}
          <div className="info-note">
            <IonIcon icon={informationCircleOutline} className="info-note-icon" />
            <p className="info-note-text">
              Tapping <strong>"View Schedule"</strong> opens the official PDF/Image in full screen. You can save or print directly from your browser.
            </p>
          </div>

          {/* Go Back */}
          <div className="back-button-container">
            <IonButton 
              expand="block" 
              fill="outline" 
              onClick={() => history.goBack()}
              className="back-button"
            >
              <IonIcon icon={arrowBackOutline} slot="start" />
              Back to Exams List
            </IonButton>
          </div>
        </div>

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={alertHeader}
          message={alertMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassExamDetailScreen;