/**
 * Create School Screen - Super Admin (Ionic React Version)
 * Form to create a new school and assign admin
 */

import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonInput,
  IonButton,
  IonSpinner,
  IonAlert,
  IonIcon,
} from '@ionic/react';
import { schoolOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { tenantsAPI } from '../../services/api';
import './CreateSchoolScreen.css';

const CreateSchoolScreen: React.FC = () => {
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showAlertMessage = (header: string, message: string) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleCreate = async () => {
    // Validation
    if (!formData.name || !formData.code || !formData.adminName || !formData.adminEmail || !formData.adminPassword) {
      showAlertMessage('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await tenantsAPI.createTenant(formData);
      if (response.success) {
        showAlertMessage('Success', 'School created successfully');
        setTimeout(() => {
          history.push('/superadmin/dashboard');
        }, 1500);
      } else {
        showAlertMessage('Error', response.error?.message || 'Failed to create school');
      }
    } catch (error: any) {
      showAlertMessage('Error', error.response?.data?.error?.message || 'Failed to create school');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Create School</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="create-school-content" fullscreen>
        <div className="container">
          {/* Header */}
          <div className="header-section">
            <IonIcon icon={schoolOutline} className="header-icon" />
            <h1 className="header-title">Create New School</h1>
            <p className="header-subtitle">Set up a new school and assign an administrator</p>
          </div>

          {/* School Information */}
          <IonCard className="form-card">
            <IonCardHeader>
              <IonCardTitle>School Information</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="input-group">
                <label className="input-label">School Name *</label>
                <IonInput
                  value={formData.name}
                  onIonInput={(e) => setFormData({ ...formData, name: e.detail.value || '' })}
                  placeholder="Enter school name"
                />
              </div>

              <div className="input-group">
                <label className="input-label">School Code * (e.g., SCH001)</label>
                <IonInput
                  value={formData.code}
                  onIonInput={(e) => setFormData({ ...formData, code: e.detail.value || '' })}
                  placeholder="Enter unique school code"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Address</label>
                <IonInput
                  value={formData.address}
                  onIonInput={(e) => setFormData({ ...formData, address: e.detail.value || '' })}
                  placeholder="Enter school address"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Phone</label>
                <IonInput
                  type="tel"
                  value={formData.phone}
                  onIonInput={(e) => setFormData({ ...formData, phone: e.detail.value || '' })}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Email</label>
                <IonInput
                  type="email"
                  value={formData.email}
                  onIonInput={(e) => setFormData({ ...formData, email: e.detail.value || '' })}
                  placeholder="Enter school email"
                />
              </div>
            </IonCardContent>
          </IonCard>

          {/* Admin Credentials */}
          <IonCard className="form-card">
            <IonCardHeader>
              <IonCardTitle>Admin Credentials</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="input-group">
                <label className="input-label">Admin Name *</label>
                <IonInput
                  value={formData.adminName}
                  onIonInput={(e) => setFormData({ ...formData, adminName: e.detail.value || '' })}
                  placeholder="Enter admin full name"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Admin Email *</label>
                <IonInput
                  type="email"
                  value={formData.adminEmail}
                  onIonInput={(e) => setFormData({ ...formData, adminEmail: e.detail.value || '' })}
                  placeholder="Enter admin email"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Admin Password * (min 6 chars, 1 number)</label>
                <IonInput
                  type="password"
                  value={formData.adminPassword}
                  onIonInput={(e) => setFormData({ ...formData, adminPassword: e.detail.value || '' })}
                  placeholder="Enter admin password"
                />
              </div>
            </IonCardContent>
          </IonCard>

          {/* Submit Button */}
          <div className="button-container">
            <IonButton
              expand="block"
              className="submit-button"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? <IonSpinner name="crescent" /> : 'Create School'}
            </IonButton>
          </div>
        </div>

        {/* Alert */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={alertHeader}
          message={alertMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default CreateSchoolScreen;