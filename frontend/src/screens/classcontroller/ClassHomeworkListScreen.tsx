import React, { useEffect, useState } from 'react';
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
  IonIcon,
  IonList,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
  IonFab,
  IonFabButton,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
} from '@ionic/react';
import {
  addOutline,
  calendarOutline,
  bookOutline,
  trashOutline,
  createOutline,
  refreshCircleOutline,
  checkmarkCircleOutline,
  timeOutline,
  peopleOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
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
      console.log('Fetching homework for page:', refresh ? 1 : page);
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

  const handleEditHomework = (e: React.MouseEvent, item: Homework) => {
    e.stopPropagation(); // Prevents card click
    history.push(`/class-controller/homework/edit/${item.id}`);
  };

  const handleDeleteHomework = (e: React.MouseEvent, item: Homework) => {
    e.stopPropagation(); // Prevents card click
    setSelectedHomework(item);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (!selectedHomework) return;
    try {
      setHomework((prev) => prev.filter((h) => h.id !== selectedHomework.id));
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
      year: 'numeric',
    });
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getSubjectColor = (subject: string) => {
    const colors: { [key: string]: string } = {
      Mathematics: '#2E7D32',
      Science: '#1565C0',
      English: '#E65100',
      History: '#6A1B9A',
      Geography: '#00838F',
      'Computer Science': '#C2185B',
      Physics: '#283593',
      Chemistry: '#00695C',
    };
    return colors[subject] || '#455A64';
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
        <IonContent className="ion-padding ion-text-center homework-loading">
          <IonSpinner name="crescent" color="primary" />
          <IonText color="medium">
            <p className="loading-text">Loading homework...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="light-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/dashboard" />
          </IonButtons>
          <IonTitle>Class Homework</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="homework-list-content" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent
            pullingIcon={refreshCircleOutline}
            refreshingSpinner="crescent"
          />
        </IonRefresher>

        <div className="header-section">
          <div>
            <h1 className="header-title">Assignments</h1>
            <p className="header-subtitle">
              {homework.length} total assignment{homework.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {homework.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <IonText>
              <h3>No homework assigned yet</h3>
              <p className="empty-subtext">
                Tap the '+' button below to create a new homework assignment for your class.
              </p>
            </IonText>
          </div>
        ) : (
          <div className="homework-container">
            {homework.map((item) => {
              const overdue = isOverdue(item.dueDate);
              const subjectColor = getSubjectColor(item.subject);

              return (
                <IonCard
                  key={item.id}
                  className="homework-card"
                  onClick={() => handleHomeworkPress(item)}
                >
                  <IonCardContent className="card-content">
                    <div className="card-top-row">
                      <span
                        className="subject-pill"
                        style={{ backgroundColor: `${subjectColor}15`, color: subjectColor }}
                      >
                        <IonIcon icon={bookOutline} /> {item.subject}
                      </span>

                      <div className="status-and-actions">
                        {item.isPublished ? (
                          <IonBadge color="success" className="status-badge">
                            <IonIcon icon={checkmarkCircleOutline} /> Published
                          </IonBadge>
                        ) : (
                          <IonBadge color="warning" className="status-badge">
                            <IonIcon icon={timeOutline} /> Draft
                          </IonBadge>
                        )}
                      </div>
                    </div>

                    <h2 className="homework-title">{item.title}</h2>
                    <p className="homework-description">{item.description}</p>

                    <div className="card-bottom-row">
                      <div className="meta-info">
                        <div className={`meta-item ${overdue ? 'overdue-text' : ''}`}>
                          <IonIcon icon={calendarOutline} />
                          <span>
                            {item.dueDate ? formatDate(item.dueDate) : 'No due date'}
                            {overdue && ' (Overdue)'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons Added Here */}
                      <div className="card-actions">
                        <IonButton
                          fill="clear"
                          size="small"
                          color="primary"
                          onClick={(e) => handleEditHomework(e, item)}
                        >
                          <IonIcon slot="icon-only" icon={createOutline} />
                        </IonButton>
                        <IonButton
                          fill="clear"
                          size="small"
                          color="danger"
                          onClick={(e) => handleDeleteHomework(e, item)}
                        >
                          <IonIcon slot="icon-only" icon={trashOutline} />
                        </IonButton>
                      </div>
                    </div>
                  </IonCardContent>
                </IonCard>
              );
            })}
          </div>
        )}

        <IonInfiniteScroll
          onIonInfinite={handleLoadMore}
          disabled={page >= totalPages}
        >
          <IonInfiniteScrollContent
            loadingSpinner="crescent"
            loadingText="Loading more..."
          />
        </IonInfiniteScroll>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton
            color="primary"
            onClick={() => history.push('/class-controller/homework/create')}
          >
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

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
      </IonContent>
    </IonPage>
  );
};

export default ClassHomeworkListScreen;