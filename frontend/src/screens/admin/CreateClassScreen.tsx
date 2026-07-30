/**
 * Admin Create Class Screen (Ionic React Modern Admin Version)
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
  IonSearchbar,
  IonAvatar,
  IonChip,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import {
  chevronForwardOutline,
  closeOutline,
  personOutline,
  schoolOutline,
  keyOutline,
  bookmarkOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import { User } from '../../types';
import './AdminTheme.css';

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
        
        // Reset form
        setClassName('');
        setSection('');
        setPassword('');
        setTeacherId(undefined);
        setSelectedTeacher(null);
      } else {
        setAlertMessage(response.error?.message || 'Failed to create class');
        setShowErrorAlert(true);
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'Failed to create class';
      console.error('Create Class Error:', error.response?.data || error.message);
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
          <IonTitle className="admin-title">Create New Class</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="create-class-content ion-padding">
        <div className="admin-container">
          
          {/* Header Banner Card */}
          <IonCard className="banner-card">
            <IonCardContent className="banner-content">
              <div className="banner-icon-box">
                <IonIcon icon={schoolOutline} />
              </div>
              <div>
                <h2 className="banner-title">Class Setup</h2>
                <p className="banner-subtitle">
                  Configure class credentials and assign a class teacher.
                </p>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Form Card */}
          <IonCard className="admin-form-card">
            <IonCardContent>
              
              {/* Class Name */}
              <div className="admin-input-group">
                <label className="admin-label">
                  Class Name <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <IonIcon icon={schoolOutline} className="input-icon" />
                  <IonInput
                    placeholder="e.g., Grade 10, MCA, Class 5"
                    value={className}
                    onIonInput={(e) => setClassName(e.detail.value || '')}
                    disabled={loading}
                    className="custom-admin-input"
                  />
                </div>
              </div>

              {/* Section */}
              <div className="admin-input-group">
                <label className="admin-label">Section (Optional)</label>
                <div className="input-wrapper">
                  <IonIcon icon={bookmarkOutline} className="input-icon" />
                  <IonInput
                    placeholder="e.g., A, B, Section-1"
                    value={section}
                    onIonInput={(e) => setSection(e.detail.value || '')}
                    maxlength={10}
                    disabled={loading}
                    className="custom-admin-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="admin-input-group">
                <label className="admin-label">
                  Class Access Password <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <IonIcon icon={keyOutline} className="input-icon" />
                  <IonInput
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onIonInput={(e) => setPassword(e.detail.value || '')}
                    disabled={loading}
                    className="custom-admin-input"
                  />
                </div>
                <span className="admin-hint">
                  Students and parents use this password for class dashboard authentication.
                </span>
              </div>

              {/* Teacher Selector */}
              <div className="admin-input-group">
                <label className="admin-label">Class Teacher (Optional)</label>
                {fetchingTeachers ? (
                  <div className="teacher-selector-btn loading">
                    <IonSpinner name="crescent" color="primary" />
                    <IonText color="medium">Fetching faculty list...</IonText>
                  </div>
                ) : selectedTeacher ? (
                  <div
                    className="teacher-selector-btn selected"
                    onClick={() => setShowTeacherPicker(true)}
                  >
                    <div className="teacher-avatar">
                      {selectedTeacher.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="teacher-details">
                      <span className="teacher-name">{selectedTeacher.name}</span>
                      <span className="teacher-email">{selectedTeacher.email}</span>
                    </div>
                    <IonChip color="primary" className="change-chip">
                      Change
                    </IonChip>
                  </div>
                ) : (
                  <div
                    className="teacher-selector-btn placeholder"
                    onClick={() => setShowTeacherPicker(true)}
                  >
                    <div className="placeholder-content">
                      <IonIcon icon={personOutline} className="placeholder-icon" />
                      <span>Assign a Class Teacher...</span>
                    </div>
                    <IonIcon icon={chevronForwardOutline} className="arrow-icon" />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <IonButton
                expand="block"
                onClick={handleSubmit}
                disabled={loading}
                className="admin-submit-btn"
              >
                {loading ? <IonSpinner name="crescent" /> : 'Create Class'}
              </IonButton>

            </IonCardContent>
          </IonCard>
        </div>

        {/* Teacher Selection Modal Sheet */}
        <IonModal
          isOpen={showTeacherPicker}
          onDidDismiss={() => setShowTeacherPicker(false)}
          className="admin-modal-sheet"
        >
          <div className="modal-header">
            <div className="modal-title-box">
              <h3>Select Class Teacher</h3>
              <p>Choose an active faculty member</p>
            </div>
            <IonButton fill="clear" color="medium" onClick={() => setShowTeacherPicker(false)}>
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </div>

          <div className="modal-search-bar">
            <IonSearchbar
              placeholder="Search by name or email..."
              value={searchQuery}
              onIonInput={(e) => setSearchQuery(e.detail.value || '')}
              showClearButton="always"
            />
          </div>

          <IonContent className="modal-list-content">
            {filteredTeachers.length === 0 ? (
              <div className="empty-teacher-state">
                <IonIcon icon={personOutline} />
                <p>No teachers matched your search</p>
              </div>
            ) : (
              <IonList lines="none" className="teacher-list">
                {filteredTeachers.map((teacher) => (
                  <IonItem
                    key={teacher.id}
                    button
                    onClick={() => handleSelectTeacher(teacher)}
                    className="teacher-list-item"
                  >
                    <IonAvatar slot="start" className="list-avatar">
                      <div className="avatar-initials">{teacher.name.charAt(0).toUpperCase()}</div>
                    </IonAvatar>
                    <div className="item-teacher-info">
                      <span className="item-name">{teacher.name}</span>
                      <span className="item-email">{teacher.email}</span>
                    </div>
                    {teacherId === teacher.id && (
                      <IonIcon
                        icon={checkmarkCircleOutline}
                        slot="end"
                        color="primary"
                        className="check-icon"
                      />
                    )}
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonContent>
        </IonModal>

        {/* Alerts */}
        <IonAlert
          isOpen={showSuccessAlert}
          onDidDismiss={handleSuccessDismiss}
          header="Class Created Successfully"
          message={
            generatedClassCode
              ? `Generated Class Code: ${generatedClassCode}\n\nShare this code with students/parents for authentication.`
              : 'Class has been created successfully.'
          }
          buttons={[{ text: 'Done', handler: handleSuccessDismiss }]}
        />

        <IonAlert
          isOpen={showErrorAlert}
          onDidDismiss={() => setShowErrorAlert(false)}
          header="Error Creating Class"
          message={alertMessage}
          buttons={['Dismiss']}
        />
      </IonContent>
    </IonPage>
  );
};

export default CreateClassScreen;