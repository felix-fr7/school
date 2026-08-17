/**
 * Class Add Student Screen (Ionic React Version)
 * Add a new student to the class with roll number
 * Requires: name, roll number, and password
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
  IonItem,
  IonLabel,
  IonInput,
  IonCard,
  IonCardContent,
  IonModal,
  IonAlert,
} from '@ionic/react';
import {
  eyeOutline,
  eyeOffOutline,
  informationCircleOutline,
  warningOutline,
  checkmarkCircleOutline,
  copyOutline,
  personAddOutline,
  keyOutline,
  personOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { classControllerAPI } from '../../services/api';
import './ClassAddStudentScreen.css';

const ClassAddStudentScreen = () => {
  const history = useHistory();

  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nextStudentId, setNextStudentId] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdStudent, setCreatedStudent] = useState(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState('');

  useEffect(() => {
    fetchNextStudentId();
  }, []);

  const fetchNextStudentId = async () => {
    try {
      const response = await classControllerAPI.getNextStudentId();
      if (response.success && response.data) {
        setNextStudentId(response.data.nextStudentId);
      }
    } catch (error) {
      console.error('Error fetching next student ID:', error);
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      setValidationErrorMessage('Student name is required');
      setShowValidationError(true);
      return false;
    }

    if (!rollNumber.trim()) {
      setValidationErrorMessage('Roll number is required');
      setShowValidationError(true);
      return false;
    }

    if (!password.trim()) {
      setValidationErrorMessage('Password is required');
      setShowValidationError(true);
      return false;
    }

    if (password.length < 6) {
      setValidationErrorMessage('Password must be at least 6 characters long');
      setShowValidationError(true);
      return false;
    }

    return true;
  };

  const handleCreateStudent = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await classControllerAPI.createStudent({
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        password: password.trim(),
      });

      if (response.success && response.data) {
        setCreatedStudent(response.data);
        setShowSuccessModal(true);
        setName('');
        setRollNumber('');
        setPassword('');
        fetchNextStudentId();
      }
    } catch (error) {
      console.error('Error creating student:', error);
      const errorMessage = error?.response?.data?.error?.message || 'Failed to create student';
      setValidationErrorMessage(errorMessage);
      setShowValidationError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setCreatedStudent(null);
    history.goBack();
  };

  const handleCopyPassword = () => {
    if (createdStudent?.password) {
      navigator.clipboard.writeText(createdStudent.password).catch(() => {
        setValidationErrorMessage(`Password: ${createdStudent.password}\n\nPlease save this password securely!`);
        setShowValidationError(true);
      });
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="light-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/students" color="dark" />
          </IonButtons>
          <IonTitle>
            <div className="brand-header">
              <IonIcon icon={personAddOutline} className="brand-icon" />
              <span>Add New Student</span>
            </div>
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="add-student-content" fullscreen>
        <div className="form-container">
          {/* Header Card */}
          <div className="light-hero-card flex-hero">
            <div className="hero-main">
              <h1 className="class-title">Enroll Student</h1>
              <p className="teacher-greeting">
                Create login credentials for a new student in your workspace.
              </p>
            </div>
          </div>

          {/* Next Student ID Preview */}
          {nextStudentId && (
            <IonCard className="preview-card">
              <IonCardContent>
                <span className="preview-label">NEXT GENERATED INTERNAL ID</span>
                <h2 className="preview-value">{nextStudentId}</h2>
                <span className="preview-note">An internal ID will be assigned. Students login with their roll number.</span>
              </IonCardContent>
            </IonCard>
          )}

          {/* Form */}
          <div className="form-card">
            {/* Student Name */}
            <div className="input-group">
              <label className="input-label">
                <IonIcon icon={personOutline} className="label-icon" />
                Student Name *
              </label>
              <div className="custom-input-box">
                <IonInput
                  value={name}
                  onIonInput={(e) => setName(e.detail.value || '')}
                  placeholder="Enter student's full name"
                  autoComplete="name"
                  autoCorrect="off"
                />
              </div>
            </div>

            {/* Roll Number */}
            <div className="input-group">
              <label className="input-label">
                <IonIcon icon={personOutline} className="label-icon" />
                Roll Number *
              </label>
              <div className="custom-input-box">
                <IonInput
                  value={rollNumber}
                  onIonInput={(e) => setRollNumber(e.detail.value || '')}
                  placeholder="Enter student's roll number (e.g., 001, A-01)"
                  autoComplete="off"
                  autoCorrect="off"
                />
              </div>
            </div>

            {/* Password */}
            <div className="input-group">
              <label className="input-label">
                <IonIcon icon={keyOutline} className="label-icon" />
                Set Password *
              </label>
              <div className="custom-input-box password-box">
                <IonInput
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value || '')}
                  placeholder="Minimum 6 characters"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoCorrect="off"
                />
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  <IonIcon
                    icon={showPassword ? eyeOffOutline : eyeOutline}
                    slot="icon-only"
                  />
                </IonButton>
              </div>
            </div>

            {/* Info Box */}
            <div className="info-box">
              <IonIcon icon={informationCircleOutline} className="info-icon" />
              <p>
                The student will use their <strong className="id-highlight">Roll Number</strong> along with this password to access the app.
              </p>
            </div>

            {/* Submit Button */}
            <IonButton
              expand="block"
              className="submit-button"
              onClick={handleCreateStudent}
              disabled={loading}
            >
              {loading ? <IonSpinner name="crescent" /> : 'Confirm & Create Student'}
            </IonButton>
          </div>
        </div>

        {/* Success Modal */}
        <IonModal
          isOpen={showSuccessModal}
          onDidDismiss={handleCloseSuccessModal}
          className="success-modal"
        >
          <div className="modal-container">
            <div className="success-icon-container">
              <IonIcon icon={checkmarkCircleOutline} className="success-icon" />
            </div>

            <h2 className="modal-title">Student Created!</h2>

            {createdStudent && (
              <div className="modal-details">
                <div className="student-id-highlight">
                  <small className="student-id-label">Roll Number (Login ID)</small>
                  <h3 className="student-id-value">{createdStudent.rollNumber}</h3>
                </div>

                {createdStudent.studentId && (
                  <div className="detail-row">
                    <span className="detail-label">Student ID (Internal)</span>
                    <span className="detail-value">{createdStudent.studentId}</span>
                  </div>
                )}

                <div className="detail-row">
                  <span className="detail-label">Full Name</span>
                  <span className="detail-value">{createdStudent.name}</span>
                </div>

                <div className="detail-row password-row">
                  <span className="detail-label">Login Password</span>
                  <div className="modal-password-container">
                    <span className="password-value">{createdStudent.password}</span>
                    <IonButton
                      fill="solid"
                      size="small"
                      onClick={handleCopyPassword}
                      className="copy-button"
                    >
                      <IonIcon icon={copyOutline} slot="start" />
                      Copy
                    </IonButton>
                  </div>
                </div>
              </div>
            )}

            <div className="modal-warning">
              <IonIcon icon={warningOutline} className="warning-icon" />
              <p>Please note down these credentials. The password will not be displayed again!</p>
            </div>

            {/* Action Buttons */}
            <div className="modal-actions">
              <IonButton
                fill="outline"
                color="medium"
                className="modal-btn"
                onClick={() => {
                  setShowSuccessModal(false);
                  setName('');
                  setRollNumber('');
                  setPassword('');
                  setCreatedStudent(null);
                  fetchNextStudentId();
                }}
              >
                Add Another
              </IonButton>

              <IonButton
                color="primary"
                className="modal-btn"
                onClick={handleCloseSuccessModal}
              >
                Done
              </IonButton>
            </div>
          </div>
        </IonModal>

        {/* Validation Error Alert */}
        <IonAlert
          isOpen={showValidationError}
          onDidDismiss={() => setShowValidationError(false)}
          header="Notice"
          message={validationErrorMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassAddStudentScreen;