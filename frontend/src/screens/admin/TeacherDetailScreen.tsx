/**
 * Teacher Detail Screen (Ionic React Version)
 * Displays detailed information about a specific teacher
 */

import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonAvatar,
  IonText,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonAlert,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { personOutline, mailOutline, callOutline, bookOutline, trashOutline, createOutline, refreshOutline } from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import { User } from '../../types';
import './TeacherDetailScreen.css';

interface TeacherDetailParams {
  teacherId: string;
}

const TeacherDetailScreen: React.FC = () => {
  const { teacherId } = useParams<TeacherDetailParams>();
  const history = useHistory();

  const [teacher, setTeacher] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  useEffect(() => {
    fetchTeacher();
  }, [teacherId]);

  const fetchTeacher = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getTeacher(teacherId);
      if (response.success && response.data) {
        setTeacher(response.data);
      }
    } catch (error) {
      console.error('Error fetching teacher:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteAlert(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await adminAPI.deleteTeacher(teacherId);
      if (response.success) {
        history.push('/admin/teachers');
      } else {
        console.error(response.error?.message || 'Failed to delete teacher');
      }
    } catch (error) {
      console.error('Error deleting teacher:', error);
    }
    setShowDeleteAlert(false);
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/teachers" />
            </IonButtons>
            <IonTitle>Teacher Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Loading teacher details...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  if (!teacher) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/teachers" />
            </IonButtons>
            <IonTitle>Teacher Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="teacher-detail-content">
          <div className="error-container">
            <IonText color="danger">
              <h3>Teacher not found</h3>
            </IonText>
            <IonButton onClick={() => history.push('/admin/teachers')}>Back to Teachers</IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const classFullName = teacher.class?.section
    ? `${teacher.class.name} - ${teacher.class.section}`
    : teacher.class?.name || null;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/teachers" />
          </IonButtons>
          <IonTitle>Teacher Details</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="teacher-detail-content">
        {/* Header Card */}
        <div className="header-card">
          <IonAvatar className="avatar">
            <span>{teacher.name.charAt(0).toUpperCase()}</span>
          </IonAvatar>
          <div className="header-info">
            <h2 className="teacher-name">{teacher.name}</h2>
            <p className="teacher-role">{teacher.role}</p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="section">
          <h3 className="section-title">Contact Information</h3>
          <IonCard className="info-card">
            <IonCardContent>
              <div className="info-row">
                <div className="info-label">
                  <IonIcon icon={mailOutline} /> Email
                </div>
                <div className="info-value">{teacher.email}</div>
              </div>
              {teacher.phone && (
                <div className="info-row">
                  <div className="info-label">
                    <IonIcon icon={callOutline} /> Phone
                  </div>
                  <div className="info-value">{teacher.phone}</div>
                </div>
              )}
            </IonCardContent>
          </IonCard>
        </div>

        {/* Class Assignment */}
        {classFullName && (
          <div className="section">
            <h3 className="section-title">Class Assignment</h3>
            <IonCard className="info-card">
              <IonCardContent>
                <div className="info-row">
                  <div className="info-label">
                    <IonIcon icon={bookOutline} /> Assigned Class
                  </div>
                  <div className="info-value">{classFullName}</div>
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        )}

        {/* Metrics */}
        <div className="section">
          <h3 className="section-title">Activity</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-value">--</span>
              <span className="metric-label">Homework</span>
            </div>
            <div className="metric-card">
              <span className="metric-value">--</span>
              <span className="metric-label">Marks</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="actions-section">
          <IonButton
            expand="block"
            color="primary"
            onClick={() => history.push(`/admin/teachers/${teacherId}`)}
          >
            <IonIcon icon={createOutline} slot="start" /> Edit Teacher
          </IonButton>
          <IonButton
            expand="block"
            color="danger"
            onClick={handleDeleteClick}
          >
            <IonIcon icon={trashOutline} slot="start" /> Delete Teacher
          </IonButton>
        </div>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Teacher"
          message={`Are you sure you want to delete "${teacher.name}"? This action cannot be undone.`}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: handleDeleteConfirm,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default TeacherDetailScreen;