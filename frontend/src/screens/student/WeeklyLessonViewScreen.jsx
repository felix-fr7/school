/**
 * Weekly Lesson View Screen (Ionic React Version)
 * Read-only view of date-based timetable with classwork, homework, and attachments
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonBackButton,
  IonButtons,
  IonList,
  IonItem,
  IonCard,
  IonCardContent,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
  IonModal,
  IonButton,
  IonBadge,
} from '@ionic/react';
import {
  refreshOutline,
  bookOutline,
  calendarOutline,
  paperPlaneOutline,
  pencilOutline,
  attachOutline,
  closeOutline,
  downloadOutline,
} from 'ionicons/icons';
import { weeklyLessonsAPI } from '../../services/api';
import './WeeklyLessonViewScreen.css';

// Helper to format date as "DD Month YYYY" (e.g., "06 July 2026")
const formatDisplayDate = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;

  const options = {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  };
  return date.toLocaleDateString('en-GB', options);
};

const WeeklyLessonViewScreen = () => {
  const [lessons, setLessons] = useState([]);
  const [groupedLessons, setGroupedLessons] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchWeeklyLessons = async () => {
    try {
      // Use getWeeklyLessons without classId to get all lessons for the student
      const response = await weeklyLessonsAPI.getWeeklyLessons('');
      if (response.success && response.data) {
        const lessonsList = response.data.lessons || [];
        setLessons(lessonsList);

        // Group lessons by date
        const grouped = {};
        lessonsList.forEach((lesson) => {
          const date = lesson.lessonDate;
          if (!date) return;
          if (!grouped[date]) {
            grouped[date] = [];
          }
          grouped[date].push(lesson);
        });

        // Sort dates descending
        const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
        const sortedGrouped = {};
        sortedDates.forEach((date) => {
          const lessonsForDate = grouped[date];
          if (lessonsForDate) {
            sortedGrouped[date] = lessonsForDate.sort((a, b) =>
              a.subject.localeCompare(b.subject)
            );
          }
        });

        setGroupedLessons(sortedGrouped);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeeklyLessons();
  }, []);

  const onRefresh = async (event) => {
    setRefreshing(true);
    await fetchWeeklyLessons();
    event.detail.complete();
  };

  const handleLessonPress = (lesson) => {
    setSelectedLesson(lesson);
    setShowModal(true);
  };

  const handleOpenAttachment = (attachment) => {
    window.open(attachment.url, '_blank');
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/student/dashboard" />
            </IonButtons>
            <IonTitle>Weekly Lessons</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Loading homework...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/student/dashboard" />
          </IonButtons>
          <IonTitle>Weekly Lessons</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="weekly-lessons-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {/* Header */}
        <div className="page-header">
          <h2 className="header-title">Homework & Classwork</h2>
          <p className="header-subtitle">
            Tap on any subject to view details and download files
          </p>
        </div>

        {/* Date Sections */}
        {Object.entries(groupedLessons).map(([date, dateLessons]) => (
          <div key={date} className="day-section">
            <div className="day-header">
              <IonIcon icon={calendarOutline} />
              <span className="day-title">{formatDisplayDate(date)}</span>
            </div>
            <div className="lessons-container">
              {dateLessons.length > 0 ? (
                dateLessons.map((lesson) => (
                  <IonCard
                    key={lesson.id}
                    className="lesson-card"
                    onClick={() => handleLessonPress(lesson)}
                  >
                    <IonCardContent>
                      <div className="lesson-header">
                        <span className="lesson-subject">
                          <IonIcon icon={bookOutline} /> {lesson.subject}
                        </span>
                        {lesson.attachments.length > 0 && (
                          <IonBadge color="light" className="attachment-badge">
                            <IonIcon icon={attachOutline} /> {lesson.attachments.length}
                          </IonBadge>
                        )}
                      </div>
                      {lesson.homeworkText ? (
                        <p className="lesson-preview">
                          <IonIcon icon={pencilOutline} /> {lesson.homeworkText}
                        </p>
                      ) : lesson.classworkText ? (
                        <p className="lesson-preview">
                          <IonIcon icon={paperPlaneOutline} /> {lesson.classworkText}
                        </p>
                      ) : (
                        <p className="lesson-empty">No assignment</p>
                      )}
                    </IonCardContent>
                  </IonCard>
                ))
              ) : (
                <div className="empty-day">
                  <IonText color="medium">No homework assigned</IonText>
                </div>
              )}
            </div>
          </div>
        ))}

        {Object.keys(groupedLessons).length === 0 && (
          <div className="empty-state">
            <IonIcon icon={calendarOutline} className="empty-icon" />
            <IonText color="medium">
              <h3>No homework assigned yet</h3>
            </IonText>
          </div>
        )}

        {/* Lesson Detail Modal */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          {selectedLesson && (
            <div className="modal-container">
              <div className="modal-header">
                <div className="modal-header-content">
                  <h2 className="modal-title">{selectedLesson.subject}</h2>
                  <p className="modal-subtitle">
                    {formatDisplayDate(selectedLesson.lessonDate)}
                  </p>
                </div>
                <IonButton fill="clear" onClick={() => setShowModal(false)}>
                  <IonIcon icon={closeOutline} slot="icon-only" />
                </IonButton>
              </div>

              <div className="modal-content">
                {/* Classwork Section */}
                {selectedLesson.classworkText && (
                  <div className="section">
                    <h4 className="section-title">
                      <IonIcon icon={paperPlaneOutline} /> Classwork
                    </h4>
                    <p className="section-content">{selectedLesson.classworkText}</p>
                  </div>
                )}

                {/* Homework Section */}
                {selectedLesson.homeworkText && (
                  <div className="section">
                    <h4 className="section-title">
                      <IonIcon icon={pencilOutline} /> Homework
                    </h4>
                    <p className="section-content">{selectedLesson.homeworkText}</p>
                  </div>
                )}

                {/* Attachments Section */}
                {selectedLesson.attachments.length > 0 && (
                  <div className="section">
                    <h4 className="section-title">
                      <IonIcon icon={attachOutline} /> Attachments
                    </h4>
                    {selectedLesson.attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="attachment-item"
                        onClick={() => handleOpenAttachment(attachment)}
                      >
                        <div className="attachment-info">
                          <span className="attachment-name">{attachment.name}</span>
                          <span className="attachment-meta">
                            {(attachment.size / 1024).toFixed(1)} KB • Tap to download
                          </span>
                        </div>
                        <IonIcon icon={downloadOutline} className="download-icon" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default WeeklyLessonViewScreen;