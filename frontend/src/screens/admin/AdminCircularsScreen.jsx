/**
 * Admin Circulars Screen (Ionic React Version) - JSX Version
 * Modern Enterprise Admin Console Dashboard Style
 * Updated to support both text and image circulars with file uploads
 */

import React, { useState, useEffect, useRef } from 'react';
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
  IonInput,
  IonTextarea,
  IonButton,
  IonSpinner,
  IonAlert,
  IonIcon,
  IonBadge,
  IonModal,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import {
  documentTextOutline,
  imageOutline,
  trashOutline,
  createOutline,
  closeOutline,
  peopleOutline,
  schoolOutline,
  cloudUploadOutline,
} from 'ionicons/icons';
import { adminAPI, fetchFileAsBlobUrl } from '../../services/api';
import './AdminCircularsScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
// Get base server URL (without /api suffix) for file serving
const SERVER_BASE_URL = API_BASE_URL.replace('/api', '');

const getVisibilityLabel = (visibility) => {
  if (visibility === 'ALL') return 'All Classes';
  if (visibility === 'SPECIFIC_CLASSES') return 'Specific Classes';
  return 'All Classes';
};

const CircularItem = ({ item, onDelete, onEdit }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <div className="circular-card" onDoubleClick={() => onEdit(item)}>
        <div className="circular-card-content">
          <div className="circular-header">
            <h3 className="circular-title">{item.title}</h3>
            <IonBadge color={item.visibility === 'ALL' ? 'success' : 'tertiary'} className="visibility-badge">
              {getVisibilityLabel(item.visibility)}
            </IonBadge>
          </div>

          {item.imageUrl ? (
            <div className="image-wrapper">
              <img 
                src={`${SERVER_BASE_URL}${item.imageUrl}`} 
                alt="Circular" 
                className="circular-image" 
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <p className="circular-content">{item.content || 'No content description provided.'}</p>
          )}

          {/* Attachments */}
          {(item.imageUrl || item.attachmentUrl) && (
            <div className="circular-attachments">
              {item.imageUrl && (
                <a
                  href={`${SERVER_BASE_URL}${item.imageUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip img-chip"
                >
                  <IonIcon icon={imageOutline} /> Image Attached
                </a>
              )}
              {item.attachmentUrl && (
                <a
                  href={`${SERVER_BASE_URL}${item.attachmentUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip pdf-chip"
                >
                  <IonIcon icon={documentTextOutline} /> PDF Document
                </a>
              )}
            </div>
          )}

          <div className="circular-meta-row">
            <span className="circular-date">
              Published: {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="circular-card-actions">
          <button className="action-button edit" onClick={() => onEdit(item)} title="Edit Circular">
            <IonIcon icon={createOutline} />
          </button>
          <button className="action-button delete" onClick={() => setShowDeleteConfirm(true)} title="Delete Circular">
            <IonIcon icon={trashOutline} />
          </button>
        </div>
      </div>

      <IonAlert
        isOpen={showDeleteConfirm}
        onDidDismiss={() => setShowDeleteConfirm(false)}
        header="Delete Circular"
        message={`Are you sure you want to delete "${item.title}"? This action cannot be undone.`}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Delete',
            role: 'destructive',
            handler: () => {
              onDelete(item.id);
              setShowDeleteConfirm(false);
            },
          },
        ]}
        backdropDismiss={false}
      />
    </>
  );
};

const AdminCircularsScreen = () => {
  const imageInputRef = useRef(null);

  const [circularList, setCircularList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageName, setImageName] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [visibility, setVisibility] = useState('ALL');
  const [mode, setMode] = useState('TEXT');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [classes, setClasses] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [editingCircularId, setEditingCircularId] = useState(null);

  const fetchCirculars = async () => {
    try {
      console.log('[Circulars] Fetching circulars, page:', page);
      const response = await adminAPI.getCirculars(page, 10);
      console.log('[Circulars] API Response:', response);
      if (response.success && response.data) {
        // Backend returns data as array directly, not nested
        const circulars = Array.isArray(response.data) ? response.data : (response.data.circulars || []);
        console.log('[Circulars] Circulars list:', circulars);
        setCircularList(circulars);
        setTotalPages(response.data.pagination?.pages || 1);
      } else {
        console.warn('[Circulars] No data in response');
      }
    } catch (error) {
      console.error('[Circulars] Error fetching circulars:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await adminAPI.getClasses();
      if (response.success && response.data) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  useEffect(() => {
    fetchCirculars();
    fetchClasses();
  }, []);

  const showAlertMessage = (header, message) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleClassSelection = (classId) => {
    setSelectedClassIds(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setImageFile(null);
    setImageName('');
    setImagePreview('');
    setVisibility('ALL');
    setSelectedClassIds([]);
    setMode('TEXT');
    setEditingCircularId(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showAlertMessage('Validation Error', 'Title is required');
      return;
    }

    if (mode === 'TEXT' && !message.trim()) {
      showAlertMessage('Validation Error', 'Message content is required');
      return;
    }

    if (mode === 'IMAGE' && !imageFile && !editingCircularId) {
      showAlertMessage('Validation Error', 'Please select an image file');
      return;
    }

    if (visibility === 'SPECIFIC_CLASSES' && selectedClassIds.length === 0) {
      showAlertMessage('Validation Error', 'Please select at least one class');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCircularId) {
        // For updates, use regular JSON
        const data = {
          title: title.trim(),
          content: mode === 'TEXT' ? message.trim() : undefined,
          visibility,
        };
        const response = await adminAPI.updateCircular(editingCircularId, data);
        if (response.success) {
          showAlertMessage('Success', 'Circular updated successfully');
          resetForm();
          fetchCirculars();
        }
      } else if (mode === 'IMAGE' && imageFile) {
        // For image uploads, use FormData
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('content', title.trim()); // Use title as content for image circulars
        formData.append('visibility', visibility);
        formData.append('image', imageFile);

        if (visibility === 'SPECIFIC_CLASSES' && selectedClassIds.length > 0) {
          formData.append('classId', selectedClassIds[0]);
        }

        const response = await adminAPI.createCircularWithFiles(formData);
        if (response.success) {
          showAlertMessage('Success', 'Circular published successfully');
          resetForm();
          fetchCirculars();
        }
      } else {
        // For text-only circulars, use JSON
        const data = {
          title: title.trim(),
          content: message.trim(),
          visibility,
        };
        const response = await adminAPI.createCircular(data);
        if (response.success) {
          showAlertMessage('Success', 'Circular published successfully');
          resetForm();
          fetchCirculars();
        }
      }
    } catch (error) {
      showAlertMessage('Error', error.response?.data?.error?.message || 'Failed to process circular');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await adminAPI.deleteCircular(id);
      if (response.success) {
        setCircularList(prev => prev.filter(item => item.id !== id));
        showAlertMessage('Success', 'Circular deleted successfully');
      }
    } catch (error) {
      showAlertMessage('Error', 'Failed to delete circular');
    }
  };

  const handleEdit = (item) => {
    setTitle(item.title);
    if (item.imageUrl) {
      setMode('IMAGE');
      setImagePreview(item.imageUrl);
      setImageName('Current Image Attached');
      setMessage('');
    } else {
      setMode('TEXT');
      setMessage(item.content || '');
      setImagePreview('');
      setImageName('');
    }
    setVisibility(item.visibility);
    setEditingCircularId(item.id);
  };

  if (loading && circularList.length === 0) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonTitle>Circulars Management</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="admin-circulars-content" fullscreen>
          <div className="loading-container">
            <IonSpinner name="crescent" color="primary" />
            <p>Fetching circulars...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="admin-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" text="" />
          </IonButtons>
          <IonTitle>Circulars Console</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-circulars-content" fullscreen>
        <div className="container">
          {/* Header Section */}
          <div className="header-section">
            <h1 className="header-title">Circulars & Announcements</h1>
            <p className="header-subtitle">Broadcast text announcements or digital notices to classes</p>
          </div>

          {/* Create / Edit Form Card */}
          <IonCard className="form-card">
            <IonCardHeader>
              <IonCardTitle>{editingCircularId ? '✏️ Edit Circular Details' : '📢 Publish New Circular'}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {/* Type Switcher */}
              <div className="input-group">
                <label className="input-label">Content Format</label>
                <div className="mode-container">
                  <button
                    type="button"
                    className={`mode-option ${mode === 'TEXT' ? 'active' : ''}`}
                    onClick={() => setMode('TEXT')}
                  >
                    <IonIcon icon={documentTextOutline} className="mode-icon" />
                    <span>Text Message</span>
                  </button>
                  <button
                    type="button"
                    className={`mode-option ${mode === 'IMAGE' ? 'active' : ''}`}
                    onClick={() => setMode('IMAGE')}
                  >
                    <IonIcon icon={imageOutline} className="mode-icon" />
                    <span>Image / Notice</span>
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <div className="input-group">
                <label className="input-label">Title *</label>
                <div className="admin-input-wrapper">
                  <IonInput
                    value={title}
                    onIonInput={(e) => setTitle(e.detail.value || '')}
                    placeholder="Enter circular title or subject"
                  />
                </div>
              </div>

              {/* Message or File Input */}
              {mode === 'TEXT' ? (
                <div className="input-group">
                  <label className="input-label">Message Content *</label>
                  <div className="admin-input-wrapper">
                    <IonTextarea
                      value={message}
                      onIonInput={(e) => setMessage(e.detail.value || '')}
                      placeholder="Write circular description here..."
                      rows={4}
                    />
                  </div>
                </div>
              ) : (
                <div className="input-group">
                  <label className="input-label">Notice Banner {editingCircularId ? '(Optional to replace)' : '*'}</label>
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="file-picker-button"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <IonIcon icon={cloudUploadOutline} className="file-icon" />
                    <span>{imageName || 'Click to select notice image'}</span>
                  </button>
                  {imagePreview && (
                    <div className="image-preview-container">
                      <img src={imagePreview} alt="Preview" className="image-preview" />
                    </div>
                  )}
                </div>
              )}

              {/* Audience Selector */}
              <div className="input-group">
                <label className="input-label">Target Audience</label>
                <div className="visibility-container">
                  <button
                    type="button"
                    className={`visibility-option ${visibility === 'ALL' ? 'active' : ''}`}
                    onClick={() => setVisibility('ALL')}
                  >
                    <IonIcon icon={peopleOutline} />
                    <span>All Classes</span>
                  </button>
                  <button
                    type="button"
                    className={`visibility-option ${visibility === 'SPECIFIC_CLASSES' ? 'active' : ''}`}
                    onClick={() => {
                      setVisibility('SPECIFIC_CLASSES');
                      setShowClassSelector(true);
                    }}
                  >
                    <IonIcon icon={schoolOutline} />
                    <span>Specific Classes</span>
                  </button>
                </div>

                {visibility === 'SPECIFIC_CLASSES' && selectedClassIds.length > 0 && (
                  <div className="selected-classes-container">
                    <span className="selected-classes-label">
                      Targeting: {selectedClassIds.length} class(es) selected
                    </span>
                    <button
                      type="button"
                      className="selected-classes-link"
                      onClick={() => setShowClassSelector(true)}
                    >
                      Modify Selection
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="button-group">
                <IonButton
                  expand="block"
                  className="admin-submit-btn"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? <IonSpinner name="crescent" /> : (editingCircularId ? 'Update Circular' : 'Publish Circular')}
                </IonButton>
                {editingCircularId && (
                  <IonButton
                    expand="block"
                    fill="outline"
                    className="admin-cancel-btn"
                    onClick={resetForm}
                  >
                    Cancel Editing
                  </IonButton>
                )}
              </div>
            </IonCardContent>
          </IonCard>

          {/* Published Circulars Panel */}
          <IonCard className="list-card">
            <IonCardHeader>
              <IonCardTitle>Published Records ({circularList.length})</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {circularList.length === 0 ? (
                <div className="empty-state">
                  <IonIcon icon={documentTextOutline} className="empty-icon" />
                  <p>No circulars published yet</p>
                </div>
              ) : (
                circularList.map((item) => (
                  <CircularItem
                    key={item.id}
                    item={item}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                  />
                ))
              )}

              {page < totalPages && (
                <IonButton
                  expand="block"
                  fill="outline"
                  className="load-more-button"
                  onClick={() => {
                    setPage(prev => prev + 1);
                    fetchCirculars();
                  }}
                >
                  Load More
                </IonButton>
              )}
            </IonCardContent>
          </IonCard>
        </div>

        {/* Class Selection Modal */}
        <IonModal
          isOpen={showClassSelector}
          onDidDismiss={() => setShowClassSelector(false)}
          className="class-selector-modal"
        >
          <div className="modal-content">
            <div className="modal-header">
              <h2>Select Target Classes</h2>
              <button type="button" className="modal-close" onClick={() => setShowClassSelector(false)}>
                <IonIcon icon={closeOutline} />
              </button>
            </div>
            <p className="modal-subtitle">Check the classes that should receive this notice:</p>

            <div className="class-list">
              {classes.map((cls) => {
                const isSelected = selectedClassIds.includes(cls.id);
                return (
                  <div
                    key={cls.id}
                    className={`class-item ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleClassSelection(cls.id)}
                  >
                    <span className="class-item-checkbox">{isSelected ? '✓' : ''}</span>
                    <span className="class-item-text">
                      {cls.name}{cls.section ? ` (${cls.section})` : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="modal-footer">
              <span className="selected-count">{selectedClassIds.length} Selected</span>
              <IonButton className="modal-done-btn" onClick={() => setShowClassSelector(false)}>
                Done
              </IonButton>
            </div>
          </div>
        </IonModal>

        {/* Alert Notifications */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={alertHeader}
          message={alertMessage}
          buttons={['OK']}
          backdropDismiss={false}
        />
      </IonContent>
    </IonPage>
  );
};

export default AdminCircularsScreen;