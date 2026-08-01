/**
 * Create Teacher Screen (React Version)
 * Admin Dashboard UI Layout
 */

import React, { useState } from 'react';
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
  IonSpinner,
  IonAlert,
  IonGrid,
  IonRow,
  IonCol,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import './AdminTheme.css';

const CreateTeacherScreen = () => {
  const history = useHistory();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [qualification, setQualification] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      setAlertMessage('Please enter teacher name');
      setIsSuccess(false);
      setShowAlert(true);
      return;
    }
    if (!age.trim()) {
      setAlertMessage('Please enter teacher age');
      setIsSuccess(false);
      setShowAlert(true);
      return;
    }
    if (!gender) {
      setAlertMessage('Please select teacher gender');
      setIsSuccess(false);
      setShowAlert(true);
      return;
    }
    if (!qualification.trim()) {
      setAlertMessage('Please enter teacher qualification');
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
        age: parseInt(age),
        gender,
        qualification: qualification.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });

      if (response.success) {
        setAlertMessage('Teacher created successfully!');
        setIsSuccess(true);
        setShowAlert(true);
        // Reset form
        setName('');
        setAge('');
        setGender('');
        setQualification('');
        setEmail('');
        setPhone('');
        setPassword('');
      } else {
        setAlertMessage(response.error?.message || 'Failed to create teacher');
        setIsSuccess(false);
        setShowAlert(true);
      }
    } catch (error) {
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
                Create a new teacher account. The teacher will be able to log in with the provided credentials.
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

                  {/* Age */}
                  <IonCol size="12" sizeMd="6">
                    <div className="input-group">
                      <label className="input-label">
                        Age <span className="required">*</span>
                      </label>
                      <IonInput
                        className="admin-input"
                        placeholder="Enter teacher's age"
                        value={age}
                        onIonInput={(e) => setAge(e.detail.value || '')}
                        type="number"
                        disabled={loading}
                      />
                    </div>
                  </IonCol>
                </IonRow>

                <IonRow>
                  {/* Gender */}
                  <IonCol size="12" sizeMd="6">
                    <div className="input-group">
                      <label className="input-label">
                        Gender <span className="required">*</span>
                      </label>
                      <IonSelect
                        className="admin-select"
                        value={gender}
                        onIonChange={(e) => setGender(e.detail.value)}
                        placeholder="Select gender"
                        disabled={loading}
                        interface="popover"
                      >
                        <IonSelectOption value="">Select gender</IonSelectOption>
                        <IonSelectOption value="Male">Male</IonSelectOption>
                        <IonSelectOption value="Female">Female</IonSelectOption>
                        <IonSelectOption value="Other">Other</IonSelectOption>
                      </IonSelect>
                    </div>
                  </IonCol>

                  {/* Qualification */}
                  <IonCol size="12" sizeMd="6">
                    <div className="input-group">
                      <label className="input-label">
                        Qualification <span className="required">*</span>
                      </label>
                      <IonInput
                        className="admin-input"
                        placeholder="e.g., B.Ed, M.Sc"
                        value={qualification}
                        onIonInput={(e) => setQualification(e.detail.value || '')}
                        disabled={loading}
                      />
                    </div>
                  </IonCol>
                </IonRow>

                <IonRow>
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

                  {/* Phone */}
                  <IonCol size="12" sizeMd="6">
                    <div className="input-group">
                      <label className="input-label">Mobile Number</label>
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