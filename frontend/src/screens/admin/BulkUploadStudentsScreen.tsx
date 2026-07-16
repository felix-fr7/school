/**
 * Admin Bulk Upload Students Screen (Ionic React Version)
 * Allows admin to upload students via CSV to a specific class
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonAlert,
  IonCard,
  IonCardContent,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonList,
  IonItem,
  IonText,
} from '@ionic/react';
import { 
  cloudUploadOutline, 
  checkmarkCircleOutline, 
  warningOutline,
  documentOutline,
  peopleOutline,
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import { Class } from '../../types';
import './BulkUploadStudentsScreen.css';

interface UploadResult {
  totalProcessed: number;
  successfullyCreated: number;
  duplicates: number;
  students: Array<{ id: string; email: string; name: string; studentId: string; createdAt: string }>;
  errors?: Array<{ row: string | number; error: string }>;
}

const BulkUploadStudentsScreen: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await adminAPI.getClasses();
      if (response.success && response.data) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      showAlertMessage('Error', 'Failed to load classes');
    }
  };

  const showAlertMessage = (header: string, message: string) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedClassId) {
      showAlertMessage('Error', 'Please select a class');
      return;
    }

    if (!selectedFile) {
      showAlertMessage('Error', 'Please select a CSV file');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('classId', selectedClassId);

      const response = await adminAPI.bulkUploadStudentsCSV(selectedFile, selectedClassId);

      if (response.success && response.data) {
        setUploadResult(response.data);
        showAlertMessage('Success', `Successfully uploaded ${response.data.successfullyCreated} students!`);
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error: any) {
      const errMsg = error?.response?.data?.error?.message || error?.message || 'Failed to upload file';
      showAlertMessage('Error', errMsg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Bulk Upload Students</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="bulk-upload-content" fullscreen>
        <div className="container">
          {/* Header */}
          <div className="header-section">
            <h1 className="header-title">Bulk Student Import</h1>
            <p className="header-subtitle">Upload multiple students via CSV file</p>
          </div>

          {/* Instructions Card */}
          <IonCard className="info-card">
            <IonCardContent>
              <h3 className="info-title">Instructions</h3>
              <ol className="info-list">
                <li>Select the target class for the students</li>
                <li>Prepare a CSV file with these columns: rollNumber, studentName, classAndSection, parentMobile, bloodGroup, studentAddress, userId, password</li>
                <li>Upload the CSV file</li>
                <li>Review the upload results</li>
              </ol>
            </IonCardContent>
          </IonCard>

          {/* Class Selection */}
          <div className="form-section">
            <h2 className="section-title">Select Class</h2>
            <IonItem className="select-item">
              <IonLabel position="stacked">Target Class</IonLabel>
              <IonSelect
                value={selectedClassId}
                onIonChange={(e) => setSelectedClassId(e.detail.value)}
                placeholder="Select a class"
                interface="action-sheet"
              >
                {classes.map((cls) => (
                  <IonSelectOption key={cls.id} value={cls.id}>
                    {cls.name} - {cls.section}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          </div>

          {/* File Upload */}
          <div className="form-section">
            <h2 className="section-title">Upload CSV File</h2>
            
            <div className="file-upload-area">
              <input
                type="file"
                id="csv-file-input"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="file-input"
              />
              <label htmlFor="csv-file-input" className="file-upload-label">
                <IonIcon icon={documentOutline} className="file-icon" />
                <span className="file-text">
                  {selectedFile ? selectedFile.name : 'Click to select CSV file'}
                </span>
              </label>
            </div>

            <IonButton
              expand="block"
              className="upload-button"
              onClick={handleUpload}
              disabled={uploading || !selectedClassId || !selectedFile}
            >
              {uploading ? <IonSpinner name="crescent" /> : <IonIcon icon={cloudUploadOutline} slot="start" />}
              {uploading ? 'Uploading...' : 'Upload Students'}
            </IonButton>
          </div>

          {/* Upload Results */}
          {uploadResult && (
            <IonCard className="result-card">
              <IonCardContent>
                <h3 className="result-title">
                  <IonIcon icon={checkmarkCircleOutline} className="result-icon" />
                  Upload Complete
                </h3>
                <div className="result-stats">
                  <div className="stat-item">
                    <div className="stat-value">{uploadResult.totalProcessed}</div>
                    <div className="stat-label">Total Processed</div>
                  </div>
                  <div className="stat-item success">
                    <div className="stat-value">{uploadResult.successfullyCreated}</div>
                    <div className="stat-label">Successfully Created</div>
                  </div>
                  <div className="stat-item warning">
                    <div className="stat-value">{uploadResult.duplicates}</div>
                    <div className="stat-label">Duplicates Skipped</div>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/* Warning Card */}
          <IonCard className="warning-card">
            <IonCardContent>
              <IonIcon icon={warningOutline} className="warning-icon" />
              <p className="warning-text">
                Ensure all required fields are filled in the CSV. Duplicate roll numbers or user IDs will be skipped automatically.
              </p>
            </IonCardContent>
          </IonCard>
        </div>

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

export default BulkUploadStudentsScreen;