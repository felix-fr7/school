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
  IonInput,
} from '@ionic/react';
import { 
  refreshOutline, 
  documentOutline, 
  pdfOutline, 
  imageOutline,
  checkmarkCircleOutline,
  eyeOutline 
} from 'ionicons/icons';
import { reportCardsAPI, fetchFileAsBlobUrl, openFileInNewTab } from '../../services/api';
import './ReportCardsScreen.css';

const ReportCardsScreen = () => {
  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [showAcknowledgeAlert, setShowAcknowledgeAlert] = useState(false);
  const [acknowledgingCard, setAcknowledgingCard] = useState(null);
  const [parentSignature, setParentSignature] = useState('');

  const fetchReportCards = async () => {
    try {
      const response = await reportCardsAPI.getMyReportCards();
      if (response.success && response.data) {
        setReportCards(response.data);
      }
    } catch (error) {
      console.error('Error fetching report cards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
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
        // Open the file URL directly
        await openFileInNewTab(card.reportCardFileUrl);
      } else if (card.pdfReportUrl) {
        await openFileInNewTab(card.pdfReportUrl);
      } else {
        // If no file, show digital report card details
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
      // Update local state
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

  if (loading) {
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
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
        </IonContent>
      </IonPage>
    );
  }

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
      <IonContent className="report-cards-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {reportCards.length === 0 ? (
          <div className="empty-container">
            <IonIcon icon={documentOutline} className="empty-icon" />
            <IonText color="medium">
              <h3>No report cards available yet</h3>
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