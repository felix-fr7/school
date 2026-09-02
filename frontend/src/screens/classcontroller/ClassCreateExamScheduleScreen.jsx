/**
 * Class Create Exam Schedule Screen (Ionic React Version)
 * Create new exam schedules for the class
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
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonDatetimeButton,
  IonModal,
  IonAlert,
  IonToast,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { sendOutline, calendarOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './ClassCreateExamScheduleScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

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
  'Other',
];

const ClassCreateExamScheduleScreen = () => {
  const history = useHistory();

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString());
  const [examTime, setExamTime] = useState('09:00');
  const [duration, setDuration] = useState('');
  const [roomNo, setRoomNo] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const validateForm = () => {
    if (!title.trim()) {
      setAlertHeader('Validation Error');
      setAlertMessage('Exam title is required');
      setShowAlert(true);
      return false;
    }

    if (!subject) {
      setAlertHeader('Validation Error');
      setAlertMessage('Please select a subject');
      setShowAlert(true);
      return false;
    }

    if (!examDate) {
      setAlertHeader('Validation Error');
      setAlertMessage('Exam date is required');
      setShowAlert(true);
      return false;
    }

    return true;
  };

  const handleCreateExam = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        subject,
        date: examDate.split('T')[0],
        time: examTime,
        duration: duration ? parseInt(duration, 10) : undefined,
        roomNo: roomNo.trim() || undefined,
      };

      console.log('Publishing Exam Schedule Payload:', payload);

      setToastMessage('Exam schedule created successfully!');

      setTimeout(() => {
        history.goBack();
      }, 1200);
    } catch (error) {
      console.error('Error creating exam schedule:', error);
      setAlertHeader('Error');
      setAlertMessage(error?.message || 'Failed to create exam schedule');
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
            <IonBackButton defaultHref="/class-controller/exams" />
          </IonButtons>
          <IonTitle>Create Exam Schedule</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="create-exam-content" fullscreen>
        <div className="form-container">
          
          {/* Header */}
          <div className="form-header">
            <h1 className="form-title">New Exam Schedule</h1>
            <p className="form-subtitle">Schedule an assessment for your class</p>
          </div>

          <div className="form-card">
            {/* Title */}
            <div className="input-group">
              <IonLabel className="field-label">
                Exam Title <span className="required">*</span>
              </IonLabel>
              <IonInput
                fill="outline"
                value={title}
                onIonInput={(e) => setTitle(e.detail.value || '')}
                placeholder="e.g., Midterm Examination"
              />
            </div>

            {/* Subject */}
            <div className="input-group">
              <IonLabel className="field-label">
                Subject <span className="required">*</span>
              </IonLabel>
              <IonSelect
                fill="outline"
                value={subject}
                placeholder="Select Subject"
                onIonChange={(e) => setSubject(e.detail.value)}
                interface="action-sheet"
              >
                {SUBJECTS.map((subj) => (
                  <IonSelectOption key={subj} value={subj}>
                    {subj}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </div>

            {/* Date & Time Row (Side-by-Side Grid) */}
            <IonGrid className="ion-no-padding">
              <IonRow>
                <IonCol size="6" className="ion-padding-end">
                  <div className="input-group">
                    <IonLabel className="field-label">
                      Date <span className="required">*</span>
                    </IonLabel>
                    <div className="datetime-btn-wrapper">
                      <IonDatetimeButton datetime="exam-date-picker" />
                    </div>
                  </div>
                </IonCol>

                <IonCol size="6">
                  <div className="input-group">
                    <IonLabel className="field-label">Time</IonLabel>
                    <div className="datetime-btn-wrapper">
                      <IonDatetimeButton datetime="exam-time-picker" />
                    </div>
                  </div>
                </IonCol>
              </IonRow>
            </IonGrid>

            {/* Native Ionic Modal Pickers */}
            <IonModal keepContentsMounted={true}>
              <IonDatetime
                id="exam-date-picker"
                presentation="date"
                value={examDate}
                min={new Date().toISOString()}
                onIonChange={(e) => setExamDate(e.detail.value)}
                preferWheel={false}
              />
            </IonModal>

            <IonModal keepContentsMounted={true}>
              <IonDatetime
                id="exam-time-picker"
                presentation="time"
                value={examTime}
                onIonChange={(e) => setExamTime(e.detail.value)}
                preferWheel={true}
              />
            </IonModal>

            {/* Duration & Room Number Grid */}
            <IonGrid className="ion-no-padding">
              <IonRow>
                <IonCol size="6" className="ion-padding-end">
                  <div className="input-group">
                    <IonLabel className="field-label">Duration (Mins)</IonLabel>
                    <IonInput
                      fill="outline"
                      type="number"
                      value={duration}
                      onIonInput={(e) => setDuration(e.detail.value || '')}
                      placeholder="e.g., 90"
                    />
                  </div>
                </IonCol>

                <IonCol size="6">
                  <div className="input-group">
                    <IonLabel className="field-label">Room / Hall No</IonLabel>
                    <IonInput
                      fill="outline"
                      value={roomNo}
                      onIonInput={(e) => setRoomNo(e.detail.value || '')}
                      placeholder="e.g., Hall A"
                    />
                  </div>
                </IonCol>
              </IonRow>
            </IonGrid>

            {/* Submit Button */}
            <IonButton
              expand="block"
              size="large"
              className="submit-button"
              onClick={handleCreateExam}
              disabled={loading}
            >
              {loading ? (
                <IonSpinner name="crescent" />
              ) : (
                <>
                  <IonIcon icon={sendOutline} slot="start" />
                  Publish Exam Schedule
                </>
              )}
            </IonButton>
          </div>
        </div>

        {/* Validation Alert */}
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

export default ClassCreateExamScheduleScreen;
