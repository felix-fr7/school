/**
 * Student Homework Detail Screen (Ionic React Version)
 * Displays full homework details with sent date, due date, subject, and description
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
  IonBadge,
  IonText,
  IonSpinner,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { calendarOutline, personOutline, bookOutline, alertCircleOutline } from 'ionicons/icons';
import { studentAPI } from '../../src/services/api';
import './HomeworkDetailScreen.css';
import HomeLogoutButtons from '../../../frontend/src/components/HomeLogoutButtons';

const StudentHomeworkDetailScreen = () => {
  const { homeworkId } = useParams();
  const [homework, setHomework] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeworkDetail();
  }, [homeworkId]);

  const fetchHomeworkDetail = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getHomework(1, 20);
      if (response.success && response.data) {
        // Handle both array response and wrapped response
        const homeworkList = Array.isArray(response.data) 
          ? response.data 
          : (response.data.homeworks || []);
        // Find homework by _id or id
        const foundHomework = homeworkList.find((h) => 
          h._id === homeworkId || h.id === homeworkId
        );
        if (foundHomework) {
          setHomework(foundHomework);
        }
      }
    } catch (error) {
      console.error('Error fetching homework detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = () => {
    const dueDate = homework?.dueDate || homework?.due_date;
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/student/homework" />
            </IonButtons>
            <IonTitle>Homework Details</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
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
              <IonBackButton defaultHref="/student/homework" />
            </IonButtons>
            <IonTitle>Homework Details</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="homework-detail-content">
          <div className="error-container">
            <IonIcon icon={bookOutline} className="error-icon" />
            <IonText color="medium">
              <h3>Homework not found</h3>
            </IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/student/homework" />
          </IonButtons>
          <IonTitle>Homework Details</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>
      <IonContent className="homework-detail-content">
        {/* Subject Badge */}
        <div className="subject-badge">
          <IonBadge color="primary">{homework.subject}</IonBadge>
        </div>

        {/* Title */}
        <h1 className="homework-title">{homework.title}</h1>

        {/* Dates */}
        <div className="dates-row">
          <IonCard className="date-card">
            <IonCardContent>
              <IonText color="medium" className="date-label">
                <IonIcon icon={calendarOutline} /> Sent Date
              </IonText>
              <p className="date-value">
                {formatDate(homework.createdAt || homework.created_at || '')}
              </p>
            </IonCardContent>
          </IonCard>

          <IonCard className={`date-card ${isOverdue() ? 'overdue' : ''}`}>
            <IonCardContent>
              <IonText color={isOverdue() ? 'danger' : 'medium'} className="date-label">
                <IonIcon icon={calendarOutline} /> Due Date
              </IonText>
              <p className={`date-value ${isOverdue() ? 'overdue-text' : ''}`}>
                {(homework.dueDate || homework.due_date)
                  ? formatDate(homework.dueDate || homework.due_date || '')
                  : 'No due date'}
              </p>
            </IonCardContent>
          </IonCard>
        </div>

        {/* Class Info */}
        {homework.class && (
          <IonCard className="info-card">
            <IonCardContent>
              <IonText color="medium" className="info-label">Class</IonText>
              <p className="info-value">
                {homework.class.name}{homework.class.section ? ` - ${homework.class.section}` : ''}
              </p>
            </IonCardContent>
          </IonCard>
        )}

        {/* Description */}
        <div className="description-section">
          <h3 className="section-label">Description</h3>
          <IonCard className="description-card">
            <IonCardContent>
              <p className="description-text">{homework.description}</p>
            </IonCardContent>
          </IonCard>
        </div>

        {/* Assigned By */}
        {homework.assignedByUser && (
          <IonCard className="info-card">
            <IonCardContent>
              <IonText color="medium" className="info-label">
                <IonIcon icon={personOutline} /> Assigned by
              </IonText>
              <p className="info-value">{homework.assignedByUser.name}</p>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default StudentHomeworkDetailScreen;
