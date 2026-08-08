import React, { useState, useEffect, useCallback } from 'react';
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
  IonSelect,
  IonSelectOption,
  IonChip,
  IonLabel,
} from '@ionic/react';
import {
  videocamOutline,
  playCircleOutline,
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
  eyeOutline,
  linkOutline,
  filmOutline,
} from 'ionicons/icons';
import axios from 'axios';
import './AdminVideosScreen.css';

// Error Display Component for debugging white screen issues
const ErrorDisplay = ({ error, onRetry }) => (
  <IonPage>
    <IonHeader>
      <IonToolbar color="danger">
        <IonTitle>Rendering Error</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding">
      <div style={{ 
        background: '#fff', 
        padding: '20px', 
        borderRadius: '12px',
        marginTop: '20px'
      }}>
        <h3 style={{ color: '#dc3545', marginTop: 0 }}>⚠️ Component Rendering Error</h3>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          An error occurred while rendering this screen. Check the console for details.
        </p>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: '300px',
          overflow: 'auto'
        }}>
          {error}
        </div>
        {onRetry && (
          <IonButton 
            expand="block" 
            onClick={onRetry} 
            style={{ marginTop: '20px' }}
          >
            Retry
          </IonButton>
        )}
      </div>
    </IonContent>
  </IonPage>
);

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const VIDEO_CATEGORIES = [
  { value: 'Event Photos', label: 'Event Photos' },
  { value: 'Sports Day', label: 'Sports Day' },
  { value: 'Annual Day', label: 'Annual Day' },
  { value: 'Cultural Program', label: 'Cultural Program' },
  { value: 'Recorded Lesson', label: 'Recorded Lesson' },
  { value: 'Learning Video', label: 'Learning Video' },
  { value: 'Home Video', label: 'Home Video' },
  { value: 'Other', label: 'Other' },
];

const AdminVideosScreen = () => {
  // Error handling state
  const [renderError, setRenderError] = useState(null);

  // Core data states
  const [videos, setVideos] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Learning Video');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [visibility, setVisibility] = useState('ALL');
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [isPublished, setIsPublished] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [eventDate, setEventDate] = useState('');

  const [editingVideoId, setEditingVideoId] = useState(null);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Error boundary: Catch and log any rendering errors
  const handleError = useCallback((error, errorInfo) => {
    const errorMessage = error ? String(error) : 'Unknown error';
    const componentStack = errorInfo?.componentStack || '';
    console.error('[AdminVideosScreen] Rendering Error:', errorMessage);
    console.error('[AdminVideosScreen] Component Stack:', componentStack);
    setRenderError(`${errorMessage}\n\nComponent Stack:\n${componentStack}`);
  }, []);

  const clearError = useCallback(() => {
    setRenderError(null);
  }, []);

  useEffect(() => {
    console.log('[AdminVideosScreen] Component mounted');
    try {
      fetchData();
    } catch (error) {
      console.error('[AdminVideosScreen] Error in useEffect:', error);
      handleError(error, { componentStack: 'useEffect: fetchData' });
    }
  }, []);

  const fetchData = async () => {
    console.log('[AdminVideosScreen] fetchData called');
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const tenantId = localStorage.getItem('tenantId');
    const headers = {
      Authorization: token ? `Bearer ${token}` : '',
      'x-tenant-id': tenantId || '',
    };

    // 1. Fetch Videos Safely
    try {
      console.log('[AdminVideosScreen] Fetching videos from:', `${API_BASE_URL}/videos/admin/all`);
      const response = await axios.get(`${API_BASE_URL}/videos/admin/all`, { headers });
      console.log('[AdminVideosScreen] Videos response:', response?.data);
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setVideos(response.data.data);
      } else {
        console.log('[AdminVideosScreen] Videos response format unexpected:', response?.data);
        setVideos([]);
      }
    } catch (error) {
      console.error('[AdminVideosScreen] Error fetching videos:', error.message || error);
      setVideos([]);
    }

    // 2. Fetch Classes Safely using direct Axios (No AdminAPI dependency crash)
    try {
      console.log('[AdminVideosScreen] Fetching classes from:', `${API_BASE_URL}/classes`);
      const classRes = await axios.get(`${API_BASE_URL}/classes`, { headers });
      console.log('[AdminVideosScreen] Classes response:', classRes?.data);
      if (classRes.data && classRes.data.success && Array.isArray(classRes.data.data)) {
        setClasses(classRes.data.data);
      } else if (Array.isArray(classRes.data)) {
        setClasses(classRes.data);
      } else {
        console.log('[AdminVideosScreen] Classes response format unexpected:', classRes?.data);
        setClasses([]);
      }
    } catch (error) {
      console.error('[AdminVideosScreen] Error fetching classes:', error.message || error);
      setClasses([]);
    }
    
    setLoading(false);
    console.log('[AdminVideosScreen] fetchData completed');
    } catch (error) {
      console.error('[AdminVideosScreen] Critical error in fetchData:', error);
      handleError(error, { componentStack: 'fetchData' });
      setLoading(false);
    }
  };

  const showAlertMessage = (header, message) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setShowAlert(true);
  };

  const toggleClassSelection = (classId) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Learning Video');
    setVideoUrl('');
    setThumbnailUrl('');
    setDuration('');
    setVisibility('ALL');
    setSelectedClassIds([]);
    setIsPublished(false);
    setTags([]);
    setTagInput('');
    setEventDate('');
    setEditingVideoId(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !videoUrl.trim() || !category) {
      showAlertMessage('Warning', 'Please fill in required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const videoData = {
        title: title.trim(),
        description: description.trim(),
        category,
        videoUrl: videoUrl.trim(),
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        duration: duration ? parseInt(duration) : undefined,
        visibility,
        targetClasses: visibility === 'SPECIFIC_CLASSES' ? selectedClassIds : [],
        isPublished,
        tags: tags.length > 0 ? tags : undefined,
        eventDate: eventDate || undefined,
      };

      const token = localStorage.getItem('authToken');
      const tenantId = localStorage.getItem('tenantId');
      const url = editingVideoId ? `${API_BASE_URL}/videos/${editingVideoId}` : `${API_BASE_URL}/videos`;
      const method = editingVideoId ? 'put' : 'post';

      const response = await axios[method](url, videoData, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'x-tenant-id': tenantId || '',
        },
      });

      if (response.data.success) {
        showAlertMessage('Success', editingVideoId ? 'Video updated successfully!' : 'Video published successfully!');
        resetForm();
        fetchData();
      }
    } catch (error) {
      showAlertMessage('Error', error.response?.data?.error?.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (video) => {
    setTitle(video.title);
    setDescription(video.description || '');
    setCategory(video.category);
    setVideoUrl(video.videoUrl);
    setThumbnailUrl(video.thumbnailUrl || '');
    setDuration(video.duration ? video.duration.toString() : '');
    setVisibility(video.visibility || 'ALL');
    setSelectedClassIds(video.targetClasses ? video.targetClasses.map(cls => cls._id || cls.id) : []);
    setIsPublished(video.isPublished);
    setTags(video.tags || []);
    setEventDate(video.eventDate ? new Date(video.eventDate).toISOString().split('T')[0] : '');
    setEditingVideoId(video._id || video.id);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      const tenantId = localStorage.getItem('tenantId');
      const response = await axios.delete(`${API_BASE_URL}/videos/${id}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'x-tenant-id': tenantId || '',
        },
      });
      if (response.data.success) {
        setVideos((prev) => prev.filter((video) => (video._id || video.id) !== id));
        showAlertMessage('Deleted', 'Video removed.');
      }
    } catch (error) {
      showAlertMessage('Error', 'Failed to delete video.');
    } finally {
      setDeleteId(null);
    }
  };

  const filteredVideos = (videos || []).filter(
    (video) =>
      video?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (video?.description && video.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // If there's a rendering error, show the error display
  if (renderError) {
    console.error('[AdminVideosScreen] Showing error display:', renderError);
    return <ErrorDisplay error={renderError} onRetry={clearError} />;
  }

  // Try-catch wrapper for render
  try {
    console.log('[AdminVideosScreen] Rendering main content');
    return (
    <IonPage>
      <IonHeader className="admin-videos-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin" />
          </IonButtons>
          <IonTitle>Media & Video Library</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-videos-content">
        <div className="onebyone-layout-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
          <div className="header-summary-card" style={{ background: '#3880ff', color: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0 }}>🎬 Video Library Manager</h2>
              <p style={{ margin: '5px 0 0 0' }}>Upload video links and share with students</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
              {videos.length} Total Videos
            </div>
          </div>

          {/* Form Section */}
          <div className="form-step-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0 }}>{editingVideoId ? 'Edit Video' : 'Add New Video'}</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px' }}>Video Title *</label>
              <IonInput
                value={title}
                onIonInput={(e) => setTitle(e.detail.value || '')}
                placeholder="Enter title..."
                style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '8px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px' }}>Video URL *</label>
              <IonInput
                value={videoUrl}
                onIonInput={(e) => setVideoUrl(e.detail.value || '')}
                placeholder="https://youtube.com/..."
                style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '8px' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px' }}>Category *</label>
              <IonSelect
                value={category}
                onIonChange={(e) => setCategory(e.detail.value)}
                interface="popover"
                style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '5px' }}
              >
                {VIDEO_CATEGORIES.map((cat) => (
                  <IonSelectOption key={cat.value} value={cat.value}>{cat.label}</IonSelectOption>
                ))}
              </IonSelect>
            </div>

            <IonButton expand="block" onClick={handleSubmit} disabled={submitting} style={{ marginTop: '20px' }}>
              {submitting ? <IonSpinner name="crescent" /> : (editingVideoId ? 'Update Video' : 'Publish Video')}
            </IonButton>
            {editingVideoId && (
              <IonButton expand="block" fill="clear" onClick={resetForm}>Cancel Editing</IonButton>
            )}
          </div>

          {/* Videos List */}
          <div className="feed-stream-section">
            <h3 style={{ marginBottom: '15px' }}>Video Library List</h3>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px' }}><IonSpinner name="crescent" color="primary" /></div>
            ) : filteredVideos.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666' }}>No videos found.</p>
            ) : (
              filteredVideos.map((video) => (
                <div key={video._id || video.id} style={{ background: '#fff', padding: '15px', borderRadius: '10px', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ margin: '0 0 5px 0' }}>{video.title}</h4>
                  <p style={{ color: '#666', fontSize: '14px', margin: '0 0 10px 0' }}>Category: {video.category}</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <IonButton size="small" fill="outline" onClick={() => handleEdit(video)}>Edit</IonButton>
                    <IonButton size="small" color="danger" fill="outline" onClick={() => setDeleteId(video._id || video.id)}>Delete</IonButton>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <IonAlert
          isOpen={!!deleteId}
          onDidDismiss={() => setDeleteId(null)}
          header="Delete Video"
          message="Are you sure you want to delete this video?"
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { text: 'Delete', role: 'destructive', handler: () => deleteId && handleDelete(deleteId) }
          ]}
        />

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
  } catch (error) {
    console.error('[AdminVideosScreen] Render error caught:', error);
    handleError(error, { componentStack: 'render' });
    return <ErrorDisplay error={String(error)} onRetry={clearError} />;
  }
};

export default AdminVideosScreen;
