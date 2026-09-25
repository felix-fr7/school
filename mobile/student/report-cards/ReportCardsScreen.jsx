/**
 * Student Report Cards Screen (Simplified Table View)
 * Displays all published report cards for the student in a clean table format
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
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
  IonBadge,
} from '@ionic/react';
import { 
  refreshOutline, 
  documentOutline, 
  closeCircleOutline,
} from 'ionicons/icons';
import { studentAPI } from '../../src/services/api';
import './ReportCardsScreen.css';
import HomeLogoutButtons from '../../../frontend/src/components/HomeLogoutButtons';

const ReportCardsScreen = () => {
  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchReportCards = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    
    try {
      const response = await studentAPI.getReportCards();
      
      if (response.success && response.data) {
        const cards = Array.isArray(response.data) ? response.data : [];
        setReportCards(cards);
      } else {
        setError('Failed to load report cards. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching report cards:', err);
      setError('Failed to load report cards. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReportCards();
  }, []);

  const onRefresh = async (event) => {
    await fetchReportCards(true);
    event.detail.complete();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const getGradeColor = (grade) => {
    if (!grade) return 'medium';
    const g = grade.toUpperCase();
    if (['A1', 'A2'].includes(g)) return 'success';
    if (['B1', 'B2'].includes(g)) return 'primary';
    if (['C1', 'C2'].includes(g)) return 'warning';
    if (['D', 'E', 'F'].includes(g)) return 'danger';
    return 'medium';
  };

  // Loading state
  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/student/dashboard" />
            </IonButtons>
            <IonTitle>Report Cards</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
          <IonText color="primary">
            <p>Loading...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  // Error state
  if (error && reportCards.length === 0) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/student/dashboard" />
            </IonButtons>
            <IonTitle>Report Cards</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <IonIcon icon={closeCircleOutline} size="large" color="danger" />
            <IonText color="danger">
              <h3>Error Loading Report Cards</h3>
              <p>{error}</p>
            </IonText>
            <IonBadge color="primary" onClick={() => fetchReportCards()} style={{ marginTop: '20px', cursor: 'pointer' }}>
              <IonIcon icon={refreshOutline} /> Retry
            </IonBadge>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // Main content
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/student/dashboard" />
          </IonButtons>
          <IonTitle>Report Cards</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>
      <IonContent className="report-cards-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {reportCards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <IonIcon icon={documentOutline} style={{ fontSize: '64px', color: '#999', marginBottom: '16px' }} />
            <IonText color="medium">
              <h3>No report cards available</h3>
              <p>Your report cards will appear here once published.</p>
            </IonText>
          </div>
        ) : (
          <div style={{ padding: '16px' }}>
            {reportCards.map((card, index) => (
              <div key={card._id || card.id || index} style={{ marginBottom: '32px' }}>
                {/* Report Card Header */}
                <div style={{ 
                  backgroundColor: '#4F46E5', 
                  color: 'white', 
                  padding: '16px', 
                  borderRadius: '8px 8px 0 0',
                  textAlign: 'center'
                }}>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>{card.term} - {card.academicYear}</h2>
                  {card.overallGrade && (
                    <IonBadge color="light" style={{ fontSize: '16px', padding: '8px 16px' }}>
                      Overall Grade: {card.overallGrade}
                    </IonBadge>
                  )}
                  {card.totalPercentage !== undefined && (
                    <div style={{ marginTop: '8px', fontSize: '18px', fontWeight: 'bold' }}>
                      {card.totalPercentage.toFixed(1)}%
                    </div>
                  )}
                </div>

                {/* Subjects Table */}
                {card.subjects && card.subjects.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'left' }}>Subject</th>
                          <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>Marks Obtained</th>
                          <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>Total Marks</th>
                          <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {card.subjects.map((subject, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb' }}>{subject.subjectName}</td>
                            <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{subject.marksObtained}</td>
                            <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{subject.totalMarks}</td>
                            <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                              <IonBadge color={getGradeColor(subject.grade)} style={{ minWidth: '40px' }}>
                                {subject.grade}
                              </IonBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Remarks */}
                {(card.teacherRemarks || card.principalRemarks) && (
                  <div style={{ 
                    backgroundColor: '#f9fafb', 
                    padding: '12px', 
                    border: '1px solid #e5e7eb',
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px'
                  }}>
                    {card.teacherRemarks && (
                      <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                        <strong>Teacher's Remarks:</strong> {card.teacherRemarks}
                      </p>
                    )}
                    {card.principalRemarks && (
                      <p style={{ margin: 0, fontSize: '14px' }}>
                        <strong>Principal's Remarks:</strong> {card.principalRemarks}
                      </p>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div style={{ 
                  backgroundColor: '#f3f4f6', 
                  padding: '8px 12px', 
                  fontSize: '12px', 
                  color: '#6b7280',
                  textAlign: 'right',
                  borderRadius: '0 0 8px 8px'
                }}>
                  Issued: {formatDate(card.issuedDate || card.publishedAt || card.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ReportCardsScreen;
