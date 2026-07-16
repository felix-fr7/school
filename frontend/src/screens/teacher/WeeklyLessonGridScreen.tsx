/**
 * Weekly Timetable Screen (Teacher) - Date-Based Diary Workflow (Ionic React Version)
 * Teachers can dynamically add subjects, select dates, toggle between Classwork/Homework,
 * and manage lessons with a clean form interface.
 */

import React, { useEffect, useState } from 'react';
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
  IonButton,
  IonIcon,
  IonSpinner,
  IonModal,
  IonInput,
  IonTextarea,
  IonAlert,
  IonChip,
  IonLabel,
  IonList,
  IonItem,
  IonBadge,
  IonButtons,
  IonBackButton,
  IonRefresher,
  IonRefresherContent,
  IonIcon as IonIconComponent,
} from '@ionic/react';
import {
  calendarOutline,
  bookOutline,
  createOutline,
  trashOutline,
  addCircleOutline,
  closeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  attachOutline,
  sendOutline,
  refreshOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { weeklyLessonsAPI } from '../../services/api';
import { WeeklyLesson } from '../../types';
import './WeeklyLessonGridScreen.css';

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

const WeeklyLessonGridScreen: React.FC = () => {
  const history = useHistory();
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
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertButtons, setAlertButtons] = useState<any[]>(['OK']);

  const showAlertMessage = (header: string, message: string, buttons = ['OK']) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setAlertButtons(buttons);
    setShowAlert(true);
  };

  // Fetch data
  const fetchWeeklyLessons = async () => {
    try {
      // Pass empty classId to fetch all lessons for the teacher's class
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
      showAlertMessage('Error', error?.response?.data?.error?.message || 'Failed to load lessons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeeklyLessons();
  }, []);

  const onRefresh = (event: CustomEvent) => {
    setRefreshing(true);
    fetchWeeklyLessons();
    event.detail.complete();
  };

  // Handle adding new subject
  const handleAddSubject = () => {
    if (!newSubjectName.trim()) {
      showAlertMessage('Error', 'Please enter a subject name');
      return;
    }

    if (uniqueSubjects.includes(newSubjectName.trim())) {
      showAlertMessage('Error', 'Subject already exists');
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
      showAlertMessage('Error', 'Please select a subject');
      return;
    }

    if (!contentText.trim()) {
      showAlertMessage('Error', 'Please enter content');
      return;
    }

    setSaving(true);
    try {
      // Prepare data with lessonDate instead of weekday
      const lessonData = {
        lessonDate: selectedDate,
        subject: selectedSubject,
        classworkText: activeContentType === 'classwork' ? contentText : (editingLesson?.classworkText || ''),
        homeworkText: activeContentType === 'homework' ? contentText : (editingLesson?.homeworkText || ''),
      };

      // Use createWeeklyLesson or updateWeeklyLesson based on whether we're editing
      const response = editingLesson 
        ? await weeklyLessonsAPI.updateWeeklyLesson(editingLesson.id, lessonData)
        : await weeklyLessonsAPI.createWeeklyLesson('', lessonData);
      
      if (response.success) {
        showAlertMessage('Success', 'Lesson saved successfully');
        // Reset form
        setContentText('');
        setEditingLesson(null);
        // Refresh data
        fetchWeeklyLessons();
      }
    } catch (error: any) {
      showAlertMessage('Error', error?.response?.data?.error?.message || 'Failed to save lesson');
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
  };

  // Handle deleting a lesson
  const handleDeleteLesson = (lessonId: string) => {
    setAlertHeader('Delete Lesson');
    setAlertMessage('Are you sure you want to delete this lesson? This action cannot be undone.');
    setAlertButtons([
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Delete',
        role: 'destructive',
        handler: async () => {
          try {
            const response = await weeklyLessonsAPI.deleteWeeklyLesson(lessonId);
            if (response.success) {
              showAlertMessage('Success', 'Lesson deleted');
              fetchWeeklyLessons();
            }
          } catch (error: any) {
            showAlertMessage('Error', error?.response?.data?.error?.message || 'Failed to delete lesson');
          }
        },
      },
    ]);
    setShowAlert(true);
  };

  // Clear form
  const handleClearForm = () => {
    setSelectedSubject(uniqueSubjects.length > 0 ? (uniqueSubjects[0] || '') : '');
    setSelectedDate(getTodayDate());
    setActiveContentType('classwork');
    setContentText('');
    setEditingLesson(null);
  };

  // Open date picker modal
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
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/teacher/dashboard" />
            </IonButtons>
            <IonTitle>Weekly Timetable</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="weekly-lesson-grid" fullscreen>
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading timetable...</p>
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
            <IonBackButton defaultHref="/teacher/dashboard" />
          </IonButtons>
          <IonTitle>Date Diary</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="weekly-lesson-grid" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon="arrow-down" refreshingSpinner="crescent" />
        </IonRefresher>

        <div className="container">
          {/* Header */}
          <div className="header-section">
            <h1 className="header-title">Date Diary</h1>
            <p className="header-subtitle">Create and manage classwork & homework by date</p>
          </div>

          {/* Form Section */}
          <IonCard className="form-card">
            <IonCardHeader>
              <IonCardTitle>📝 Create/Edit Lesson</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {/* Subject Selection */}
              <div className="form-group">
                <label className="form-label">Subject</label>
                <div className="subject-chips">
                  {uniqueSubjects.map((subject, index) => (
                    <IonChip
                      key={index}
                      className={selectedSubject === subject ? 'chip-active' : ''}
                      onClick={() => setSelectedSubject(subject)}
                    >
                      <IonLabel>{subject}</IonLabel>
                    </IonChip>
                  ))}
                  <IonButton
                    size="small"
                    color="primary"
                    onClick={() => setShowAddSubjectModal(true)}
                  >
                    + Add
                  </IonButton>
                </div>
              </div>

              {/* Date Picker */}
              <div className="form-group">
                <label className="form-label">Date</label>
                <div className="date-input" onClick={handleOpenDatePicker}>
                  <IonIcon icon={calendarOutline} className="date-icon" />
                  <span className="date-text">{formatDisplayDate(selectedDate)}</span>
                  <IonIcon icon={calendarOutline} className="date-arrow" />
                </div>
              </div>

              {/* Content Type Toggles */}
              <div className="form-group">
                <label className="form-label">Content Type</label>
                <div className="toggle-container">
                  <IonButton
                    expand="block"
                    className={activeContentType === 'classwork' ? 'toggle-active' : 'toggle-inactive'}
                    onClick={() => setActiveContentType('classwork')}
                  >
                    📖 Classwork
                  </IonButton>
                  <IonButton
                    expand="block"
                    className={activeContentType === 'homework' ? 'toggle-active' : 'toggle-inactive'}
                    onClick={() => setActiveContentType('homework')}
                  >
                    📝 Homework
                  </IonButton>
                </div>
              </div>

              {/* Content Text Input */}
              <div className="form-group">
                <label className="form-label">
                  {activeContentType === 'classwork' ? '📖 Classwork Content' : '📝 Homework Content'}
                </label>
                <IonTextarea
                  value={contentText}
                  onIonInput={(e) => setContentText(e.detail.value || '')}
                  placeholder={`Enter ${activeContentType} assignment...`}
                  rows={6}
                  className="content-input"
                />
              </div>

              {/* Action Buttons */}
              <div className="button-row">
                <IonButton
                  expand="block"
                  color="success"
                  onClick={handleSaveLesson}
                  disabled={saving}
                >
                  {saving ? <IonSpinner name="crescent" /> : '🚀 Send'}
                </IonButton>
                <IonButton
                  expand="block"
                  fill="outline"
                  color="medium"
                  onClick={handleClearForm}
                >
                  Clear
                </IonButton>
              </div>

              {editingLesson && (
                <div className="editing-badge">
                  ✏️ Editing: {editingLesson.subject} - {formatDisplayDate(editingLesson.lessonDate)}
                </div>
              )}
            </IonCardContent>
          </IonCard>

          {/* Existing Lessons List */}
          <IonCard className="lessons-card">
            <IonCardHeader>
              <IonCardTitle>📋 Existing Lessons ({lessons.length})</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {lessons.length === 0 ? (
                <div className="empty-state">
                  <IonIcon icon={calendarOutline} className="empty-icon" />
                  <p className="empty-text">No lessons created yet</p>
                  <p className="empty-hint">Use the form above to create your first lesson</p>
                </div>
              ) : (
                <div className="lessons-list">
                  {lessons
                    .sort((a, b) => {
                      if (a.lessonDate !== b.lessonDate) {
                        return b.lessonDate.localeCompare(a.lessonDate);
                      }
                      return a.subject.localeCompare(b.subject);
                    })
                    .map((lesson) => (
                      <IonCard key={lesson.id} className="lesson-item">
                        <IonCardContent>
                          <div className="lesson-header">
                            <div className="lesson-info">
                              <h3 className="lesson-subject">{lesson.subject}</h3>
                              <p className="lesson-date">{formatDisplayDate(lesson.lessonDate)}</p>
                            </div>
                            <div className="lesson-actions">
                              <IonButton
                                size="small"
                                fill="clear"
                                onClick={() => handleEditLesson(lesson)}
                              >
                                <IonIcon icon={createOutline} />
                              </IonButton>
                              <IonButton
                                size="small"
                                fill="clear"
                                color="danger"
                                onClick={() => handleDeleteLesson(lesson.id)}
                              >
                                <IonIcon icon={trashOutline} />
                              </IonButton>
                            </div>
                          </div>
                          
                          {lesson.classworkText && (
                            <div className="lesson-content">
                              <p className="content-label">📖 Classwork:</p>
                              <p className="content-text">{lesson.classworkText}</p>
                            </div>
                          )}
                          
                          {lesson.homeworkText && (
                            <div className="lesson-content">
                              <p className="content-label">📝 Homework:</p>
                              <p className="content-text">{lesson.homeworkText}</p>
                            </div>
                          )}
                          
                          {!lesson.classworkText && !lesson.homeworkText && (
                            <p className="no-content">No content added yet</p>
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
                </div>
              )}
            </IonCardContent>
          </IonCard>
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
          <div className="modal-content">
            <h2>Add New Subject</h2>
            <IonInput
              value={newSubjectName}
              onIonInput={(e) => setNewSubjectName(e.detail.value || '')}
              placeholder="e.g., Tamil, English, Mathematics"
              className="modal-input"
            />
            <div className="modal-buttons">
              <IonButton
                fill="outline"
                onClick={() => {
                  setNewSubjectName('');
                  setShowAddSubjectModal(false);
                }}
              >
                Cancel
              </IonButton>
              <IonButton color="primary" onClick={handleAddSubject}>
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
          <div className="modal-content">
            <h2>Select Date</h2>
            <input
              type="date"
              value={tempDate}
              onChange={(e) => setTempDate(e.target.value)}
              className="date-picker-native"
            />
            <div className="modal-buttons">
              <IonButton fill="outline" onClick={() => setShowDatePickerModal(false)}>
                Cancel
              </IonButton>
              <IonButton color="primary" onClick={handleConfirmDate}>
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
          buttons={alertButtons}
        />
      </IonContent>
    </IonPage>
  );
};

export default WeeklyLessonGridScreen;