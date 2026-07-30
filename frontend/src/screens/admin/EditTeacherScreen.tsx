/**
 * Edit Teacher Screen (Ionic React - Modern Admin UI)
 * Allows admin to edit teacher details and assign classes
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
  IonSelect,
  IonSelectOption,
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
  schoolOutline,
  saveOutline,
  closeOutline
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import { Class } from '../../types';
import './AdminTheme.css';

interface RouteParams {
  teacherId: string;
}

const EditTeacherScreen: React.FC = () => {
  const history = useHistory();
  const { teacherId } = useParams<RouteParams>();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [classId, setClassId] = useState<string | undefined>(undefined);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertCallback, setAlertCallback] = useState<(() => void) | null>(null);

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
      const [teacherRes, classesRes] = await Promise.all([
        adminAPI.getTeacher(teacherId),
        adminAPI.getClasses(),
      ]);

      if (teacherRes.success && teacherRes.data) {
        const teacher = teacherRes.data;
        setName(teacher.name);
        setEmail(teacher.email);
        setPhone(teacher.phone || '');
        setClassId(teacher.classId);
      }

      if (classesRes.success && classesRes.data) {
        setClasses(classesRes.data);
      }
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      showAlertMessage('Error', 'Failed to load teacher data');
    } finally {
      setLoading(false);
    }
  };

  const showAlertMessage = (header: string, message: string, callback?: () => void) => {
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
        classId: classId,
      });

      if (response.success) {
        showAlertMessage('Success', 'Teacher updated successfully', () => {
          history.goBack();
        });
      } else {
        showAlertMessage('Error', response.error?.message || 'Failed to update teacher');
      }
    } catch (error: any) {
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
                    autocomplete="name"
                    autocapitalize="words"
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
                    autocomplete="email"
                    autocapitalize="none"
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
                    autocomplete="tel"
                    disabled={saving}
                  />
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Academic Allocation Card */}
          <IonCard className="admin-card allocation-card">
            <IonCardContent>
              <div className="card-header-badge">
                <IonIcon icon={schoolOutline} className="card-header-icon" />
                <span>Class Allocation</span>
              </div>

              <div className="input-field-group">
                <label className="admin-label">Assigned Class</label>
                <IonSelect
                  className="admin-select"
                  value={classId}
                  onIonChange={(e) => setClassId(e.detail.value || undefined)}
                  placeholder="Select a class to assign"
                  interface="action-sheet"
                  disabled={saving}
                >
                  <IonSelectOption value="">No class assigned</IonSelectOption>
                  {classes.map((cls) => (
                    <IonSelectOption key={cls.id} value={cls.id}>
                      {cls.section ? `${cls.name} - ${cls.section}` : cls.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
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