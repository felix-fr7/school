/**
 * Admin Create Class Screen (Ionic React Version)
 * Create a new class with optional teacher assignment
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
  IonIcon,
  IonInput,
  IonText,
  IonSpinner,
  IonAlert,
  IonModal,
  IonList,
  IonItem,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { chevronForwardOutline, closeOutline, searchOutline } from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import { User } from '../../types';
import './CreateClassScreen.css';

const CreateClassScreen: React.FC = () => {
  const history = useHistory();
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [password, setPassword] = useState('');
  const [teacherId, setTeacherId] = useState<string | undefined>(undefined);
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTeachers, setFetchingTeachers] = useState(false);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatedClassCode, setGeneratedClassCode] = useState<string | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setFetchingTeachers(true);
      const response = await adminAPI.getTeachers(1, 100);
      if (response.success && response.data) {
        setTeachers(response.data.teachers);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setFetchingTeachers(false);
    }
  };

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTeacher = (teacher: User) => {
    setSelectedTeacher(teacher);
    setTeacherId(teacher.id);
    setShowTeacherPicker(false);
    setSearchQuery('');
  };

  const handleSubmit = async () => {
    // Validation
    if (!className.trim()) {
      setAlertMessage('Please enter class name');
      setShowErrorAlert(true);
      return;
    }

    if (!password.trim()) {
      setAlertMessage('Please enter a password for class login');
      setShowErrorAlert(true);
      return;
    }

    if (password.length < 6) {
      setAlertMessage('Password must be at least 6 characters long');
      setShowErrorAlert(true);
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        name: className.trim(),
        section: section.trim() || undefined,
        password: password,
      };

      if (teacherId) {
        payload.assignedTeacherId = teacherId;
      }

      const response = await adminAPI.createClass(payload);

      if (response.success && response.data) {
        const classCode = response.data.classCode || 'N/A';
        setGeneratedClassCode(classCode);
        setShowSuccessAlert(true);
        // Reset form after success
        setClassName('');
        setSection('');
        setPassword('');
        setTeacherId(undefined);
        setSelectedTeacher(null);
        setGeneratedClassCode(null);
      } else {
        setAlertMessage(response.error?.message || 'Failed to create class');
        setShowErrorAlert(true);
      }
    } catch (error: any) {
      setAlertMessage(error.response?.data?.error?.message || 'Failed to create class');
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
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/classes" />
          </IonButtons>
          <IonTitle>Create Class</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="create-class-content">
        <div className="form-container">
          <IonText color="medium" className="description">
            Create a new class for your school. Optionally assign an existing teacher as the class teacher.
          </IonText>

          <div className="input-group">
            <label className="input-label">Class Name *</label>
            <IonInput
              placeholder="e.g., Class 10, Grade 5, MCA"
              value={className}
              onIonInput={(e) => setClassName(e.detail.value || '')}
              autocapitalize="words"
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Section (Optional)</label>
            <IonInput
              placeholder="e.g., A, B, C, -A, -B"
              value={section}
              onIonInput={(e) => setSection(e.detail.value || '')}
              autocapitalize="characters"
              maxlength={10}
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Class Login Password *</label>
            <IonInput
              type="password"
              placeholder="Set a password for class login (min 6 characters)"
              value={password}
              onIonInput={(e) => setPassword(e.detail.value || '')}
              autocapitalize="off"
              disabled={loading}
            />
            <IonText color="medium" className="hint-text">
              This password will be used by students/parents to login to this class.
            </IonText>
          </div>

          <div className="input-group">
            <label className="input-label">Assigned Class Teacher (Optional)</label>
            {fetchingTeachers ? (
              <div className="teacher-picker-button">
                <IonSpinner name="crescent" />
                <IonText color="medium">Loading teachers...</IonText>
              </div>
            ) : selectedTeacher ? (
              <div className="teacher-picker-button" onClick={() => setShowTeacherPicker(true)}>
                <div className="selected-teacher">
                  <span className="selected-teacher-name">{selectedTeacher.name}</span>
                  <span className="selected-teacher-email">{selectedTeacher.email}</span>
                </div>
                <IonText color="primary" className="change-text">Change</IonText>
              </div>
            ) : (
              <div className="teacher-picker-button" onClick={() => setShowTeacherPicker(true)}>
                <IonText color="medium">Select a teacher...</IonText>
                <IonIcon icon={chevronForwardOutline} className="dropdown-icon" />
              </div>
            )}
          </div>

          <IonButton
            expand="block"
            color="primary"
            onClick={handleSubmit}
            disabled={loading}
            className="submit-button"
          >
            {loading ? <IonSpinner name="crescent" /> : 'Create Class'}
          </IonButton>
        </div>

        {/* Teacher Selection Modal */}
        <IonModal isOpen={showTeacherPicker} onDidDismiss={() => setShowTeacherPicker(false)}>
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Select Class Teacher</h3>
              <IonButton fill="clear" onClick={() => setShowTeacherPicker(false)}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </div>

            <div className="search-container">
              <IonInput
                placeholder="Search teachers by name or email..."
                value={searchQuery}
                onIonInput={(e) => setSearchQuery(e.detail.value || '')}
              >
                <IonIcon icon={searchOutline} slot="start" />
              </IonInput>
            </div>

            {filteredTeachers.length === 0 ? (
              <div className="empty-state">
                <IonText color="medium">No teachers found</IonText>
              </div>
            ) : (
              <IonList>
                {filteredTeachers.map((teacher) => (
                  <IonItem
                    key={teacher.id}
                    button
                    onClick={() => handleSelectTeacher(teacher)}
                    className="teacher-item"
                  >
                    <div className="teacher-item-info">
                      <span className="teacher-item-name">{teacher.name}</span>
                      <span className="teacher-item-email">{teacher.email}</span>
                    </div>
                    <IonIcon icon={chevronForwardOutline} className="select-icon" />
                  </IonItem>
                ))}
              </IonList>
            )}
          </div>
        </IonModal>

        <IonAlert
          isOpen={showSuccessAlert}
          onDidDismiss={handleSuccessDismiss}
          header="Success"
          message={`Class created successfully!\n\nClass ID: ${generatedClassCode}\n\nShare this ID with students/parents for login.`}
          buttons={['OK']}
        />

        <IonAlert
          isOpen={showErrorAlert}
          onDidDismiss={() => setShowErrorAlert(false)}
          header="Error"
          message={alertMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default CreateClassScreen;