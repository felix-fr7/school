/**
 * Class Exam Schedules List Screen (Ionic React Version - READ-ONLY)
 * View Admin-published exam timetables (PDF/Image based)
 * Teachers cannot create or delete exams - only Admin can
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonCard,
  IonCardContent,
  IonIcon,
  IonBadge,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { 
  calendarOutline, 
  schoolOutline, 
  globeOutline, 
  documentOutline, 
  imageOutline,
  refreshOutline,
} from 'ionicons/icons';
import { classControllerAPI } from '../../services/api';
import './ClassExamSchedulesListScreen.css';

interface Exam {
  id: string;
  title: string;
  examName: string;
  fileUrl: string;
  pdfUrl: string;
  imageUrl: string;
  dueDate: string;
  isPublished: boolean;
  createdAt: string;
  class: {
    id: string;
    name: string;
    section: string;
  } | null;
}

const ClassExamSchedulesListScreen: React.FC = () => {
  const history = useHistory();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchExams = async (refresh = false) => {
    try {
      if (refresh) {
        setPage(1);
      }
      
      // Note: getExams API not available in classControllerAPI
      console.log('Fetching exams for page:', refresh ? 1 : page);
      
      // Simulate empty response for now
      setExams([]);
      setTotalPages(1);
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    setRefreshing(true);
    await fetchExams(true);
    event.detail.complete();
  };

  const onIonInfinite = async (event: CustomEvent) => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
      await fetchExams(false);
      (event.target as HTMLIonInfiniteScrollElement).complete();
    } else {
      (event.target as HTMLIonInfiniteScrollElement).complete();
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const getExamIcon = (item: Exam) => {
    const hasAttachment = item.fileUrl || item.pdfUrl || item.imageUrl;
    const isPDF = item.pdfUrl?.toLowerCase().endsWith('.pdf') || item.fileUrl?.toLowerCase().endsWith('.pdf');
    const isImage = !isPDF && (item.imageUrl || item.fileUrl);

    if (isPDF) return { icon: documentOutline, color: 'danger' as const };
    if (isImage) return { icon: imageOutline, color: 'primary' as const };
    return { icon: calendarOutline, color: 'medium' as const };
  };

  const navigateToExam = (examId: string) => {
    history.push(`/class-controller/exams/${examId}`);
  };

  if (loading && exams.length === 0) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Exam Schedules</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center exams-loading">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p className="loading-text">Loading exam schedules...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Exam Schedules</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="exams-list-content" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} />
        </IonRefresher>

        {/* Header */}
        <div className="header-section">
          <h1 className="header-title">Exam Schedules</h1>
          <IonText color="medium">
            <p className="header-subtitle">
              {exams.length} exam{exams.length !== 1 ? 's' : ''} published by Admin
            </p>
          </IonText>
        </div>

        {/* Info Banner */}
        <div className="info-banner">
          <span className="info-icon">ℹ️</span>
          <IonText color="primary">
            <p className="info-text">
              Exam schedules are published by school administration. Tap an exam to view details.
            </p>
          </IonText>
        </div>

        {/* Exam List */}
        {exams.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h2>No exam schedules</h2>
            <IonText color="medium">
              <p>Admin has not published any exams yet</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {exams.map((item) => {
              const examIcon = getExamIcon(item);
              const hasAttachment = item.fileUrl || item.pdfUrl || item.imageUrl;
              const isPDF = item.pdfUrl?.toLowerCase().endsWith('.pdf') || item.fileUrl?.toLowerCase().endsWith('.pdf');
              const isImage = !isPDF && (item.imageUrl || item.fileUrl);

              return (
                <IonCard 
                  key={item.id} 
                  className="exam-card"
                  button
                  onClick={() => navigateToExam(item.id)}
                >
                  <IonCardContent className="exam-card-content">
                    {/* Icon */}
                    <div className="exam-icon-container">
                      <span className="exam-icon">
                        {isPDF ? '📄' : isImage ? '🖼️' : '📅'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="exam-info">
                      <h3 className="exam-title">
                        {item.title || item.examName || 'Exam'}
                      </h3>

                      <div className="exam-meta">
                        <div className="meta-item">
                          <IonIcon icon={calendarOutline} />
                          <IonText color="medium">
                            {formatDate(item.dueDate) || formatDate(item.createdAt) || 'No date'}
                          </IonText>
                        </div>
                        {item.class ? (
                          <div className="meta-item">
                            <IonIcon icon={schoolOutline} />
                            <IonText color="medium">
                              {item.class.name}{item.class.section ? `-${item.class.section}` : ''}
                            </IonText>
                          </div>
                        ) : (
                          <div className="meta-item">
                            <IonIcon icon={globeOutline} />
                            <IonText color="medium">School-wide</IonText>
                          </div>
                        )}
                      </div>

                      {hasAttachment && (
                        <IonBadge color="secondary" className="attachment-badge">
                          {isPDF ? '📄 PDF' : isImage ? '🖼️ Image' : '📎 Attachment'}
                        </IonBadge>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="status-badge-container">
                      {item.isPublished ? (
                        <IonBadge color="success" className="status-badge">
                          Published
                        </IonBadge>
                      ) : (
                        <IonBadge color="warning" className="status-badge">
                          Draft
                        </IonBadge>
                      )}
                    </div>
                  </IonCardContent>
                </IonCard>
              );
            })}
          </IonList>
        )}

        {/* Infinite Scroll */}
        <IonInfiniteScroll
          threshold="100px"
          onIonInfinite={onIonInfinite}
          disabled={page >= totalPages}
        >
          <IonInfiniteScrollContent
            loadingSpinner="crescent"
            loadingText="Loading more exams..."
          />
        </IonInfiniteScroll>
      </IonContent>
    </IonPage>
  );
};

export default ClassExamSchedulesListScreen;