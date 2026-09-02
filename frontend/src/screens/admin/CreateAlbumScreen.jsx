/**
 * Admin Create Album Screen (Ionic React)
 * Dedicated page for creating a new video/link album
 */

import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonInput,
  IonTextarea,
  IonSpinner,
  IonAlert,
  IonCard,
  IonCardContent,
  IonSelect,
  IonSelectOption,
  IonChip,
  IonToggle,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import {
  albumsOutline,
  textOutline,
  documentTextOutline,
  pricetagOutline,
  peopleOutline,
  closeOutline,
  addCircleOutline,
} from 'ionicons/icons';
import { albumsAPI, adminAPI } from '../../services/api';
import './CreateAlbumScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const CreateAlbumScreen = () => {
  const history = useHistory();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Educational');
  const [visibility, setVisibility] = useState('ALL');
  const [targetClasses, setTargetClasses] = useState([]);
  const [isPublished, setIsPublished] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  const [categories, setCategories] = useState([]);
  const [classes, setClasses] = useState([]);
  const [fetchingClasses, setFetchingClasses] = useState(false);

  const [loading, setLoading] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchClasses();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await albumsAPI.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([
        { value: 'Educational', label: 'Educational' },
        { value: 'Events', label: 'Events' },
        { value: 'Sports', label: 'Sports' },
        { value: 'Cultural', label: 'Cultural' },
        { value: 'Science', label: 'Science' },
        { value: 'Arts', label: 'Arts' },
        { value: 'Music', label: 'Music' },
        { value: 'Dance', label: 'Dance' },
        { value: 'Documentary', label: 'Documentary' },
        { value: 'Other', label: 'Other' },
      ]);
    }
  };

  const fetchClasses = async () => {
    try {
      setFetchingClasses(true);
      const response = await adminAPI.getClasses();
      if (response.success && response.data) {
        setClasses(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setFetchingClasses(false);
    }
  };

  const handleAddTag = () => {
    const value = tagInput.trim();
    if (value && !tags.includes(value)) {
      setTags([...tags, value]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setAlertMessage('Please enter an album title');
      setShowErrorAlert(true);
      return;
    }

    if (visibility === 'SPECIFIC_CLASSES' && targetClasses.length === 0) {
      setAlertMessage('Please select at least one class for specific visibility');
      setShowErrorAlert(true);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        visibility,
        targetClasses: visibility === 'SPECIFIC_CLASSES' ? targetClasses : [],
        isPublished,
        tags,
      };

      const response = await albumsAPI.createAlbum(payload);

      if (response.success) {
        setAlertMessage('Album created successfully.');
        setShowSuccessAlert(true);
      } else {
        setAlertMessage(response.error?.message || 'Failed to create album');
        setShowErrorAlert(true);
      }
    } catch (error) {
      console.error('Error creating album:', error);
      setAlertMessage(error.response?.data?.error?.message || 'Failed to create album');
      setShowErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessDismiss = () => {
    setShowSuccessAlert(false);
    history.push('/admin/albums');
  };

  return (
    <IonPage>
      <IonHeader className="admin-header ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/albums" className="admin-back-btn" />
          </IonButtons>
          <IonTitle className="admin-title">Create New Album</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="create-album-content ion-padding">
        <div className="album-form-container">

          {/* Header Banner Card */}
          <IonCard className="album-banner-card">
            <IonCardContent className="album-banner-content">
              <div className="album-banner-icon-box">
                <IonIcon icon={albumsOutline} />
              </div>
              <div>
                <h2 className="album-banner-title">Album Setup</h2>
                <p className="album-banner-subtitle">
                  Create a video/link album and choose who can view it.
                </p>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Form Card */}
          <IonCard className="album-form-card">
            <IonCardContent>

              {/* Title */}
              <div className="album-input-group">
                <label className="album-label">
                  Album Title <span className="required">*</span>
                </label>
                <div className="album-input-wrapper">
                  <IonIcon icon={textOutline} className="album-input-icon" />
                  <IonInput
                    placeholder="e.g., Annual Day Highlights"
                    value={title}
                    onIonInput={(e) => setTitle(e.detail.value || '')}
                    disabled={loading}
                    className="album-custom-input"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="album-input-group">
                <label className="album-label">Description (Optional)</label>
                <div className="album-textarea-wrapper">
                  <IonTextarea
                    placeholder="Brief description of this album..."
                    value={description}
                    onIonInput={(e) => setDescription(e.detail.value || '')}
                    rows={3}
                    disabled={loading}
                    className="album-custom-textarea"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="album-input-group">
                <label className="album-label">Category</label>
                <div className="album-input-wrapper">
                  <IonIcon icon={documentTextOutline} className="album-input-icon" />
                  <IonSelect
                    value={category}
                    onIonChange={(e) => setCategory(e.detail.value)}
                    interface="popover"
                    className="album-custom-select"
                  >
                    {categories.map((cat) => (
                      <IonSelectOption key={cat.value} value={cat.value}>
                        {cat.label}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </div>
              </div>

              {/* Visibility */}
              <div className="album-input-group">
                <label className="album-label">Visibility</label>
                <div className="album-input-wrapper">
                  <IonIcon icon={peopleOutline} className="album-input-icon" />
                  <IonSelect
                    value={visibility}
                    onIonChange={(e) => setVisibility(e.detail.value)}
                    interface="popover"
                    className="album-custom-select"
                  >
                    <IonSelectOption value="ALL">All Classes</IonSelectOption>
                    <IonSelectOption value="SPECIFIC_CLASSES">Specific Classes</IonSelectOption>
                  </IonSelect>
                </div>
              </div>

              {/* Target Classes */}
              {visibility === 'SPECIFIC_CLASSES' && (
                <div className="album-input-group">
                  <label className="album-label">Select Classes <span className="required">*</span></label>
                  {fetchingClasses ? (
                    <div className="album-loading-inline">
                      <IonSpinner name="crescent" color="primary" />
                      <span>Loading classes...</span>
                    </div>
                  ) : (
                    <div className="album-input-wrapper">
                      <IonSelect
                        multiple
                        placeholder="Choose classes"
                        value={targetClasses}
                        onIonChange={(e) => setTargetClasses(e.detail.value || [])}
                        interface="popover"
                        className="album-custom-select"
                      >
                        {classes.map((cls) => (
                          <IonSelectOption key={cls._id || cls.id} value={cls._id || cls.id}>
                            {cls.name}{cls.section ? ` - ${cls.section}` : ''}
                          </IonSelectOption>
                        ))}
                      </IonSelect>
                    </div>
                  )}
                </div>
              )}


              {/* Tags */}
              <div className="album-input-group">
                <label className="album-label">Tags (Optional)</label>
                <div className="album-tags-container">
                  {tags.map((tag, idx) => (
                    <IonChip key={idx} color="primary" className="album-tag-chip">
                      {tag}
                      <IonIcon icon={closeOutline} onClick={() => handleRemoveTag(tag)} />
                    </IonChip>
                  ))}
                </div>
                <div className="album-input-wrapper album-tag-input-wrapper">
                  <IonIcon icon={pricetagOutline} className="album-input-icon" />
                  <IonInput
                    placeholder="Type a tag and press Add"
                    value={tagInput}
                    onIonInput={(e) => setTagInput(e.detail.value || '')}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    disabled={loading}
                    className="album-custom-input"
                  />
                  <IonButton fill="clear" size="small" onClick={handleAddTag} disabled={loading}>
                    <IonIcon icon={addCircleOutline} slot="icon-only" />
                  </IonButton>
                </div>
              </div>

              {/* Publish Toggle */}
              <div className="album-toggle-row">
                <label className="album-label">Publish Immediately</label>
                <IonToggle
                  checked={isPublished}
                  onIonChange={(e) => setIsPublished(e.detail.checked)}
                  disabled={loading}
                />
              </div>
              <span className="album-hint">
                Unpublished albums are saved as drafts and stay hidden from students until published.
              </span>

            </IonCardContent>
          </IonCard>

          {/* Action Buttons */}
          <div className="album-button-actions-container">
            <IonButton expand="block" fill="outline" color="medium" className="album-btn-cancel" onClick={() => history.goBack()} disabled={loading}>
              Cancel
            </IonButton>
            <IonButton expand="block" color="primary" className="album-btn-save" onClick={handleSubmit} disabled={loading}>
              {loading ? <IonSpinner name="crescent" size="small" /> : 'Create Album'}
            </IonButton>
          </div>
        </div>

        <IonAlert
          isOpen={showSuccessAlert}
          onDidDismiss={handleSuccessDismiss}
          header="Album Created"
          message={alertMessage}
          buttons={[{ text: 'Done', handler: handleSuccessDismiss }]}
        />

        <IonAlert
          isOpen={showErrorAlert}
          onDidDismiss={() => setShowErrorAlert(false)}
          header="Error"
          message={alertMessage}
          buttons={['Dismiss']}
        />
      </IonContent>
    </IonPage>
  );
};

export default CreateAlbumScreen;
