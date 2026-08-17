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
  IonToast,
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
  saveOutline,
  trashOutline,
  warningOutline,
} from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { classControllerAPI } from '../../services/api';
import './ClassEditStudentScreen.css';

const ClassEditStudentScreen = () => {
  const { studentId: routeStudentId } = useParams();
  const history = useHistory();

  const [student, setStudent] = useState(null);
  const [originalName, setOriginalName] = useState('');
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastColor, setToastColor] = useState('dark');

  useEffect(() => {
    fetchStudent();
  }, [routeStudentId]);

  const fetchStudent = async () => {
    setLoading(true);
    try {
      // We'll fetch from the students list endpoint and find the specific student
      const response = await classControllerAPI.getStudents('', 1, 100, '');
      
      if (response && response.success && response.data) {
        const foundStudent = response.data.students.find(s => s.id === routeStudentId);
        
        if (foundStudent) {
          const studentData = {
            id: foundStudent.id,
            name: foundStudent.name,
            rollNumber: foundStudent.rollNumber || foundStudent.studentId || `STU-${foundStudent.id.slice(-4).toUpperCase()}`,
            studentId: foundStudent.studentId,
            email: foundStudent.email,
            createdAt: foundStudent.createdAt,
          };
          setStudent(studentData);
          setEditName(studentData.name);
          setOriginalName(studentData.name);
        } else {
          setAlertHeader('Error');
          setAlertMessage('Student not found.');
          setShowAlert(true);
        }
      }
    } catch (error) {
      console.error('Error fetching student:', error);
      setToastMessage('Failed to load student data.');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      setAlertHeader('Validation Error');
      setAlertMessage('Student name is required.');
      setShowAlert(true);
      return;
    }

    if (editName.trim() === originalName) {
      setAlertHeader('No Changes');
      setAlertMessage('No changes were made.');
      setShowAlert(true);
      return;
    }

    setSaving(true);
    try {
      const response = await classControllerAPI.updateStudent(student.id, {
        name: editName.trim(),
      });

      if (response.success) {
        setStudent(prev => ({ ...prev, name: editName.trim() }));
        setOriginalName(editName.trim());
        setToastMessage('Student updated successfully.');
        setToastColor('success');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error updating student:', error);
      const errorMsg = error?.response?.data?.error?.message || 'Failed to update student.';
      setAlertHeader('Error');
      setAlertMessage(errorMsg);
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      setAlertHeader('Validation Error');
      setAlertMessage('Password must be at least 6 characters long.');
      setShowAlert(true);
      return;
    }

    setResetting(true);
    try {
      const response = await classControllerAPI.resetPassword(student.id, newPassword);
      
      if (response.success) {
        setAlertHeader('Password Reset Successful');
        setAlertMessage(`Password updated for ${student?.name}. New password: ${response.data.password}`);
        setNewPassword('');
        setShowResetModal(false);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      const errorMsg = error?.response?.data?.error?.message || 'Failed to reset password.';
      setAlertHeader('Error');
      setAlertMessage(errorMsg);
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await classControllerAPI.deleteStudent(student.id);
      
      if (response.success) {
        setToastMessage('Student deleted successfully.');
        setToastColor('success');
        setShowToast(true);
        setTimeout(() => {
          history.goBack();
        }, 1500);
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      const errorMsg = error?.response?.data?.error?.message || 'Failed to delete student.';
      setAlertHeader('Error');
      setAlertMessage(errorMsg);
      setShowAlert(true);
    } finally {
      setDeleting(false);
      setShowDeleteAlert(false);
    }
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

  if (!student) {
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
        <IonContent className="ion-padding">
          <p>Student not found.</p>
          <IonButton onClick={() => history.goBack()}>Go Back</IonButton>
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
            </div>

            <div className="avatar-placeholder">
              {student?.name ? student.name.charAt(0) : 'S'}
            </div>

            <h2 className="student-name">{student?.name}</h2>
            <div className="id-box">
              <small>ROLL NUMBER</small>
              <h3 className="student-id-value">{student?.rollNumber}</h3>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Editable Name Section */}
        <IonCard className="info-card">
          <IonCardContent>
            <h3 className="info-card-title">Student Information</h3>
            
            <div className="input-group">
              <label className="input-label">
                <IonIcon icon={personOutline} className="label-icon" />
                Full Name
              </label>
              <div className="custom-input-box">
                <IonInput
                  value={editName}
                  onIonInput={(e) => setEditName(e.detail.value || '')}
                  placeholder="Enter student's full name"
                />
              </div>
            </div>

            {editName !== originalName && (
              <IonButton
                expand="block"
                color="primary"
                onClick={handleSave}
                disabled={saving}
                className="save-btn"
              >
                {saving ? <IonSpinner name="crescent" /> : (
                  <>
                    <IonIcon icon={saveOutline} slot="start" />
                    Save Changes
                  </>
                )}
              </IonButton>
            )}
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
                  <small>Roll Number</small>
                  <p>{student?.rollNumber}</p>
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

            <IonItem className="action-button danger-action" button onClick={() => setShowDeleteAlert(true)} detail={false}>
              <div className="action-icon-container">
                <IonIcon icon={trashOutline} />
              </div>
              <IonLabel>
                <h4>Delete Student</h4>
                <p>Remove this student from the class</p>
              </IonLabel>
              <IonIcon icon={chevronForwardOutline} slot="end" color="danger" />
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

            <IonButton expand="block" fill="outline" color="medium" onClick={() => { setNewPassword('Student@123'); handleResetPassword(); }} className="default-btn" disabled={resetting}>
              <IonIcon icon={refreshOutline} slot="start" />
              Set Default (Student@123)
            </IonButton>

            <IonButton expand="block" color="primary" onClick={handleResetPassword} disabled={resetting || !newPassword || newPassword.length < 6} className="submit-btn">
              {resetting ? <IonSpinner name="crescent" /> : 'Confirm New Password'}
            </IonButton>

            <IonButton expand="block" fill="clear" color="dark" onClick={() => { setShowResetModal(false); setNewPassword(''); }}>
              Cancel
            </IonButton>
          </div>
        </IonModal>

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Student"
          message={`Are you sure you want to delete ${student?.name}? This action cannot be undone.`}
          subHeader="Warning"
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: handleDelete,
            },
          ]}
        />

        <IonAlert isOpen={showAlert} onDidDismiss={() => setShowAlert(false)} header={alertHeader} message={alertMessage} buttons={['OK']} />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
          color={toastColor}
          icon={toastColor === 'success' ? checkmarkCircleOutline : undefined}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassEditStudentScreen;