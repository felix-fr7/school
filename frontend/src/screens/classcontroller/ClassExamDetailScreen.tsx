/**
 * Class Controller Exam Detail Screen (Ionic React Version)
 * Displays exam details with PDF/Image viewer and "View Schedule / Open PDF" button
 * Uses Capacitor Browser plugin to open documents
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
} from 'ionicons/icons';
import { classControllerAPI } from '../../services/api';
import './ClassExamDetailScreen.css';

interface ExamDetail {
  id: string;
  title: string;
  examName: string;
  fileUrl: string;
  pdfUrl: string;
  imageUrl: string;
  dueDate: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  class: {
    id: string;
    name: string;
    section: string;
  } | null;
}

interface RouteParams {
  examId: string;
}

const ClassExamDetailScreen: React.FC = () => {
  const history = useHistory();
  const examId = (window.location.pathname.match(/exams\/([^/]+)$/) || [])[1];
  
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    fetchExamDetails();
  }, [examId]);

  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      // Note: getExamById API not available in classControllerAPI
      console.log('Fetching exam details for:', examId);
      
      // Simulate exam data for demo
      setExam({
        id: examId,
        title: 'Midterm Exam Schedule',
        examName: 'Midterm Exam',
        fileUrl: 'https://example.com/exam-schedule.pdf',
        pdfUrl: '',
        imageUrl: 'https://via.placeholder.com/400x200?text=Exam+Schedule',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isPublished: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        class: { id: '1', name: 'Class 10', section: 'A' },
      });
    } catch (err: any) {
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

    // Use Capacitor Browser if available, otherwise fallback to window.open
    const Browser = (window as any).Capacitor?.Plugins?.Browser;
    
    if (Browser) {
      try {
        await Browser.open({ 
          url: displayFileUrl, 
          toolbarColor: '#3880ff' 
        });
      } catch (err) {
        console.error('Error opening URL with Capacitor:', err);
        window.open(displayFileUrl, '_blank');
      }
    } else {
      // Fallback: open in new window/tab
      window.open(displayFileUrl, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/class-controller/exams" />
            </IonButtons>
            <IonTitle>Exam Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center exam-detail-loading">
          <IonSpinner name="crescent" color="primary" />
          <IonText color="medium">
            <p className="loading-text">Loading exam details...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  if (error || !exam) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
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
              <h2>{error || 'Exam not found'}</h2>
            </IonText>
            <IonButton onClick={fetchExamDetails} color="primary">
              Retry
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const displayTitle = exam.title || exam.examName || 'Exam';
  const displayFileUrl = exam.fileUrl || exam.pdfUrl || exam.imageUrl;
  const hasAttachment = !!displayFileUrl;
  const isPDF = displayFileUrl?.toLowerCase().endsWith('.pdf');
  const isImage = !isPDF && (displayFileUrl?.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/exams" />
          </IonButtons>
          <IonTitle>Exam Details</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="exam-detail-content">
        {/* Exam Info Card */}
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
            {/* Class Info */}
            {exam.class ? (
              <div className="info-row">
                <IonIcon icon={schoolOutline} className="info-icon" />
                <IonText color="medium">
                  <span className="info-label">Class:</span>
                  {exam.class.name}{exam.class.section ? ` - ${exam.class.section}` : ''}
                </IonText>
              </div>
            ) : (
              <div className="info-row">
                <IonIcon icon={globeOutline} className="info-icon" />
                <IonText color="medium">
                  <span className="info-label">Scope:</span>
                  School-wide (All Classes)
                </IonText>
              </div>
            )}

            {/* Due Date */}
            {exam.dueDate && (
              <div className="info-row">
                <IonIcon icon={calendarOutline} className="info-icon" />
                <IonText color="medium">
                  <span className="info-label">Due Date:</span>
                  {formatDate(exam.dueDate)}
                </IonText>
              </div>
            )}

            {/* Created Date */}
            <div className="info-row">
              <IonIcon icon={calendarOutline} className="info-icon" />
              <IonText color="medium">
                <span className="info-label">Published:</span>
                {formatDate(exam.createdAt)}
              </IonText>
            </div>

            {/* Attachment Status */}
            <div className="attachment-status">
              {hasAttachment ? (
                <>
                  <IonIcon 
                    icon={isPDF ? documentOutline : imageOutline} 
                    className="attachment-icon"
                  />
                  <IonText color="dark">
                    <span className="attachment-text">Attachment available</span>
                  </IonText>
                </>
              ) : (
                <>
                  <IonIcon 
                    icon={alertCircleOutline} 
                    className="attachment-icon warning"
                  />
                  <IonText color="warning">
                    <span className="attachment-text">No attachment available</span>
                  </IonText>
                </>
              )}
            </div>

            {/* View Schedule / Open PDF Button */}
            {hasAttachment && (
              <IonButton 
                expand="block" 
                onClick={handleOpenDocument}
                className="open-doc-button"
              >
                <IonIcon icon={documentOutline} />
                View Schedule / Open PDF
              </IonButton>
            )}

            {/* Preview Image */}
            {exam.imageUrl && (
              <div className="preview-section">
                <IonText color="medium">
                  <p className="preview-label">Preview:</p>
                </IonText>
                <IonImg
                  src={exam.imageUrl}
                  className="preview-image"
                />
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Info Note */}
        <div className="info-note">
          <span className="info-note-icon">ℹ️</span>
          <IonText color="primary">
            <p className="info-note-text">
              Tap the button above to view or download the exam schedule. The document will open in your device's default PDF viewer or image gallery.
            </p>
          </IonText>
        </div>

        {/* Back Button */}
        <div className="back-button-container">
          <IonButton 
            expand="block" 
            fill="outline" 
            onClick={() => history.goBack()}
            className="back-button"
          >
            <IonIcon icon={arrowBackOutline} />
            Back to Exams
          </IonButton>
        </div>

        {/* Alert */}
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