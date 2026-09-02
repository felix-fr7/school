/**
 * Teacher Detail Screen (Ionic React Version)
 * Displays detailed information about a specific teacher with Admin Dashboard styling
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { mailOutline, callOutline, bookOutline, trashOutline, createOutline } from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import './AdminTheme.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const TeacherDetailScreen = () => {
  const { teacherId } = useParams();
  const history = useHistory();
  const redirectAttemptedRef = useRef(false);

  // ✅ Hooks state declarations
  /** @type {[import('../../types').User | null, React.Dispatch<React.SetStateAction<import('../../types').User | null>>]} */
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  // ✅ Guard & redirect for 'create' or 'add' keywords
  useEffect(() => {
    if ((teacherId === 'create' || teacherId === 'add') && !redirectAttemptedRef.current) {
      redirectAttemptedRef.current = true;
      history.replace('/admin/teachers/create');
    }
  }, [teacherId, history]);

  // ✅ Fetch Teacher Details
  useEffect(() => {
    if (teacherId === 'create' || teacherId === 'add') {
      return;
    }
    fetchTeacher();
  }, [teacherId]);

  // Guard return before render
  if (teacherId === 'create' || teacherId === 'add') {
    return null;
  }

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
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" color="primary" />
          <IonText color="medium">
            <p style={{ marginTop: '12px', fontWeight: 500 }}>Loading teacher details...</p>
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
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent style={{ '--background': '#f8fafc' }}>
          <div style={styles.errorContainer}>
            <IonText color="danger">
              <h3 style={{ fontWeight: 700, margin: 0 }}>Teacher not found</h3>
            </IonText>
            <IonButton fill="solid" color="primary" onClick={() => history.push('/admin/teachers')}>
              Back to Teachers
            </IonButton>
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
      {/* Dynamic CSS Stylesheet inside component to override Ionic Shadow DOM */}
      <style>{adminCss}</style>

      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/teachers" />
          </IonButtons>
          <IonTitle>Teacher Details</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="teacher-detail-content">
        {/* Header Profile Section */}
        <div style={styles.headerCard}>
          <div style={styles.avatar}>
            {teacher.name.charAt(0).toUpperCase()}
          </div>
          <div style={styles.headerInfo}>
            <h2 style={styles.teacherName}>{teacher.name}</h2>
            <p style={styles.teacherRole}>{teacher.role || 'Teacher'}</p>
          </div>
        </div>

        {/* Contact Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Contact Information</h3>
          <IonCard className="admin-info-card">
            <IonCardContent>
              <div style={styles.infoRow}>
                <div style={styles.infoLabel}>
                  <IonIcon icon={mailOutline} style={styles.icon} /> Email
                </div>
                <div style={styles.infoValue}>{teacher.email}</div>
              </div>
              {teacher.phone && (
                <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
                  <div style={styles.infoLabel}>
                    <IonIcon icon={callOutline} style={styles.icon} /> Phone
                  </div>
                  <div style={styles.infoValue}>{teacher.phone}</div>
                </div>
              )}
            </IonCardContent>
          </IonCard>
        </div>

        {/* Class Assignment */}
        {classFullName && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Class Assignment</h3>
            <IonCard className="admin-info-card">
              <IonCardContent>
                <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
                  <div style={styles.infoLabel}>
                    <IonIcon icon={bookOutline} style={styles.icon} /> Assigned Class
                  </div>
                  <div style={styles.infoValue}>{classFullName}</div>
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        )}

        {/* Activity Metrics */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Activity</h3>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <span style={styles.metricValue}>--</span>
              <span style={styles.metricLabel}>Homework</span>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricValue}>--</span>
              <span style={styles.metricLabel}>Marks</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionsSection}>
          <IonButton
            expand="block"
            color="primary"
            style={styles.actionBtn}
            onClick={() => history.push(`/admin/teachers/${teacherId}/edit`)}
          >
            <IonIcon icon={createOutline} slot="start" /> Edit Teacher
          </IonButton>
          <IonButton
            expand="block"
            color="danger"
            style={styles.actionBtn}
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

/* Inline Object Styles for Guaranteed Layout Alignment */
const styles = {
  headerCard: {
    backgroundColor: '#ffffff',
    padding: '24px 20px',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  },
  avatar: {
    width: '68px',
    height: '68px',
    minWidth: '68px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
  },
  headerInfo: {
    marginLeft: '16px',
    flex: 1,
  },
  teacherName: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px 0',
    letterSpacing: '-0.3px',
  },
  teacherRole: {
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.6px',
    margin: 0,
  },
  section: {
    padding: '20px 20px 0 20px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    margin: '0 0 10px 4px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '500',
  },
  icon: {
    fontSize: '18px',
    color: '#4f46e5',
  },
  infoValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '600',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '18px 16px',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
  },
  metricValue: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#4f46e5',
    display: 'block',
    marginBottom: '2px',
  },
  metricLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  actionsSection: {
    padding: '28px 20px 40px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  actionBtn: {
    margin: 0,
    fontWeight: 600,
    height: '48px',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px 24px',
    textAlign: 'center',
    gap: '16px',
  },
};

/* Injected Ionic CSS Overrides */
const adminCss = `
  .teacher-detail-content {
    --background: #f8fafc !important;
  }
  
  ion-card.admin-info-card {
    margin: 0 !important;
    border-radius: 12px !important;
    background: #ffffff !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
    border: 1px solid #e2e8f0 !important;
  }
  
  ion-card.admin-info-card ion-card-content {
    padding: 6px 16px !important;
  }
  
  .actions-section ion-button {
    --border-radius: 10px !important;
    --box-shadow: 0 2px 4px rgba(79, 70, 229, 0.15) !important;
  }
`;

export default TeacherDetailScreen;