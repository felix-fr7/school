/**
 * Class Controller Homework Detail Screen (Ionic React Version)
 * Styled with Class Royal Blue Theme
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
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonBadge,
  IonAlert,
} from '@ionic/react';
import {
  calendarOutline,
  trashOutline,
  personOutline,
  bookOutline,
  alertCircleOutline,
  arrowBackOutline,
  checkmarkCircleOutline,
  timeOutline,
} from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { classControllerAPI } from '../../services/api';
import './ClassHomeworkDetailScreen.css';

interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate?: string;
  due_date?: string;
  createdAt?: string;
  created_at?: string;
  isPublished: boolean;
  class?: {
    id: string;
    name: string;
    section?: string;
  } | null;
  assignedByUser?: {
    id: string;
    name: string;
  } | null;
}

const ClassHomeworkDetailScreen: React.FC = () => {
  const { homeworkId } = useParams<{ homeworkId: string }>();
  const history = useHistory();
  
  const [homework, setHomework] = useState<HomeworkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  useEffect(() => {
    fetchHomeworkDetail();
  }, [homeworkId]);

  const fetchHomeworkDetail = async () => {
    try {
      setLoading(true);
      console.log('Fetching homework detail for:', homeworkId);
      
      // Simulated mock homework payload
      setHomework({
        id: homeworkId || 'hw-101',
        title: 'Chapter 4: Quadratic Equations Worksheet',
        description: 'Complete questions 1 to 15 from Exercise 4.2 in your homework notebook. Submit hard copies or scanned PDFs before the due date.',
        subject: 'Mathematics',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        isPublished: true,
        class: { id: '1', name: 'Class 10', section: 'A' },
        assignedByUser: { id: '1', name: 'Math Faculty' },
      });
    } catch (error) {
      console.error('Error fetching homework detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const isOverdue = () => {
    const dueDate = homework?.dueDate || homework?.due_date;
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const handleDelete = async () => {
    try {
      console.log('Deleting homework:', homeworkId);
      history.goBack();
    } catch (error) {
      console.error('Error deleting homework:', error);
    }
    setShowDeleteAlert(false);
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar color="primary" className="class-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/class-controller/homework" />
            </IonButtons>
            <IonTitle>Homework Detail</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center homework-detail-loading">
          <IonSpinner name="crescent" color="primary" />
          <IonText color="medium">
            <p className="loading-text">Loading Homework Details...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  if (!homework) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar color="primary" className="class-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/class-controller/homework" />
            </IonButtons>
            <IonTitle>Homework Detail</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="empty-state">
            <IonIcon icon={alertCircleOutline} className="empty-icon" />
            <IonText>
              <h3>Homework Record Not Found</h3>
            </IonText>
            <IonButton color="primary" className="retry-btn" onClick={() => history.goBack()}>
              Go Back to List
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const rawDueDate = homework.dueDate || homework.due_date;
  const rawCreatedAt = homework.createdAt || homework.created_at;

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar color="primary" className="class-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/homework" />
          </IonButtons>
          <IonTitle>Homework Detail</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="homework-detail-content" fullscreen>
        <div className="homework-detail-wrapper">
          
          {/* Main Info Card */}
          <IonCard className="homework-main-card">
            <IonCardContent>
              {/* Header Badges */}
              <div className="badge-header-row">
                <IonBadge className="subject-badge">
                  <IonIcon icon={bookOutline} />
                  {homework.subject}
                </IonBadge>
                {isOverdue() ? (
                  <IonBadge color="danger" className="status-badge overdue">
                    <IonIcon icon={timeOutline} />
                    Overdue
                  </IonBadge>
                ) : (
                  <IonBadge color="success" className="status-badge active">
                    <IonIcon icon={checkmarkCircleOutline} />
                    Active
                  </IonBadge>
                )}
              </div>

              {/* Homework Title */}
              <h1 className="homework-title">{homework.title}</h1>

              {/* Dates Row */}
              <div className="dates-grid">
                <div className="date-card">
                  <IonIcon icon={calendarOutline} className="date-icon" />
                  <div className="date-info">
                    <span className="date-label">Assigned Date</span>
                    <p className="date-value">{formatDate(rawCreatedAt || '')}</p>
                  </div>
                </div>

                <div className={`date-card ${isOverdue() ? 'overdue-card' : ''}`}>
                  <IonIcon icon={calendarOutline} className={`date-icon ${isOverdue() ? 'overdue-icon' : ''}`} />
                  <div className="date-info">
                    <span className="date-label">Due Date</span>
                    <p className={`date-value ${isOverdue() ? 'overdue-text' : 'highlight'}`}>
                      {rawDueDate ? formatDate(rawDueDate) : 'No due date'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Target Class Info */}
              {homework.class && (
                <div className="class-info-box">
                  <IonIcon icon={personOutline} className="class-info-icon" />
                  <div className="class-info-text">
                    <span className="class-info-label">Target Class</span>
                    <p className="class-info-val">
                      {homework.class.name}
                      {homework.class.section ? ` - ${homework.class.section}` : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Homework Description */}
              <div className="description-section">
                <h3 className="description-label">Homework Description</h3>
                <div className="description-box">
                  <p className="description-text">{homework.description}</p>
                </div>
              </div>

              {/* Actions Container */}
              <div className="actions-container">
                <IonButton
                  expand="block"
                  color="danger"
                  fill="outline"
                  className="delete-button"
                  onClick={() => setShowDeleteAlert(true)}
                >
                  <IonIcon icon={trashOutline} slot="start" />
                  Delete Homework
                </IonButton>

                <IonButton 
                  expand="block" 
                  fill="clear" 
                  onClick={() => history.goBack()}
                  className="back-button"
                >
                  <IonIcon icon={arrowBackOutline} slot="start" />
                  Back to Homework List
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>

        </div>

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Homework"
          message="Are you sure you want to delete this homework? This action cannot be undone."
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: handleDelete,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassHomeworkDetailScreen;