/**
 * Admin News Screen (Ionic React Version)
 * Premium minimalist 2-column bento style with visibility control
 * Features: Title, Content, Image Picker, PDF Picker, Visibility selector
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
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonSpinner,
  IonAlert,
  IonIcon,
  IonChip,
  IonBadge,
  IonText,
  IonModal,
  IonList,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react';
import {
  newspaperOutline,
  imageOutline,
  documentOutline,
  trashOutline,
  createOutline,
  informationCircleOutline,
  closeOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { News, CreateNewsInput, Class } from '../../types';
import { adminAPI } from '../../services/api';
import './AdminNewsScreen.css';

type VisibilityType = 'ALL' | 'SPECIFIC_CLASSES';

interface NewsItemProps {
  item: News;
  onDelete: (id: string) => void;
  onEdit: (item: News) => void;
}

const NewsItem: React.FC<NewsItemProps> = ({ item, onDelete, onEdit }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <div className="news-card" onDoubleClick={() => onEdit(item)}>
        <div className="news-card-content">
          <h3 className="news-title">{item.title}</h3>
          <p className="news-content">{item.content.substring(0, 100)}...</p>
          <div className="news-meta-row">
            <IonBadge color={item.visibility === 'ALL' ? 'success' : 'primary'}>
              {item.visibility === 'ALL' ? '👥 All Classes' : '🏫 Specific Classes'}
            </IonBadge>
            <span className="news-date">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
          {(item.imageUrl || item.pdfUrl) && (
            <div className="attachments-row">
              {item.imageUrl && (
                <IonBadge color="light">🖼️ Image</IonBadge>
              )}
              {item.pdfUrl && (
                <IonBadge color="light">📄 PDF</IonBadge>
              )}
            </div>
          )}
        </div>
        <div className="news-card-actions">
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
        header="Delete News"
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

const AdminNewsScreen: React.FC = () => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [newsList, setNewsList] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfName, setPdfName] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>('ALL');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);

  useEffect(() => {
    fetchNews();
    fetchClasses();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await adminAPI.getNews(page, 10);
      if (response.success && response.data) {
        setNewsList(response.data.news || []);
        setTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
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

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setPdfName(file.name);
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
    setContent('');
    setImageFile(null);
    setImageName('');
    setImagePreview('');
    setPdfFile(null);
    setPdfName('');
    setVisibility('ALL');
    setSelectedClassIds([]);
    setEditingNewsId(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      showAlertMessage('Validation Error', 'Title and content are required');
      return;
    }

    if (visibility === 'SPECIFIC_CLASSES' && selectedClassIds.length === 0) {
      showAlertMessage('Validation Error', 'Please select at least one class');
      return;
    }

    setSubmitting(true);
    try {
      const data: CreateNewsInput = {
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageFile ? `/uploads/news/${imageFile.name}` : undefined,
        pdfUrl: pdfFile ? `/uploads/news/${pdfFile.name}` : undefined,
        visibility,
        classId: visibility === 'SPECIFIC_CLASSES' && selectedClassIds.length > 0
          ? selectedClassIds[0]
          : undefined,
      };

      let response;
      if (editingNewsId) {
        response = await adminAPI.updateNews(editingNewsId, data);
      } else {
        response = await adminAPI.createNews(data);
      }

      if (response.success) {
        showAlertMessage('Success', editingNewsId ? 'News updated successfully' : 'News created successfully');
        resetForm();
        fetchNews();
      }
    } catch (error: any) {
      showAlertMessage('Error', error.response?.data?.error?.message || 'Failed to create news');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await adminAPI.deleteNews(id);
      if (response.success) {
        setNewsList(prev => prev.filter(item => item.id !== id));
        showAlertMessage('Success', 'News deleted successfully');
      }
    } catch (error) {
      showAlertMessage('Error', 'Failed to delete news');
    }
  };

  const handleEdit = (item: News) => {
    setTitle(item.title);
    setContent(item.content);
    setImagePreview(item.imageUrl || '');
    setImageName(item.imageUrl ? 'Current Image (select new to replace)' : '');
    setPdfName(item.pdfUrl ? 'Current PDF (select new to replace)' : '');
    setVisibility(item.visibility);
    setEditingNewsId(item.id);
  };

  if (loading && newsList.length === 0) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>News Manager</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="admin-news-content" fullscreen>
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading news...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>News Manager</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-news-content" fullscreen>
        <div className="container">
          {/* Header */}
          <div className="header-section">
            <h1 className="header-title">📰 News Manager</h1>
            <p className="header-subtitle">Create and manage school announcements</p>
          </div>

          {/* Create Form */}
          <IonCard className="form-card">
            <IonCardHeader>
              <IonCardTitle>{editingNewsId ? 'Edit News' : 'Create New News'}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {/* Title Input */}
              <div className="input-group">
                <label className="input-label">Title *</label>
                <IonInput
                  value={title}
                  onIonInput={(e) => setTitle(e.detail.value || '')}
                  placeholder="Enter news title"
                />
              </div>

              {/* Content Input */}
              <div className="input-group">
                <label className="input-label">Content *</label>
                <IonTextarea
                  value={content}
                  onIonInput={(e) => setContent(e.detail.value || '')}
                  placeholder="Write your news content here..."
                  rows={4}
                />
              </div>

              {/* Image Picker */}
              <div className="input-group">
                <label className="input-label">Feature Image</label>
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
                  <span>{imageName || 'Choose Image from Gallery'}</span>
                </button>
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="image-preview" />
                )}
              </div>

              {/* PDF Picker */}
              <div className="input-group">
                <label className="input-label">PDF Document</label>
                <input
                  type="file"
                  ref={pdfInputRef}
                  accept=".pdf"
                  onChange={handlePdfChange}
                  style={{ display: 'none' }}
                />
                <button
                  className="file-picker-button"
                  onClick={() => pdfInputRef.current?.click()}
                >
                  <IonIcon icon={documentOutline} className="file-icon" />
                  <span>{pdfName || 'Choose PDF Document'}</span>
                </button>
              </div>

              {/* Visibility Selector */}
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
                  {submitting ? <IonSpinner name="crescent" /> : (editingNewsId ? 'Update News' : 'Publish News')}
                </IonButton>
                {editingNewsId && (
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

          {/* News List */}
          <IonCard className="list-card">
            <IonCardHeader>
              <IonCardTitle>Published News ({newsList.length})</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {newsList.length === 0 ? (
                <div className="empty-state">
                  <IonIcon icon={newspaperOutline} className="empty-icon" />
                  <p>No news published yet</p>
                </div>
              ) : (
                newsList.map((item) => (
                  <NewsItem
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
                    fetchNews();
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
              Tap to select one or more classes for this news
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

export default AdminNewsScreen;