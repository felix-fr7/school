/**
 * Create Student Screen (Ionic React Version)
 * Form to create a new student with optional class assignment
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
  IonInput,
  IonText,
  IonSpinner,
  IonAlert,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { Class } from '../../types';
import './CreateStudentScreen.css';

const CreateStudentScreen: React.FC = () => {
  const history = useHistory();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState<string | undefined>(undefined);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingClasses, setFetchingClasses] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setFetchingClasses(true);
      const response = await adminAPI.getClasses();
      if (response.success && response.data) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setFetchingClasses(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      setAlertMessage('Please enter student name');
      setIsSuccess(false);
      setShowAlert(true);
      return;
    }
    if (!email.trim()) {
      setAlertMessage('Please enter student email');
      setIsSuccess(false);
      setShowAlert(true);
      return;
    }
    if (!password.trim()) {
      setAlertMessage('Please enter password');
      setIsSuccess(false);
      setShowAlert(true);
      return;
    }
    if (!studentId.trim()) {
      setAlertMessage('Please enter student ID');
      setIsSuccess(false);
      setShowAlert(true);
      return;
    }

    try {
      setLoading(true);
      const response = await adminAPI.createStudent({
        name: name.trim(),
        email: email.trim(),
        password,
        studentId: studentId.trim(),
        classId,
      });

      if (response.success) {
        setAlertMessage('Student created successfully!');
        setIsSuccess(true);
        setShowAlert(true);
        // Reset form
        setName('');
        setEmail('');
        setPassword('');
        setStudentId('');
        setClassId(undefined);
      } else {
        setAlertMessage(response.error?.message || 'Failed to create student');
        setIsSuccess(false);
        setShowAlert(true);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to create student';
      setAlertMessage(errorMessage);
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAlertDismiss = () => {
    setShowAlert(false);
    if (isSuccess) {
      history.push('/admin/students');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/students" />
          </IonButtons>
          <IonTitle>Create Student</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="create-student-content">
        <div className="form-container">
          <div className="input-group">
            <label className="input-label">Student Name *</label>
            <IonInput
              placeholder="Enter student name"
              value={name}
              onIonInput={(e) => setName(e.detail.value || '')}
              autocapitalize="words"
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Email *</label>
            <IonInput
              placeholder="Enter student email"
              value={email}
              onIonInput={(e) => setEmail(e.detail.value || '')}
              type="email"
              autocapitalize="none"
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password *</label>
            <IonInput
              type="password"
              placeholder="Enter password"
              value={password}
              onIonInput={(e) => setPassword(e.detail.value || '')}
              autocapitalize="off"
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Student ID *</label>
            <IonInput
              placeholder="Enter student ID"
              value={studentId}
              onIonInput={(e) => setStudentId(e.detail.value || '')}
              autocapitalize="none"
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Class</label>
            {fetchingClasses ? (
              <div className="picker-loading">
                <IonSpinner name="crescent" />
                <IonText color="medium">Loading classes...</IonText>
              </div>
            ) : (
              <IonSelect
                value={classId}
                placeholder="Select a class (optional)"
                interface="popover"
                onIonChange={(e) => setClassId(e.detail.value || undefined)}
                disabled={loading}
                className="class-select"
              >
                <IonSelectOption value="">Select a class (optional)</IonSelectOption>
                {classes.map((cls) => (
                  <IonSelectOption key={cls.id} value={cls.id}>
                    {cls.section ? `${cls.name} - ${cls.section}` : cls.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            )}
          </div>

          <div className="button-row">
            <IonButton expand="block" color="medium" onClick={() => history.goBack()} disabled={loading}>
              Cancel
            </IonButton>
            <IonButton expand="block" color="primary" onClick={handleSubmit} disabled={loading}>
              {loading ? <IonSpinner name="crescent" /> : 'Create Student'}
            </IonButton>
          </div>
        </div>

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={handleAlertDismiss}
          header={isSuccess ? 'Success' : 'Error'}
          message={alertMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default CreateStudentScreen;