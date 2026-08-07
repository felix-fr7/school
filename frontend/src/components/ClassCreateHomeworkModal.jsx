/**
 * Class Create Homework Modal
 * Inline modal for creating homework directly from the dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonToggle,
  IonIcon,
  IonSpinner,
  IonToast,
} from '@ionic/react';
import {
  closeOutline,
  sendOutline,
  bookOutline,
  calendarOutline,
  documentTextOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  createOutline,
} from 'ionicons/icons';
import { classControllerAPI } from '../services/api';
import SubjectManager from './SubjectManager';
import './ClassCreateHomeworkModal.css';

const ClassCreateHomeworkModal = ({ isOpen, onDidDismiss, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [givenDate, setGivenDate] = useState(new Date().toISOString());
  const [dueDate, setDueDate] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [showGivenDateModal, setShowGivenDateModal] = useState(false);
  const [showSubjectManager, setShowSubjectManager] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // Fetch subjects from database
  useEffect(() => {
    if (isOpen) {
      fetchSubjects();
    }
  }, [isOpen]);

  const fetchSubjects = async () => {
    setSubjectsLoading(true);
    try {
      const response = await classControllerAPI.getSubjects();
      if (response.success) {
        setSubjects(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setSubjectsLoading(false);
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      setToastMessage('Please enter a title for the homework assignment.');
      setToastColor('danger');
      setShowToast(true);
      return false;
    }
    if (!subject) {
      setToastMessage('Please select a subject.');
      setToastColor('danger');
      setShowToast(true);
      return false;
    }
    if (!givenDate) {
      setToastMessage('Please set the date when homework was given.');
      setToastColor('danger');
      setShowToast(true);
      return false;
    }
    if (!dueDate) {
      setToastMessage('Please set a due date.');
      setToastColor('danger');
      setShowToast(true);
      return false;
    }
    return true;
  };

  const handleCreateHomework = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await classControllerAPI.createHomework({
        title: title.trim(),
        subject,
        description: description.trim(),
        givenDate,
        dueDate,
        isPublished,
      });

      if (response.success) {
        setToastMessage('Homework created successfully!');
        setToastColor('success');
        setShowToast(true);
        
        // Reset form
        setTitle('');
        setSubject('');
        setDescription('');
        setGivenDate(new Date().toISOString());
        setDueDate('');
        setIsPublished(true);
        
        // Close modal and refresh dashboard
        setTimeout(() => {
          onDidDismiss();
          if (onSuccess) onSuccess();
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating homework:', error);
      setToastMessage(error.response?.data?.error?.message || 'Failed to create homework.');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const formatDueDate = (dateStr) => {
    if (!dateStr) return 'Set Due Date & Time';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleModalWillDismiss = () => {
    // Reset form when modal is dismissed
    setTitle('');
    setSubject('');
    setDescription('');
    setGivenDate(new Date().toISOString());
    setDueDate('');
    setIsPublished(true);
    onDidDismiss();
  };

  const formatGivenDate = (dateStr) => {
    if (!dateStr) return 'Set Given Date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubjectSelect = (subjectName) => {
    setSubject(subjectName);
  };

  return (
    <>
      <IonModal 
        isOpen={isOpen} 
        onDidDismiss={handleModalWillDismiss}
        className="homework-creation-modal"
        breakpoints={[0.5, 0.75, 0.95]}
        initialBreakpoint={0.95}
      >
        <IonHeader className="ion-no-border">
          <IonToolbar color="primary" className="modal-toolbar">
            <IonButtons slot="start">
              <IonButton onClick={handleModalWillDismiss}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
            <IonTitle>Create Homework</IonTitle>
            <IonButtons slot="end">
              <IonButton 
                onClick={handleCreateHomework} 
                disabled={loading}
                className="create-btn"
              >
                {loading ? (
                  <IonSpinner name="crescent" size="small" />
                ) : (
                  <>
                    <IonIcon icon={sendOutline} slot="start" />
                    Publish
                  </>
                )}
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="homework-form-content" fullscreen>
          <div className="form-container">
            {/* Title */}
            <IonItem className="input-item">
              <IonIcon icon={documentTextOutline} slot="start" className="field-icon" />
              <IonLabel position="stacked">Assignment Title *</IonLabel>
              <IonInput
                value={title}
                onIonInput={(e) => setTitle(e.detail.value || '')}
                placeholder="e.g., Chapter 4 Algebra Practice"
              />
            </IonItem>

            {/* Subject */}
            <IonItem className="input-item">
              <IonIcon icon={bookOutline} slot="start" className="field-icon" />
              <IonLabel position="stacked">Subject *</IonLabel>
              <div className="subject-select-wrapper">
                <IonSelect
                  value={subject}
                  onIonChange={(e) => setSubject(e.detail.value)}
                  placeholder="Select Subject"
                  interface="action-sheet"
                  disabled={subjectsLoading}
                >
                  {subjectsLoading ? (
                    <IonSelectOption value="" disabled>Loading...</IonSelectOption>
                  ) : (
                    subjects.map((subj) => (
                      <IonSelectOption key={subj._id} value={subj.name}>{subj.name}</IonSelectOption>
                    ))
                  )}
                </IonSelect>
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={() => setShowSubjectManager(true)}
                  className="manage-subjects-btn"
                >
                  <IonIcon icon={createOutline} slot="icon-only" />
                </IonButton>
              </div>
            </IonItem>

            {/* Description */}
            <IonItem className="input-item textarea-item">
              <IonLabel position="stacked">Instructions & Notes</IonLabel>
              <IonTextarea
                value={description}
                onIonInput={(e) => setDescription(e.detail.value || '')}
                placeholder="Provide detailed submission instructions, reference pages, or links..."
                rows={4}
                autoGrow
              />
            </IonItem>

            {/* Given Date */}
            <IonItem 
              className="input-item date-item" 
              button 
              onClick={() => setShowGivenDateModal(true)}
            >
              <IonLabel position="stacked">Date Given *</IonLabel>
              <div className="date-input">
                <IonIcon icon={calendarOutline} className="date-icon" />
                <span className={`date-text ${givenDate ? '' : 'placeholder'}`}>
                  {formatGivenDate(givenDate)}
                </span>
              </div>
            </IonItem>

            {/* Due Date */}
            <IonItem 
              className="input-item date-item" 
              button 
              onClick={() => setShowDueDateModal(true)}
            >
              <IonLabel position="stacked">Submission Deadline *</IonLabel>
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
                <h4>Notify Students Immediately</h4>
                <p>Send an instant alert to students</p>
              </IonLabel>
              <IonToggle
                checked={isPublished}
                onIonChange={(e) => setIsPublished(e.detail.checked)}
                slot="end"
              />
            </IonItem>
          </div>
        </IonContent>
      </IonModal>

      {/* Given Date Picker Modal */}
      <IonModal 
        isOpen={showGivenDateModal} 
        onDidDismiss={() => setShowGivenDateModal(false)}
        className="date-picker-modal"
      >
        <div className="modal-container">
          <h2 className="modal-title">Select Date Given</h2>
          <div className="date-picker-wrapper">
            <IonDatetime
              value={givenDate}
              onIonChange={(e) => setGivenDate(e.detail.value)}
              presentation="date-time"
              max={new Date().toISOString()}
              displayFormat="MMM DD, YYYY hh:mm A"
            />
          </div>
          <div className="modal-buttons">
            <IonButton 
              fill="outline" 
              color="medium" 
              onClick={() => { setGivenDate(new Date().toISOString()); setShowGivenDateModal(false); }}
            >
              Reset to Now
            </IonButton>
            <IonButton color="primary" onClick={() => setShowGivenDateModal(false)}>
              Confirm
            </IonButton>
          </div>
        </div>
      </IonModal>

      {/* Due Date Picker Modal */}
      <IonModal 
        isOpen={showDueDateModal} 
        onDidDismiss={() => setShowDueDateModal(false)}
        className="date-picker-modal"
      >
        <div className="modal-container">
          <h2 className="modal-title">Select Due Date & Time</h2>
          <div className="date-picker-wrapper">
            <IonDatetime
              value={dueDate}
              onIonChange={(e) => setDueDate(e.detail.value)}
              presentation="date-time"
              min={givenDate || new Date().toISOString()}
              displayFormat="MMM DD, YYYY hh:mm A"
            />
          </div>
          <div className="modal-buttons">
            <IonButton 
              fill="outline" 
              color="medium" 
              onClick={() => { setDueDate(''); setShowDueDateModal(false); }}
            >
              Clear
            </IonButton>
            <IonButton color="primary" onClick={() => setShowDueDateModal(false)}>
              Confirm
            </IonButton>
          </div>
        </div>
      </IonModal>

      {/* Subject Manager Modal */}
      <SubjectManager
        isOpen={showSubjectManager}
        onDidDismiss={() => setShowSubjectManager(false)}
        onSubjectSelect={handleSubjectSelect}
        selectedSubject={subject}
      />

      {/* Toast */}
      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        position="bottom"
        color={toastColor}
        icon={toastColor === 'success' ? checkmarkCircleOutline : alertCircleOutline}
      />
    </>
  );
};

export default ClassCreateHomeworkModal;