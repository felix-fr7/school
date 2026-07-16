/**
 * Weekly Timetable Screen (Teacher) - Ionic React Version
 * Date-Based Diary Workflow
 * Teachers can dynamically add subjects, select dates, toggle between Classwork/Homework,
 * and manage lessons with a clean form interface.
 */

import React, { useEffect, useState, useRef } from 'react';
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
  IonChip,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonBadge,
  IonModal,
  IonAlert,
  IonDatetime,
  IonList,
  IonItem,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonSpinner as IonSpinnerComponent,
} from '@ionic/react';
import {
  addCircleOutline,
  calendarOutline,
  chevronForwardOutline,
  createOutline,
  trashOutline,
  bookOutline,
  documentTextOutline,
  attachOutline,
  sendOutline,
  refreshCircleOutline,
} from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import { weeklyLessonsAPI } from '../../services/api';
import { WeeklyLesson, CreateUpdateLessonInput } from '../../types';
import './WeeklyTimetableScreen.css';

// Helper to format date as "DD Month YYYY" (e.g., "06 July 2026")
const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;
  
  const options: Intl.DateTimeFormatOptions = { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  };
  return date.toLocaleDateString('en-GB', options);
};

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WeeklyTimetableScreen: React.FC = () => {
  const { user } = useAuth();

  // Form state
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [activeContentType, setActiveContentType] = useState<'classwork' | 'homework'>('classwork');
  const [contentText, setContentText] = useState('');
  
  // Data state
  const [lessons, setLessons] = useState<WeeklyLesson[]>([]);
  const [uniqueSubjects, setUniqueSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Modal state
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingLesson, setEditingLesson] = useState<WeeklyLesson | null>(null);
  const [tempDate, setTempDate] = useState<string>(getTodayDate());

  // Alert state
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertHeader, setAlertHeader] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Delete confirmation state
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<string | null>(null);

  // Ref for scrolling
  const contentRef = useRef<HTMLIonContentElement>(null);

  // Fetch data
  const fetchWeeklyLessons = async () => {
    try {
      // Use getWeeklyLessons without params to get all lessons for the teacher's class
      const response = await weeklyLessonsAPI.getWeeklyLessons('');
      if (response.success && response.data) {
        const allLessons: WeeklyLesson[] = response.data.lessons || [];
        setLessons(allLessons);
        
        // Extract unique subjects
        const subjects = Array.from(new Set(allLessons.map(l => l.subject)));
        setUniqueSubjects(subjects);
        
        // Set default subject if available
        if (subjects.length > 0 && !selectedSubject) {
          setSelectedSubject(subjects[0] || '');
        }
      }
    } catch (error: any) {
      console.error('Error fetching lessons:', error);
      setAlertHeader('Error');
      setAlertMessage(error?.response?.data?.error?.message || 'Failed to load lessons');
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeeklyLessons();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    setRefreshing(true);
    await fetchWeeklyLessons();
    event.detail.complete();
  };

  // Handle adding new subject
  const handleAddSubject = () => {
    if (!newSubjectName.trim()) {
      setAlertHeader('Error');
      setAlertMessage('Please enter a subject name');
      setIsSuccess(false);
      setShowAlert(true);
      return;
    }

    if (uniqueSubjects.includes(newSubjectName.trim())) {
      setAlertHeader('Error');
      setAlertMessage('Subject already exists');
      setIsSuccess(false);
      setShowAlert(true);
      setNewSubjectName('');
      setShowAddSubjectModal(false);
      return;
    }

    const trimmedSubject = newSubjectName.trim();
    setUniqueSubjects([...uniqueSubjects, trimmedSubject]);
    setSelectedSubject(trimmedSubject);
    setNewSubjectName('');
    setShowAddSubjectModal(false);
  };

  // Handle saving lesson (Create/Update)
  const handleSaveLesson = async () => {
    // Validation
    if (!selectedSubject) {
      setAlertHeader('Error');
      setAlertMessage('Please select a subject');
      setIsSuccess(false);
      setShowAlert(true);
      return;
    }

    if (!contentText.trim()) {
      setAlertHeader('Error');
      setAlertMessage('Please enter content');
      setIsSuccess(false);
      setShowAlert(true);
      return;
    }

    setSaving(true);
    try {
      // Prepare data with lessonDate
      const lessonData: CreateUpdateLessonInput = {
        lessonDate: selectedDate,
        subject: selectedSubject,
        classworkText: activeContentType === 'classwork' ? contentText : (editingLesson?.classworkText || ''),
        homeworkText: activeContentType === 'homework' ? contentText : (editingLesson?.homeworkText || ''),
      };

      let response;
      if (editingLesson && editingLesson.id) {
        // Update existing lesson
        response = await weeklyLessonsAPI.updateWeeklyLesson(editingLesson.id, lessonData);
      } else {
        // Create new lesson (pass empty classId to use teacher's assigned class)
        response = await weeklyLessonsAPI.createWeeklyLesson('', lessonData);
      }
      
      if (response.success) {
        setAlertHeader('Success');
        setAlertMessage('Lesson saved successfully');
        setIsSuccess(true);
        setShowAlert(true);
        // Reset form
        setContentText('');
        setEditingLesson(null);
        // Refresh data
        fetchWeeklyLessons();
      }
    } catch (error: any) {
      setAlertHeader('Error');
      setAlertMessage(error?.response?.data?.error?.message || 'Failed to save lesson');
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  // Handle editing a lesson
  const handleEditLesson = (lesson: WeeklyLesson) => {
    setEditingLesson(lesson);
    setSelectedSubject(lesson.subject);
    setSelectedDate(lesson.lessonDate);
    
    // Determine which content to edit (prefer homework if both exist)
    if (lesson.homeworkText) {
      setActiveContentType('homework');
      setContentText(lesson.homeworkText);
    } else if (lesson.classworkText) {
      setActiveContentType('classwork');
      setContentText(lesson.classworkText);
    } else {
      setActiveContentType('classwork');
      setContentText('');
    }

    // Scroll to top
    contentRef.current?.scrollToTop(0);
  };

  // Handle deleting a lesson - show confirmation
  const handleDeleteLesson = (lessonId: string) => {
    setLessonToDelete(lessonId);
    setShowDeleteAlert(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!lessonToDelete) return;
    
    try {
      const response = await weeklyLessonsAPI.deleteWeeklyLesson(lessonToDelete);
      if (response.success) {
        setAlertHeader('Success');
        setAlertMessage('Lesson deleted');
        setIsSuccess(true);
        setShowAlert(true);
        fetchWeeklyLessons();
      }
    } catch (error: any) {
      setAlertHeader('Error');
      setAlertMessage(error?.response?.data?.error?.message || 'Failed to delete lesson');
      setIsSuccess(false);
      setShowAlert(true);
    }
    setShowDeleteAlert(false);
    setLessonToDelete(null);
  };

  // Clear form
  const handleClearForm = () => {
    setSelectedSubject(uniqueSubjects.length > 0 ? (uniqueSubjects[0] || '') : '');
    setSelectedDate(getTodayDate());
    setActiveContentType('classwork');
    setContentText('');
    setEditingLesson(null);
  };

  // Open date picker
  const handleOpenDatePicker = () => {
    setTempDate(selectedDate);
    setShowDatePickerModal(true);
  };

  // Confirm date selection
  const handleConfirmDate = () => {
    setSelectedDate(tempDate);
    setShowDatePickerModal(false);
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center weekly-timetable-loading">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p className="loading-text">Loading timetable...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/teacher/dashboard" />
          </IonButtons>
          <IonTitle>Date Diary</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent 
        ref={contentRef}
        className="weekly-timetable-content"
        fullscreen
      >
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent
            pullingIcon={refreshCircleOutline}
            refreshingSpinner="crescent"
          />
        </IonRefresher>

        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Date Diary</IonTitle>
          </IonToolbar>
        </IonHeader>

        {/* Form Section */}
        <div className="form-section">
          <div className="section-header">
            <h2 className="section-title">📝 Create/Edit Lesson</h2>
          </div>

          {/* Subject Selection */}
          <div className="form-group">
            <label className="form-label">Subject</label>
            <div className="subject-scroll-container">
              <div className="subject-chips-wrapper">
                {uniqueSubjects.map((subject, index) => (
                  <IonChip
                    key={index}
                    className={`subject-chip ${selectedSubject === subject ? 'chip-active' : ''}`}
                    onClick={() => setSelectedSubject(subject)}
                  >
                    <IonLabel>{subject}</IonLabel>
                  </IonChip>
                ))}
              </div>
            </div>
            <IonButton
              className="add-subject-button"
              size="small"
              color="secondary"
              onClick={() => setShowAddSubjectModal(true)}
            >
              <IonIcon icon={addCircleOutline} slot="start" />
              Add Subject
            </IonButton>
          </div>

          {/* Date Picker */}
          <div className="form-group">
            <label className="form-label">Date</label>
            <div className="date-input" onClick={handleOpenDatePicker}>
              <IonIcon icon={calendarOutline} className="date-icon" />
              <span className="date-text">{formatDisplayDate(selectedDate)}</span>
              <IonIcon icon={chevronForwardOutline} className="date-arrow" />
            </div>
          </div>

          {/* Content Type Toggles */}
          <div className="form-group">
            <label className="form-label">Content Type</label>
            <IonSegment
              value={activeContentType}
              onIonChange={(e) => setActiveContentType(e.detail.value as 'classwork' | 'homework')}
              className="content-type-segment"
            >
              <IonSegmentButton value="classwork">
                <IonIcon icon={bookOutline} />
                <IonLabel>Classwork</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="homework">
                <IonIcon icon={documentTextOutline} />
                <IonLabel>Homework</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </div>

          {/* Content Text Input */}
          <div className="form-group">
            <label className="form-label">
              {activeContentType === 'classwork' ? '📖 Classwork Content' : '📝 Homework Content'}
            </label>
            <IonTextarea
              className="content-textarea"
              value={contentText}
              onIonChange={(e) => setContentText(e.detail.value || '')}
              placeholder={`Enter ${activeContentType} assignment...`}
              rows={6}
              autoGrow
            />
          </div>

          {/* Action Buttons */}
          <div className="button-row">
            <IonButton
              className="send-button"
              expand="block"
              color="success"
              onClick={handleSaveLesson}
              disabled={saving}
            >
              {saving ? <IonSpinner name="crescent" /> : <IonIcon icon={sendOutline} slot="start" />}
              {saving ? 'Sending...' : 'Send'}
            </IonButton>
            <IonButton
              className="clear-button"
              expand="block"
              color="medium"
              onClick={handleClearForm}
            >
              Clear
            </IonButton>
          </div>

          {editingLesson && (
            <div className="editing-badge">
              <IonText color="warning">
                ✏️ Editing: {editingLesson.subject} - {formatDisplayDate(editingLesson.lessonDate)}
              </IonText>
            </div>
          )}
        </div>

        {/* Existing Lessons List */}
        <div className="lessons-section">
          <div className="section-header">
            <h2 className="section-title">📋 Existing Lessons ({lessons.length})</h2>
          </div>
          
          {lessons.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <IonText>
                <h3>No lessons created yet</h3>
                <p className="empty-hint">Use the form above to create your first lesson</p>
              </IonText>
            </div>
          ) : (
            <IonList>
              {lessons
                .sort((a, b) => {
                  // Sort by date (newest first), then subject
                  if (a.lessonDate !== b.lessonDate) {
                    return b.lessonDate.localeCompare(a.lessonDate);
                  }
                  return a.subject.localeCompare(b.subject);
                })
                .map((lesson) => (
                  <IonCard key={lesson.id} className="lesson-card">
                    <IonCardContent>
                      <div className="lesson-card-header">
                        <div className="lesson-info">
                          <h3 className="lesson-subject">{lesson.subject}</h3>
                          <IonCardSubtitle className="lesson-date">
                            {formatDisplayDate(lesson.lessonDate)}
                          </IonCardSubtitle>
                        </div>
                        <div className="lesson-actions">
                          <IonButton
                            fill="clear"
                            size="small"
                            onClick={() => handleEditLesson(lesson)}
                          >
                            <IonIcon icon={createOutline} />
                          </IonButton>
                          <IonButton
                            fill="clear"
                            size="small"
                            color="danger"
                            onClick={() => handleDeleteLesson(lesson.id)}
                          >
                            <IonIcon icon={trashOutline} />
                          </IonButton>
                        </div>
                      </div>
                      
                      {lesson.classworkText && (
                        <div className="lesson-content classwork-content">
                          <IonText color="secondary">
                            <strong>📖 Classwork:</strong>
                          </IonText>
                          <p className="content-text">{lesson.classworkText}</p>
                        </div>
                      )}
                      
                      {lesson.homeworkText && (
                        <div className="lesson-content homework-content">
                          <IonText color="secondary">
                            <strong>📝 Homework:</strong>
                          </IonText>
                          <p className="content-text">{lesson.homeworkText}</p>
                        </div>
                      )}
                      
                      {!lesson.classworkText && !lesson.homeworkText && (
                        <IonText color="medium" className="no-content-text">
                          <em>No content added yet</em>
                        </IonText>
                      )}
                      
                      {lesson.attachments && lesson.attachments.length > 0 && (
                        <IonBadge color="light" className="attachment-badge">
                          <IonIcon icon={attachOutline} slot="start" />
                          {lesson.attachments.length} attachment(s)
                        </IonBadge>
                      )}
                    </IonCardContent>
                  </IonCard>
                ))}
            </IonList>
          )}
        </div>

        {/* Add Subject Modal */}
        <IonModal
          isOpen={showAddSubjectModal}
          onDidDismiss={() => {
            setShowAddSubjectModal(false);
            setNewSubjectName('');
          }}
          className="small-modal"
        >
          <div className="modal-container">
            <h2>Add New Subject</h2>
            <IonTextarea
              className="modal-input"
              value={newSubjectName}
              onIonChange={(e) => setNewSubjectName(e.detail.value || '')}
              placeholder="e.g., Tamil, English, Mathematics"
              rows={1}
              autoFocus
            />
            <div className="modal-buttons">
              <IonButton
                color="medium"
                onClick={() => {
                  setNewSubjectName('');
                  setShowAddSubjectModal(false);
                }}
              >
                Cancel
              </IonButton>
              <IonButton
                color="secondary"
                onClick={handleAddSubject}
              >
                Add Subject
              </IonButton>
            </div>
          </div>
        </IonModal>

        {/* Date Picker Modal */}
        <IonModal
          isOpen={showDatePickerModal}
          onDidDismiss={() => setShowDatePickerModal(false)}
          className="small-modal"
        >
          <div className="modal-container">
            <h2>Select Date</h2>
            <div className="date-picker-wrapper">
              <IonDatetime
                value={tempDate}
                onIonChange={(e) => setTempDate(e.detail.value as string)}
                presentation="date"
                min="2020-01-01"
                max="2030-12-31"
              />
            </div>
            <div className="modal-buttons">
              <IonButton
                color="medium"
                onClick={() => setShowDatePickerModal(false)}
              >
                Cancel
              </IonButton>
              <IonButton
                color="secondary"
                onClick={handleConfirmDate}
              >
                Select
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

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => {
            setShowDeleteAlert(false);
            setLessonToDelete(null);
          }}
          header="Delete Lesson"
          message="Are you sure you want to delete this lesson? This action cannot be undone."
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: confirmDelete,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default WeeklyTimetableScreen;