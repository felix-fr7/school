/**
 * Edit Teacher Screen (Ionic React - Modern Admin UI)
 * Allows admin to edit teacher details (name, email, phone)
 */

import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonBackButton,
  IonContent,
  IonInput,
  IonButton,
  IonSpinner,
  IonAlert,
  IonCard,
  IonCardContent,
  IonIcon,
  IonText,
  IonButtons,
} from '@ionic/react';
import { useHistory, useParams } from 'react-router-dom';
import { 
  personOutline, 
  mailOutline, 
  callOutline, 
  saveOutline,
  closeOutline
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import './EditTeacherScreen.css';

const EditTeacherScreen = () => {
  const history = useHistory();
  const { teacherId } = useParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertCallback, setAlertCallback] = useState(null);

  useEffect(() => {
    // If teacherId is 'create', redirect to the create teacher page
    if (teacherId === 'create') {
      history.push('/admin/teachers/create');
      return;
    }
    
    fetchData();
  }, [teacherId]);

  const fetchData = async () => {
    if (teacherId === 'create') return;
    
    try {
      setLoading(true);
      const teacherRes = await adminAPI.getTeacher(teacherId);

      if (teacherRes.success && teacherRes.data) {
        const teacher = teacherRes.data;
        setName(teacher.name);
        setEmail(teacher.email);
        setPhone(teacher.phone || '');
      }
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      showAlertMessage('Error', 'Failed to load teacher data');
    } finally {
      setLoading(false);
    }
  };

  const showAlertMessage = (header, message, callback) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setAlertCallback(() => callback || null);
    setShowAlert(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showAlertMessage('Error', 'Please enter teacher name');
      return;
    }
    if (!email.trim()) {
      showAlertMessage('Error', 'Please enter teacher email');
      return;
    }

    try {
      setSaving(true);
      const response = await adminAPI.updateTeacher(teacherId, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });

      if (response.success) {
        showAlertMessage('Success', 'Teacher updated successfully', () => {
          history.goBack();
        });
      } else {
        showAlertMessage('Error', response.error?.message || 'Failed to update teacher');
      }
    } catch (error) {
      showAlertMessage('Error', error.response?.data?.error?.message || 'Failed to update teacher');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar className="admin-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/teachers" className="admin-back-btn" />
            </IonButtons>
            <IonTitle className="admin-title">Edit Teacher</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="admin-loading-container">
          <IonSpinner name="crescent" color="primary" />
          <IonText className="loading-text">Loading teacher details...</IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="admin-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/teachers" className="admin-back-btn" />
          </IonButtons>
          <IonTitle className="admin-title">Edit Teacher</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="edit-teacher-content" fullscreen>
        <div className="form-container">
          
          {/* Main Details Card */}
          <IonCard className="admin-card teacher-card">
            <IonCardContent>
              <div className="card-header-badge">
                <IonIcon icon={personOutline} className="card-header-icon" />
                <span>Personal Information</span>
              </div>

              <div className="input-field-group">
                <label className="admin-label">Teacher Name *</label>
                <div className="input-with-icon">
                  <IonIcon icon={personOutline} className="input-icon" />
                  <IonInput
                    className="admin-input"
                    value={name}
                    onIonInput={(e) => setName(e.detail.value || '')}
                    placeholder="Enter teacher name"
                    autoComplete="name"
                    autoCapitalize="words"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label className="admin-label">Email Address *</label>
                <div className="input-with-icon">
                  <IonIcon icon={mailOutline} className="input-icon" />
                  <IonInput
                    className="admin-input"
                    value={email}
                    onIonInput={(e) => setEmail(e.detail.value || '')}
                    placeholder="Enter teacher email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label className="admin-label">Phone Number</label>
                <div className="input-with-icon">
                  <IonIcon icon={callOutline} className="input-icon" />
                  <IonInput
                    className="admin-input"
                    value={phone}
                    onIonInput={(e) => setPhone(e.detail.value || '')}
                    placeholder="Enter phone number"
                    type="tel"
                    autoComplete="tel"
                    disabled={saving}
                  />
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Action Buttons */}
          <div className="button-actions-container">
            <IonButton 
              expand="block" 
              fill="outline" 
              color="medium" 
              className="btn-cancel" 
              onClick={() => history.goBack()} 
              disabled={saving}
            >
              <IonIcon icon={closeOutline} slot="start" />
              Cancel
            </IonButton>

            <IonButton 
              expand="block" 
              color="primary" 
              className="btn-save" 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? (
                <IonSpinner name="crescent" size="small" />
              ) : (
                <>
                  <IonIcon icon={saveOutline} slot="start" />
                  Save Changes
                </>
              )}
            </IonButton>
          </div>

        </div>

        {/* Alert */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => {
            setShowAlert(false);
            if (alertCallback) {
              alertCallback();
              setAlertCallback(null);
            }
          }}
          header={alertHeader}
          message={alertMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default EditTeacherScreen;