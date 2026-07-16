/**
 * Class Homework List Screen (Ionic React Version)
 * View and manage homework assignments for the class
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSpinner,
  IonText,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
  IonFab,
  IonFabButton,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/react';
import {
  addCircleOutline,
  calendarOutline,
  bookOutline,
  trashOutline,
  createOutline,
  refreshCircleOutline,
  checkmarkCircleOutline,
  timeOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { classControllerAPI } from '../../services/api';
import { Homework } from '../../types';
import './ClassHomeworkListScreen.css';

const ClassHomeworkListScreen: React.FC = () => {
  const history = useHistory();
  
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);

  const fetchHomework = async (refresh = false) => {
    try {
      if (refresh) {
        setPage(1);
      }
      
      // Note: getHomework API not available in classControllerAPI
      // This would need to be implemented in the backend
      console.log('Fetching homework for page:', refresh ? 1 : page);
      
      // Simulate empty response for now
      setHomework([]);
      setTotalPages(1);
    } catch (error) {
      console.error('Error fetching homework:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHomework();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    setRefreshing(true);
    await fetchHomework(true);
    event.detail.complete();
  };

  const handleHomeworkPress = (item: Homework) => {
    history.push(`/class-controller/homework/${item.id}`);
  };

  const handleDeleteHomework = (item: Homework) => {
    setSelectedHomework(item);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (!selectedHomework) return;
    
    try {
      // Note: deleteHomework API not available in classControllerAPI
      console.log('Deleting homework:', selectedHomework.id);
      setHomework(prev => prev.filter(h => h.id !== selectedHomework.id));
    } catch (error) {
      console.error('Error deleting homework:', error);
    }
    setShowDeleteAlert(false);
    setSelectedHomework(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getSubjectColor = (subject: string) => {
    const colors: { [key: string]: string } = {
      Mathematics: '#4CAF50',
      Science: '#2196F3',
      English: '#FF9800',
      History: '#9C27B0',
      Geography: '#00BCD4',
      'Computer Science': '#E91E63',
      Physics: '#3F51B5',
      Chemistry: '#009688',
      Biology: '#4CAF50',
      'Physical Education': '#FF5722',
      Art: '#9C27B0',
      Music: '#E91E63',
    };
    return colors[subject] || '#607D8B';
  };

  const handleLoadMore = async (event: CustomEvent) => {
    if (page >= totalPages) {
      event.detail.complete();
      return;
    }
    
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchHomework(false);
    event.detail.complete();
  };

  if (loading && homework.length === 0) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center homework-loading">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p className="loading-text">Loading homework...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Homework</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="homework-list-content" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent
            pullingIcon={refreshCircleOutline}
            refreshingSpinner="crescent"
          />
        </IonRefresher>

        {/* Header */}
        <div className="header-section">
          <h1 className="header-title">Homework</h1>
          <p className="header-subtitle">
            {homework.length} assignment{homework.length !== 1 ? 's' : ''} total
          </p>
        </div>

        {homework.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <IonText>
              <h3>No homework assigned</h3>
              <p className="empty-subtext">Create your first homework assignment</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {homework.map((item) => {
              const overdue = isOverdue(item.dueDate);
              const subjectColor = getSubjectColor(item.subject);

              return (
                <IonItem
                  key={item.id}
                  className="homework-card"
                  button
                  onClick={() => handleHomeworkPress(item)}
                  detail={false}
                >
                  <div
                    className="subject-badge"
                    style={{ backgroundColor: subjectColor }}
                    slot="start"
                  >
                    <span className="subject-badge-text">
                      {item.subject.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <IonLabel className="homework-content">
                    <h3 className="homework-title">{item.title}</h3>
                    <p className="homework-description">{item.description}</p>
                    
                    <div className="homework-meta">
                      <div className="meta-item">
                        <IonIcon icon={calendarOutline} className="meta-icon" />
                        <span className={`meta-text ${overdue ? 'overdue-text' : ''}`}>
                          {item.dueDate ? formatDate(item.dueDate) : 'No due date'}
                          {overdue && ' (Overdue)'}
                        </span>
                      </div>
                      <div className="meta-item">
                        <IonIcon icon={bookOutline} className="meta-icon" />
                        <span className="meta-text">{item.subject}</span>
                      </div>
                    </div>
                  </IonLabel>

                  <div className="homework-status" slot="end">
                    {item.isPublished ? (
                      <IonBadge color="success" className="status-badge published">
                        <IonIcon icon={checkmarkCircleOutline} slot="start" />
                        Published
                      </IonBadge>
                    ) : (
                      <IonBadge color="warning" className="status-badge draft">
                        <IonIcon icon={timeOutline} slot="start" />
                        Draft
                      </IonBadge>
                    )}
                  </div>
                </IonItem>
              );
            })}
          </IonList>
        )}

        <IonInfiniteScroll
          onIonInfinite={handleLoadMore}
          disabled={page >= totalPages}
        >
          <IonInfiniteScrollContent
            loadingSpinner="crescent"
            loadingText="Loading more homework..."
          />
        </IonInfiniteScroll>
      </IonContent>

      {/* Floating Add Button */}
      <IonFab
        vertical="bottom"
        horizontal="end"
        slot="fixed"
        onClick={() => history.push('/class-controller/homework/create')}
      >
        <IonFabButton color="secondary">
          <IonIcon icon={addCircleOutline} />
        </IonFabButton>
      </IonFab>

      {/* Delete Confirmation Alert */}
      <IonAlert
        isOpen={showDeleteAlert}
        onDidDismiss={() => setShowDeleteAlert(false)}
        header="Delete Homework"
        message={`Are you sure you want to delete "${selectedHomework?.title}"?`}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Delete',
            role: 'destructive',
            handler: confirmDelete,
          },
        ]}
      />
    </IonPage>
  );
};

export default ClassHomeworkListScreen;