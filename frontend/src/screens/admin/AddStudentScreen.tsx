/**
 * Add Student Screen (Ionic React Version)
 * Dual-mode screen: Manual Student Form & Excel Bulk Upload
 */

import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonItem,
  IonInput,
  IonTextarea,
  IonButton,
  IonSpinner,
  IonAlert,
  IonIcon,
  IonCard,
  IonCardContent,
  IonChip,
} from '@ionic/react';
import { 
  cloudUploadOutline, 
  downloadOutline, 
  warningOutline, 
  checkmarkCircleOutline,
  personAddOutline,
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import './AddStudentScreen.css';

type TabMode = 'manual' | 'excel';

interface StudentFormData {
  rollNumber: string;
  studentName: string;
  classAndSection: string;
  parentMobile: string;
  bloodGroup: string;
  studentAddress: string;
  userId: string;
  password: string;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const AddStudentScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabMode>('manual');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Manual form state
  const [formData, setFormData] = useState<StudentFormData>({
    rollNumber: '',
    studentName: '',
    classAndSection: '',
    parentMobile: '',
    bloodGroup: '',
    studentAddress: '',
    userId: '',
    password: '',
  });

  const updateForm = (field: keyof StudentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const showAlertMessage = (header: string, message: string) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setShowAlert(true);
  };

  const validateManualForm = (): boolean => {
    if (!formData.rollNumber.trim()) {
      showAlertMessage('Error', 'Roll Number is required');
      return false;
    }
    if (!formData.studentName.trim()) {
      showAlertMessage('Error', 'Student Name is required');
      return false;
    }
    if (!formData.userId.trim() || !formData.userId.includes('@')) {
      showAlertMessage('Error', 'Valid User ID (email) is required');
      return false;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      showAlertMessage('Error', 'Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleManualSubmit = async () => {
    if (!validateManualForm()) return;

    try {
      setLoading(true);
      const response = await adminAPI.createStudentManual({
        rollNumber: formData.rollNumber.trim(),
        studentName: formData.studentName.trim(),
        classAndSection: formData.classAndSection.trim() || undefined,
        parentMobile: formData.parentMobile.trim() || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        studentAddress: formData.studentAddress.trim() || undefined,
        userId: formData.userId.trim(),
        password: formData.password,
      });

      if (response.success) {
        showAlertMessage('Success', 'Student created successfully!');
        setFormData({
          rollNumber: '',
          studentName: '',
          classAndSection: '',
          parentMobile: '',
          bloodGroup: '',
          studentAddress: '',
          userId: '',
          password: '',
        });
      }
    } catch (error: any) {
      const errMsg = error?.response?.data?.error?.message || error?.message || 'Failed to create student';
      showAlertMessage('Error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await adminAPI.getStudentTemplate();
      if (response.success && response.data) {
        const columns = response.data.columns.join(', ');
        showAlertMessage(
          'Template Information',
          `Required columns: ${columns}\n\nPlease create an Excel file with these exact column headers.`
        );
      }
    } catch (error: any) {
      showAlertMessage('Error', 'Failed to fetch template');
    }
  };

  const handleUploadExcel = async () => {
    // For web version, we'll show a message about file upload
    showAlertMessage(
      'File Upload',
      'Excel upload requires a file input element. Please use the manual form for now, or implement a file input component for bulk upload functionality.'
    );
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Add Student</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="add-student-content" fullscreen>
        {/* Tab Switcher */}
        <div className="tab-container">
          <IonSegment value={activeTab} onIonChange={(e) => setActiveTab(e.detail.value as TabMode)}>
            <IonSegmentButton value="manual">
              <IonLabel>Manual Form</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="excel">
              <IonLabel>Excel Bulk Upload</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </div>

        {/* Manual Form */}
        {activeTab === 'manual' && (
          <div className="form-container">
            <h2 className="section-title">Student Information</h2>

            <div className="input-row">
              <div className="input-half">
                <IonItem className="input-item">
                  <IonLabel position="stacked">Roll Number *</IonLabel>
                  <IonInput
                    value={formData.rollNumber}
                    onIonInput={(e) => updateForm('rollNumber', e.detail.value || '')}
                    placeholder="e.g., STU001"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="characters"
                  />
                </IonItem>
              </div>
              <div className="input-half">
                <IonItem className="input-item">
                  <IonLabel position="stacked">Student Name *</IonLabel>
                  <IonInput
                    value={formData.studentName}
                    onIonInput={(e) => updateForm('studentName', e.detail.value || '')}
                    placeholder="Full name"
                    autocomplete="name"
                    autocorrect="off"
                    autocapitalize="words"
                  />
                </IonItem>
              </div>
            </div>

            <div className="input-row">
              <div className="input-half">
                <IonItem className="input-item">
                  <IonLabel position="stacked">Class & Section</IonLabel>
                  <IonInput
                    value={formData.classAndSection}
                    onIonInput={(e) => updateForm('classAndSection', e.detail.value || '')}
                    placeholder="e.g., 10-A"
                    autocomplete="off"
                  />
                </IonItem>
              </div>
              <div className="input-half">
                <IonItem className="input-item">
                  <IonLabel position="stacked">Parent Mobile</IonLabel>
                  <IonInput
                    value={formData.parentMobile}
                    onIonInput={(e) => updateForm('parentMobile', e.detail.value || '')}
                    placeholder="Phone number"
                    type="tel"
                    autocomplete="tel"
                  />
                </IonItem>
              </div>
            </div>

            <div className="blood-group-section">
              <h3 className="label">Blood Group</h3>
              <div className="blood-group-container">
                {BLOOD_GROUPS.map(bg => (
                  <IonChip
                    key={bg}
                    className={`blood-group-chip ${formData.bloodGroup === bg ? 'active' : ''}`}
                    onClick={() => updateForm('bloodGroup', bg)}
                  >
                    <IonLabel>{bg}</IonLabel>
                  </IonChip>
                ))}
              </div>
            </div>

            <IonItem className="input-item textarea-item">
              <IonLabel position="stacked">Student Address</IonLabel>
              <IonTextarea
                value={formData.studentAddress}
                onIonInput={(e) => updateForm('studentAddress', e.detail.value || '')}
                placeholder="Full address"
                rows={3}
              />
            </IonItem>

            <h2 className="section-title">Login Credentials</h2>

            <IonItem className="input-item">
              <IonLabel position="stacked">User ID (Email) *</IonLabel>
              <IonInput
                value={formData.userId}
                onIonInput={(e) => updateForm('userId', e.detail.value || '')}
                placeholder="student@school.com"
                type="email"
                autocomplete="email"
                autocapitalize="none"
              />
            </IonItem>

            <IonItem className="input-item">
              <IonLabel position="stacked">Password *</IonLabel>
              <IonInput
                value={formData.password}
                onIonInput={(e) => updateForm('password', e.detail.value || '')}
                placeholder="Minimum 6 characters"
                type="password"
                autocomplete="new-password"
              />
            </IonItem>

            <IonButton
              expand="block"
              className="submit-button"
              onClick={handleManualSubmit}
              disabled={loading}
            >
              {loading ? <IonSpinner name="crescent" /> : <IonIcon icon={checkmarkCircleOutline} slot="start" />}
              {loading ? 'Creating...' : 'Create Student'}
            </IonButton>
          </div>
        )}

        {/* Excel Bulk Upload */}
        {activeTab === 'excel' && (
          <div className="form-container">
            <h2 className="section-title">Bulk Student Import</h2>

            <IonCard className="info-card">
              <IonCardContent>
                <h3 className="info-title">Instructions</h3>
                <p className="info-text">
                  1. Download the sample template to see the required column format.<br/>
                  2. Fill in student data with these exact column headers:<br/>
                  <code className="code-text">
                    rollNumber, studentName, classAndSection, parentMobile, bloodGroup, studentAddress, userId, password
                  </code><br/>
                  3. Upload the completed Excel file (.xlsx, .xls, or .csv).
                </p>
              </IonCardContent>
            </IonCard>

            <IonButton
              expand="block"
              fill="outline"
              className="template-button"
              onClick={handleDownloadTemplate}
            >
              <IonIcon icon={downloadOutline} slot="start" />
              Download Sample Template
            </IonButton>

            <IonButton
              expand="block"
              className="upload-button"
              onClick={handleUploadExcel}
              disabled={uploading}
            >
              {uploading ? <IonSpinner name="crescent" /> : <IonIcon icon={cloudUploadOutline} slot="start" />}
              {uploading ? 'Uploading...' : 'Upload Excel File'}
            </IonButton>

            <IonCard className="warning-card">
              <IonCardContent>
                <IonIcon icon={warningOutline} className="warning-icon" />
                <p className="warning-text">
                  Ensure all required fields are filled. Duplicate roll numbers or user IDs will be skipped.
                </p>
              </IonCardContent>
            </IonCard>
          </div>
        )}

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

export default AddStudentScreen;