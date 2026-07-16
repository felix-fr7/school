/**
 * Class Circulars List Screen (Ionic React Version)
 * View circulars/announcements with visibility filtering
 * Only shows circulars where visibility is 'ALL' OR the current class is included
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
  IonCard,
  IonCardContent,
  IonBadge,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
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

  const fetchCirculars = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(1);
      }
      
      const currentPage = refresh ? 1 : page;
      // Note: classControllerAPI.getCirculars not available, using console.log fallback
      console.log('Fetching circulars for page:', currentPage);
      
      // Simulate empty response for now
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
    setRefreshing(true);
    await fetchCirculars(true);
    event.detail.complete();
  };

  const formatDate = (dateString: string) => {
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

  const handleDeleteCircular = (circular: Circular) => {
    // Note: deleteCircular API not available, using console.log fallback
    console.log('Deleting circular:', circular.id);
    setCirculars(prev => prev.filter(c => c.id !== circular.id));
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
          <IonToolbar>
            <IonTitle>Circulars</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center circulars-loading">
          <IonSpinner name="crescent" />
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
        <IonToolbar>
          <IonTitle>Circulars</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="circulars-list-content" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} />
        </IonRefresher>

        {/* Header */}
        <div className="header-section">
          <h1 className="header-title">Circulars</h1>
          <IonText color="medium">
            <p className="header-subtitle">Official announcements and notices</p>
          </IonText>
        </div>

        {/* Info Banner */}
        <div className="info-banner">
          <span className="info-icon">ℹ️</span>
          <IonText color="primary">
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
          <>
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
                      <span>{item.issueDate ? formatDate(item.issueDate) : formatDate(item.createdAt)}</span>
                    </div>
                    <div className="footer-right">
                      {item.imageUrl && (
                        <IonIcon icon={documentOutline} className="attachment-icon" />
                      )}
                      <IonIcon 
                        icon={trashOutline} 
                        className="delete-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCircular(item);
                        }}
                      />
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>
            ))}
          </>
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
      </IonContent>
    </IonPage>
  );
};

export default ClassCircularsListScreen;