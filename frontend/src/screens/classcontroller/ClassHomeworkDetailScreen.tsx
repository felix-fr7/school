/**
 * Class Controller Homework Detail Screen (Ionic React Version)
 * Displays full homework details with sent date, due date, subject, and description
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
      // Note: getHomework API not available in classControllerAPI
      // Simulating with a placeholder - in production this would fetch the actual homework
      console.log('Fetching homework detail for:', homeworkId);
      
      // For demo purposes, create a mock homework
      setHomework({
        id: homeworkId,
        title: 'Sample Homework',
        description: 'This is a sample homework description. In production, this would be fetched from the API.',
        subject: 'Mathematics',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        isPublished: true,
        class: { id: '1', name: 'Class 10', section: 'A' },
        assignedByUser: { id: '1', name: 'Teacher' },
      });
    } catch (error) {
      console.error('Error fetching homework detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
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

  const handleDelete = async () => {
    try {
      // Note: deleteHomework API not available in classControllerAPI
      console.log('Deleting homework:', homeworkId);
      // Simulate success
      history.goBack();
    } catch (error) {
      console.error('Error deleting homework:', error);
    }
    setShowDeleteAlert(false);
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center homework-detail-loading">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p className="loading-text">Loading homework details...</p>
          </IonText>
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
            <IonTitle>Homework Detail</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <IonText>
              <h3>Homework not found</h3>
            </IonText>
            <IonButton color="secondary" onClick={() => history.goBack()}>
              Go Back
            </IonButton>
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
            <IonBackButton defaultHref="/class-controller/homework" />
          </IonButtons>
          <IonTitle>Homework Detail</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="homework-detail-content">
        {/* Subject Badge */}
        <div className="subject-badge-container">
          <IonBadge color="secondary" className="subject-badge">
            {homework.subject}
          </IonBadge>
        </div>

        {/* Title */}
        <h1 className="homework-title">{homework.title}</h1>

        {/* Dates Row */}
        <div className="dates-row">
          <IonCard className="date-card">
            <IonCardContent>
              <IonText color="medium">
                <small className="date-label">Sent Date</small>
              </IonText>
              <p className="date-value">
                {formatDate(homework.createdAt || homework.created_at || '')}
              </p>
            </IonCardContent>
          </IonCard>

          <IonCard className={`date-card ${isOverdue() ? 'date-card-overdue' : ''}`}>
            <IonCardContent>
              <IonText color="medium">
                <small className="date-label">Due Date</small>
              </IonText>
              <p className={`date-value ${isOverdue() ? 'date-value-overdue' : ''}`}>
                {(homework.dueDate || homework.due_date)
                  ? formatDate(homework.dueDate || homework.due_date || '')
                  : 'No due date'}
              </p>
            </IonCardContent>
          </IonCard>
        </div>

        {/* Class Info */}
        {homework.class && (
          <IonCard className="class-info-card">
            <IonCardContent>
              <IonText color="medium">
                <small className="class-label">Class</small>
              </IonText>
              <div className="class-value">
                <IonIcon icon={personOutline} className="class-icon" />
                <span>{homework.class.name}{homework.class.section ? ` - ${homework.class.section}` : ''}</span>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {/* Description */}
        <IonCard className="description-card">
          <IonCardContent>
            <IonText color="dark">
              <h3 className="description-label">Description</h3>
            </IonText>
            <div className="description-box">
              <p className="description-text">{homework.description}</p>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Actions */}
        <div className="actions-container">
          <IonButton
            expand="block"
            color="danger"
            fill="outline"
            onClick={() => setShowDeleteAlert(true)}
          >
            <IonIcon icon={trashOutline} slot="start" />
            Delete Homework
          </IonButton>
        </div>

        {/* Delete Alert */}
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