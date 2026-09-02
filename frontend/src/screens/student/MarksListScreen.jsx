/**
 * Student Marks List Screen (Ionic React Version)
 * Displays all marks/grades for the student
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
} from '@ionic/react';
import { refreshOutline, statsChartOutline } from 'ionicons/icons';
import { studentAPI } from '../../services/api';
import './MarksListScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const StudentMarksListScreen = () => {
  const [marks, setMarks] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMarks = async () => {
    try {
      const response = await studentAPI.getMarks(1, 20);
      if (response.success && response.data) {
        setMarks(response.data.marks);
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching marks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarks();
  }, []);

  const onRefresh = async (event) => {
    setRefreshing(true);
    await fetchMarks();
    event.detail.complete();
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
            <IonTitle>Marks</IonTitle>
          <HomeLogoutButtons />
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
          <IonTitle>Marks</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>
      <IonContent className="marks-list-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {/* Statistics Card */}
        {statistics && (
          <div className="stats-card">
            <IonIcon icon={statsChartOutline} className="stats-icon" />
            <h3>Overall Statistics</h3>
            <p className="stats-percentage">{statistics.overallPercentage?.toFixed(1)}%</p>
          </div>
        )}

        {marks.length === 0 ? (
          <div className="empty-container">
            <IonIcon icon={statsChartOutline} className="empty-icon" />
            <IonText color="medium">
              <h3>No marks available yet</h3>
            </IonText>
          </div>
        ) : (
          <IonList>
            {marks.map((item) => (
              <IonItem key={item.id} className="mark-item">
                <IonCard className="mark-card">
                  <IonCardContent>
                    <div className="mark-header">
                      <span className="subject">{item.subject}</span>
                      {item.grade && (
                        <IonBadge color={getGradeColor(item.grade)} className="grade-badge">
                          {item.grade}
                        </IonBadge>
                      )}
                    </div>
                    <p className="marks-obtained">
                      {item.marksObtained} / {item.totalMarks}
                    </p>
                    <p className="exam-type">{item.examType}</p>
                    {item.percentage && (
                      <p className="percentage">{item.percentage.toFixed(1)}%</p>
                    )}
                  </IonCardContent>
                </IonCard>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default StudentMarksListScreen;