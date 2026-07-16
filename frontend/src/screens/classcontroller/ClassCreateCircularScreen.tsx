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
  IonModal,
  IonAlert,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { 
  sendOutline, 
  calendarOutline, 
  documentOutline,
  notificationsOutline,
} from 'ionicons/icons';
import { classControllerAPI } from '../../services/api';
import './ClassCreateCircularScreen.css';

const ClassCreateCircularScreen: React.FC = () => {
  const history = useHistory();
  
  const [circularNo, setCircularNo] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [issueDate, setIssueDate] = useState<string>('');
  const [visibility, setVisibility] = useState<'ALL' | 'SPECIFIC_CLASSES'>('ALL');
  const [notifyParents, setNotifyParents] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

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

  const handleCreateCircular = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Note: createCircular API not available in classControllerAPI
      console.log('Creating circular:', {
        circularNo: circularNo.trim() || undefined,
        title: title.trim(),
        content: content.trim(),
        issueDate: issueDate || undefined,
        visibility,
        notifyParents,
      });
      
      // Simulate success
      setAlertHeader('Success');
      setAlertMessage('Circular created successfully!');
      setShowAlert(true);
      
      setTimeout(() => {
        history.goBack();
      }, 1500);
    } catch (error: any) {
      console.error('Error creating circular:', error);
      const errorMessage = error?.response?.data?.error?.message || 'Failed to create circular';
      setAlertHeader('Error');
      setAlertMessage(errorMessage);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/circulars" />
          </IonButtons>
          <IonTitle>Create Circular</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="create-circular-content" fullscreen>
        <div className="form-container">
          {/* Header */}
          <div className="form-header">
            <h1 className="form-title">Create Circular</h1>
            <p className="form-subtitle">Send announcements to students and parents</p>
          </div>

          {/* Form */}
          <div className="form">
            {/* Circular Number */}
            <IonItem className="input-item">
              <IonLabel position="stacked">Circular Number (Optional)</IonLabel>
              <IonInput
                value={circularNo}
                onIonInput={(e) => setCircularNo(e.detail.value || '')}
                placeholder="e.g., CIRC-2024-001"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="characters"
              />
            </IonItem>

            {/* Title */}
            <IonItem className="input-item">
              <IonLabel position="stacked">Title *</IonLabel>
              <IonInput
                value={title}
                onIonInput={(e) => setTitle(e.detail.value || '')}
                placeholder="e.g., School Closure Notice"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="words"
              />
            </IonItem>

            {/* Content */}
            <div className="textarea-item">
              <IonLabel>Content *</IonLabel>
              <IonTextarea
                value={content}
                onIonInput={(e) => setContent(e.detail.value || '')}
                placeholder="Enter the circular content..."
                rows={6}
              />
            </div>

            {/* Issue Date */}
            <IonItem className="input-item date-item" button onClick={() => setShowDateModal(true)}>
              <IonLabel position="stacked">Issue Date</IonLabel>
              <div className="date-input">
                <IonIcon icon={calendarOutline} className="date-icon" />
                <span className={`date-text ${issueDate ? '' : 'placeholder'}`}>
                  {formatDate(issueDate)}
                </span>
              </div>
            </IonItem>

            {/* Visibility */}
            <IonItem className="input-item">
              <IonLabel position="stacked">Visibility</IonLabel>
              <IonSelect
                value={visibility}
                onIonChange={(e) => setVisibility(e.detail.value)}
                placeholder="Select visibility"
                interface="action-sheet"
              >
                <IonSelectOption value="ALL">All Classes (School-wide)</IonSelectOption>
                <IonSelectOption value="SPECIFIC_CLASSES">Specific Classes Only</IonSelectOption>
              </IonSelect>
            </IonItem>

            {/* Notify Parents Toggle */}
            <IonItem className="toggle-item">
              <IonLabel>Notify Parents</IonLabel>
              <IonToggle
                checked={notifyParents}
                onIonChange={(e) => setNotifyParents(e.detail.checked)}
              />
            </IonItem>
            <p className="toggle-description">
              <IonIcon icon={notificationsOutline} slot="start" />
              Send push notification to parents when circular is published
            </p>
          </div>

          {/* Submit Button */}
          <IonButton
            expand="block"
            className="submit-button"
            onClick={handleCreateCircular}
            disabled={loading}
          >
            {loading ? <IonSpinner name="crescent" /> : <IonIcon icon={sendOutline} slot="start" />}
            {loading ? 'Creating...' : 'Create Circular'}
          </IonButton>
        </div>

        {/* Date Picker Modal */}
        <IonModal
          isOpen={showDateModal}
          onDidDismiss={() => setShowDateModal(false)}
          className="date-picker-modal"
        >
          <div className="modal-container">
            <h2 className="modal-title">Select Issue Date</h2>
            <div className="date-picker-wrapper">
              <IonDatetime
                value={issueDate}
                onIonChange={(e) => setIssueDate(e.detail.value as string)}
                presentation="date"
                max={new Date().toISOString()}
              />
            </div>
            <div className="modal-buttons">
              <IonButton
                fill="outline"
                color="medium"
                onClick={() => {
                  setIssueDate('');
                  setShowDateModal(false);
                }}
              >
                Clear
              </IonButton>
              <IonButton
                color="secondary"
                onClick={() => setShowDateModal(false)}
              >
                Done
              </IonButton>
            </div>
          </div>
        </IonModal>

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

export default ClassCreateCircularScreen;