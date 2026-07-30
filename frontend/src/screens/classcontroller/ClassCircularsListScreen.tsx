/**
 * Class Circulars List Screen (Ionic React Version)
 * View circulars/announcements with visibility filtering
 */

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
  IonCard,
  IonCardContent,
  IonBadge,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonAlert,
  IonToast,
  IonButton,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { 
  documentOutline, 
  calendarOutline, 
  globeOutline, 
  listOutline,
  refreshOutline,
  trashOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { Circular } from '../../types';
import './ClassCircularsListScreen.css';

const ClassCircularsListScreen: React.FC = () => {
  const history = useHistory();
  
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Delete State Handling
  const [selectedCircularToDelete, setSelectedCircularToDelete] = useState<Circular | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchCirculars = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(1);
      }
      
      const currentPage = refresh ? 1 : page;
      console.log('Fetching circulars for page:', currentPage);
      
      // Fallback empty data / API integration point
      setCirculars([]);
      setTotalPages(1);
    } catch (error) {
      console.error('Error fetching circulars:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCirculars();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    await fetchCirculars(true);
    event.detail.complete();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleCircularPress = (circular: Circular) => {
    history.push(`/class-controller/circulars/${circular.id}`);
  };

  const confirmDelete = (circular: Circular, event: React.MouseEvent) => {
    event.stopPropagation(); // Card navigation trigger ஆகாமல் தடுக்கும்
    setSelectedCircularToDelete(circular);
    setShowDeleteAlert(true);
  };

  const executeDelete = () => {
    if (!selectedCircularToDelete) return;
    
    // Logic for deleting item locally
    setCirculars(prev => prev.filter(c => c.id !== selectedCircularToDelete.id));
    setToastMessage('Circular deleted successfully');
    setSelectedCircularToDelete(null);
  };

  const onIonInfinite = async (event: CustomEvent) => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
      await fetchCirculars(false);
    }
    (event.target as HTMLIonInfiniteScrollElement).complete();
  };

  if (loading && circulars.length === 0) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar className="light-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/class-controller/dashboard" />
            </IonButtons>
            <IonTitle>Circulars</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="circulars-loading ion-text-center">
          <IonSpinner name="crescent" color="primary" />
          <IonText color="medium">
            <p className="loading-text">Loading circulars...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="light-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/dashboard" />
          </IonButtons>
          <IonTitle>Circulars</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="circulars-list-content" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} />
        </IonRefresher>

        {/* Header Section */}
        <div className="header-section">
          <h1 className="header-title">Circulars</h1>
          <IonText color="medium">
            <p className="header-subtitle">Official announcements and notices</p>
          </IonText>
        </div>

        {/* Info Banner */}
        <div className="info-banner">
          <IonIcon icon={informationCircleOutline} className="info-icon" color="primary" />
          <IonText color="dark">
            <p className="info-text">
              Showing circulars visible to your class
            </p>
          </IonText>
        </div>

        {/* Circulars List */}
        {circulars.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <IonText>
              <h3>No circulars available</h3>
              <p className="empty-subtext">Check back later for announcements</p>
            </IonText>
          </div>
        ) : (
          <div className="circulars-wrapper">
            {circulars.map((item) => (
              <IonCard 
                key={item.id} 
                className="circular-card"
                button
                onClick={() => handleCircularPress(item)}
              >
                <IonCardContent>
                  <div className="circular-header">
                    <IonBadge color="secondary" className="circular-no-badge">
                      {item.circularNo || 'N/A'}
                    </IonBadge>
                    <h3 className="circular-title">{item.title}</h3>
                    <IonBadge 
                      className={`visibility-badge ${item.visibility === 'ALL' ? 'visibility-all' : 'visibility-specific'}`}
                    >
                      <IonIcon icon={item.visibility === 'ALL' ? globeOutline : listOutline} slot="start" />
                      {item.visibility === 'ALL' ? 'All' : 'Specific'}
                    </IonBadge>
                  </div>
                  
                  <p className="circular-content">{item.content}</p>
                  
                  <div className="circular-footer">
                    <div className="footer-left">
                      <IonIcon icon={calendarOutline} />
                      <span>{formatDate(item.issueDate || item.createdAt)}</span>
                    </div>
                    <div className="footer-right">
                      {item.imageUrl && (
                        <IonIcon icon={documentOutline} className="attachment-icon" />
                      )}
                      <IonButton
                        fill="clear"
                        size="small"
                        color="danger"
                        className="delete-btn"
                        onClick={(e) => confirmDelete(item, e)}
                      >
                        <IonIcon slot="icon-only" icon={trashOutline} />
                      </IonButton>
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>
            ))}
          </div>
        )}

        {/* Infinite Scroll */}
        <IonInfiniteScroll
          onIonInfinite={onIonInfinite}
          disabled={page >= totalPages}
        >
          <IonInfiniteScrollContent
            loadingSpinner="crescent"
            loadingText="Loading more circulars..."
          />
        </IonInfiniteScroll>

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Confirm Deletion"
          message={`Are you sure you want to delete "${selectedCircularToDelete?.title}"?`}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: executeDelete,
            },
          ]}
        />

        {/* Action Feedback Toast */}
        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage}
          duration={2000}
          onDidDismiss={() => setToastMessage('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassCircularsListScreen;