/**
 * Student Exam Detail Screen
 * Displays exam details with PDF/Image viewer and "View Document Fullscreen" button
 * Uses Capacitor Browser plugin for PDFs, and IonModal for full-screen image preview
 * 
 * Migrated from React Native to Ionic React
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
  IonModal,
  IonIcon as IonIconModal,
} from '@ionic/react';
import { useHistory, RouteComponentProps } from 'react-router-dom';
import { 
  documentOutline, 
  imageOutline, 
  calendarOutline, 
  schoolOutline, 
  globeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  arrowBackOutline,
  closeOutline,
  eyeOutline,
  expandOutline,
} from 'ionicons/icons';
import { studentAPI } from '../../services/api';

interface ExamDetail {
  id: string;
  title: string;
  examName: string;
  // camelCase properties
  fileUrl?: string;
  pdfUrl?: string;
  imageUrl?: string;
  dueDate?: string;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
  class?: {
    id: string;
    name: string;
    section: string;
  } | null;
  // snake_case properties (from backend)
  file_url?: string;
  pdf_url?: string;
  image_url?: string;
  due_date?: string;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
  class_id?: string;
  class_name?: string;
  class_section?: string;
}

interface RouteParams {
  examId: string;
}

const StudentExamDetailScreen: React.FC<RouteComponentProps<RouteParams>> = ({ match }) => {
  const history = useHistory();
  const { examId } = match.params;

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  useEffect(() => {
    fetchExamDetails();
  }, [examId]);

  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getExamScheduleById(examId);
      if (response.success && response.data) {
        // Transform snake_case to camelCase for consistency
        const data = response.data as any;
        setExam({
          id: data.id,
          title: data.title || data.examName || 'Exam',
          examName: data.examName || data.title || 'Exam',
          fileUrl: data.fileUrl || data.file_url,
          pdfUrl: data.pdfUrl || data.pdf_url,
          imageUrl: data.imageUrl || data.image_url,
          dueDate: data.dueDate || data.due_date,
          isPublished: data.isPublished ?? data.is_published ?? true,
          createdAt: data.createdAt || data.created_at,
          updatedAt: data.updatedAt || data.updated_at,
          class: data.class || null,
        } as ExamDetail);
      } else {
        setError('Failed to load exam details');
      }
    } catch (err: any) {
      console.error('Error fetching exam details:', err);
      setError(err.response?.data?.error?.message || 'Failed to load exam details');
    } finally {
      setLoading(false);
    }
  };

  // Safe-check incoming exam payload for file URL
  const getFileUrl = (): string | null => {
    if (!exam) return null;
    const url = exam.fileUrl || exam.file_url || exam.pdf_url || exam.pdfUrl || exam.image_url || exam.imageUrl;
    return url || null;
  };

  // Detect if file is PDF
  const isPDF = (url: string): boolean => {
    if (!url) return false;
    return url.toLowerCase().endsWith('.pdf');
  };

  // Detect if file is Image
  const isImage = (url: string): boolean => {
    if (!url) return false;
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
    return imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
  };

  const handleOpenDocument = async () => {
    const fileUrl = getFileUrl();
    if (!fileUrl) {
      alert('No Attachment', 'No PDF or image file is attached to this exam.');
      return;
    }

    if (isPDF(fileUrl)) {
      // Open PDF in new browser tab/window
      window.open(fileUrl, '_blank');
    } else if (isImage(fileUrl)) {
      // Open image in full-screen modal
      setImageModalVisible(true);
    } else {
      // Fallback: open in new browser tab/window
      window.open(fileUrl, '_blank');
    }
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return String(dateString);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/student-exams" />
            </IonButtons>
            <IonTitle>Exam Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%' 
          }}>
            <IonSpinner name="crescent" color="primary" />
            <IonText color="medium" className="ion-margin-top">
              <p>Loading exam details...</p>
            </IonText>
          </div>
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
              <IonBackButton defaultHref="/student-exams" />
            </IonButtons>
            <IonTitle>Exam Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            textAlign: 'center'
          }}>
            <IonIcon icon={alertCircleOutline} style={{ fontSize: '48px', color: '#EF4444', marginBottom: '16px' }} />
            <IonText color="danger">
              <h2 style={{ marginBottom: '20px' }}>{error || 'Exam not found'}</h2>
            </IonText>
            <IonButton onClick={fetchExamDetails} color="primary">
              Retry
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const fileUrl = getFileUrl();
  const hasAttachment = !!fileUrl;
  const fileType = hasAttachment ? (isPDF(fileUrl!) ? 'PDF' : isImage(fileUrl!) ? 'Image' : 'File') : null;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/student-exams" />
          </IonButtons>
          <IonTitle>📅 Exam Details</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#F8FAFC' }}>
        {/* Exam Info Card */}
        <IonCard style={{ 
          borderRadius: '16px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          marginTop: '16px'
        }}>
          <IonCardHeader>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start' 
            }}>
              <IonCardTitle style={{ 
                fontSize: '22px', 
                fontWeight: 'bold', 
                color: '#1E293B',
                marginRight: '12px'
              }}>
                {exam.title || exam.examName || 'Exam'}
              </IonCardTitle>
              {exam.isPublished && (
                <IonBadge color="success" style={{ 
                  borderRadius: '20px', 
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}>
                  <IonIcon icon={checkmarkCircleOutline} style={{ marginRight: '4px' }} />
                  Published
                </IonBadge>
              )}
            </div>
          </IonCardHeader>

          <IonCardContent>
            {/* Class Info */}
            {exam.class && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '12px' 
              }}>
                <IonIcon icon={schoolOutline} style={{ color: '#64748B', marginRight: '8px' }} />
                <IonText color="medium">
                  <span style={{ fontWeight: '500', marginRight: '4px' }}>Class:</span>
                  {exam.class.name}{exam.class.section ? ` - ${exam.class.section}` : ''}
                </IonText>
              </div>
            )}

            {!exam.class && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '12px' 
              }}>
                <IonIcon icon={globeOutline} style={{ color: '#64748B', marginRight: '8px' }} />
                <IonText color="medium">
                  <span style={{ fontWeight: '500', marginRight: '4px' }}>Scope:</span>
                  🏫 School-wide (All Classes)
                </IonText>
              </div>
            )}

            {/* Due Date */}
            {exam.dueDate && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '12px' 
              }}>
                <IonIcon icon={calendarOutline} style={{ color: '#64748B', marginRight: '8px' }} />
                <IonText color="medium">
                  <span style={{ fontWeight: '500', marginRight: '4px' }}>Date:</span>
                  {formatDate(exam.dueDate)}
                </IonText>
              </div>
            )}

            {/* Published Date */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '20px' 
            }}>
              <IonIcon icon={calendarOutline} style={{ color: '#64748B', marginRight: '8px' }} />
              <IonText color="medium">
                <span style={{ fontWeight: '500', marginRight: '4px' }}>Published:</span>
                {formatDate(exam.createdAt)}
              </IonText>
            </div>

            {/* Attachment Section */}
            {hasAttachment && (
              <div style={{ 
                marginTop: '20px', 
                paddingTop: '20px', 
                borderTop: '1px solid #E2E8F0' 
              }}>
                {/* Attachment Status */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  backgroundColor: '#F8FAFC', 
                  padding: '12px', 
                  borderRadius: '12px',
                  marginBottom: '16px'
                }}>
                  <IonIcon 
                    icon={isPDF(fileUrl!) ? documentOutline : imageOutline} 
                    style={{ fontSize: '20px', marginRight: '8px', color: '#475569' }} 
                  />
                  <IonText color="dark">
                    <span style={{ fontWeight: '500' }}>{fileType} attachment available</span>
                  </IonText>
                </div>

                {/* Image Preview (if image) */}
                {isImage(fileUrl!) && fileUrl && (
                  <div 
                    style={{ 
                      position: 'relative', 
                      marginBottom: '16px', 
                      borderRadius: '12px', 
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                    onClick={() => setImageModalVisible(true)}
                  >
                    <IonImg
                      src={fileUrl}
                      style={{ 
                        width: '100%', 
                        height: '200px',
                        objectFit: 'cover'
                      }}
                    />
                    <div style={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      left: 0, 
                      right: 0, 
                      backgroundColor: 'rgba(0,0,0,0.5)', 
                      padding: '8px', 
                      textAlign: 'center'
                    }}>
                      <IonText style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>
                        👆 Tap to view full screen
                      </IonText>
                    </div>
                  </div>
                )}

                {/* PDF Preview Badge */}
                {isPDF(fileUrl!) && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    backgroundColor: '#FEE2E2', 
                    padding: '12px', 
                    borderRadius: '12px',
                    marginBottom: '16px'
                  }}>
                    <IonIcon icon={documentOutline} style={{ fontSize: '20px', marginRight: '8px', color: '#DC2626' }} />
                    <IonText color="danger">
                      <span style={{ fontWeight: '500' }}>PDF Document</span>
                    </IonText>
                  </div>
                )}

                {/* View Document Fullscreen Button */}
                <IonButton
                  expand="block"
                  onClick={handleOpenDocument}
                  style={{ borderRadius: '12px' }}
                >
                  <IonIcon icon={expandOutline} style={{ marginRight: '8px' }} />
                  {isPDF(fileUrl!) 
                    ? 'View PDF Fullscreen' 
                    : isImage(fileUrl!) 
                    ? 'View Image Fullscreen' 
                    : 'View Document Fullscreen'}
                </IonButton>
              </div>
            )}

            {!hasAttachment && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                backgroundColor: '#FEF3C7', 
                padding: '12px', 
                borderRadius: '12px',
                marginTop: '20px'
              }}>
                <IonIcon icon={alertCircleOutline} style={{ fontSize: '20px', marginRight: '8px', color: '#92400E' }} />
                <IonText color="warning">
                  <span style={{ fontWeight: '500' }}>No attachment available for this exam</span>
                </IonText>
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Info Note */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          backgroundColor: '#F0F9FF', 
          padding: '12px', 
          borderRadius: '12px',
          marginTop: '16px'
        }}>
          <span style={{ fontSize: '16px', marginRight: '8px' }}>ℹ️</span>
          <IonText color="primary">
            <p style={{ 
              fontSize: '13px', 
              lineHeight: '18px',
              flex: 1 
            }}>
              {isPDF(fileUrl!) 
                ? 'Tap the button above to open the PDF in your device\'s PDF viewer. You can zoom, scroll, and download the exam schedule.'
                : isImage(fileUrl!)
                ? 'Tap the preview or button above to view the image in full screen. You can zoom and pan to see all details of the exam schedule.'
                : 'Tap the button above to view or download the exam schedule document.'
              }
            </p>
          </IonText>
        </div>

        {/* Back Button */}
        <div style={{ marginTop: '16px' }}>
          <IonButton 
            expand="block" 
            fill="outline" 
            onClick={() => history.goBack()}
            style={{ borderRadius: '12px' }}
          >
            <IonIcon icon={arrowBackOutline} style={{ marginRight: '8px' }} />
            Back to Exams
          </IonButton>
        </div>

        {/* Image Full Screen Modal */}
        <IonModal 
          isOpen={imageModalVisible} 
          onDidDismiss={() => setImageModalVisible(false)}
          className="fullscreen-image-modal"
        >
          <div style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#000000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setImageModalVisible(false)}
              style={{
                position: 'absolute',
                top: '50px',
                right: '20px',
                backgroundColor: 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '20px',
                padding: '10px 20px',
                fontSize: '15px',
                fontWeight: '600',
                color: '#1E293B',
                cursor: 'pointer',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <IonIcon icon={closeOutline} />
              Close
            </button>

            {/* Full Screen Image */}
            {fileUrl && (
              <img
                src={fileUrl}
                alt="Exam Schedule"
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  padding: '20px'
                }}
              />
            )}
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

// Simple alert helper (can be replaced with Ionic alert controller if needed)
const alert = (title: string, message: string) => {
  // Using native alert for simplicity, can be replaced with Ionic AlertController
  window.alert(`${title}\n\n${message}`);
};

export default StudentExamDetailScreen;