/**
 * Edit Teacher Screen (Ionic React Version)
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
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonSpinner,
  IonAlert,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { useHistory, useParams } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { Class } from '../../types';
import './EditTeacherScreen.css';

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
    // Skip fetching if teacherId is 'create' (handled by redirect above)
    if (teacherId === 'create') {
      return;
    }
    
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
        <IonHeader>
          <IonToolbar>
            <IonBackButton defaultHref="/admin/teachers" />
            <IonTitle>Edit Teacher</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="edit-teacher-content" fullscreen>
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p className="loading-text">Loading teacher data...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonBackButton defaultHref="/admin/teachers" />
          <IonTitle>Edit Teacher</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="edit-teacher-content" fullscreen>
        <div className="form-container">
          <div className="form-section">
            <h2 className="section-title">Teacher Information</h2>

            <IonItem className="input-item">
              <IonLabel position="stacked">Teacher Name *</IonLabel>
              <IonInput
                value={name}
                onIonInput={(e) => setName(e.detail.value || '')}
                placeholder="Enter teacher name"
                autocomplete="name"
                autocapitalize="words"
              />
            </IonItem>

            <IonItem className="input-item">
              <IonLabel position="stacked">Email *</IonLabel>
              <IonInput
                value={email}
                onIonInput={(e) => setEmail(e.detail.value || '')}
                placeholder="Enter teacher email"
                type="email"
                autocomplete="email"
                autocapitalize="none"
              />
            </IonItem>

            <IonItem className="input-item">
              <IonLabel position="stacked">Phone Number</IonLabel>
              <IonInput
                value={phone}
                onIonInput={(e) => setPhone(e.detail.value || '')}
                placeholder="Enter phone number"
                type="tel"
                autocomplete="tel"
              />
            </IonItem>

            <IonItem className="input-item">
              <IonLabel position="stacked">Assigned Class</IonLabel>
              <IonSelect
                value={classId}
                onIonChange={(e) => setClassId(e.detail.value || undefined)}
                placeholder="Select a class"
                interface="action-sheet"
              >
                <IonSelectOption value="">No class assigned</IonSelectOption>
                {classes.map((cls) => (
                  <IonSelectOption key={cls.id} value={cls.id}>
                    {cls.section ? `${cls.name} - ${cls.section}` : cls.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          </div>

          <IonButton
            expand="block"
            className="save-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <IonSpinner name="crescent" /> : 'Save Changes'}
          </IonButton>
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