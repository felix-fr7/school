/**
 * Admin Exams Screen (Ionic React Version)
 * Exam Timetables management using ExamSchedule API
 * Manages structured exam schedules with subject, date, time, room number
 */

import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonSpinner,
  IonAlert,
  IonIcon,
  IonChip,
  IonBadge,
  IonText,
  IonDatetime,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import { 
  calendarOutline, 
  trashOutline, 
  createOutline,
  informationCircleOutline,
  timeOutline,
  locationOutline,
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import { Class, ExamSchedule, CreateExamScheduleInput } from '../../types';
import './AdminExamsScreen.css';

interface ExamItemProps {
  item: ExamSchedule;
  onDelete: (id: string) => void;
  onEdit: (item: ExamSchedule) => void;
}

const ExamItem: React.FC<ExamItemProps> = ({ item, onDelete, onEdit }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <div className="exam-card" onDoubleClick={() => onEdit(item)}>
        <div className="exam-card-content">
          <h3 className="exam-title">{item.title}</h3>
          <p className="exam-subject">{item.subject}</p>
          <div className="exam-meta-row">
            <span className="exam-date">
              <IonIcon icon={calendarOutline} />
              {new Date(item.date).toLocaleDateString()}
            </span>
            <span className="exam-time">
              <IonIcon icon={timeOutline} />
              {item.time}
            </span>
            {item.roomNo && (
              <span className="exam-room">
                <IonIcon icon={locationOutline} />
                {item.roomNo}
              </span>
            )}
          </div>
          <p className="exam-class">
            {item.class ? `${item.class.name}${item.class.section ? '-' + item.class.section : ''}` : 'School-wide'}
          </p>
        </div>
        <div className="exam-card-actions">
          <button className="action-button edit" onClick={() => onEdit(item)} title="Edit">
            <IonIcon icon={createOutline} />
          </button>
          <button className="action-button delete" onClick={() => setShowDeleteConfirm(true)} title="Delete">
            <IonIcon icon={trashOutline} />
          </button>
        </div>
      </div>

      <IonAlert
        isOpen={showDeleteConfirm}
        onDidDismiss={() => setShowDeleteConfirm(false)}
        header="Delete Exam Schedule"
        message={`Are you sure you want to delete "${item.title}"?`}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          { 
            text: 'Delete', 
            role: 'destructive',
            handler: () => {
              onDelete(item.id);
              setShowDeleteConfirm(false);
            }
          }
        ]}
      />
    </>
  );
};

const AdminExamsScreen: React.FC = () => {
  const [examList, setExamList] = useState<ExamSchedule[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState<number | ''>('');
  const [roomNo, setRoomNo] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  useEffect(() => {
    fetchExams();
    fetchClasses();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await adminAPI.getExamSchedules(1, 50);
      if (response.success && response.data) {
        setExamList(response.data.examSchedules || []);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await adminAPI.getClasses();
      if (response.success && response.data) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const showAlertMessage = (header: string, message: string) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setShowAlert(true);
  };

  const validateForm = () => {
    if (!title.trim()) {
      showAlertMessage('Validation Error', 'Exam title is required');
      return false;
    }
    if (!subject.trim()) {
      showAlertMessage('Validation Error', 'Subject is required');
      return false;
    }
    if (!date) {
      showAlertMessage('Validation Error', 'Exam date is required');
      return false;
    }
    if (!time) {
      showAlertMessage('Validation Error', 'Exam time is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      // Find a class to use its tenantId - use first class or selected class
      const classForTenant = classes.find(c => c.id === selectedClassId) || classes[0];
      if (!classForTenant) {
        showAlertMessage('Error', 'No classes available. Please create a class first.');
        setSubmitting(false);
        return;
      }

      const data: CreateExamScheduleInput = {
        title: title.trim(),
        subject: subject.trim(),
        date: date,
        time: time,
        classId: selectedClassId || '',
        duration: duration || undefined,
        roomNo: roomNo || undefined,
      };

      let response;
      if (editingExamId) {
        // Update existing exam schedule
        response = await adminAPI.updateClass(editingExamId, data as any);
      } else {
        response = await adminAPI.createExamSchedule(data);
      }

      if (response.success) {
        showAlertMessage('Success', editingExamId ? 'Exam schedule updated successfully' : 'Exam schedule created successfully');
        resetForm();
        fetchExams();
      }
    } catch (error: any) {
      showAlertMessage('Error', error.response?.data?.error?.message || 'Failed to save exam schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await adminAPI.deleteExamSchedule(id);
      if (response.success) {
        setExamList(prev => prev.filter(item => item.id !== id));
        showAlertMessage('Success', 'Exam schedule deleted successfully');
      }
    } catch (error) {
      showAlertMessage('Error', 'Failed to delete exam schedule');
    }
  };

  const handleEdit = (item: ExamSchedule) => {
    setTitle(item.title);
    setSubject(item.subject);
    setDate(item.date);
    setTime(item.time);
    setDuration(item.duration || '');
    setRoomNo(item.roomNo || '');
    setSelectedClassId(item.classId);
    setEditingExamId(item.id);
  };

  const resetForm = () => {
    setTitle('');
    setSubject('');
    setDate('');
    setTime('');
    setDuration('');
    setRoomNo('');
    setSelectedClassId(undefined);
    setEditingExamId(null);
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/dashboard" />
            </IonButtons>
            <IonTitle>Exam Schedules</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="admin-exams-content" fullscreen>
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading exam schedules...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle>Exam Schedules</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-exams-content" fullscreen>
        <div className="container">
          {/* Header */}
          <div className="header-section">
            <h1 className="header-title">📅 Exam Schedules</h1>
            <p className="header-subtitle">Manage exam timetables and schedules</p>
          </div>

          {/* Create Form */}
          <IonCard className="form-card">
            <IonCardHeader>
              <IonCardTitle>{editingExamId ? 'Edit Exam Schedule' : 'Create New Exam Schedule'}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {/* Title Input */}
              <div className="input-group">
                <label className="input-label">Exam Title *</label>
                <IonInput
                  value={title}
                  onIonInput={(e) => setTitle(e.detail.value || '')}
                  placeholder="e.g., Mathematics Final Exam"
                />
              </div>

              {/* Subject Input */}
              <div className="input-group">
                <label className="input-label">Subject *</label>
                <IonInput
                  value={subject}
                  onIonInput={(e) => setSubject(e.detail.value || '')}
                  placeholder="e.g., Mathematics, Science, English"
                />
              </div>

              {/* Date and Time Row */}
              <div className="input-row">
                <div className="input-group">
                  <label className="input-label">Date *</label>
                  <IonInput
                    type="date"
                    value={date}
                    onIonInput={(e) => setDate(e.detail.value || '')}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Time *</label>
                  <IonInput
                    type="time"
                    value={time}
                    onIonInput={(e) => setTime(e.detail.value || '')}
                  />
                </div>
              </div>

              {/* Duration and Room Row */}
              <div className="input-row">
                <div className="input-group">
                  <label className="input-label">Duration (minutes)</label>
                  <IonInput
                    type="number"
                    value={duration}
                    onIonInput={(e) => setDuration(e.detail.value ? parseInt(e.detail.value) : '')}
                    placeholder="e.g., 90"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Room Number</label>
                  <IonInput
                    value={roomNo}
                    onIonInput={(e) => setRoomNo(e.detail.value || '')}
                    placeholder="e.g., Room 101"
                  />
                </div>
              </div>

              {/* Class Selector */}
              <div className="input-group">
                <label className="input-label">Class (Optional - leave empty for school-wide)</label>
                <div className="class-selector">
                  <IonChip
                    className={`class-option ${!selectedClassId ? 'active' : ''}`}
                    onClick={() => setSelectedClassId(undefined)}
                  >
                    🏫 All Classes
                  </IonChip>
                  {classes.map((cls) => (
                    <IonChip
                      key={cls.id}
                      className={`class-option ${selectedClassId === cls.id ? 'active' : ''}`}
                      onClick={() => setSelectedClassId(cls.id)}
                    >
                      {cls.name}{cls.section ? `-${cls.section}` : ''}
                    </IonChip>
                  ))}
                </div>
              </div>

              {/* Info Note */}
              <div className="info-note">
                <IonIcon icon={informationCircleOutline} className="info-icon" />
                <span>Exam schedules are visible to ALL teachers and students upon creation.</span>
              </div>

              {/* Action Buttons */}
              <div className="button-group">
                <IonButton
                  expand="block"
                  className="submit-button"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? <IonSpinner name="crescent" /> : (editingExamId ? 'Update Exam' : 'Publish Exam Schedule')}
                </IonButton>
                {editingExamId && (
                  <IonButton
                    expand="block"
                    color="medium"
                    className="cancel-button"
                    onClick={resetForm}
                  >
                    Cancel Edit
                  </IonButton>
                )}
              </div>
            </IonCardContent>
          </IonCard>

          {/* Exams List */}
          <IonCard className="list-card">
            <IonCardHeader>
              <IonCardTitle>Published Exam Schedules ({examList.length})</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {examList.length === 0 ? (
                <div className="empty-state">
                  <IonIcon icon={calendarOutline} className="empty-icon" />
                  <p>No exam schedules published yet</p>
                </div>
              ) : (
                examList.map((item) => (
                  <ExamItem
                    key={item.id}
                    item={item}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                  />
                ))
              )}
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

export default AdminExamsScreen;