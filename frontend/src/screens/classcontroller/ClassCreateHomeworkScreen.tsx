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
  IonDatetime,
  IonModal,
  IonAlert,
  IonToggle,
  IonChip,
} from '@ionic/react';
import {
  calendarOutline,
  sendOutline,
  attachOutline,
  schoolOutline,
  bookOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './ClassCreateHomeworkScreen.css';

const SUBJECTS = [
  'Mathematics', 'Science', 'English', 'History',
  'Geography', 'Computer Science', 'Physics', 'Chemistry'
];

const CLASSES = ['Class 9-A', 'Class 9-B', 'Class 10-A', 'Class 10-B', 'Class 11-A', 'Class 12-A'];

const ClassCreateHomeworkScreen: React.FC = () => {
  const history = useHistory();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [isPublished, setIsPublished] = useState(true);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileName = e.target.files[0].name;
      setAttachments((prev) => [...prev, fileName]);
    }
  };

  const validateForm = (): boolean => {
    if (!selectedClass) {
      setAlertHeader('Class Required');
      setAlertMessage('Please select a target class/section.');
      setShowAlert(true);
      return false;
    }
    if (!title.trim()) {
      setAlertHeader('Validation Error');
      setAlertMessage('Please enter a title for the homework assignment.');
      setShowAlert(true);
      return false;
    }
    if (!subject) {
      setAlertHeader('Validation Error');
      setAlertMessage('Please select a subject.');
      setShowAlert(true);
      return false;
    }
    return true;
  };

  const handleCreateHomework = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      console.log('Creating Class Homework:', {
        class: selectedClass,
        title: title.trim(),
        subject,
        description: description.trim(),
        dueDate: dueDate || null,
        isPublished,
        attachments,
      });

      setAlertHeader('Homework Published');
      setAlertMessage(`Assignment created successfully for ${selectedClass}!`);
      setShowAlert(true);

      setTimeout(() => history.goBack(), 1500);
    } catch (error) {
      setAlertHeader('Error');
      setAlertMessage('Failed to create homework');
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const formatDueDate = (dateStr: string) => {
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

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar color="primary" className="class-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/homework" />
          </IonButtons>
          <IonTitle>Assign Homework</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="create-homework-content" fullscreen>
        <div className="form-container">
          <div className="form-header">
            <h1 className="form-title">New Assignment</h1>
            <p className="form-subtitle">Create and distribute homework to your students</p>
          </div>

          <div className="form">
            {/* Target Class Selection */}
            <IonItem className="input-item">
              <IonIcon icon={schoolOutline} slot="start" className="field-icon" />
              <IonLabel position="stacked">Target Class *</IonLabel>
              <IonSelect
                value={selectedClass}
                onIonChange={(e) => setSelectedClass(e.detail.value)}
                placeholder="Select Target Class"
                interface="action-sheet"
              >
                {CLASSES.map((cls) => (
                  <IonSelectOption key={cls} value={cls}>{cls}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {/* Subject Selection */}
            <IonItem className="input-item">
              <IonIcon icon={bookOutline} slot="start" className="field-icon" />
              <IonLabel position="stacked">Subject *</IonLabel>
              <IonSelect
                value={subject}
                onIonChange={(e) => setSubject(e.detail.value)}
                placeholder="Select Subject"
                interface="action-sheet"
              >
                {SUBJECTS.map((subj) => (
                  <IonSelectOption key={subj} value={subj}>{subj}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {/* Title */}
            <IonItem className="input-item">
              <IonLabel position="stacked">Assignment Title *</IonLabel>
              <IonInput
                value={title}
                onIonInput={(e) => setTitle(e.detail.value || '')}
                placeholder="e.g., Chapter 4 Algebra Practice Questions"
              />
            </IonItem>

            {/* Description */}
            <IonItem className="input-item textarea-item">
              <IonLabel position="stacked">Instructions & Notes</IonLabel>
              <IonTextarea
                value={description}
                onIonInput={(e) => setDescription(e.detail.value || '')}
                placeholder="Provide detailed submission instructions, reference pages, or links..."
                rows={5}
                autoGrow
              />
            </IonItem>

            {/* Attachment Section */}
            <div className="attachment-section">
              <label htmlFor="file-upload" className="attachment-button">
                <IonIcon icon={attachOutline} /> Attach Worksheets / PDFs
              </label>
              <input id="file-upload" type="file" onChange={handleFileUpload} style={{ display: 'none' }} />

              <div className="chips-container">
                {attachments.map((file, idx) => (
                  <IonChip key={idx} color="primary" onDismiss={() => setAttachments(attachments.filter((_, i) => i !== idx))}>
                    {file}
                  </IonChip>
                ))}
              </div>
            </div>

            {/* Due Date Modal Trigger */}
            <IonItem className="input-item date-item" button onClick={() => setShowDueDateModal(true)}>
              <IonLabel position="stacked">Submission Deadline</IonLabel>
              <div className="date-input">
                <IonIcon icon={calendarOutline} className="date-icon" />
                <span className={`date-text ${dueDate ? '' : 'placeholder'}`}>
                  {formatDueDate(dueDate)}
                </span>
              </div>
            </IonItem>

            {/* Publish Immediately Toggle */}
            <IonItem className="toggle-item">
              <IonLabel>
                <h4>Notify Class Immediately</h4>
                <p>Send an instant alert to students and parents</p>
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
            {loading ? 'Publishing...' : 'Publish Homework'}
          </IonButton>
        </div>

        {/* Due Date Modal */}
        <IonModal isOpen={showDueDateModal} onDidDismiss={() => setShowDueDateModal(false)} className="date-picker-modal">
          <div className="modal-container">
            <h2 className="modal-title">Select Due Date & Time</h2>
            <div className="date-picker-wrapper">
              <IonDatetime
                value={dueDate}
                onIonChange={(e) => setDueDate(e.detail.value as string)}
                presentation="date-time"
                min={new Date().toISOString()}
              />
            </div>
            <div className="modal-buttons">
              <IonButton fill="outline" color="medium" onClick={() => { setDueDate(''); setShowDueDateModal(false); }}>
                Clear
              </IonButton>
              <IonButton color="primary" onClick={() => setShowDueDateModal(false)}>
                Confirm
              </IonButton>
            </div>
          </div>
        </IonModal>

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