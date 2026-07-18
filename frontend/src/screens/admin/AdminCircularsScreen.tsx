/**
 * Admin Circulars Screen (Ionic React Version)
 * Premium minimalist 2-column bento style with visibility control
 * Features: Title, Message OR Image Picker, Target Audience selector (All Classes or Specific Classes)
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
  informationCircleOutline,
} from 'ionicons/icons';
import { Class, Circular, CreateCircularInput } from '../../types';
import { adminAPI } from '../../services/api';
import './AdminCircularsScreen.css';

type VisibilityType = 'ALL' | 'SPECIFIC_CLASSES';
type CircularMode = 'TEXT' | 'IMAGE';

interface CircularItemProps {
  item: Circular;
  onDelete: (id: string) => void;
  onEdit: (item: Circular) => void;
}

// Map visibility to display text
const getVisibilityLabel = (visibility: string) => {
  if (visibility === 'ALL') return '👥 All Classes';
  if (visibility === 'SPECIFIC_CLASSES') return '🏫 Specific Classes';
  return '👥 All Classes';
};

const CircularItem: React.FC<CircularItemProps> = ({ item, onDelete, onEdit }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <div className="circular-card" onDoubleClick={() => onEdit(item)}>
        <div className="circular-card-content">
          <h3 className="circular-title">{item.title}</h3>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="Circular" className="circular-image" />
          ) : (
            <p className="circular-content">{item.content?.substring(0, 100) || ''}...</p>
          )}
          <div className="circular-meta-row">
            <IonBadge color={item.visibility === 'ALL' ? 'success' : 'primary'}>
              {getVisibilityLabel(item.visibility)}
            </IonBadge>
            <span className="circular-date">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="circular-card-actions">
          <button className="action-button edit" onClick={() => onEdit(item)} title="Edit">
            <IonIcon icon={createOutline} />
          </button>
          <button className="action-button delete" onClick={() => setShowDeleteConfirm(true)} title="Delete">
            <IonIcon icon={trashOutline} />
          </button>
        </div>
      </div>

      <IonAlert
        isOpen={showDeleteConfirm}
        onDidDismiss={() => setShowDeleteConfirm(false)}
        header="Delete Circular"
        message={`Are you sure you want to delete "${item.title}"?`}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Delete',
            role: 'destructive',
            handler: () => {
              onDelete(item.id);
              setShowDeleteConfirm(false);
            }
          }
        ]}
      />
    </>
  );
};

const AdminCircularsScreen: React.FC = () => {
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [circularList, setCircularList] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>('ALL');
  const [mode, setMode] = useState<CircularMode>('TEXT');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [editingCircularId, setEditingCircularId] = useState<string | null>(null);

  const fetchCirculars = async () => {
    try {
      const response = await adminAPI.getCirculars(page, 10);
      if (response.success && response.data) {
        setCircularList(response.data.circulars || []);
        setTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching circulars:', error);
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

  const showAlertMessage = (header: string, message: string) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleClassSelection = (classId: string) => {
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
      const data: CreateCircularInput = {
        title: title.trim(),
        content: mode === 'TEXT' ? message.trim() : undefined,
        imageUrl: imageFile ? `/uploads/circulars/${imageFile.name}` : undefined,
        visibility,
      };

      let response;
      if (editingCircularId) {
        response = await adminAPI.updateNews(editingCircularId, data as any); // Reusing news update for now
      } else {
        response = await adminAPI.createCircular(data);
      }

      if (response.success) {
        showAlertMessage('Success', editingCircularId ? 'Circular updated successfully' : 'Circular created successfully');
        resetForm();
        fetchCirculars();
      }
    } catch (error: any) {
      showAlertMessage('Error', error.response?.data?.error?.message || 'Failed to create circular');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
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

  const handleEdit = (item: Circular) => {
    setTitle(item.title);
    if (item.imageUrl) {
      setMode('IMAGE');
      setImagePreview(item.imageUrl);
      setImageName('Current Image (select new to replace)');
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
        <IonHeader>
          <IonToolbar>
            <IonTitle>Circulars Manager</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="admin-circulars-content" fullscreen>
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading circulars...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle>Circulars Manager</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-circulars-content" fullscreen>
        <div className="container">
          {/* Header */}
          <div className="header-section">
            <h1 className="header-title">📋 Circulars Manager</h1>
            <p className="header-subtitle">Create and manage school circulars</p>
          </div>

          {/* Create Form */}
          <IonCard className="form-card">
            <IonCardHeader>
              <IonCardTitle>{editingCircularId ? 'Edit Circular' : 'Create New Circular'}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {/* Mode Selector */}
              <div className="input-group">
                <label className="input-label">Circular Type</label>
                <div className="mode-container">
                  <button
                    className={`mode-option ${mode === 'TEXT' ? 'active' : ''}`}
                    onClick={() => setMode('TEXT')}
                  >
                    <span className="mode-icon">📝</span>
                    <span>Type Message</span>
                  </button>
                  <button
                    className={`mode-option ${mode === 'IMAGE' ? 'active' : ''}`}
                    onClick={() => setMode('IMAGE')}
                  >
                    <span className="mode-icon">📷</span>
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <div className="input-group">
                <label className="input-label">Title *</label>
                <IonInput
                  value={title}
                  onIonInput={(e) => setTitle(e.detail.value || '')}
                  placeholder="Enter circular title"
                />
              </div>

              {/* Content based on mode */}
              {mode === 'TEXT' ? (
                <div className="input-group">
                  <label className="input-label">Message *</label>
                  <IonTextarea
                    value={message}
                    onIonInput={(e) => setMessage(e.detail.value || '')}
                    placeholder="Write your circular message here..."
                    rows={4}
                  />
                </div>
              ) : (
                <div className="input-group">
                  <label className="input-label">Select Image File {editingCircularId ? '(optional)' : '*'}</label>
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    className="file-picker-button"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <IonIcon icon={imageOutline} className="file-icon" />
                    <span>{imageName || 'Browse and select image from gallery'}</span>
                  </button>
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                  )}
                </div>
              )}

              {/* Target Audience Selector */}
              <div className="input-group">
                <label className="input-label">Target Audience</label>
                <div className="visibility-container">
                  <button
                    className={`visibility-option ${visibility === 'ALL' ? 'active' : ''}`}
                    onClick={() => setVisibility('ALL')}
                  >
                    <IonIcon icon={informationCircleOutline} />
                    <span>All Classes & Students</span>
                  </button>
                  <button
                    className={`visibility-option ${visibility === 'SPECIFIC_CLASSES' ? 'active' : ''}`}
                    onClick={() => {
                      setVisibility('SPECIFIC_CLASSES');
                      setShowClassSelector(true);
                    }}
                  >
                    <IonIcon icon={informationCircleOutline} />
                    <span>Specific Classes Only</span>
                  </button>
                </div>
                {visibility === 'SPECIFIC_CLASSES' && selectedClassIds.length > 0 && (
                  <div className="selected-classes-container">
                    <span className="selected-classes-label">
                      Selected: {selectedClassIds.length} class(es)
                    </span>
                    <button
                      className="selected-classes-link"
                      onClick={() => setShowClassSelector(true)}
                    >
                      View / Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="button-group">
                <IonButton
                  expand="block"
                  className="submit-button"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? <IonSpinner name="crescent" /> : (editingCircularId ? 'Update Circular' : 'Publish Circular')}
                </IonButton>
                {editingCircularId && (
                  <IonButton
                    expand="block"
                    color="medium"
                    className="cancel-button"
                    onClick={resetForm}
                  >
                    Cancel Edit
                  </IonButton>
                )}
              </div>
            </IonCardContent>
          </IonCard>

          {/* Circulars List */}
          <IonCard className="list-card">
            <IonCardHeader>
              <IonCardTitle>Published Circulars ({circularList.length})</IonCardTitle>
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

        {/* Class Selector Modal */}
        <IonModal
          isOpen={showClassSelector}
          onDidDismiss={() => setShowClassSelector(false)}
          className="class-selector-modal"
        >
          <div className="modal-content">
            <div className="modal-header">
              <h2>Select Classes</h2>
              <button className="modal-close" onClick={() => setShowClassSelector(false)}>
                <IonIcon icon={closeOutline} />
              </button>
            </div>
            <p className="modal-subtitle">
              Tap to select one or more classes for this circular
            </p>
            <div className="class-list">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className={`class-item ${selectedClassIds.includes(cls.id) ? 'active' : ''}`}
                  onClick={() => toggleClassSelection(cls.id)}
                >
                  <span className="class-item-icon">
                    {selectedClassIds.includes(cls.id) ? '✅' : '⬜'}
                  </span>
                  <span className="class-item-text">
                    {cls.name}{cls.section ? ` - ${cls.section}` : ''}
                  </span>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <span className="selected-count">
                {selectedClassIds.length} class(es) selected
              </span>
              <IonButton onClick={() => setShowClassSelector(false)}>
                Done
              </IonButton>
            </div>
          </div>
        </IonModal>

        {/* Alert */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={alertHeader}
          message={alertMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default AdminCircularsScreen;