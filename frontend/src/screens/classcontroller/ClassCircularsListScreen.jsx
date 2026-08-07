/**
 * Class Circulars List Screen (Ionic React Version)
 * View circulars/announcements with visibility filtering
 */

import React, { useEffect, useState, useCallback } from 'react';
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
import { 
  documentOutline, 
  calendarOutline, 
  globeOutline, 
  listOutline,
  refreshOutline,
  trashOutline,
  informationCircleOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { classControllerAPI, storage } from '../../services/api';
import './ClassCircularsListScreen.css';

// Get API base URL for constructing attachment URLs
const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.EXPO_PUBLIC_API_URL || 
  'http://localhost:3000/api';

const ClassCircularsListScreen = () => {
  const history = useHistory();
  
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Delete State Handling
  const [selectedCircularToDelete, setSelectedCircularToDelete] = useState(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastColor, setToastColor] = useState('dark');

  const fetchCirculars = useCallback(async (refresh = false, pageNum = 1) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(1);
      }
      
      const currentPage = refresh ? 1 : pageNum;
      console.log('Fetching circulars for page:', currentPage);
      
      const response = await classControllerAPI.getCirculars(currentPage, 20);
      
      if (response && response.success && response.data) {
        const circularsData = response.data.map(c => ({
          id: c._id || c.id,
          title: c.title,
          content: c.content,
          visibility: c.visibility || 'ALL',
          classId: c.classId?._id || c.classId,
          className: c.classId?.name || null,
          issueDate: c.createdAt || c.publishedAt,
          imageUrl: c.imageUrl,
          attachmentUrl: c.attachmentUrl,
          author: c.authorId?.name || 'Admin',
        }));
        
        if (refresh || currentPage === 1) {
          setCirculars(circularsData);
        } else {
          setCirculars(prev => [...prev, ...circularsData]);
        }
        setTotalPages(response.pagination?.pages || 1);
      } else {
        setCirculars([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching circulars:', error);
      setToastMessage('Failed to load circulars.');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCirculars(false, 1);
  }, [fetchCirculars]);

  const onRefresh = async (event) => {
    await fetchCirculars(true, 1);
    event.detail.complete();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleCircularPress = (circular) => {
    history.push(`/class-controller/circulars/${circular.id}`);
  };

  const confirmDelete = (circular, event) => {
    event.stopPropagation();
    setSelectedCircularToDelete(circular);
    setShowDeleteAlert(true);
  };

  const executeDelete = async () => {
    if (!selectedCircularToDelete) return;
    
    try {
      // Note: Delete is admin-only, so this would only work if the class controller
      // has admin privileges. For now, we'll show a message.
      setToastMessage('Only admins can delete circulars.');
      setToastColor('warning');
      setShowToast(true);
    } catch (error) {
      console.error('Error deleting circular:', error);
      setToastMessage('Failed to delete circular.');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setShowDeleteAlert(false);
      setSelectedCircularToDelete(null);
    }
  };

  const onIonInfinite = async (event) => {
    if (page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchCirculars(false, nextPage);
    }
    event.target.complete();
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
          <IonTitle>Circulars ({circulars.length})</IonTitle>
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
                    <IonBadge 
                      className={`visibility-badge ${item.visibility === 'ALL' ? 'visibility-all' : 'visibility-specific'}`}
                    >
                      <IonIcon icon={item.visibility === 'ALL' ? globeOutline : listOutline} slot="start" />
                      {item.visibility === 'ALL' ? 'All Classes' : `Class: ${item.className || 'Specific'}`}
                    </IonBadge>
                    <h3 className="circular-title">{item.title}</h3>
                  </div>
                  
                  <p className="circular-content">{item.content}</p>
                  
                  <div className="circular-footer">
                    <div className="footer-left">
                      <IonIcon icon={calendarOutline} />
                      <span>{formatDate(item.issueDate)}</span>
                    </div>
                    <div className="footer-right">
                      {item.imageUrl && (
                        <IonButton
                          fill="clear"
                          size="small"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              // Use fetchFileAsBlobUrl to get authenticated access
                              const { fetchFileAsBlobUrl } = await import('../../services/api');
                              const blobUrl = await fetchFileAsBlobUrl(item.imageUrl);
                              window.open(blobUrl, '_blank', 'noopener,noreferrer');
                            } catch (error) {
                              console.error('Error opening attachment:', error);
                              // Fallback: try direct URL
                              const fullUrl = item.imageUrl.startsWith('http') 
                                ? item.imageUrl 
                                : `${API_BASE_URL.replace('/api', '')}${item.imageUrl}`;
                              window.open(fullUrl, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          className="attachment-btn"
                        >
                          <IonIcon icon={documentOutline} slot="start" />
                          View Attachment
                        </IonButton>
                      )}
                      {item.attachmentUrl && (
                        <IonButton
                          fill="clear"
                          size="small"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              // Use fetchFileAsBlobUrl to get authenticated access
                              const { fetchFileAsBlobUrl } = await import('../../services/api');
                              const blobUrl = await fetchFileAsBlobUrl(item.attachmentUrl);
                              window.open(blobUrl, '_blank', 'noopener,noreferrer');
                            } catch (error) {
                              console.error('Error opening attachment:', error);
                              // Fallback: try direct URL
                              const fullUrl = item.attachmentUrl.startsWith('http') 
                                ? item.attachmentUrl 
                                : `${API_BASE_URL.replace('/api', '')}${item.attachmentUrl}`;
                              window.open(fullUrl, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          className="attachment-btn"
                        >
                          <IonIcon icon={documentOutline} slot="start" />
                          Download PDF
                        </IonButton>
                      )}
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
          message={`Are you sure you want to delete "${selectedCircularToDelete?.title}"? Note: Only admins can delete circulars.`}
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
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
          color={toastColor}
          icon={toastColor === 'success' ? checkmarkCircleOutline : undefined}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassCircularsListScreen;