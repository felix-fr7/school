/**
 * Edit Student Screen (Ionic React - Modern Admin UI)
 * Allows admin to edit student details and assign classes
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
  closeOutline,
  barcodeOutline,
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import { Class } from '../../types';
import './AdminTheme.css';

interface RouteParams {
  studentId: string;
}

const EditStudentScreen: React.FC = () => {
  const history = useHistory();
  const { studentId } = useParams<RouteParams>();

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
    // If studentId is 'create', redirect to the create student page
    if (studentId === 'create') {
      history.push('/admin/students/create');
      return;
    }
    
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    if (studentId === 'create') return;
    
    try {
      setLoading(true);
      const [studentRes, classesRes] = await Promise.all([
        adminAPI.getStudent(studentId),
        adminAPI.getClasses(),
      ]);

      if (studentRes.success && studentRes.data) {
        const student = studentRes.data;
        setName(student.name);
        setEmail(student.email || '');
        setPhone(student.phone || '');
        setClassId(student.classId);
      }

      if (classesRes.success && classesRes.data) {
        setClasses(classesRes.data);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      showAlertMessage('Error', 'Failed to load student data');
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
    // Validation
    if (!name.trim()) {
      showAlertMessage('Error', 'Please enter student name');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        classId: classId,
      };
      const response = await adminAPI.updateStudent(studentId, payload);

      if (response.success) {
        showAlertMessage('Success', 'Student updated successfully', () => {
          history.goBack();
        });
      } else {
        showAlertMessage('Error', response.error?.message || 'Failed to update student');
      }
    } catch (error: any) {
      showAlertMessage('Error', error.response?.data?.error?.message || 'Failed to update student');
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
              <IonBackButton defaultHref="/admin/students" className="admin-back-btn" />
            </IonButtons>
            <IonTitle className="admin-title">Edit Student</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="admin-loading-container">
          <IonSpinner name="crescent" color="primary" />
          <IonText className="loading-text">Loading student details...</IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="admin-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/students" className="admin-back-btn" />
          </IonButtons>
          <IonTitle className="admin-title">Edit Student</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="edit-student-content" fullscreen>
        <div className="form-container">
          
          {/* Personal Information Card */}
          <IonCard className="admin-card student-card">
            <IonCardContent>
              <div className="card-header-badge">
                <IonIcon icon={personOutline} className="card-header-icon" />
                <span>Personal Information</span>
              </div>

              <div className="input-field-group">
                <label className="admin-label">Student Name *</label>
                <div className="input-with-icon">
                  <IonIcon icon={personOutline} className="input-icon" />
                  <IonInput
                    className="admin-input"
                    value={name}
                    onIonInput={(e) => setName(e.detail.value || '')}
                    placeholder="Enter student name"
                    autocomplete="name"
                    autocapitalize="words"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label className="admin-label">Roll Number / Admission No</label>
                <div className="input-with-icon">
                  <IonIcon icon={barcodeOutline} className="input-icon" />
                  <IonInput
                    className="admin-input"
                    value=""
                    placeholder="Roll number (read-only)"
                    disabled={true}
                  />
                </div>
                <IonText color="medium" className="helper-text">
                  Roll number cannot be modified after creation
                </IonText>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Contact Information Card */}
          <IonCard className="admin-card contact-card">
            <IonCardContent>
              <div className="card-header-badge">
                <IonIcon icon={callOutline} className="card-header-icon" />
                <span>Contact Information</span>
              </div>

              <div className="input-field-group">
                <label className="admin-label">Email Address</label>
                <div className="input-with-icon">
                  <IonIcon icon={mailOutline} className="input-icon" />
                  <IonInput
                    className="admin-input"
                    value={email}
                    onIonInput={(e) => setEmail(e.detail.value || '')}
                    placeholder="Enter email address (optional)"
                    type="email"
                    autocomplete="email"
                    autocapitalize="none"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label className="admin-label">Phone / Parent Contact</label>
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
          <IonCard className="admin-card academic-card">
            <IonCardContent>
              <div className="card-header-badge">
                <IonIcon icon={schoolOutline} className="card-header-icon" />
                <span>Academic Allocation</span>
              </div>

              <div className="input-field-group">
                <label className="admin-label">Assign Class *</label>
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
                <IonSpinner name="crescent" style={{ width: '18px', height: '18px' }} />
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

export default EditStudentScreen;