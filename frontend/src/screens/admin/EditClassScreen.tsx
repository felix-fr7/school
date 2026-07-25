/**
 * Edit Class Screen (Ionic React Version)
 * Allows admin to edit class details
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
import { useParams, useHistory } from 'react-router-dom';
import { chevronForwardOutline, closeOutline, searchOutline, keyOutline, lockClosedOutline } from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import { User, Class } from '../../types';
import './EditClassScreen.css';

interface EditClassParams {
  classId: string;
}

const EditClassScreen: React.FC = () => {
  const { classId } = useParams<EditClassParams>();
  const history = useHistory();

  const [classData, setClassData] = useState<Class | null>(null);
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [teacherId, setTeacherId] = useState<string | undefined>(undefined);
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classPassword, setClassPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingTeachers, setFetchingTeachers] = useState(false);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // If classId is 'create', redirect to the create class page
    if (classId === 'create') {
      history.push('/admin/classes/create');
      return;
    }
    
    if (!classId) {
      setAlertMessage('No class ID provided');
      setIsSuccess(false);
      setShowAlert(true);
      return;
    }
    fetchClassData();
    fetchAvailableTeachers();
  }, [classId]);

  const fetchClassData = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getClass(classId);
      if (response.success && response.data) {
        const data = response.data;
        setClassData(data);
        setClassName(data.name);
        setSection(data.section || '');
        if (data.teacherId) {
          setTeacherId(data.teacherId);
        }
      }
    } catch (error) {
      console.error('Error fetching class data:', error);
      setAlertMessage('Failed to load class data');
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTeachers = async () => {
    try {
      setFetchingTeachers(true);
      const response = await adminAPI.getAvailableTeachers(classId, '', 1, 100);
      if (response.success && response.data) {
        setTeachers(response.data.teachers);
      }
    } catch (error) {
      console.error('Error fetching available teachers:', error);
    } finally {
      setFetchingTeachers(false);
    }
  };

  useEffect(() => {
    if (teacherId && teachers.length > 0) {
      const teacher = teachers.find(t => t.id === teacherId);
      if (teacher) {
        setSelectedTeacher(teacher);
      }
    }
  }, [teacherId, teachers]);

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

  const handleClearTeacher = () => {
    setSelectedTeacher(null);
    setTeacherId(undefined);
  };

  const handleUpdatePassword = async () => {
    if (!classPassword || classPassword.length < 6) {
      setAlertMessage('Password must be at least 6 characters long');
      setIsSuccess(false);
      setShowAlert(true);
      return;
    }

    try {
      setUpdatingPassword(true);
      const response = await adminAPI.resetClassPassword(classId, classPassword);

      if (response.success) {
        setAlertMessage('Class password updated successfully!');
        setIsSuccess(true);
        setShowAlert(true);
        setClassPassword('');
      } else {
        setAlertMessage(response.error?.message || 'Failed to update password');
        setIsSuccess(false);
        setShowAlert(true);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update password';
      setAlertMessage(errorMessage);
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSubmit = async () => {
    if (!className.trim()) {
      setAlertMessage('Please enter class name');
      setIsSuccess(false);
      setShowAlert(true);
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name: className.trim(),
        section: section.trim() || undefined,
      };

      if (teacherId !== undefined) {
        payload.teacherId = teacherId;
      }

      const response = await adminAPI.updateClass(classId, payload);

      if (response.success) {
        setAlertMessage('Class updated successfully!');
        setIsSuccess(true);
        setShowAlert(true);
      } else {
        setAlertMessage(response.error?.message || 'Failed to update class');
        setIsSuccess(false);
        setShowAlert(true);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update class';
      setAlertMessage(errorMessage);
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const handleAlertDismiss = () => {
    setShowAlert(false);
    if (isSuccess) {
      history.goBack();
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/classes" />
            </IonButtons>
            <IonTitle>Edit Class</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
          <IonText color="medium"><p>Loading class data...</p></IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/classes" />
          </IonButtons>
          <IonTitle>Edit Class</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="edit-class-content">
        <div className="form-container">
          {/* Class ID Card */}
          <IonCard className="class-id-card">
            <IonCardContent>
              <div className="bento-header">
                <IonIcon icon={keyOutline} className="bento-icon" />
                <span className="bento-title">Class Login ID</span>
              </div>
              <p className="class-id-value">{classData?.classCode || classData?.class_code || 'Not yet generated'}</p>
              <IonText color="medium" className="class-id-note">Share this ID with students/parents for class login</IonText>
            </IonCardContent>
          </IonCard>

          {/* Password Card */}
          <IonCard className="password-card">
            <IonCardContent>
              <h4 className="password-card-title">
                <IonIcon icon={lockClosedOutline} /> Class Login Password
              </h4>
              <IonText color="medium" className="password-card-note">
                Set a password for students/parents to login to this class.
              </IonText>
              <div className="password-input-row">
                <IonInput
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  value={classPassword}
                  onIonInput={(e) => setClassPassword(e.detail.value || '')}
                  autocapitalize="off"
                />
                <IonButton
                  color="primary"
                  onClick={handleUpdatePassword}
                  disabled={!classPassword || classPassword.length < 6 || updatingPassword}
                >
                  {updatingPassword ? <IonSpinner name="crescent" /> : 'Update'}
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>

          <IonText color="medium" className="description">
            Edit class details below. Changes will be saved to the database.
          </IonText>

          <div className="input-group">
            <label className="input-label">Class Name *</label>
            <IonInput
              placeholder="e.g., Class 10, Grade 5, MCA"
              value={className}
              onIonInput={(e) => setClassName(e.detail.value || '')}
              autocapitalize="words"
              disabled={saving}
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
              disabled={saving}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Assigned Class Teacher (Optional)</label>
            {fetchingTeachers ? (
              <div className="teacher-picker-loading">
                <IonSpinner name="crescent" />
                <IonText color="medium">Loading available teachers...</IonText>
              </div>
            ) : selectedTeacher ? (
              <div className="selected-teacher-container">
                <div className="teacher-picker-button" onClick={() => setShowTeacherPicker(true)}>
                  <div className="selected-teacher">
                    <span className="selected-teacher-name">{selectedTeacher.name}</span>
                    <span className="selected-teacher-email">{selectedTeacher.email}</span>
                  </div>
                  <IonText color="primary" className="change-text">Change</IonText>
                </div>
                <IonButton fill="outline" color="danger" size="small" onClick={handleClearTeacher}>
                  <IonIcon icon={closeOutline} /> Remove
                </IonButton>
              </div>
            ) : (
              <div className="teacher-picker-button" onClick={() => setShowTeacherPicker(true)}>
                <IonText color="medium">Select a teacher...</IonText>
                <IonIcon icon={chevronForwardOutline} className="dropdown-icon" />
              </div>
            )}
          </div>

          <div className="button-row">
            <IonButton expand="block" color="medium" onClick={() => history.goBack()} disabled={saving}>
              Cancel
            </IonButton>
            <IonButton expand="block" color="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? <IonSpinner name="crescent" /> : 'Save Changes'}
            </IonButton>
          </div>
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

            <IonText color="medium" className="modal-note">
              Only teachers without a class assignment are shown.
            </IonText>

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
                <IonText color="medium">No available teachers found</IonText>
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
                      {teacher.class && (
                        <span className="teacher-item-class">
                          Assigned: {teacher.class.name}{teacher.class.section ? ` - ${teacher.class.section}` : ''}
                        </span>
                      )}
                    </div>
                    <IonIcon icon={chevronForwardOutline} className="select-icon" />
                  </IonItem>
                ))}
              </IonList>
            )}
          </div>
        </IonModal>

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

export default EditClassScreen;