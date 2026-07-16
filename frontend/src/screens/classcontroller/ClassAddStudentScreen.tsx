/**
 * Class Add Student Screen (Ionic React Version)
 * Add a new student to the class with auto-generated sequential ID
 * Email-free flow: Only name and password required
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
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { classControllerAPI } from '../../services/api';
import './ClassAddStudentScreen.css';

interface StudentCreationResult {
  id: string;
  name: string;
  studentId: string;
  createdAt: string;
  password: string;
}

const ClassAddStudentScreen: React.FC = () => {
  const history = useHistory();
  
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nextStudentId, setNextStudentId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<StudentCreationResult | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState('');

  useEffect(() => {
    fetchNextStudentId();
  }, []);

  const fetchNextStudentId = async () => {
    try {
      // Note: getNextStudentId API not available in classControllerAPI
      // This would need to be implemented in the backend
      console.log('Fetching next student ID...');
    } catch (error) {
      console.error('Error fetching next student ID:', error);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setValidationErrorMessage('Student name is required');
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
      // Note: createStudent API not available in classControllerAPI
      // This would need to be implemented in the backend
      console.log('Creating student:', { name: name.trim(), password: password.trim() });
      
      // Simulate success for demo
      const mockResponse: StudentCreationResult = {
        id: Date.now().toString(),
        name: name.trim(),
        studentId: nextStudentId || 'STU-001',
        createdAt: new Date().toISOString(),
        password: password.trim(),
      };
      
      setCreatedStudent(mockResponse);
      setShowSuccessModal(true);
      // Reset form
      setName('');
      setPassword('');
      // Refresh next student ID
      fetchNextStudentId();
    } catch (error: any) {
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
      // Use Clipboard API for web
      navigator.clipboard.writeText(createdStudent.password).catch(() => {
        // Fallback: show in alert
        setValidationErrorMessage(`Password: ${createdStudent.password}\n\nPlease save this password securely!`);
        setShowValidationError(true);
      });
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/students" />
          </IonButtons>
          <IonTitle>Add Student</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="add-student-content" fullscreen>
        <div className="form-container">
          {/* Header */}
          <div className="form-header">
            <h1 className="form-title">Add New Student</h1>
            <p className="form-subtitle">Student ID will be auto-generated</p>
          </div>

          {/* Next Student ID Preview */}
          {nextStudentId && (
            <IonCard className="preview-card">
              <IonCardContent>
                <IonText color="secondary">
                  <small className="preview-label">Next Student ID</small>
                </IonText>
                <h2 className="preview-value">{nextStudentId}</h2>
                <IonText color="medium">
                  <small className="preview-note">This ID will be assigned to the new student</small>
                </IonText>
              </IonCardContent>
            </IonCard>
          )}

          {/* Form */}
          <div className="form">
            {/* Student Name */}
            <IonItem className="input-item">
              <IonLabel position="stacked">Student Name *</IonLabel>
              <IonInput
                value={name}
                onIonInput={(e) => setName(e.detail.value || '')}
                placeholder="Enter student's full name"
                autocomplete="name"
                autocorrect="off"
              />
            </IonItem>

            {/* Password */}
            <IonItem className="input-item password-item">
              <IonLabel position="stacked">Password *</IonLabel>
              <div className="password-wrapper">
                <IonInput
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value || '')}
                  placeholder="Enter password (min 6 characters)"
                  type={showPassword ? 'text' : 'password'}
                  autocomplete="new-password"
                  autocorrect="off"
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
              <IonText color="medium" className="input-hint">
                <small>This password will be used for student login</small>
              </IonText>
            </IonItem>

            {/* Info Box */}
            <div className="info-box">
              <IonIcon icon={informationCircleOutline} className="info-icon" />
              <IonText>
                <small>
                  The student will use their <strong className="id-highlight">Student ID</strong> as username and this password to login.
                </small>
              </IonText>
            </div>
          </div>

          {/* Submit Button */}
          <IonButton
            expand="block"
            className="submit-button"
            onClick={handleCreateStudent}
            disabled={loading}
          >
            {loading ? <IonSpinner name="crescent" /> : 'Create Student'}
          </IonButton>
        </div>

        {/* Success Modal */}
        <IonModal
          isOpen={showSuccessModal}
          onDidDismiss={handleCloseSuccessModal}
          className="success-modal"
        >
          <div className="modal-container">
            {/* Success Icon */}
            <div className="success-icon-container">
              <IonIcon icon={checkmarkCircleOutline} className="success-icon" />
            </div>

            <h2 className="modal-title">Student Created Successfully!</h2>
            
            {createdStudent && (
              <div className="modal-details">
                <div className="student-id-highlight">
                  <small className="student-id-label">Student ID</small>
                  <h3 className="student-id-value">{createdStudent.studentId}</h3>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{createdStudent.name}</span>
                </div>
                
                <div className="detail-row password-row">
                  <span className="detail-label">Password:</span>
                  <div className="modal-password-container">
                    <span className="password-value">{createdStudent.password}</span>
                    <IonButton
                      fill="outline"
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
              <IonText>
                <small>Please save the Student ID and password securely! The password won't be shown again.</small>
              </IonText>
            </div>

            {/* Action Buttons */}
            <div className="modal-actions">
              <IonButton
                fill="outline"
                color="secondary"
                onClick={() => {
                  setShowSuccessModal(false);
                  setName('');
                  setPassword('');
                  setCreatedStudent(null);
                  fetchNextStudentId();
                }}
              >
                Add Another
              </IonButton>
              
              <IonButton
                color="secondary"
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
          header="Validation Error"
          message={validationErrorMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassAddStudentScreen;