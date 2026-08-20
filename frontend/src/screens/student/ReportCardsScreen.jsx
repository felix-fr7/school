/**
 * Student Report Cards Screen (Ionic React Version)
 * Displays all report cards (images/PDFs) for the student
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
  IonList,
  IonItem,
  IonCard,
  IonCardContent,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
  IonBadge,
  IonButton,
  IonAlert,
} from '@ionic/react';
import { 
  refreshOutline, 
  documentOutline, 
  pdfOutline, 
  imageOutline,
  checkmarkCircleOutline,
  eyeOutline,
  closeCircleOutline
} from 'ionicons/icons';
import { reportCardsAPI, fetchFileAsBlobUrl, openFileInNewTab } from '../../services/api';
import './ReportCardsScreen.css';

const ReportCardsScreen = () => {
  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [showAcknowledgeAlert, setShowAcknowledgeAlert] = useState(false);
  const [acknowledgingCard, setAcknowledgingCard] = useState(null);
  const [parentSignature, setParentSignature] = useState('');

  // DEBUG: This will help us confirm the component is rendering
  useEffect(() => {
    console.log('*** REPORT CARDS SCREEN COMPONENT MOUNTED ***');
    console.log('*** If you see this, the component IS rendering ***');
    
    // Force loading to false after 2 seconds to test
    const timer = setTimeout(() => {
      console.log('*** Forcing loading state to false ***');
      setLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  const fetchReportCards = async () => {
    console.log('[ReportCardsScreen] fetchReportCards called');
    setLoading(true);
    setError('');
    try {
      console.log('[ReportCardsScreen] Calling reportCardsAPI.getMyReportCards()');
      const response = await reportCardsAPI.getMyReportCards();
      console.log('[ReportCardsScreen] API response:', response);
      if (response.success && response.data) {
        setReportCards(response.data);
        console.log('[ReportCardsScreen] Set reportCards:', response.data.length);
      } else {
        setError('Failed to load report cards. Please try again.');
        console.log('[ReportCardsScreen] No success or data in response');
      }
    } catch (err) {
      console.error('[ReportCardsScreen] Error fetching report cards:', err);
      const errorMessage = err?.response?.data?.error?.message || err?.message || 'Failed to load report cards';
      setError(errorMessage);
      console.log('[ReportCardsScreen] Error message:', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('[ReportCardsScreen] fetchReportCards completed, loading:', false);
    }
  };

  useEffect(() => {
    console.log('[ReportCardsScreen] fetchReportCards useEffect triggered');
    fetchReportCards();
  }, []);

  const onRefresh = async (event) => {
    setRefreshing(true);
    await fetchReportCards();
    event.detail.complete();
  };

  const handleViewReportCard = async (card) => {
    try {
      if (card.reportCardFileUrl) {
        await openFileInNewTab(card.reportCardFileUrl);
      } else if (card.pdfReportUrl) {
        await openFileInNewTab(card.pdfReportUrl);
      } else {
        setSelectedCard(card);
        setShowViewer(true);
      }
    } catch (error) {
      console.error('Error opening report card:', error);
    }
  };

  const handleAcknowledge = async () => {
    if (!acknowledgingCard) return;
    
    try {
      await reportCardsAPI.acknowledgeReportCard(acknowledgingCard._id, parentSignature);
      setReportCards(reportCards.map(card => 
        card._id === acknowledgingCard._id 
          ? { ...card, parentAcknowledgment: true, parentSignature }
          : card
      ));
      setShowAcknowledgeAlert(false);
      setParentSignature('');
      setAcknowledgingCard(null);
    } catch (error) {
      console.error('Error acknowledging report card:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getFileTypeIcon = (card) => {
    if (card.reportCardFileType === 'pdf') return pdfOutline;
    if (card.reportCardFileType === 'image') return imageOutline;
    return documentOutline;
  };

  const getGradeColor = (grade) => {
    if (!grade) return 'medium';
    const g = grade.toUpperCase();
    if (['A+', 'A', 'A-'].includes(g)) return 'success';
    if (['B+', 'B', 'B-'].includes(g)) return 'primary';
    if (['C+', 'C', 'C-'].includes(g)) return 'warning';
    if (['D', 'F'].includes(g)) return 'danger';
    return 'medium';
  };

  // Loading state
  if (loading) {
    console.log('[ReportCardsScreen] Rendering LOADING state');
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/student/dashboard" />
            </IonButtons>
            <IonTitle>Report Cards</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center" style={{ '--background': '#e0e7ff' }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '16px',
            minHeight: '200px',
            padding: '20px',
            backgroundColor: '#e0e7ff',
            borderRadius: '12px',
            margin: '20px'
          }}>
            <IonSpinner name="crescent" style={{ color: '#4F46E5' }} />
            <IonText style={{ color: '#4F46E5', fontWeight: 'bold', fontSize: '16px' }}>
              <p>Loading your report cards...</p>
            </IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Error state
  if (error) {
    console.log('[ReportCardsScreen] Rendering ERROR state:', error);
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/student/dashboard" />
            </IonButtons>
            <IonTitle>Report Cards</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding" style={{ '--background': '#fef2f2' }}>
          <div className="empty-container" style={{ backgroundColor: '#fef2f2', padding: '30px', borderRadius: '12px', margin: '20px' }}>
            <IonIcon icon={closeCircleOutline} size="large" style={{ color: '#DC2626' }} />
            <IonText style={{ color: '#DC2626' }}>
              <h3 style={{ marginTop: '16px' }}>Error Loading Report Cards</h3>
              <p>{error}</p>
            </IonText>
            <IonButton color="primary" onClick={fetchReportCards} style={{ marginTop: '20px' }}>
              <IonIcon icon={refreshOutline} slot="start" />
              Retry
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Main content
  console.log('[ReportCardsScreen] Rendering MAIN CONTENT, reportCards count:', reportCards.length);
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/student/dashboard" />
          </IonButtons>
          <IonTitle>Report Cards</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="report-cards-content" style={{ '--background': '#f0fdf4' }}>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {reportCards.length === 0 ? (
          <div className="empty-container" style={{ minHeight: '200px' }}>
            <IonIcon icon={documentOutline} className="empty-icon" />
            <IonText color="medium">
              <h3 style={{ marginTop: '16px' }}>No report cards available yet</h3>
              <p>Your report cards will appear here once published</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {reportCards.map((card) => (
              <IonItem key={card._id} className="report-card-item">
                <IonCard className="report-card-card">
                  <IonCardContent>
                    <div className="report-card-header">
                      <div className="report-card-title">
                        <IonIcon icon={getFileTypeIcon(card)} className="file-type-icon" />
                        <span className="term-badge">{card.term}</span>
                        <span className="year-badge">{card.academicYear}</span>
                      </div>
                      {card.overallGrade && (
                        <IonBadge color={getGradeColor(card.overallGrade)} className="grade-badge">
                          Grade: {card.overallGrade}
                        </IonBadge>
                      )}
                    </div>

                    {card.totalPercentage !== undefined && (
                      <div className="percentage-display">
                        <span className="percentage-value">{card.totalPercentage.toFixed(1)}%</span>
                        {card.rank && card.totalStudents && (
                          <span className="rank-info">Rank: {card.rank}/{card.totalStudents}</span>
                        )}
                      </div>
                    )}

                    {card.subjects && card.subjects.length > 0 && (
                      <div className="subjects-summary">
                        {card.subjects.slice(0, 3).map((subject, idx) => (
                          <div key={idx} className="subject-mini">
                            <span className="subject-name">{subject.subjectName}</span>
                            <span className="subject-grade">{subject.grade}</span>
                          </div>
                        ))}
                        {card.subjects.length > 3 && (
                          <span className="more-subjects">+{card.subjects.length - 3} more</span>
                        )}
                      </div>
                    )}

                    <div className="report-card-footer">
                      <span className="issued-date">
                        Issued: {formatDate(card.issuedDate || card.publishedAt)}
                      </span>
                      {card.parentAcknowledgment ? (
                        <IonBadge color="success" className="acknowledged-badge">
                          <IonIcon icon={checkmarkCircleOutline} /> Acknowledged
                        </IonBadge>
                      ) : (
                        <IonButton 
                          size="small" 
                          fill="outline"
                          onClick={() => {
                            setAcknowledgingCard(card);
                            setShowAcknowledgeAlert(true);
                          }}
                        >
                          Acknowledge
                        </IonButton>
                      )}
                    </div>

                    <IonButton 
                      expand="block" 
                      className="view-button"
                      onClick={() => handleViewReportCard(card)}
                    >
                      <IonIcon icon={eyeOutline} /> View Report Card
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              </IonItem>
            ))}
          </IonList>
        )}

        {/* Acknowledge Alert */}
        <IonAlert
          isOpen={showAcknowledgeAlert}
          onDidDismiss={() => {
            setShowAcknowledgeAlert(false);
            setParentSignature('');
            setAcknowledgingCard(null);
          }}
          header="Acknowledge Report Card"
          subHeader={`${acknowledgingCard?.term} ${acknowledgingCard?.academicYear}`}
          message="Please enter your name as parent/guardian signature to acknowledge this report card."
          inputs={[
            {
              name: 'signature',
              type: 'text',
              placeholder: 'Parent/Guardian Name',
              value: parentSignature,
              handler: (value) => setParentSignature(value)
            }
          ]}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel'
            },
            {
              text: 'Acknowledge',
              handler: handleAcknowledge
            }
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default ReportCardsScreen;