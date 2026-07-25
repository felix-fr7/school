import React, { useState, useRef, useEffect } from 'react';
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
  IonSelect,
  IonSelectOption,
  IonButton,
  IonSpinner,
  IonAlert,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonLabel,
  IonItem,
  IonTextarea
} from '@ionic/react';
import {
  cloudUploadOutline,
  imageOutline,
  closeCircleOutline,
  informationCircleOutline,
  newspaperOutline,
  sendOutline,
  schoolOutline,
  pricetagOutline
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import { Class } from '../../types';
import './CreateNewsScreen.css';

const CreateNewsScreen: React.FC = () => {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [targetClassId, setTargetClassId] = useState<string | undefined>(undefined);
  const [classes, setClasses] = useState<Class[]>([]);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        showAlertMessage('Invalid File', 'Only JPEG, PNG, and WEBP images are allowed.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showAlertMessage('File Too Large', 'Image size must be under 5MB.');
        return;
      }

      setSelectedFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showAlertMessage('Title Required', 'Please enter a headline or title for the news.');
      return;
    }

    if (!content.trim()) {
      showAlertMessage('Content Required', 'Please enter the detailed content for the news post.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('summary', summary.trim());
      formData.append('content', content.trim());
      formData.append('category', category);
      if (targetClassId) {
        formData.append('classId', targetClassId);
      }
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      // API Call Placeholder
      // await adminAPI.createNews(formData);

      showAlertMessage('Success', 'News announcement published successfully!');
      setTitle('');
      setSummary('');
      setContent('');
      setCategory('General');
      setTargetClassId(undefined);
      handleRemoveFile();
    } catch (error: any) {
      showAlertMessage('Error', error.response?.data?.error?.message || 'Failed to publish news');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonPage>
      {/* Dark Navy Header */}
      <IonHeader className="create-news-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/news" />
          </IonButtons>
          <IonTitle>Post School News</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="create-news-content" fullscreen>
        <div className="create-news-container">
          {/* Header Title Section */}
          <div className="page-header">
            <h1 className="page-title">📢 Create Announcement</h1>
            <p className="page-subtitle">Publish news, updates, and announcements for students and staff</p>
          </div>

          <IonCard className="admin-card-modern">
            <IonCardHeader>
              <IonCardTitle className="card-title-modern">
                <IonIcon icon={newspaperOutline} />
                News Post Details
              </IonCardTitle>
            </IonCardHeader>

            <IonCardContent>
              <div className="form-grid-modern">
                {/* News Title */}
                <div className="input-field-modern">
                  <IonLabel className="field-label-modern">News Headline / Title *</IonLabel>
                  <IonItem lines="none" className="custom-input-item-modern">
                    <input
                      type="text"
                      className="custom-text-input-modern"
                      placeholder="e.g., Annual Sports Day 2026 Schedule Released"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </IonItem>
                </div>

                {/* Category and Target Class Selection Row */}
                <div className="form-row-two-col">
                  <div className="input-field-modern">
                    <IonLabel className="field-label-modern">Category</IonLabel>
                    <IonItem lines="none" className="custom-input-item-modern">
                      <IonIcon icon={pricetagOutline} slot="start" className="field-icon-modern" />
                      <IonSelect
                        value={category}
                        onIonChange={(e) => setCategory(e.detail.value)}
                        interface="popover"
                        className="admin-select-modern"
                      >
                        <IonSelectOption value="General">General Notice</IonSelectOption>
                        <IonSelectOption value="Events">Events</IonSelectOption>
                        <IonSelectOption value="Academic">Academic</IonSelectOption>
                        <IonSelectOption value="Sports">Sports</IonSelectOption>
                        <IonSelectOption value="Achievements">Achievements</IonSelectOption>
                      </IonSelect>
                    </IonItem>
                  </div>

                  <div className="input-field-modern">
                    <IonLabel className="field-label-modern">Target Class</IonLabel>
                    <IonItem lines="none" className="custom-input-item-modern">
                      <IonIcon icon={schoolOutline} slot="start" className="field-icon-modern" />
                      <IonSelect
                        value={targetClassId}
                        placeholder="All Classes (School-wide)"
                        onIonChange={(e) => setTargetClassId(e.detail.value)}
                        interface="popover"
                        className="admin-select-modern"
                      >
                        <IonSelectOption value={undefined}>🏫 All Classes (School-wide)</IonSelectOption>
                        {classes.map((cls) => (
                          <IonSelectOption key={cls.id} value={cls.id}>
                            Class {cls.name}{cls.section ? ` - ${cls.section}` : ''}
                          </IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  </div>
                </div>

                {/* Short Summary */}
                <div className="input-field-modern">
                  <IonLabel className="field-label-modern">Short Summary (Optional)</IonLabel>
                  <IonItem lines="none" className="custom-input-item-modern">
                    <input
                      type="text"
                      className="custom-text-input-modern"
                      placeholder="Brief 1-2 sentence preview for cards..."
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                    />
                  </IonItem>
                </div>

                {/* Detailed Content */}
                <div className="input-field-modern">
                  <IonLabel className="field-label-modern">Full Announcement Content *</IonLabel>
                  <IonItem lines="none" className="custom-input-item-modern textarea-item-modern">
                    <IonTextarea
                      rows={6}
                      placeholder="Write the full details of the announcement here..."
                      value={content}
                      onIonInput={(e) => setContent(e.detail.value || '')}
                      className="custom-textarea-modern"
                    />
                  </IonItem>
                </div>

                {/* Banner Image Upload Area */}
                <div className="input-field-modern">
                  <IonLabel className="field-label-modern">Cover Image (Optional)</IonLabel>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/png, image/jpeg, image/webp"
                    style={{ display: 'none' }}
                  />

                  {!selectedFile ? (
                    <div
                      className="file-upload-dropzone-modern"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <IonIcon icon={cloudUploadOutline} className="upload-icon-modern" />
                      <p className="upload-text-modern">
                        <strong>Click to upload banner image</strong> or drag & drop
                      </p>
                      <span className="upload-hint-modern">Supports: PNG, JPG, WEBP (Max 5MB)</span>
                    </div>
                  ) : (
                    <div className="file-preview-card-modern">
                      <div className="file-info-row-modern">
                        <IonIcon icon={imageOutline} className="file-type-icon-modern" />
                        <div className="file-details-modern">
                          <span className="file-name-modern">{selectedFile.name}</span>
                          <span className="file-size-modern">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                        <button className="remove-file-btn-modern" onClick={handleRemoveFile}>
                          <IonIcon icon={closeCircleOutline} />
                        </button>
                      </div>

                      {filePreview && (
                        <div className="image-preview-container-modern">
                          <img src={filePreview} alt="News Banner Preview" className="image-preview-modern" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Info Note */}
                <div className="info-box-modern">
                  <IonIcon icon={informationCircleOutline} />
                  <span>Published news will instantly appear on student and teacher feeds.</span>
                </div>

                {/* Submit Button */}
                <IonButton
                  expand="block"
                  className="primary-btn-modern"
                  onClick={handleSubmit}
                  disabled={submitting || !title.trim() || !content.trim()}
                >
                  {submitting ? (
                    <IonSpinner name="crescent" />
                  ) : (
                    <>
                      <IonIcon slot="start" icon={sendOutline} />
                      Publish News Now
                    </>
                  )}
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </div>

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

export default CreateNewsScreen;