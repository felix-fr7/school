/**
 * Create Teacher Screen (Ionic React Version)
 * Admin Dashboard UI Layout
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
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { Class } from '../../types';
import './CreateTeacherScreen.css';

const CreateTeacherScreen: React.FC = () => {
  const history = useHistory();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
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
      setAlertMessage('Please enter teacher name');
      setIsSuccess(false);
      setShowAlert(true);
      return;
    }
    if (!email.trim()) {
      setAlertMessage('Please enter teacher email');
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
    if (password.length < 6) {
      setAlertMessage('Password must be at least 6 characters');
      setIsSuccess(false);
      setShowAlert(true);
      return;
    }

    try {
      setLoading(true);
      const response = await adminAPI.createTeacher({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        classId,
      });

      if (response.success) {
        setAlertMessage('Teacher created successfully!');
        setIsSuccess(true);
        setShowAlert(true);
        // Reset form
        setName('');
        setEmail('');
        setPassword('');
        setPhone('');
        setClassId(undefined);
      } else {
        setAlertMessage(response.error?.message || 'Failed to create teacher');
        setIsSuccess(false);
        setShowAlert(true);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to create teacher';
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
      history.push('/admin/teachers');
    }
  };

  return (
    <IonPage>
      <IonHeader className="admin-header">
        <IonToolbar className="admin-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/teachers" color="light" />
          </IonButtons>
          <IonTitle>Create Teacher</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-teacher-content">
        <div className="admin-form-container">
          <div className="admin-card">
            <div className="admin-card-header">
              <h2>Teacher Account Registration</h2>
              <p className="description">
                Create a new teacher account. The teacher will be able to log in and manage their assigned class.
              </p>
            </div>

            <div className="admin-card-body">
              <IonGrid className="ion-no-padding">
                <IonRow>
                  {/* Name */}
                  <IonCol size="12" sizeMd="6">
                    <div className="input-group">
                      <label className="input-label">
                        Teacher Name <span className="required">*</span>
                      </label>
                      <IonInput
                        className="admin-input"
                        placeholder="Enter teacher's full name"
                        value={name}
                        onIonInput={(e) => setName(e.detail.value || '')}
                        autocapitalize="words"
                        disabled={loading}
                      />
                    </div>
                  </IonCol>

                  {/* Email */}
                  <IonCol size="12" sizeMd="6">
                    <div className="input-group">
                      <label className="input-label">
                        Email / Login ID <span className="required">*</span>
                      </label>
                      <IonInput
                        className="admin-input"
                        placeholder="Enter teacher's email address"
                        value={email}
                        onIonInput={(e) => setEmail(e.detail.value || '')}
                        type="email"
                        autocapitalize="none"
                        disabled={loading}
                      />
                    </div>
                  </IonCol>
                </IonRow>

                <IonRow>
                  {/* Password */}
                  <IonCol size="12" sizeMd="6">
                    <div className="input-group">
                      <label className="input-label">
                        Password <span className="required">*</span>
                      </label>
                      <IonInput
                        className="admin-input"
                        type="password"
                        placeholder="Enter password (min 6 characters)"
                        value={password}
                        onIonInput={(e) => setPassword(e.detail.value || '')}
                        autocapitalize="off"
                        disabled={loading}
                      />
                    </div>
                  </IonCol>

                  {/* Phone */}
                  <IonCol size="12" sizeMd="6">
                    <div className="input-group">
                      <label className="input-label">Phone Number</label>
                      <IonInput
                        className="admin-input"
                        placeholder="Enter phone number"
                        value={phone}
                        onIonInput={(e) => setPhone(e.detail.value || '')}
                        type="tel"
                        disabled={loading}
                      />
                    </div>
                  </IonCol>
                </IonRow>

                <IonRow>
                  {/* Assign Class */}
                  <IonCol size="12">
                    <div className="input-group">
                      <label className="input-label">Assign to Class</label>
                      {fetchingClasses ? (
                        <div className="picker-loading">
                          <IonSpinner name="crescent" color="primary" />
                          <IonText color="medium">Loading classes...</IonText>
                        </div>
                      ) : (
                        <IonSelect
                          value={classId}
                          placeholder="No class assigned (optional)"
                          interface="popover"
                          onIonChange={(e) => setClassId(e.detail.value || undefined)}
                          disabled={loading}
                          className="admin-select class-select"
                        >
                          <IonSelectOption value="">No class assigned (optional)</IonSelectOption>
                          {classes.map((cls) => (
                            <IonSelectOption key={cls.id} value={cls.id}>
                              {cls.section ? `${cls.name} - ${cls.section}` : cls.name}
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      )}
                    </div>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>

            {/* Action Buttons */}
            <div className="button-row">
              <IonButton
                className="cancel-btn"
                fill="outline"
                color="medium"
                onClick={() => history.goBack()}
                disabled={loading}
              >
                Cancel
              </IonButton>
              <IonButton
                className="submit-btn"
                fill="solid"
                color="primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <IonSpinner name="crescent" /> : 'Create Teacher'}
              </IonButton>
            </div>
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

export default CreateTeacherScreen;