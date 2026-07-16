/**
 * Teacher Students Screen (Ionic React Version)
 * Student management for teachers - view list, add manually, edit student details, and bulk upload
 */

import React, { useEffect, useState } from 'react';
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
  IonAvatar,
  IonText,
  IonSpinner,
  IonList,
  IonItem,
  IonCard,
  IonCardContent,
  IonInput,
  IonModal,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
} from '@ionic/react';
import {
  refreshOutline,
  cloudUploadOutline,
  downloadOutline,
  addCircleOutline,
  closeOutline,
  personOutline,
  mailOutline,
  createOutline,
} from 'ionicons/icons';
import { teacherAPI } from '../../services/api';
import './TeacherStudentsScreen.css';

interface Student {
  id: string;
  name: string;
  email: string;
  studentId?: string;
  createdAt: string;
}

const TeacherStudentsScreen: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showUploadResultModal, setShowUploadResultModal] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    totalProcessed: number;
    successfullyCreated: number;
    duplicates: number;
  } | null>(null);

  // Manual student creation state
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const fetchStudents = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const response = await teacherAPI.getMyStudents(1, 50);
      if (response.success && response.data) {
        setStudents(response.data.students);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    await fetchStudents(true);
    event.detail.complete();
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditEmail(student.email);
    setEditStudentId(student.studentId || '');
    setShowEditModal(true);
  };

  const validateEditForm = () => {
    if (!editName.trim()) {
      setAlertMessage('Please enter student name');
      setIsSuccess(false);
      setShowAlert(true);
      return false;
    }
    if (!editStudentId.trim()) {
      setAlertMessage('Please enter student ID');
      setIsSuccess(false);
      setShowAlert(true);
      return false;
    }
    return true;
  };

  const handleUpdateStudent = async () => {
    if (!validateEditForm() || !editingStudent) return;

    try {
      setSaving(true);
      const response = await teacherAPI.updateStudent(editingStudent.id, {
        name: editName.trim(),
        email: editEmail.trim() || undefined,
        studentId: editStudentId.trim(),
      });

      if (response.success) {
        setAlertMessage('Student updated successfully');
        setIsSuccess(true);
        setShowAlert(true);
        setShowEditModal(false);
        setEditingStudent(null);
        fetchStudents();
      }
    } catch (error: any) {
      setAlertMessage(error.response?.data?.error?.message || 'Failed to update student');
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingStudent(null);
    setEditName('');
    setEditEmail('');
    setEditStudentId('');
  };

  // Manual student creation handlers
  const openAddStudentModal = () => {
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentId('');
    setNewStudentPhone('');
    setNewStudentPassword('');
    setShowAddStudentModal(true);
  };

  const closeAddStudentModal = () => {
    setShowAddStudentModal(false);
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentId('');
    setNewStudentPhone('');
    setNewStudentPassword('');
  };

  const validateNewStudentForm = () => {
    if (!newStudentName.trim()) {
      setAlertMessage('Please enter student name');
      setIsSuccess(false);
      setShowAlert(true);
      return false;
    }
    if (!newStudentEmail.trim()) {
      setAlertMessage('Please enter student email');
      setIsSuccess(false);
      setShowAlert(true);
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStudentEmail.trim())) {
      setAlertMessage('Please enter a valid email address');
      setIsSuccess(false);
      setShowAlert(true);
      return false;
    }
    if (!newStudentId.trim()) {
      setAlertMessage('Please enter student ID (roll number)');
      setIsSuccess(false);
      setShowAlert(true);
      return false;
    }
    if (newStudentPassword && newStudentPassword.length < 6) {
      setAlertMessage('Password must be at least 6 characters');
      setIsSuccess(false);
      setShowAlert(true);
      return false;
    }
    return true;
  };

  const handleCreateStudentManual = async () => {
    if (!validateNewStudentForm()) return;

    try {
      setSaving(true);
      const response = await teacherAPI.createStudentManual({
        name: newStudentName.trim(),
        email: newStudentEmail.trim().toLowerCase(),
        studentId: newStudentId.trim(),
        phone: newStudentPhone.trim() || undefined,
        password: newStudentPassword.trim() || undefined,
      });

      if (response.success) {
        setAlertMessage('Student created successfully');
        setIsSuccess(true);
        setShowAlert(true);
        closeAddStudentModal();
        fetchStudents();
      }
    } catch (error: any) {
      setAlertMessage(error.response?.data?.error?.message || 'Failed to create student');
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  // Bulk upload handlers
  const handleBulkUpload = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv,.xls,.xlsx';
    fileInput.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await teacherAPI.bulkUploadStudents(formData as unknown as File);

        if (response.success && response.data) {
          setUploadResult({
            totalProcessed: response.data.totalProcessed,
            successfullyCreated: response.data.successfullyCreated,
            duplicates: response.data.duplicates,
          });
          setShowUploadResultModal(true);
          fetchStudents();
        }
      } catch (error: any) {
        setAlertMessage(error.response?.data?.error?.message || 'Failed to upload file');
        setIsSuccess(false);
        setShowAlert(true);
      } finally {
        setUploading(false);
      }
    };
    fileInput.click();
  };

  // Download CSV template handler
  const handleDownloadSampleCSV = () => {
    // Download sample CSV template
    const csvContent = 'Name,Email,StudentID,Phone\nJohn Doe,john@example.com,STU001,1234567890';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Loading students...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/teacher/dashboard" />
          </IonButtons>
          <IonTitle>My Students</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="teacher-students-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {/* Action Buttons */}
        <div className="action-buttons">
          <IonButton expand="block" color="primary" onClick={handleBulkUpload} disabled={uploading}>
            <IonIcon icon={cloudUploadOutline} slot="start" /> Bulk Upload (CSV)
          </IonButton>
          <IonButton expand="block" color="secondary" fill="outline" onClick={handleDownloadSampleCSV}>
            <IonIcon icon={downloadOutline} slot="start" /> Download Sample CSV Template
          </IonButton>
          <IonButton expand="block" color="success" onClick={openAddStudentModal}>
            <IonIcon icon={addCircleOutline} slot="start" /> Add Student Manually
          </IonButton>
        </div>

        {/* Students List */}
        {students.length === 0 ? (
          <div className="empty-container">
            <IonIcon icon={personOutline} className="empty-icon" />
            <IonText color="medium">
              <h3>No students in your class yet</h3>
              <p>Use the buttons above to add students</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {students.map((item) => (
              <IonItem key={item.id} className="student-item" button onClick={() => handleEditStudent(item)}>
                <IonAvatar slot="start">
                  <span>{item.name.charAt(0).toUpperCase()}</span>
                </IonAvatar>
                <div className="student-info">
                  <h3 className="student-name">{item.name}</h3>
                  <p className="student-id">ID: {item.studentId || 'N/A'}</p>
                  <p className="student-email">{item.email}</p>
                </div>
                <IonIcon icon={createOutline} slot="end" className="edit-icon" />
              </IonItem>
            ))}
          </IonList>
        )}

        {/* Info Text */}
        {students.length > 0 && (
          <div className="info-bar">
            <IonText color="primary">
              <p>Tap on a student to edit their details</p>
            </IonText>
          </div>
        )}

        {/* Upload Progress Overlay */}
        {uploading && (
          <div className="upload-overlay">
            <div className="upload-progress-card">
              <IonSpinner name="crescent" />
              <IonText color="medium">
                <p>Parsing data & uploading...</p>
              </IonText>
            </div>
          </div>
        )}

        {/* Upload Result Modal */}
        <IonModal isOpen={showUploadResultModal} onDidDismiss={() => setShowUploadResultModal(false)}>
          <div className="modal-container">
            <div className="result-header">
              <IonIcon icon="checkmark-circle-outline" className="result-icon" />
              <h2>Upload Complete</h2>
            </div>
            {uploadResult && (
              <div className="result-stats">
                <div className="stat-item">
                  <span className="stat-value">{uploadResult.totalProcessed}</span>
                  <span className="stat-label">Total Parsed</span>
                </div>
                <div className="stat-item stat-success">
                  <span className="stat-value">{uploadResult.successfullyCreated}</span>
                  <span className="stat-label">Created</span>
                </div>
                <div className="stat-item stat-warning">
                  <span className="stat-value">{uploadResult.duplicates}</span>
                  <span className="stat-label">Skipped</span>
                </div>
              </div>
            )}
            <IonButton expand="block" onClick={() => { setShowUploadResultModal(false); setUploadResult(null); }}>
              Close
            </IonButton>
          </div>
        </IonModal>

        {/* Edit Student Modal */}
        <IonModal isOpen={showEditModal} onDidDismiss={closeEditModal}>
          <div className="modal-container">
            <div className="modal-header">
              <h2>Edit Student</h2>
              <IonButton fill="clear" onClick={closeEditModal}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </div>
            <div className="modal-form">
              <IonInput
                label="Full Name *"
                labelPlacement="stacked"
                placeholder="Enter student's full name"
                value={editName}
                onIonInput={(e) => setEditName(e.detail.value || '')}
                autocapitalize="words"
              />
              <IonInput
                label="Student ID *"
                labelPlacement="stacked"
                placeholder="e.g., STU001"
                value={editStudentId}
                onIonInput={(e) => setEditStudentId(e.detail.value || '')}
                autocapitalize="characters"
              />
              <IonInput
                label="Email (Optional)"
                labelPlacement="stacked"
                placeholder="student@email.com"
                value={editEmail}
                onIonInput={(e) => setEditEmail(e.detail.value || '')}
                type="email"
                autocapitalize="none"
              />
              <IonText color="medium" className="hint">Leave email field empty to keep current email</IonText>
            </div>
            <div className="modal-actions">
              <IonButton fill="outline" color="medium" onClick={closeEditModal}>Cancel</IonButton>
              <IonButton color="primary" onClick={handleUpdateStudent} disabled={saving}>
                {saving ? <IonSpinner name="crescent" /> : 'Update Student'}
              </IonButton>
            </div>
          </div>
        </IonModal>

        {/* Add Student Manually Modal */}
        <IonModal isOpen={showAddStudentModal} onDidDismiss={closeAddStudentModal}>
          <div className="modal-container">
            <div className="modal-header">
              <h2>Add Student Manually</h2>
              <IonButton fill="clear" onClick={closeAddStudentModal}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </div>
            <div className="modal-form">
              <IonInput
                label="Full Name *"
                labelPlacement="stacked"
                placeholder="Enter student's full name"
                value={newStudentName}
                onIonInput={(e) => setNewStudentName(e.detail.value || '')}
                autocapitalize="words"
              />
              <IonInput
                label="Email *"
                labelPlacement="stacked"
                placeholder="student@email.com"
                value={newStudentEmail}
                onIonInput={(e) => setNewStudentEmail(e.detail.value || '')}
                type="email"
                autocapitalize="none"
              />
              <IonInput
                label="Student ID (Roll Number) *"
                labelPlacement="stacked"
                placeholder="e.g., STU001"
                value={newStudentId}
                onIonInput={(e) => setNewStudentId(e.detail.value || '')}
                autocapitalize="characters"
              />
              <IonInput
                label="Phone Number (Optional)"
                labelPlacement="stacked"
                placeholder="Parent's phone number"
                value={newStudentPhone}
                onIonInput={(e) => setNewStudentPhone(e.detail.value || '')}
                type="tel"
              />
              <IonInput
                label="Password (Optional)"
                labelPlacement="stacked"
                placeholder="Leave empty for default: Student@123"
                value={newStudentPassword}
                onIonInput={(e) => setNewStudentPassword(e.detail.value || '')}
                type="password"
              />
              <IonText color="medium" className="hint">Default password will be used if left empty</IonText>
            </div>
            <div className="modal-actions">
              <IonButton fill="outline" color="medium" onClick={closeAddStudentModal}>Cancel</IonButton>
              <IonButton color="primary" onClick={handleCreateStudentManual} disabled={saving}>
                {saving ? <IonSpinner name="crescent" /> : 'Create Student'}
              </IonButton>
            </div>
          </div>
        </IonModal>

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={isSuccess ? 'Success' : 'Error'}
          message={alertMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default TeacherStudentsScreen;