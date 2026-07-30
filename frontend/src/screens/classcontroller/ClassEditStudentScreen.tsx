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
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonModal,
  IonAlert,
  IonBadge,
} from '@ionic/react';
import {
  keyOutline,
  personOutline,
  calendarOutline,
  chevronForwardOutline,
  refreshOutline,
  schoolOutline,
  ribbonOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { User } from '../../types';
import './ClassEditStudentScreen.css';

const ClassEditStudentScreen: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const history = useHistory();

  const [student, setStudent] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    // Simulated fetch student logic
    setTimeout(() => {
      setStudent({
        id: studentId || '101',
        name: 'Felix (MCA Student)',
        studentId: 'STU-2026-089',
        createdAt: new Date().toISOString(),
      } as any);
      setLoading(false);
    }, 600);
  }, [studentId]);

  const handleResetPassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      setAlertHeader('Validation Error');
      setAlertMessage('Password must be at least 6 characters long.');
      setShowAlert(true);
      return;
    }

    setResetting(true);
    setTimeout(() => {
      setAlertHeader('Password Reset Successful');
      setAlertMessage(`Password updated for ${student?.name}.`);
      setShowAlert(true);
      setNewPassword('');
      setShowResetModal(false);
      setResetting(false);
    }, 1000);
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center student-edit-loading">
          <IonSpinner name="crescent" color="primary" />
          <p className="loading-text">Loading Class Student Profile...</p>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar color="primary" className="class-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/students" />
          </IonButtons>
          <IonTitle>Class Student Details</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="student-edit-content" fullscreen>
        {/* Profile / Student ID Card */}
        <IonCard className="student-id-card">
          <IonCardContent>
            <div className="badge-row">
              <IonBadge color="success" className="status-badge">
                <IonIcon icon={checkmarkCircleOutline} /> Active Student
              </IonBadge>
              <IonBadge color="tertiary" className="class-badge">Class 10-A</IonBadge>
            </div>

            <div className="avatar-placeholder">
              {student?.name ? student.name.charAt(0) : 'S'}
            </div>

            <h2 className="student-name">{student?.name}</h2>
            <div className="id-box">
              <small>STUDENT ROLL / ID</small>
              <h3 className="student-id-value">{student?.studentId}</h3>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Academic Details */}
        <IonCard className="info-card">
          <IonCardContent>
            <h3 className="info-card-title">Academic Profile</h3>
            
            <IonList lines="none">
              <IonItem>
                <IonIcon icon={personOutline} slot="start" className="info-icon" />
                <IonLabel>
                  <small>Full Name</small>
                  <p>{student?.name}</p>
                </IonLabel>
              </IonItem>
              
              <IonItem>
                <IonIcon icon={schoolOutline} slot="start" className="info-icon" />
                <IonLabel>
                  <small>Assigned Section</small>
                  <p>Grade 10 - Section A</p>
                </IonLabel>
              </IonItem>

              <IonItem>
                <IonIcon icon={ribbonOutline} slot="start" className="info-icon" />
                <IonLabel>
                  <small>Attendance Record</small>
                  <p>94% Overall Attendance</p>
                </IonLabel>
              </IonItem>
              
              <IonItem>
                <IonIcon icon={calendarOutline} slot="start" className="info-icon" />
                <IonLabel>
                  <small>Admitted Date</small>
                  <p>{new Date(student?.createdAt || '').toLocaleDateString()}</p>
                </IonLabel>
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        {/* Admin Actions */}
        <IonCard className="actions-card">
          <IonCardContent>
            <h3 className="info-card-title">Administrative Actions</h3>

            <IonItem className="action-button" button onClick={() => setShowResetModal(true)} detail={false}>
              <div className="action-icon-container">
                <IonIcon icon={keyOutline} />
              </div>
              <IonLabel>
                <h4>Reset Login Password</h4>
                <p>Change or generate default portal password</p>
              </IonLabel>
              <IonIcon icon={chevronForwardOutline} slot="end" color="medium" />
            </IonItem>
          </IonCardContent>
        </IonCard>

        {/* Reset Password Modal */}
        <IonModal isOpen={showResetModal} onDidDismiss={() => setShowResetModal(false)} className="reset-password-modal">
          <div className="modal-container">
            <h2 className="modal-title">Reset Password</h2>
            <p className="modal-subtitle">Set new credentials for <strong>{student?.name}</strong></p>

            <div className="input-group">
              <IonLabel>New Password</IonLabel>
              <IonInput
                value={newPassword}
                onIonInput={(e) => setNewPassword(e.detail.value || '')}
                placeholder="Enter password (min 6 chars)"
                type="password"
              />
            </div>

            <IonButton expand="block" fill="outline" color="medium" onClick={handleResetPassword} className="default-btn">
              <IonIcon icon={refreshOutline} slot="start" />
              Set Default (Student@123)
            </IonButton>

            <IonButton expand="block" color="primary" onClick={handleResetPassword} disabled={resetting} className="submit-btn">
              {resetting ? <IonSpinner name="crescent" /> : 'Confirm New Password'}
            </IonButton>

            <IonButton expand="block" fill="clear" color="dark" onClick={() => setShowResetModal(false)}>
              Cancel
            </IonButton>
          </div>
        </IonModal>

        <IonAlert isOpen={showAlert} onDidDismiss={() => setShowAlert(false)} header={alertHeader} message={alertMessage} buttons={['OK']} />
      </IonContent>
    </IonPage>
  );
};

export default ClassEditStudentScreen;