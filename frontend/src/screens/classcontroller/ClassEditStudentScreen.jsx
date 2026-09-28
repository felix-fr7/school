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
  createOutline,
  chevronForwardOutline,
  refreshOutline,
  schoolOutline,
  ribbonOutline,
  checkmarkCircleOutline,
  saveOutline,
  trashOutline,
  warningOutline,
  callOutline,
  mailOutline,
} from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { classControllerAPI } from '../../services/api';
import './ClassEditStudentScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const ClassEditStudentScreen = () => {
  const { studentId: routeStudentId } = useParams();
  const history = useHistory();

  const [student, setStudent] = useState(null);
  const [originalName, setOriginalName] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
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
  const [showDateModal, setShowDateModal] = useState(false);
  const [editAdmittedDate, setEditAdmittedDate] = useState('');
  const [savingDate, setSavingDate] = useState(false);
  
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastColor, setToastColor] = useState('dark');

  useEffect(() => {
    fetchStudent();
  }, [routeStudentId]);

  const toDateInputValue = (dateValue) => {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const fetchStudent = async () => {
    setLoading(true);
    try {
      // We'll fetch from the students list endpoint and find the specific student
      const response = await classControllerAPI.getStudents('', 1, 100, '');
      
      if (response && response.success && response.data) {
        const foundStudent = response.data.students.find(s => s.id === routeStudentId);
        
        if (foundStudent) {
          // Auto-generated placeholder emails are not shown as real contact info
          const realEmail = foundStudent.emailProvided ? (foundStudent.email || '') : '';
          const currentPhone = foundStudent.phone || '';

          const studentData = {
            id: foundStudent.id,
            name: foundStudent.name,
            rollNumber: foundStudent.rollNumber || foundStudent.studentId || `STU-${foundStudent.id.slice(-4).toUpperCase()}`,
            studentId: foundStudent.studentId,
            email: realEmail,
            phone: currentPhone,
            createdAt: foundStudent.createdAt,
            admittedDate: foundStudent.admittedDate || foundStudent.createdAt,
          };
          setStudent(studentData);
          setEditName(studentData.name);
          setOriginalName(studentData.name);
          setEditPhone(currentPhone);
          setOriginalPhone(currentPhone);
          setEditEmail(realEmail);
          setOriginalEmail(realEmail);
          setEditAdmittedDate(toDateInputValue(studentData.admittedDate));
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

    if (editPhone.trim() && !/^[\d\s\-()+]{6,20}$/.test(editPhone.trim())) {
      setAlertHeader('Validation Error');
      setAlertMessage('Enter a valid mobile number (digits only, 6-20 characters).');
      setShowAlert(true);
      return;
    }

    if (editEmail.trim() && !/^\S+@\S+\.\S+$/.test(editEmail.trim())) {
      setAlertHeader('Validation Error');
      setAlertMessage('Please enter a valid email address.');
      setShowAlert(true);
      return;
    }

    const newName = editName.trim();
    const newPhone = editPhone.trim();
    const newEmail = editEmail.trim();

    const nothingChanged =
      newName === originalName &&
      newPhone === originalPhone &&
      newEmail === originalEmail;

    if (nothingChanged) {
      setAlertHeader('No Changes');
      setAlertMessage('No changes were made.');
      setShowAlert(true);
      return;
    }

    setSaving(true);
    try {
      const response = await classControllerAPI.updateStudent(student.id, {
        name: newName,
        phone: newPhone,
        email: newEmail,
      });

      if (response.success) {
        setStudent(prev => ({
          ...prev,
          name: newName,
          phone: response.data?.phone ?? newPhone,
          email: newEmail,
        }));
        setOriginalName(newName);
        setOriginalPhone(newPhone);
        setOriginalEmail(newEmail);
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

  const handleSaveAdmittedDate = async () => {
    if (!editAdmittedDate) {
      setAlertHeader('Validation Error');
      setAlertMessage('Please select an admitted date.');
      setShowAlert(true);
      return;
    }

    setSavingDate(true);
    try {
      const response = await classControllerAPI.updateStudent(student.id, {
        admittedDate: editAdmittedDate,
      });

      if (response.success) {
        setStudent(prev => ({ ...prev, admittedDate: editAdmittedDate }));
        setToastMessage('Admitted date updated successfully.');
        setToastColor('success');
        setShowToast(true);
        setShowDateModal(false);
      }
    } catch (error) {
      console.error('Error updating admitted date:', error);
      const errorMsg = error?.response?.data?.error?.message || 'Failed to update admitted date.';
      setAlertHeader('Error');
      setAlertMessage(errorMsg);
      setShowAlert(true);
    } finally {
      setSavingDate(false);
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
          <HomeLogoutButtons />
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
        <HomeLogoutButtons />
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

            {/* Mobile Number */}
            <div className="input-group">
              <label className="input-label">
                <IonIcon icon={callOutline} className="label-icon" />
                Mobile Number
                <span className="optional-tag">Optional</span>
              </label>
              <div className="custom-input-box">
                <IonInput
                  type="tel"
                  inputmode="numeric"
                  value={editPhone}
                  onIonInput={(e) => setEditPhone(e.detail.value || '')}
                  placeholder="Enter mobile number"
                  autoComplete="tel"
                  autoCorrect="off"
                />
              </div>
            </div>

            {/* Email */}
            <div className="input-group">
              <label className="input-label">
                <IonIcon icon={mailOutline} className="label-icon" />
                Email Address
                <span className="optional-tag">Optional</span>
              </label>
              <div className="custom-input-box">
                <IonInput
                  type="email"
                  inputmode="email"
                  value={editEmail}
                  onIonInput={(e) => setEditEmail(e.detail.value || '')}
                  placeholder="student@example.com"
                  autoComplete="email"
                  autoCorrect="off"
                  autoCapitalize="none"
                />
              </div>
            </div>

            {(editName !== originalName || editPhone !== originalPhone || editEmail !== originalEmail) && (
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

              {student?.phone && (
                <IonItem>
                  <IonIcon icon={callOutline} slot="start" className="info-icon" />
                  <IonLabel>
                    <small>Mobile Number</small>
                    <p>{student.phone}</p>
                  </IonLabel>
                </IonItem>
              )}

              {student?.email && (
                <IonItem>
                  <IonIcon icon={mailOutline} slot="start" className="info-icon" />
                  <IonLabel>
                    <small>Email Address</small>
                    <p>{student.email}</p>
                  </IonLabel>
                </IonItem>
              )}

              <IonItem>
                <IonIcon icon={ribbonOutline} slot="start" className="info-icon" />
                <IonLabel>
                  <small>Attendance Record</small>
                  <p>94% Overall Attendance</p>
                </IonLabel>
              </IonItem>
              
              <IonItem button detail={false} onClick={() => setShowDateModal(true)}>
                <IonIcon icon={calendarOutline} slot="start" className="info-icon" />
                <IonLabel>
                  <small>Admitted Date</small>
                  <p>{student?.admittedDate ? new Date(student.admittedDate).toLocaleDateString() : 'Not set'}</p>
                </IonLabel>
                <IonIcon icon={createOutline} slot="end" color="medium" />
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

        {/* Edit Admitted Date Modal */}
        <IonModal isOpen={showDateModal} onDidDismiss={() => setShowDateModal(false)} className="reset-password-modal">
          <div className="modal-container">
            <h2 className="modal-title">Edit Admitted Date</h2>
            <p className="modal-subtitle">Update the admission date for <strong>{student?.name}</strong></p>

            <div className="input-group">
              <IonLabel>Admitted Date</IonLabel>
              <IonInput
                type="date"
                value={editAdmittedDate}
                onIonInput={(e) => setEditAdmittedDate(e.detail.value || '')}
              />
            </div>

            <IonButton expand="block" color="primary" onClick={handleSaveAdmittedDate} disabled={savingDate || !editAdmittedDate} className="submit-btn">
              {savingDate ? <IonSpinner name="crescent" /> : 'Save Admitted Date'}
            </IonButton>

            <IonButton expand="block" fill="clear" color="dark" onClick={() => setShowDateModal(false)}>
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
