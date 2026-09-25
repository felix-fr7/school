/**
 * Albums Screen
 * View published video/link albums (for students and class controllers)
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonGrid,
  IonRow,
  IonCol,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonBadge,
  IonSpinner,
  IonButtons,
  IonBackButton,
  IonToast,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import {
  linkOutline,
  filmOutline,
  folderOpenOutline,
  playCircleOutline,
  closeOutline,
} from 'ionicons/icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { albumsAPI } from '../../src/services/api';
import './AlbumsScreen.css';
import HomeLogoutButtons from '../../src/components/HomeLogoutButtons';

const AlbumsScreen = () => {
  const { isClass, isStudent } = useAuth();
  const [toast, setToast] = useState(null);

  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [showAlbumDetail, setShowAlbumDetail] = useState(false);

  // Back navigation depends on who is viewing
  const defaultBackHref = isClass
    ? '/class-controller/dashboard'
    : isStudent
      ? '/student/dashboard'
      : '/';

  useEffect(() => {
    fetchAlbums();
  }, [pagination.page]);

  const fetchAlbums = async () => {
    try {
      setLoading(true);
      // Public endpoint: only published albums, filtered by class when applicable
      const response = await albumsAPI.getAlbums(pagination.page, pagination.limit);
      if (response.success) {
        setAlbums(response.data || []);
        setPagination(response.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
      } else {
        setAlbums([]);
        showToast('danger', response.error?.message || 'Failed to load albums');
      }
    } catch (error) {
      console.error('Error fetching albums:', error);
      setAlbums([]);
      showToast('danger', error.response?.data?.error?.message || 'Failed to load albums');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async (event) => {
    await fetchAlbums();
    event.detail.complete();
  };

  const showToast = (color, message) => {
    setToast({ color, message, duration: 3000 });
  };

  const openAlbum = (album) => {
    setSelectedAlbum(album);
    setShowAlbumDetail(true);
  };

  const openLink = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading && albums.length === 0) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref={defaultBackHref} />
            </IonButtons>
            <IonTitle>Albums</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <IonSpinner name="crescent" color="primary" />
          <p>Loading albums...</p>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={defaultBackHref} />
          </IonButtons>
          <IonTitle>Albums</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {albums.length === 0 ? (
          <div className="empty-state">
            <IonIcon icon={folderOpenOutline} style={{ fontSize: '64px', color: '#ccc' }} />
            <h3>No Albums Available</h3>
            <p>Only albums published by admin will appear here. Check back later.</p>
          </div>
        ) : (
          <IonGrid>
            <IonRow>
              {albums.map((album) => (
                <IonCol size="12" size-md="6" size-lg="4" key={album._id}>
                  <IonCard className="album-view-card" onClick={() => openAlbum(album)}>
                    <IonCardHeader>
                      <IonCardTitle>{album.title}</IonCardTitle>
                      <IonCardSubtitle>
                        <IonIcon icon={linkOutline} size="small" /> {album.links?.length || 0} links
                      </IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      {album.description && (
                        <p className="album-view-description">{album.description}</p>
                      )}
                      <div className="album-view-meta">
                        <IonBadge color="primary">{album.category}</IonBadge>
                        {album.tags && album.tags.slice(0, 2).map((tag, idx) => (
                          <IonBadge key={idx} color="secondary">{tag}</IonBadge>
                        ))}
                      </div>
                      {album.links && album.links.length > 0 && (
                        <div className="album-view-preview">
                          <IonIcon icon={playCircleOutline} className="play-icon" />
                          <span>Click to view links</span>
                        </div>
                      )}
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination-controls">
            <IonButton
              disabled={pagination.page === 1}
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            >
              Previous
            </IonButton>
            <span>Page {pagination.page} of {pagination.pages}</span>
            <IonButton
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            >
              Next
            </IonButton>
          </div>
        )}
      </IonContent>

      {/* Toast Notification */}
      {toast && (
        <IonToast
          isOpen={!!toast}
          onDidDismiss={() => setToast(null)}
          message={toast.message}
          duration={toast.duration}
          color={toast.color}
          position="top"
        />
      )}

      {/* Album Detail Modal */}
      <IonModal isOpen={showAlbumDetail} onDidDismiss={() => setShowAlbumDetail(false)}>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => setShowAlbumDetail(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
            <IonTitle>{selectedAlbum?.title}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {selectedAlbum && (
            <>
              <p className="album-detail-description">{selectedAlbum.description}</p>

              <div className="album-detail-meta">
                <IonBadge color="primary">{selectedAlbum.category}</IonBadge>
                {selectedAlbum.tags && selectedAlbum.tags.map((tag, idx) => (
                  <IonBadge key={idx} color="secondary">{tag}</IonBadge>
                ))}
              </div>

              <h3 className="links-title">
                <IonIcon icon={filmOutline} /> Links ({selectedAlbum.links?.length || 0})
              </h3>

              {selectedAlbum.links && selectedAlbum.links.length > 0 ? (
                <IonList>
                  {selectedAlbum.links.map((link, idx) => (
                    <IonItem
                      key={idx}
                      className="album-link-item"
                      button
                      onClick={() => openLink(link.url)}
                    >
                      <div className="link-icon-wrapper">
                        <IonIcon icon={playCircleOutline} className="link-play-icon" />
                      </div>
                      <IonLabel>
                        <h3>{link.title}</h3>
                        <p className="link-url">{link.url}</p>
                      </IonLabel>
                      <IonIcon icon={linkOutline} slot="end" color="primary" />
                    </IonItem>
                  ))}
                </IonList>
              ) : (
                <p>No links in this album yet.</p>
              )}
            </>
          )}
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default AlbumsScreen;
