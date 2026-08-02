/**
 * Edit Class Screen (Ionic React - Modern Admin UI)
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
import { 
  chevronForwardOutline, 
  closeOutline, 
  searchOutline, 
  keyOutline, 
  lockClosedOutline,
  personOutline,
  schoolOutline,
  checkmarkCircleOutline,
  trashOutline
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import './EditClassScreen.css';

const EditClassScreen = () => {
  const { classId } = useParams();
  const history = useHistory();

  const [classData, setClassData] = useState(null);
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [teacherId, setTeacherId] = useState(undefined);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teachers, setTeachers] = useState([]);
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
      // Fetch all available teachers (use a very high limit to ensure all are returned)
      const response = await adminAPI.getAvailableTeachers(classId, '', 1, 10000);
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

  const handleSelectTeacher = (teacher) => {
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
    } catch (error) {
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
      const payload = {
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
    } catch (error) {
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
        <IonHeader className="ion-no-border">
          <IonToolbar className="admin-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/classes" className="admin-back-btn" />
            </IonButtons>
            <IonTitle className="admin-title">Edit Class</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="admin-loading-container">
          <IonSpinner name="crescent" color="primary" />
          <IonText className="loading-text">Loading class details...</IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="admin-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/classes" className="admin-back-btn" />
          </IonButtons>
          <IonTitle className="admin-title">Edit Class</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="edit-class-content">
        <div className="form-container">
          
          {/* Class ID Highlight Card */}
          <IonCard className="admin-card id-card">
            <IonCardContent>
              <div className="card-header-badge">
                <IonIcon icon={keyOutline} className="card-header-icon" />
                <span>Class Login ID</span>
              </div>
              <div className="class-id-value">
                {classData?.classCode || classData?.class_code || 'Not Generated'}
              </div>
              <p className="card-subtext">
                Share this ID with students and parents for logging into the portal.
              </p>
            </IonCardContent>
          </IonCard>

          {/* Password Security Card */}
          <IonCard className="admin-card security-card">
            <IonCardContent>
              <div className="card-header-badge">
                <IonIcon icon={lockClosedOutline} className="card-header-icon" />
                <span>Security Settings</span>
              </div>
              <h4 className="card-title">Reset Class Password</h4>
              <p className="card-subtext">Set a new login password for students of this class.</p>
              
              <div className="password-input-group">
                <IonInput
                  className="admin-input password-field"
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={classPassword}
                  onIonInput={(e) => setClassPassword(e.detail.value || '')}
                  autocapitalize="off"
                />
                <IonButton
                  className="admin-btn-action"
                  color="primary"
                  onClick={handleUpdatePassword}
                  disabled={!classPassword || classPassword.length < 6 || updatingPassword}
                >
                  {updatingPassword ? <IonSpinner name="crescent" size="small" /> : 'Update'}
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Class Details Form Card */}
          <IonCard className="admin-card form-card">
            <IonCardContent>
              <div className="card-header-badge">
                <IonIcon icon={schoolOutline} className="card-header-icon" />
                <span>Class Information</span>
              </div>

              <div className="input-field-group">
                <label className="admin-label">Class Name *</label>
                <IonInput
                  className="admin-input"
                  placeholder="e.g. Grade 10, MCA"
                  value={className}
                  onIonInput={(e) => setClassName(e.detail.value || '')}
                  autocapitalize="words"
                  disabled={saving}
                />
              </div>

              <div className="input-field-group">
                <label className="admin-label">Section (Optional)</label>
                <IonInput
                  className="admin-input"
                  placeholder="e.g. A, B, Sec-1"
                  value={section}
                  onIonInput={(e) => setSection(e.detail.value || '')}
                  autocapitalize="characters"
                  maxlength={10}
                  disabled={saving}
                />
              </div>

              <div className="input-field-group">
                <label className="admin-label">Assigned Class Teacher</label>
                {fetchingTeachers ? (
                  <div className="teacher-loading-box">
                    <IonSpinner name="crescent" size="small" />
                    <span>Loading teachers...</span>
                  </div>
                ) : selectedTeacher ? (
                  <div className="teacher-selected-box">
                    <div className="teacher-details">
                      <span className="teacher-name">{selectedTeacher.name}</span>
                      <span className="teacher-email">{selectedTeacher.email}</span>
                    </div>
                    <div className="teacher-actions">
                      <IonButton fill="clear" color="primary" size="small" onClick={() => setShowTeacherPicker(true)}>
                        Change
                      </IonButton>
                      <IonButton fill="clear" color="danger" size="small" onClick={handleClearTeacher}>
                        <IonIcon icon={trashOutline} slot="icon-only" />
                      </IonButton>
                    </div>
                  </div>
                ) : (
                  <div className="teacher-select-btn" onClick={() => setShowTeacherPicker(true)}>
                    <div className="select-placeholder">
                      <IonIcon icon={personOutline} />
                      <span>Assign a teacher...</span>
                    </div>
                    <IonIcon icon={chevronForwardOutline} className="arrow-icon" />
                  </div>
                )}
              </div>
            </IonCardContent>
          </IonCard>

          {/* Action Buttons */}
          <div className="button-actions-container">
            <IonButton expand="block" fill="outline" color="medium" className="btn-cancel" onClick={() => history.goBack()} disabled={saving}>
              Cancel
            </IonButton>
            <IonButton expand="block" color="primary" className="btn-save" onClick={handleSubmit} disabled={saving}>
              {saving ? <IonSpinner name="crescent" size="small" /> : 'Save Changes'}
            </IonButton>
          </div>
        </div>

        {/* Teacher Selection Modal */}
        <IonModal isOpen={showTeacherPicker} onDidDismiss={() => setShowTeacherPicker(false)} className="admin-modal">
          <div className="modal-wrapper">
            <div className="modal-header">
              <h3>Select Class Teacher</h3>
              <IonButton fill="clear" color="medium" onClick={() => setShowTeacherPicker(false)}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </div>

            <p className="modal-subtext">Only teachers available for assignment are shown below.</p>

            <div className="modal-search-box">
              <IonInput
                className="admin-input search-input"
                placeholder="Search by name or email..."
                value={searchQuery}
                onIonInput={(e) => setSearchQuery(e.detail.value || '')}
              >
                <IonIcon icon={searchOutline} slot="start" />
              </IonInput>
            </div>

            {filteredTeachers.length === 0 ? (
              <div className="modal-empty-state">
                <IonText color="medium">No available teachers found.</IonText>
              </div>
            ) : (
              <IonList className="teacher-modal-list">
                {filteredTeachers.map((teacher) => (
                  <IonItem key={teacher.id} button onClick={() => handleSelectTeacher(teacher)} lines="full" className="teacher-list-item">
                    <div className="modal-teacher-info">
                      <span className="modal-teacher-name">{teacher.name}</span>
                      <span className="modal-teacher-email">{teacher.email}</span>
                      {teacher.class && (
                        <span className="modal-teacher-assigned">
                          Currently: {teacher.class.name}{teacher.class.section ? ` - ${teacher.class.section}` : ''}
                        </span>
                      )}
                    </div>
                    <IonIcon icon={checkmarkCircleOutline} slot="end" className="select-check-icon" />
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