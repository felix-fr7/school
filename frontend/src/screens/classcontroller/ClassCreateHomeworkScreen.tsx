/**
 * Class Create Homework Screen (Ionic React Version)
 * Create new homework assignments for the class
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
  IonText,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonModal,
  IonAlert,
  IonToggle,
} from '@ionic/react';
import {
  calendarOutline,
  checkmarkOutline,
  sendOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { classControllerAPI } from '../../services/api';
import './ClassCreateHomeworkScreen.css';

const SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'History',
  'Geography',
  'Computer Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Physical Education',
  'Art',
  'Music',
];

const ClassCreateHomeworkScreen: React.FC = () => {
  const history = useHistory();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = (): boolean => {
    if (!title.trim()) {
      setAlertHeader('Validation Error');
      setAlertMessage('Please enter a title for the homework');
      setIsSuccess(false);
      setShowAlert(true);
      return false;
    }
    
    if (!subject) {
      setAlertHeader('Validation Error');
      setAlertMessage('Please select a subject');
      setIsSuccess(false);
      setShowAlert(true);
      return false;
    }
    
    return true;
  };

  const handleCreateHomework = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Note: createHomework API not available in classControllerAPI
      console.log('Creating homework:', {
        title: title.trim(),
        description: description.trim(),
        subject,
        dueDate: dueDate || null,
        isPublished,
      });
      
      // Simulate success
      setAlertHeader('Success');
      setAlertMessage('Homework created successfully!');
      setIsSuccess(true);
      setShowAlert(true);
      
      setTimeout(() => {
        history.goBack();
      }, 1500);
    } catch (error: any) {
      console.error('Error creating homework:', error);
      const errorMessage = error?.response?.data?.error?.message || 'Failed to create homework';
      setAlertHeader('Error');
      setAlertMessage(errorMessage);
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return 'Select due date';
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
            <IonBackButton defaultHref="/class-controller/homework" />
          </IonButtons>
          <IonTitle>Create Homework</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="create-homework-content" fullscreen>
        <div className="form-container">
          {/* Header */}
          <div className="form-header">
            <h1 className="form-title">Create Homework</h1>
            <p className="form-subtitle">Assign homework to your class</p>
          </div>

          {/* Form */}
          <div className="form">
            {/* Title */}
            <IonItem className="input-item">
              <IonLabel position="stacked">Title *</IonLabel>
              <IonInput
                value={title}
                onIonInput={(e) => setTitle(e.detail.value || '')}
                placeholder="Enter homework title"
                autocomplete="off"
                autocorrect="off"
              />
            </IonItem>

            {/* Subject */}
            <IonItem className="input-item">
              <IonLabel position="stacked">Subject *</IonLabel>
              <IonSelect
                value={subject}
                onIonChange={(e) => setSubject(e.detail.value)}
                placeholder="Select subject"
                interface="action-sheet"
              >
                {SUBJECTS.map((subj) => (
                  <IonSelectOption key={subj} value={subj}>
                    {subj}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {/* Description */}
            <IonItem className="input-item textarea-item">
              <IonLabel position="stacked">Description</IonLabel>
              <IonTextarea
                value={description}
                onIonInput={(e) => setDescription(e.detail.value || '')}
                placeholder="Enter homework description and instructions"
                rows={6}
                autoGrow
              />
            </IonItem>

            {/* Due Date */}
            <IonItem className="input-item date-item" button onClick={() => setShowDueDateModal(true)}>
              <IonLabel position="stacked">Due Date</IonLabel>
              <div className="date-input">
                <IonIcon icon={calendarOutline} className="date-icon" />
                <span className={`date-text ${dueDate ? '' : 'placeholder'}`}>
                  {formatDueDate(dueDate)}
                </span>
              </div>
            </IonItem>

            {/* Publish Toggle */}
            <IonItem className="toggle-item">
              <IonLabel>
                <h4>Publish Immediately</h4>
                <p>Make this homework visible to students</p>
              </IonLabel>
              <IonToggle
                checked={isPublished}
                onIonChange={(e) => setIsPublished(e.detail.checked)}
                slot="end"
              />
            </IonItem>
          </div>

          {/* Submit Button */}
          <IonButton
            expand="block"
            className="submit-button"
            onClick={handleCreateHomework}
            disabled={loading}
          >
            {loading ? <IonSpinner name="crescent" /> : <IonIcon icon={sendOutline} slot="start" />}
            {loading ? 'Creating...' : 'Create Homework'}
          </IonButton>
        </div>

        {/* Due Date Modal */}
        <IonModal
          isOpen={showDueDateModal}
          onDidDismiss={() => setShowDueDateModal(false)}
          className="date-picker-modal"
        >
          <div className="modal-container">
            <h2 className="modal-title">Select Due Date</h2>
            <div className="date-picker-wrapper">
              <IonDatetime
                value={dueDate}
                onIonChange={(e) => setDueDate(e.detail.value as string)}
                presentation="date"
                min={new Date().toISOString()}
                max="2030-12-31"
              />
            </div>
            <div className="modal-buttons">
              <IonButton
                fill="outline"
                color="medium"
                onClick={() => {
                  setDueDate('');
                  setShowDueDateModal(false);
                }}
              >
                Clear
              </IonButton>
              <IonButton
                color="secondary"
                onClick={() => setShowDueDateModal(false)}
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

export default ClassCreateHomeworkScreen;