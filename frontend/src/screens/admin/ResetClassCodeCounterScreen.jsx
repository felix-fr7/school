/**
 * Admin Reset Class Code Counter Screen
 * Allows admin to reset the class code counter
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
  IonIcon,
  IonInput,
  IonText,
  IonSpinner,
  IonAlert,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { warningOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import './AdminTheme.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const ResetClassCodeCounterScreen = () => {
  const history = useHistory();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmAlert, setShowConfirmAlert] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const handleReset = () => {
    if (!password.trim()) {
      setAlertMessage('Please enter your password');
      setShowErrorAlert(true);
      return;
    }

    // Show confirmation alert
    setShowConfirmAlert(true);
  };

  const handleConfirmReset = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.resetClassCodeCounter(password);

      if (response.success) {
        setShowSuccessAlert(true);
        setPassword('');
      } else {
        setAlertMessage(response.message || 'Failed to reset class code counter');
        setShowErrorAlert(true);
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Failed to reset class code counter';
      setAlertMessage(errorMsg);
      setShowErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessDismiss = () => {
    setShowSuccessAlert(false);
    history.push('/admin/classes');
  };

  return (
    <IonPage>
      <IonHeader className="admin-header ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/classes" className="admin-back-btn" />
          </IonButtons>
          <IonTitle className="admin-title">Reset Class Code Counter</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="create-class-content ion-padding">
        <div className="admin-container">
          
          {/* Warning Banner Card */}
          <IonCard className="banner-card warning">
            <IonCardContent className="banner-content">
              <div className="banner-icon-box warning">
                <IonIcon icon={warningOutline} />
              </div>
              <div>
                <h2 className="banner-title warning">Warning</h2>
                <p className="banner-subtitle">
                  This action will delete all existing classes and reset the class code counter.
                  New classes will start from CLS-001.
                </p>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Form Card */}
          <IonCard className="admin-form-card">
            <IonCardContent>
              <div className="admin-input-group">
                <label className="admin-label">
                  Admin Password <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <IonInput
                    type="password"
                    placeholder="Enter your admin password"
                    value={password}
                    onIonInput={(e) => setPassword(e.detail.value || '')}
                    disabled={loading}
                    className="custom-admin-input"
                  />
                </div>
                <span className="admin-hint">
                  Please enter your password to confirm this action.
                </span>
              </div>

              {/* Reset Button */}
              <IonButton
                expand="block"
                color="danger"
                onClick={handleReset}
                disabled={loading}
                className="admin-submit-btn"
              >
                {loading ? <IonSpinner name="crescent" /> : 'Reset Class Code Counter'}
              </IonButton>

            </IonCardContent>
          </IonCard>
        </div>

        {/* Confirmation Alert */}
        <IonAlert
          isOpen={showConfirmAlert}
          onDidDismiss={() => setShowConfirmAlert(false)}
          header="Confirm Reset"
          message="Are you sure you want to reset the class code counter? This will delete all existing classes. This action cannot be undone."
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => setShowConfirmAlert(false)
            },
            {
              text: 'Reset',
              handler: handleConfirmReset
            }
          ]}
        />

        {/* Success Alert */}
        <IonAlert
          isOpen={showSuccessAlert}
          onDidDismiss={handleSuccessDismiss}
          header="Class Code Counter Reset"
          message="All classes have been deleted and the counter has been reset. New classes will start from CLS-001."
          buttons={[{ text: 'OK', handler: handleSuccessDismiss }]}
        />

        {/* Error Alert */}
        <IonAlert
          isOpen={showErrorAlert}
          onDidDismiss={() => setShowErrorAlert(false)}
          header="Error"
          message={alertMessage}
          buttons={['Dismiss']}
        />
      </IonContent>
    </IonPage>
  );
};

export default ResetClassCodeCounterScreen;