/**
 * Admin Albums Screen
 * Manage video/link albums for classes and students
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
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
  IonInput,
  IonBadge,
  IonSpinner,
  IonButtons,
  IonToast,
  IonAlert,
} from '@ionic/react';
import {
  addCircleOutline,
  trashOutline,
  createOutline,
  linkOutline,
  eyeOutline,
  eyeOffOutline,
  filmOutline,
  folderOpenOutline,
  closeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  refreshOutline,
  arrowBackOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { albumsAPI } from '../../services/api';
import './AdminAlbumsScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const AdminAlbumsScreen = () => {
  const history = useHistory();
  const { user } = useAuth();
  const [toast, setToast] = useState(null);

  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  // Modal states
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showAlbumDetailModal, setShowAlbumDetailModal] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);

  // Delete confirmation
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState(null);

  const [newLink, setNewLink] = useState({
    title: '',
    url: '',
    thumbnailUrl: '',
  });

  // Ref-based guard to prevent overlapping requests without relying on
  // the (async) 'loading' state, which caused a stale-closure bug where
  // the very first fetch call always bailed out and the screen stayed
  // stuck on the loading/white screen forever.
  const isFetchingRef = useRef(false);

  // Debug logging
  useEffect(() => {
    console.log('[AdminAlbumsScreen] Component mounted, user:', user);
  }, []);

  const fetchAlbums = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isFetchingRef.current) {
      console.log('[AdminAlbumsScreen] Already loading, skipping fetch');
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      setApiError(null);
      setAlbums([]);
      console.log('[AdminAlbumsScreen] Fetching albums, page:', pagination.page, 'limit:', pagination.limit);
      
      const response = await albumsAPI.getAdminAlbums(pagination.page, pagination.limit);
      console.log('[AdminAlbumsScreen] Albums response received:', response);
      
      if (response && response.success) {
        const updatedAlbums = response.data || [];
        setAlbums(updatedAlbums);
        setPagination(response.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
        console.log('[AdminAlbumsScreen] Albums loaded successfully:', updatedAlbums.length, 'albums');
      } else {
        const errorMsg = response?.error?.message || response?.message || 'Invalid response from server';
        console.warn('[AdminAlbumsScreen] Invalid response:', response, errorMsg);
        setError('Failed to load albums: ' + errorMsg);
        setApiError(response?.error?.details || '');
        setAlbums([]);
      }
    } catch (err) {
      console.error('[AdminAlbumsScreen] Error fetching albums:', err);
      console.error('[AdminAlbumsScreen] Error details:', {
        message: err.message,
        code: err.code,
        response: err.response?.status,
        data: err.response?.data
      });
      
      let errorMessage = 'Failed to load albums';
      if (err.response) {
        errorMessage = err.response.data?.error?.message || err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'No response from server. Please check if the backend is running.';
      } else {
        errorMessage = err.message || 'Unknown error';
      }
      
      setError(errorMessage);
      setApiError(err.response?.data?.error?.details || '');
      setAlbums([]);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  const showToast = (color, message) => {
    setToast({ color, message, duration: 3000 });
  };

  const handleAddLink = async () => {
    if (!selectedAlbum) return;
    if (!newLink.title.trim() || !newLink.url.trim()) {
      showToast('danger', 'Link title and URL are required');
      return;
    }

    try {
      const response = await albumsAPI.addLinkToAlbum(selectedAlbum._id, newLink);
      if (response.success) {
        showToast('success', 'Link added successfully');
        setShowAddLinkModal(false);
        setSelectedAlbum(response.data);
        setNewLink({ title: '', url: '', thumbnailUrl: '' });
        fetchAlbums();
      }
    } catch (error) {
      console.error('Error adding link:', error);
      showToast('danger', error.response?.data?.error?.message || 'Failed to add link');
    }
  };

  const handleDeleteAlbum = (album) => {
    setAlbumToDelete(album);
    setShowDeleteAlert(true);
  };

  const handleDeleteConfirm = async () => {
    if (!albumToDelete) return;
    try {
      const response = await albumsAPI.deleteAlbum(albumToDelete._id);
      if (response.success) {
        showToast('success', 'Album deleted successfully');
        fetchAlbums();
      }
    } catch (error) {
      console.error('Error deleting album:', error);
      showToast('danger', 'Failed to delete album');
    } finally {
      setAlbumToDelete(null);
      setShowDeleteAlert(false);
    }
  };

  const handleEditAlbum = (album) => {
    history.push(`/admin/albums/${album._id}/edit`);
  };

  const handleRemoveLink = async (albumId, linkIndex) => {
    try {
      const response = await albumsAPI.removeLinkFromAlbum(albumId, linkIndex);
      if (response.success) {
        showToast('success', 'Link removed successfully');
        setSelectedAlbum(response.data);
        fetchAlbums();
      }
    } catch (error) {
      console.error('Error removing link:', error);
      showToast('danger', 'Failed to remove link');
    }
  };

  const handleTogglePublish = async (album) => {
    try {
      const response = await albumsAPI.updateAlbum(album._id, {
        isPublished: !album.isPublished
      });
      if (response.success) {
        showToast('success', album.isPublished ? 'Album unpublished' : 'Album published');
        fetchAlbums();
      }
    } catch (error) {
      console.error('Error toggling publish:', error);
      showToast('danger', 'Failed to update album');
    }
  };

  const openAlbumDetail = (album) => {
    setSelectedAlbum(album);
    setShowAlbumDetailModal(true);
  };

  const openAddLinkModal = (album) => {
    setSelectedAlbum(album);
    setShowAddLinkModal(true);
  };

  if (loading) {
    return (
      <IonPage className="admin-albums-page">
        <IonContent className="admin-albums-content ion-padding ion-text-center" forceOverscroll={false}>
          <div className="loading-container">
            <IonSpinner name="crescent" color="primary" />
            <p className="loading-text">Loading albums...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="admin-albums-page" style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <IonHeader>
        <IonToolbar style={{ '--background': '#4F46E5', '--color': '#ffffff' }}>
          <IonButtons slot="start">
            <IonButton 
              onClick={() => history.push('/admin/dashboard')}
              style={{ '--color': '#ffffff', '--background': 'rgba(255, 255, 255, 0.15)', '--border-radius': '8px' }}
            >
              <IonIcon icon={arrowBackOutline} slot="icon-only" style={{ color: '#ffffff', fontSize: '20px' }} />
            </IonButton>
          </IonButtons>
          <IonTitle style={{ color: '#ffffff', fontWeight: '700' }}>Albums Management</IonTitle>
          <IonButtons slot="end">
            <IonButton 
              onClick={() => history.push('/admin/albums/create')}
              style={{ '--color': '#ffffff', '--background': '#6366F1', '--border-radius': '8px', padding: '0 8px' }}
            >
              <IonIcon icon={addCircleOutline} slot="start" style={{ color: '#ffffff' }} />
              New Album
            </IonButton>
          </IonButtons>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-albums-content ion-padding" forceOverscroll={false} style={{ '--background': '#f0f0f0' }}>
        {error ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <IonIcon icon={alertCircleOutline} style={{ fontSize: '48px', color: '#ef4444' }} />
            <h3 style={{ color: '#333', marginTop: '16px' }}>Error Loading Albums</h3>
            <p style={{ color: '#666', fontSize: '0.9rem', maxWidth: '400px', margin: '8px auto' }}>{error}</p>
            <IonButton onClick={fetchAlbums} style={{ marginTop: '16px' }}>
              <IonIcon icon={refreshOutline} slot="start" />
              Retry
            </IonButton>
          </div>
        ) : albums.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', minHeight: '300px', background: '#f8fafc', borderRadius: '12px', margin: '20px auto', maxWidth: '400px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <IonIcon icon={folderOpenOutline} style={{ fontSize: '64px', color: '#4F46E5' }} />
            <h3 style={{ marginTop: '16px', color: '#1F2937', fontSize: '1.4rem', fontWeight: '700' }}>No Albums Yet</h3>
            <p style={{ color: '#4B5563', marginTop: '8px', fontSize: '1rem', lineHeight: '1.5' }}>Create your first album to share video links with classes</p>
            <IonButton onClick={() => history.push('/admin/albums/create')} style={{ marginTop: '20px' }}>
              <IonIcon icon={addCircleOutline} slot="start" />
              Create Album
            </IonButton>
          </div>
        ) : (
          <IonGrid>
            <IonRow>
              {albums.map((album) => (
                <IonCol size="12" size-md="6" size-lg="4" key={album._id}>
                  <IonCard className="album-card">
                    <IonCardHeader>
                      <div className="album-card-header">
                        <IonCardTitle>{album.title}</IonCardTitle>
                        <div className="album-badges">
                          {album.isPublished ? (
                            <IonBadge color="success">Published</IonBadge>
                          ) : (
                            <IonBadge color="medium">Draft</IonBadge>
                          )}
                          <IonBadge color="primary">{album.category}</IonBadge>
                        </div>
                      </div>
                      <IonCardSubtitle>
                        {album.links?.length || 0} links • {album.visibility === 'ALL' ? 'All Classes' : 'Specific Classes'}
                      </IonCardSubtitle>
                    </IonCardHeader>
                    <IonCardContent>
                      {album.description && (
                        <p className="album-description">{album.description}</p>
                      )}
                      
                      {album.links && album.links.length > 0 && (
                        <div className="album-links-preview">
                          <h4>Links:</h4>
                          <IonList>
                            {album.links.slice(0, 3).map((link, idx) => (
                              <IonItem key={idx} lines="none" className="link-item">
                                <IonIcon icon={linkOutline} slot="start" color="primary" />
                                <IonLabel className="link-title">{link.title}</IonLabel>
                                <IonButton
                                  size="small"
                                  fill="clear"
                                  color="primary"
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Open
                                </IonButton>
                              </IonItem>
                            ))}
                            {album.links.length > 3 && (
                              <IonItem lines="none">
                                <IonLabel color="medium">
                                  +{album.links.length - 3} more links
                                </IonLabel>
                              </IonItem>
                            )}
                          </IonList>
                        </div>
                      )}

                      <div className="album-actions">
                        <IonButton
                          size="small"
                          fill="outline"
                          onClick={() => openAlbumDetail(album)}
                        >
                          <IonIcon icon={eyeOutline} slot="start" />
                          View
                        </IonButton>
                        <IonButton
                          size="small"
                          fill="outline"
                          color="secondary"
                          onClick={() => openAddLinkModal(album)}
                        >
                          <IonIcon icon={addCircleOutline} slot="start" />
                          Add Link
                        </IonButton>
                        <IonButton
                          size="small"
                          fill="outline"
                          color={album.isPublished ? 'warning' : 'success'}
                          onClick={() => handleTogglePublish(album)}
                        >
                          <IonIcon icon={album.isPublished ? eyeOffOutline : checkmarkCircleOutline} slot="start" />
                          {album.isPublished ? 'Unpublish' : 'Publish'}
                        </IonButton>
                        <IonButton
                          size="small"
                          fill="outline"
                          color="tertiary"
                          onClick={() => handleEditAlbum(album)}
                        >
                          <IonIcon icon={createOutline} slot="start" />
                          Edit
                        </IonButton>
                        <IonButton
                          size="small"
                          fill="outline"
                          color="danger"
                          onClick={() => handleDeleteAlbum(album)}
                        >
                          <IonIcon icon={trashOutline} slot="start" />
                          Delete
                        </IonButton>
                      </div>
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

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Album"
          message={`Are you sure you want to delete "${albumToDelete?.title}"? This action cannot be undone.`}
          buttons={[
            { text: 'Cancel', role: 'cancel', handler: () => setAlbumToDelete(null) },
            {
              text: 'Delete',
              role: 'destructive',
              handler: handleDeleteConfirm,
            },
          ]}
        />

        {/* Add Link Modal */}
        <IonModal className="album-modal" isOpen={showAddLinkModal} onDidDismiss={() => setShowAddLinkModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Add Link to "{selectedAlbum?.title}"</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowAddLinkModal(false)}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonLabel position="floating">Link Title *</IonLabel>
                <IonInput
                  value={newLink.title}
                  onIonChange={(e) => setNewLink({ ...newLink, title: e.detail.value })}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Video URL *</IonLabel>
                <IonInput
                  type="url"
                  value={newLink.url}
                  onIonChange={(e) => setNewLink({ ...newLink, url: e.detail.value })}
                  placeholder="https://..."
                />
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Thumbnail URL (Optional)</IonLabel>
                <IonInput
                  type="url"
                  value={newLink.thumbnailUrl}
                  onIonChange={(e) => setNewLink({ ...newLink, thumbnailUrl: e.detail.value })}
                  placeholder="https://..."
                />
              </IonItem>
            </IonList>
            <div className="ion-padding-top">
              <IonButton expand="block" onClick={handleAddLink}>
                <IonIcon icon={linkOutline} slot="start" />
                Add Link
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        {/* Album Detail Modal */}
        <IonModal className="album-modal" isOpen={showAlbumDetailModal} onDidDismiss={() => setShowAlbumDetailModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{selectedAlbum?.title}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowAlbumDetailModal(false)}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {selectedAlbum && (
              <>
                <p>{selectedAlbum.description}</p>
                <div className="album-meta">
                  <IonBadge color="primary">{selectedAlbum.category}</IonBadge>
                  <IonBadge color={selectedAlbum.isPublished ? 'success' : 'medium'}>
                    {selectedAlbum.isPublished ? 'Published' : 'Draft'}
                  </IonBadge>
                  {selectedAlbum.tags && selectedAlbum.tags.map((tag, idx) => (
                    <IonBadge key={idx} color="secondary">{tag}</IonBadge>
                  ))}
                </div>
                <h3>Links ({selectedAlbum.links?.length || 0})</h3>
                {selectedAlbum.links && selectedAlbum.links.length > 0 ? (
                  <IonList>
                    {selectedAlbum.links.map((link, idx) => (
                      <IonItem key={idx}>
                        <IonIcon icon={filmOutline} slot="start" color="primary" />
                        <IonLabel>
                          <h3>{link.title}</h3>
                          <p>{link.url}</p>
                        </IonLabel>
                        <IonButton
                          fill="clear"
                          color="primary"
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <IonIcon icon={linkOutline} />
                        </IonButton>
                        <IonButton
                          fill="clear"
                          color="danger"
                          onClick={() => handleRemoveLink(selectedAlbum._id, idx)}
                        >
                          <IonIcon icon={trashOutline} />
                        </IonButton>
                      </IonItem>
                    ))}
                  </IonList>
                ) : (
                  <p>No links added yet.</p>
                )}
                <div className="ion-padding-top">
                  <IonButton expand="block" onClick={() => { setShowAlbumDetailModal(false); openAddLinkModal(selectedAlbum); }}>
                    <IonIcon icon={addCircleOutline} slot="start" />
                    Add Link
                  </IonButton>
                </div>
              </>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default AdminAlbumsScreen;