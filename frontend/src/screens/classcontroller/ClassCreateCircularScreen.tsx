/**
 * Class Create Circular Screen (Ionic React Version)
 * Create new circular for the class
 */

import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonSpinner,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonDatetime,
  IonDatetimeButton,
  IonModal,
  IonAlert,
  IonToast,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { 
  sendOutline, 
  notificationsOutline,
  attachOutline,
  closeCircleOutline,
} from 'ionicons/icons';
import './ClassCreateCircularScreen.css';

const ClassCreateCircularScreen: React.FC = () => {
  const history = useHistory();
  
  const [circularNo, setCircularNo] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString());
  const [visibility, setVisibility] = useState<'ALL' | 'SPECIFIC_CLASSES'>('ALL');
  const [notifyParents, setNotifyParents] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const validateForm = (): boolean => {
    if (!title.trim()) {
      setAlertHeader('Validation Error');
      setAlertMessage('Circular title is required');
      setShowAlert(true);
      return false;
    }
    
    if (!content.trim()) {
      setAlertHeader('Validation Error');
      setAlertMessage('Circular content is required');
      setShowAlert(true);
      return false;
    }
    
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleCreateCircular = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Dummy API submission logic
      const formData = new FormData();
      formData.append('circularNo', circularNo.trim());
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      formData.append('issueDate', issueDate);
      formData.append('visibility', visibility);
      formData.append('notifyParents', String(notifyParents));
      if (selectedFile) {
        formData.append('attachment', selectedFile);
      }

      console.log('Publishing Circular Data Payload...');

      setToastMessage('Circular created successfully!');
      
      setTimeout(() => {
        history.goBack();
      }, 1200);
    } catch (error: any) {
      console.error('Error creating circular:', error);
      setAlertHeader('Error');
      setAlertMessage(error?.message || 'Failed to create circular');
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/circulars" />
          </IonButtons>
          <IonTitle>Create Circular</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="create-circular-content" fullscreen>
        <div className="form-container">
          
          {/* Form Header */}
          <div className="form-header">
            <h1 className="form-title">New Circular</h1>
            <p className="form-subtitle">Publish official updates to students and parents</p>
          </div>

          <div className="form-card">
            {/* Circular Number */}
            <div className="input-group">
              <IonLabel className="field-label">Circular Number (Optional)</IonLabel>
              <IonInput
                fill="outline"
                value={circularNo}
                onIonInput={(e) => setCircularNo(e.detail.value || '')}
                placeholder="e.g., CIRC-2026-001"
              />
            </div>

            {/* Title */}
            <div className="input-group">
              <IonLabel className="field-label">Title <span className="required">*</span></IonLabel>
              <IonInput
                fill="outline"
                value={title}
                onIonInput={(e) => setTitle(e.detail.value || '')}
                placeholder="e.g., School Closure Notice"
              />
            </div>

            {/* Content */}
            <div className="input-group">
              <IonLabel className="field-label">Content <span className="required">*</span></IonLabel>
              <IonTextarea
                fill="outline"
                value={content}
                onIonInput={(e) => setContent(e.detail.value || '')}
                placeholder="Enter detailed description or announcement..."
                rows={5}
              />
            </div>

            {/* Native Ionic Datetime Picker (Clean Modal approach) */}
            <div className="input-group">
              <IonLabel className="field-label">Issue Date</IonLabel>
              <div className="datetime-picker-row">
                <IonDatetimeButton datetime="issue-datetime" />
                <IonModal keepContentsMounted={true}>
                  <IonDatetime
                    id="issue-datetime"
                    presentation="date"
                    value={issueDate}
                    onIonChange={(e) => setIssueDate(e.detail.value as string)}
                    preferWheel={false}
                  />
                </IonModal>
              </div>
            </div>

            {/* Visibility Selector */}
            <div className="input-group">
              <IonLabel className="field-label">Visibility</IonLabel>
              <IonSelect
                fill="outline"
                value={visibility}
                onIonChange={(e) => setVisibility(e.detail.value)}
                interface="action-sheet"
              >
                <IonSelectOption value="ALL">All Classes (School-wide)</IonSelectOption>
                <IonSelectOption value="SPECIFIC_CLASSES">Specific Classes Only</IonSelectOption>
              </IonSelect>
            </div>

            {/* Attachment Input */}
            <div className="input-group">
              <IonLabel className="field-label">Attachment (Optional)</IonLabel>
              <div className="file-upload-wrapper">
                <input
                  type="file"
                  id="circular-file-input"
                  className="file-input-hidden"
                  onChange={handleFileChange}
                  accept="image/*,.pdf"
                />
                {!selectedFile ? (
                  <label htmlFor="circular-file-input" className="file-upload-button">
                    <IonIcon icon={attachOutline} />
                    <span>Upload Attachment (PDF / Image)</span>
                  </label>
                ) : (
                  <div className="file-selected-box">
                    <span className="file-name">{selectedFile.name}</span>
                    <IonIcon 
                      icon={closeCircleOutline} 
                      className="file-remove-icon"
                      onClick={() => setSelectedFile(null)} 
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Notify Parents Toggle */}
            <div className="toggle-group">
              <IonItem lines="none" className="toggle-item">
                <IonLabel>Notify Parents</IonLabel>
                <IonToggle
                  checked={notifyParents}
                  onIonChange={(e) => setNotifyParents(e.detail.checked)}
                />
              </IonItem>
              <p className="toggle-description">
                <IonIcon icon={notificationsOutline} />
                Send instant push notification to parents' app.
              </p>
            </div>

            {/* Submit Button */}
            <IonButton
              expand="block"
              size="large"
              className="submit-button"
              onClick={handleCreateCircular}
              disabled={loading}
            >
              {loading ? (
                <IonSpinner name="crescent" />
              ) : (
                <>
                  <IonIcon icon={sendOutline} slot="start" />
                  Publish Circular
                </>
              )}
            </IonButton>

          </div>
        </div>

        {/* Validation / Error Alerts */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={alertHeader}
          message={alertMessage}
          buttons={['OK']}
        />

        {/* Success Toast */}
        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage}
          duration={2000}
          color="success"
          onDidDismiss={() => setToastMessage('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassCreateCircularScreen;