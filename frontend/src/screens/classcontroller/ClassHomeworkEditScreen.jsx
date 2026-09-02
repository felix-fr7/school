import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonButton,
  IonIcon,
  IonSpinner,
  IonToast,
  IonDatetime,
  IonModal,
} from '@ionic/react';
import {
  saveOutline,
  closeOutline,
  bookOutline,
  documentTextOutline,
  calendarOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { classControllerAPI } from '../../services/api';
import './ClassHomeworkEditScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const ClassHomeworkEditScreen = () => {
  const history = useHistory();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [showGivenDateModal, setShowGivenDateModal] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    givenDate: '',
    dueDate: '',
    isPublished: true,
    maxMarks: 100,
  });

  useEffect(() => {
    fetchHomework();
    fetchSubjects();
  }, [id]);

  const fetchHomework = async () => {
    try {
      // We'll need to create a getHomeworkById method in the API service
      // For now, we'll fetch all and find the right one
      const response = await classControllerAPI.getHomework(1, 100);
      if (response.success && response.data) {
        const homework = response.data.homework.find(h => h.id === id);
        if (homework) {
          setFormData({
            title: homework.title,
            subject: homework.subject,
            description: homework.description || '',
            givenDate: homework.givenDate ? new Date(homework.givenDate).toISOString() : new Date().toISOString(),
            dueDate: homework.dueDate ? new Date(homework.dueDate).toISOString() : '',
            isPublished: homework.isPublished !== undefined ? homework.isPublished : true,
            maxMarks: homework.maxMarks || 100,
          });
        } else {
          setToastMessage('Homework not found');
          setToastColor('danger');
          setShowToast(true);
          setTimeout(() => history.push('/class-controller/homework'), 2000);
        }
      }
    } catch (error) {
      console.error('Error fetching homework:', error);
      setToastMessage('Failed to load homework');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await classControllerAPI.getSubjects();
      if (response.success) {
        setSubjects(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setToastMessage('Please enter a title for the homework assignment.');
      setToastColor('danger');
      setShowToast(true);
      return false;
    }
    if (!formData.subject) {
      setToastMessage('Please select a subject.');
      setToastColor('danger');
      setShowToast(true);
      return false;
    }
    if (!formData.givenDate) {
      setToastMessage('Please set the date when homework was given.');
      setToastColor('danger');
      setShowToast(true);
      return false;
    }
    if (!formData.dueDate) {
      setToastMessage('Please set a due date.');
      setToastColor('danger');
      setShowToast(true);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const response = await classControllerAPI.updateHomework(id, {
        title: formData.title.trim(),
        subject: formData.subject,
        description: formData.description.trim(),
        givenDate: formData.givenDate,
        dueDate: formData.dueDate,
        isPublished: formData.isPublished,
        maxMarks: formData.maxMarks,
      });

      if (response.success) {
        setToastMessage('Homework updated successfully!');
        setToastColor('success');
        setShowToast(true);
        setTimeout(() => history.push('/class-controller/homework'), 1500);
      }
    } catch (error) {
      console.error('Error updating homework:', error);
      setToastMessage(error.response?.data?.error?.message || 'Failed to update homework.');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center">
          <IonSpinner name="crescent" color="primary" />
          <p>Loading homework...</p>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonButton onClick={() => history.push('/class-controller/homework')}>
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Edit Homework</IonTitle>
          <IonButtons slot="end">
            <IonButton 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? (
                <IonSpinner name="crescent" size="small" />
              ) : (
                <>
                  <IonIcon icon={saveOutline} slot="start" />
                  Save
                </>
              )}
            </IonButton>
          </IonButtons>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="homework-edit-content" fullscreen>
        <div className="form-container">
          {/* Title */}
          <IonItem className="input-item">
            <IonIcon icon={documentTextOutline} slot="start" className="field-icon" />
            <IonLabel position="stacked">Assignment Title *</IonLabel>
            <IonInput
              value={formData.title}
              onIonInput={(e) => setFormData({...formData, title: e.detail.value || ''})}
              placeholder="e.g., Chapter 4 Algebra Practice"
            />
          </IonItem>

          {/* Subject */}
          <IonItem className="input-item">
            <IonIcon icon={bookOutline} slot="start" className="field-icon" />
            <IonLabel position="stacked">Subject *</IonLabel>
            <IonSelect
              value={formData.subject}
              onIonChange={(e) => setFormData({...formData, subject: e.detail.value})}
              placeholder="Select Subject"
              interface="action-sheet"
            >
              {subjects.map((subj) => (
                <IonSelectOption key={subj._id} value={subj.name}>{subj.name}</IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>

          {/* Description */}
          <IonItem className="input-item textarea-item">
            <IonLabel position="stacked">Instructions & Notes</IonLabel>
            <IonTextarea
              value={formData.description}
              onIonInput={(e) => setFormData({...formData, description: e.detail.value || ''})}
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
              <span className={`date-text ${formData.givenDate ? '' : 'placeholder'}`}>
                {formatGivenDate(formData.givenDate)}
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
              <span className={`date-text ${formData.dueDate ? '' : 'placeholder'}`}>
                {formatDueDate(formData.dueDate)}
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
              checked={formData.isPublished}
              onIonChange={(e) => setFormData({...formData, isPublished: e.detail.checked})}
              slot="end"
            />
          </IonItem>

          {/* Update Button */}
          <IonButton
            expand="block"
            color="primary"
            onClick={handleSave}
            disabled={saving}
            style={{ marginTop: '20px', marginBottom: '20px', height: '48px', fontSize: '16px', fontWeight: 'bold' }}
          >
            {saving ? (
              <IonSpinner name="crescent" />
            ) : (
              <>
                <IonIcon icon={saveOutline} slot="start" />
                Update Homework
              </>
            )}
          </IonButton>
        </div>
      </IonContent>

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
              value={formData.givenDate}
              onIonChange={(e) => setFormData({...formData, givenDate: e.detail.value})}
              presentation="date-time"
              max={new Date().toISOString()}
              displayFormat="MMM DD, YYYY hh:mm A"
            />
          </div>
          <div className="modal-buttons">
            <IonButton 
              fill="outline" 
              color="medium" 
              onClick={() => { setFormData({...formData, givenDate: new Date().toISOString()}); setShowGivenDateModal(false); }}
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
              value={formData.dueDate}
              onIonChange={(e) => setFormData({...formData, dueDate: e.detail.value})}
              presentation="date-time"
              min={formData.givenDate || new Date().toISOString()}
              displayFormat="MMM DD, YYYY hh:mm A"
            />
          </div>
          <div className="modal-buttons">
            <IonButton 
              fill="outline" 
              color="medium" 
              onClick={() => { setFormData({...formData, dueDate: ''}); setShowDueDateModal(false); }}
            >
              Clear
            </IonButton>
            <IonButton color="primary" onClick={() => setShowDueDateModal(false)}>
              Confirm
            </IonButton>
          </div>
        </div>
      </IonModal>

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
    </IonPage>
  );
};

export default ClassHomeworkEditScreen;