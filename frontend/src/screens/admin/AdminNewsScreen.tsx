import React, { useState, useEffect, useRef } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonInput,
  IonTextarea,
  IonButton,
  IonSpinner,
  IonAlert,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonModal,
} from '@ionic/react';
import {
  newspaperOutline,
  imageOutline,
  documentOutline,
  createOutline,
  closeOutline,
  closeCircleOutline,
  sendOutline,
  peopleOutline,
  schoolOutline,
  trashOutline,
  calendarOutline,
  searchOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { News, CreateNewsInput, Class } from '../../types';
import { adminAPI, openFileInNewTab } from '../../services/api';
import './AdminNewsScreen.css';

type VisibilityType = 'ALL' | 'SPECIFIC_CLASSES';

const AdminNewsScreen: React.FC = () => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Core Data States
  const [newsList, setNewsList] = useState<News[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form Field States
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [visibility, setVisibility] = useState<VisibilityType>('ALL');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  // Editing & Modals
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [showClassSelector, setShowClassSelector] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Alerts
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertHeader, setAlertHeader] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [newsRes, classRes] = await Promise.all([
        adminAPI.getNews(1, 20),
        adminAPI.getClasses(),
      ]);

      if (newsRes.success && newsRes.data) {
        setNewsList(newsRes.data.news || []);
      }
      if (classRes.success && classRes.data) {
        setClasses(classRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
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
      reader.onloadend = () => setImagePreview(reader.result as string);
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

  const removeImage = () => {
    setImageFile(null);
    setImageName('');
    setImagePreview('');
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removePdf = () => {
    setPdfFile(null);
    setPdfName('');
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    removeImage();
    removePdf();
    setVisibility('ALL');
    setSelectedClassIds([]);
    setEditingNewsId(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      showAlertMessage('Warning', 'Please enter both Title and Content.');
      return;
    }

    if (visibility === 'SPECIFIC_CLASSES' && selectedClassIds.length === 0) {
      showAlertMessage('Warning', 'Please select at least one target class.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateNewsInput = {
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageFile ? `/uploads/news/${imageFile.name}` : imagePreview || undefined,
        pdfUrl: pdfFile ? `/uploads/news/${pdfFile.name}` : pdfName || undefined,
        visibility,
        classId: visibility === 'SPECIFIC_CLASSES' ? selectedClassIds[0] : undefined,
      };

      const response = editingNewsId
        ? await adminAPI.updateNews(editingNewsId, payload)
        : await adminAPI.createNews(payload);

      if (response.success) {
        showAlertMessage(
          'Success',
          editingNewsId ? 'Announcement updated successfully!' : 'Announcement published successfully!'
        );
        resetForm();
        fetchData();
      }
    } catch (error: any) {
      showAlertMessage('Error', error.response?.data?.error?.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: News) => {
    setTitle(item.title);
    setContent(item.content);
    setImagePreview(item.imageUrl || '');
    setImageName(item.imageUrl ? 'Attached Image' : '');
    setPdfName(item.pdfUrl ? 'Attached Document' : '');
    setVisibility(item.visibility);
    setEditingNewsId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await adminAPI.deleteNews(id);
      if (response.success) {
        setNewsList((prev) => prev.filter((item) => item.id !== id));
        showAlertMessage('Deleted', 'Announcement removed.');
      }
    } catch (error) {
      showAlertMessage('Error', 'Failed to delete announcement.');
    } finally {
      setDeleteId(null);
    }
  };

  const filteredNews = newsList.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <IonPage>
      <IonHeader className="admin-news-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle>News & Announcements</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-news-content" fullscreen>
        <div className="onebyone-layout-container">
          {/* Top Header Summary Banner */}
          <div className="header-summary-card">
            <div>
              <h2>📢 Announcement Publisher</h2>
              <p>Create, target, and broadcast circulars to students</p>
            </div>
            <div className="summary-badge">{newsList.length} Total News</div>
          </div>

          {/* ONE BY ONE VERTICAL FORM FLOW */}
          <div className="form-step-card">
            <div className="step-card-header">
              <span className="step-badge">{editingNewsId ? 'EDIT MODE' : 'NEW'}</span>
              <h3>{editingNewsId ? 'Edit Announcement' : 'Create New Announcement'}</h3>
            </div>

            <div className="step-form-body">
              {/* STEP 1: Title Input */}
              <div className="vertical-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <label>Announcement Title *</label>
                  <IonInput
                    className="step-input"
                    value={title}
                    onIonInput={(e) => setTitle(e.detail.value || '')}
                    placeholder="Enter short, descriptive title..."
                  />
                </div>
              </div>

              {/* STEP 2: Content Body */}
              <div className="vertical-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <label>Full Content Details *</label>
                  <IonTextarea
                    className="step-textarea"
                    value={content}
                    onIonInput={(e) => setContent(e.detail.value || '')}
                    placeholder="Type the full news description or message here..."
                    rows={4}
                  />
                </div>
              </div>

              {/* STEP 3: Media Uploads */}
              <div className="vertical-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <label>Attachments (Optional)</label>
                  <div className="upload-options-row">
                    {/* Image Selector */}
                    <input
                      type="file"
                      ref={imageInputRef}
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                    {!imageName ? (
                      <button
                        type="button"
                        className="upload-box-btn"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <IonIcon icon={imageOutline} />
                        <span>Add Image</span>
                      </button>
                    ) : (
                      <div className="file-chip image">
                        <IonIcon icon={imageOutline} />
                        <span>{imageName}</span>
                        <button type="button" onClick={removeImage}>
                          <IonIcon icon={closeCircleOutline} />
                        </button>
                      </div>
                    )}

                    {/* PDF Selector */}
                    <input
                      type="file"
                      ref={pdfInputRef}
                      accept=".pdf"
                      onChange={handlePdfChange}
                      style={{ display: 'none' }}
                    />
                    {!pdfName ? (
                      <button
                        type="button"
                        className="upload-box-btn"
                        onClick={() => pdfInputRef.current?.click()}
                      >
                        <IonIcon icon={documentOutline} />
                        <span>Add PDF</span>
                      </button>
                    ) : (
                      <div className="file-chip pdf">
                        <IonIcon icon={documentOutline} />
                        <span>{pdfName}</span>
                        <button type="button" onClick={removePdf}>
                          <IonIcon icon={closeCircleOutline} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="image-preview-card">
                      <img src={imagePreview} alt="Upload Preview" />
                      <button type="button" onClick={removeImage}>
                        <IonIcon icon={closeOutline} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 4: Target Audience Selection */}
              <div className="vertical-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <label>Target Audience</label>
                  <div className="audience-toggle-group">
                    <button
                      type="button"
                      className={`audience-btn ${visibility === 'ALL' ? 'selected' : ''}`}
                      onClick={() => setVisibility('ALL')}
                    >
                      <IonIcon icon={peopleOutline} />
                      <span>All Classes & Students</span>
                    </button>
                    <button
                      type="button"
                      className={`audience-btn ${visibility === 'SPECIFIC_CLASSES' ? 'selected' : ''}`}
                      onClick={() => {
                        setVisibility('SPECIFIC_CLASSES');
                        setShowClassSelector(true);
                      }}
                    >
                      <IonIcon icon={schoolOutline} />
                      <span>Specific Classes</span>
                    </button>
                  </div>

                  {visibility === 'SPECIFIC_CLASSES' && (
                    <div className="class-selection-info">
                      <span>
                        {selectedClassIds.length > 0
                          ? `${selectedClassIds.length} class(es) selected`
                          : 'No specific class chosen'}
                      </span>
                      <button type="button" onClick={() => setShowClassSelector(true)}>
                        {selectedClassIds.length > 0 ? 'Edit Selection' : 'Select Classes'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="form-action-row">
                <IonButton
                  expand="block"
                  className="submit-post-btn"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <IonSpinner name="crescent" />
                  ) : (
                    <>
                      <IonIcon slot="start" icon={sendOutline} />
                      {editingNewsId ? 'Update Announcement' : 'Publish Announcement'}
                    </>
                  )}
                </IonButton>

                {editingNewsId && (
                  <IonButton
                    expand="block"
                    fill="clear"
                    className="cancel-post-btn"
                    onClick={resetForm}
                  >
                    Cancel Editing
                  </IonButton>
                )}
              </div>
            </div>
          </div>

          {/* ONE BY ONE LIST FLOW SECTION */}
          <div className="feed-stream-section">
            <div className="feed-header-row">
              <h3>
                <IonIcon icon={newspaperOutline} /> Published Circulars
              </h3>
              <div className="search-input-box">
                <IonIcon icon={searchOutline} />
                <input
                  type="text"
                  placeholder="Search notices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="loading-state-box">
                <IonSpinner name="crescent" color="primary" />
                <p>Loading published news...</p>
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="empty-state-box">
                <IonIcon icon={newspaperOutline} />
                <p>No circulars found.</p>
              </div>
            ) : (
              <div className="vertical-news-stream">
                {filteredNews.map((item) => (
                  <div key={item.id} className="news-stream-card">
                    <div className="news-card-top">
                      <span className={`pill-visibility ${item.visibility.toLowerCase()}`}>
                        {item.visibility === 'ALL' ? 'All Classes' : 'Specific Target'}
                      </span>
                      <span className="news-date">
                        <IonIcon icon={calendarOutline} />
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="news-card-title">{item.title}</h4>
                    <p className="news-card-body">{item.content}</p>

                    {(item.imageUrl || item.pdfUrl) && (
                      <div className="news-attachments">
                        {item.imageUrl && (
                          <button
                            type="button"
                            className="chip img-chip"
                            onClick={async () => {
                              try {
                                await openFileInNewTab(`/files/news/${item.id}/image`);
                              } catch (error) {
                                console.error('Error opening image:', error);
                              }
                            }}
                          >
                            <IonIcon icon={imageOutline} /> Image Attached
                          </button>
                        )}
                        {item.pdfUrl && (
                          <button
                            type="button"
                            className="chip pdf-chip"
                            onClick={async () => {
                              try {
                                await openFileInNewTab(`/files/news/${item.id}/pdf`);
                              } catch (error) {
                                console.error('Error opening PDF:', error);
                              }
                            }}
                          >
                            <IonIcon icon={documentOutline} /> PDF Document
                          </button>
                        )}
                      </div>
                    )}

                    <div className="news-card-actions">
                      <button
                        type="button"
                        className="btn-action edit"
                        onClick={() => handleEdit(item)}
                      >
                        <IonIcon icon={createOutline} /> Edit
                      </button>
                      <button
                        type="button"
                        className="btn-action delete"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <IonIcon icon={trashOutline} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal for Class Selection */}
        <IonModal
          isOpen={showClassSelector}
          onDidDismiss={() => setShowClassSelector(false)}
          className="class-selector-modal"
        >
          <div className="modal-inner-content">
            <div className="modal-header">
              <h4>Select Target Classes</h4>
              <button type="button" onClick={() => setShowClassSelector(false)}>
                <IonIcon icon={closeOutline} />
              </button>
            </div>
            <div className="modal-class-list">
              {classes.map((cls) => {
                const isSelected = selectedClassIds.includes(cls.id);
                return (
                  <div
                    key={cls.id}
                    className={`class-select-tile ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleClassSelection(cls.id)}
                  >
                    <IonIcon
                      icon={isSelected ? checkmarkCircleOutline : schoolOutline}
                      className="tile-icon"
                    />
                    <span>
                      Class {cls.name} {cls.section ? `(${cls.section})` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="modal-footer">
              <IonButton
                expand="block"
                className="confirm-modal-btn"
                onClick={() => setShowClassSelector(false)}
              >
                Done ({selectedClassIds.length} Selected)
              </IonButton>
            </div>
          </div>
        </IonModal>

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={!!deleteId}
          onDidDismiss={() => setDeleteId(null)}
          header="Delete Announcement"
          message="Are you sure you want to permanently delete this announcement?"
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: () => deleteId && handleDelete(deleteId),
            },
          ]}
        />

        {/* Global Alert */}
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