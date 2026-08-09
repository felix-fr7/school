import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonInput,
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
  playCircleOutline,
  closeOutline,
  filmOutline,
} from 'ionicons/icons';
import axios from 'axios';
import './AdminVideosScreen.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// Helper function to convert video URLs to embeddable format
const getEmbedUrl = (videoUrl) => {
  if (!videoUrl) return null;
  
  const url = videoUrl.trim();
  
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  
  // Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  
  // Direct video files (mp4, webm, ogg)
  if (/\.(mp4|webm|ogg|mov)($|\?)/i.test(url)) {
    return url;
  }
  
  return url;
};

// Video Player Component
const VideoPlayer = ({ video, onClose }) => {
  const embedUrl = getEmbedUrl(video?.videoUrl);
  
  if (!embedUrl) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        background: '#000',
        color: '#fff',
        borderRadius: '8px'
      }}>
        <p>Unable to play this video format.</p>
        <p style={{ fontSize: '12px', marginTop: '10px', wordBreak: 'break-all' }}>{video?.videoUrl}</p>
      </div>
    );
  }
  
  // Check if it's a direct video file
  if (/\.(mp4|webm|ogg|mov)($|\?)/i.test(video.videoUrl)) {
    return (
      <div style={{ background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
        <video 
          controls 
          autoPlay 
          style={{ width: '100%', maxHeight: '70vh' }}
          src={video.videoUrl}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }
  
  // iframe for YouTube, Vimeo, etc.
  return (
    <div style={{ 
      position: 'relative', 
      paddingBottom: '56.25%', 
      height: 0, 
      overflow: 'hidden',
      background: '#000',
      borderRadius: '8px'
    }}>
      <iframe
        src={embedUrl}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none'
        }}
        title={video.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

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
  console.log('[AdminVideosScreen] Component is rendering!');
  
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
  const [deleteId, setDeleteId] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [previewVideo, setPreviewVideo] = useState(null);

  useEffect(() => {
    console.log('[AdminVideosScreen] Component mounted, fetching data...');
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const tenantId = localStorage.getItem('tenantId');
      const headers = {
        Authorization: token ? `Bearer ${token}` : '',
        'x-tenant-id': tenantId || '',
      };

      // Fetch Videos
      try {
        const response = await axios.get(`${API_BASE_URL}/videos/admin/all`, { headers });
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          setVideos(response.data.data);
        } else {
          setVideos([]);
        }
      } catch (error) {
        console.error('Error fetching videos:', error.message);
        setVideos([]);
      }

      // Fetch Classes
      try {
        const classRes = await axios.get(`${API_BASE_URL}/classes`, { headers });
        if (classRes.data && classRes.data.success && Array.isArray(classRes.data.data)) {
          setClasses(classRes.data.data);
        } else if (Array.isArray(classRes.data)) {
          setClasses(classRes.data);
        } else {
          setClasses([]);
        }
      } catch (error) {
        console.error('Error fetching classes:', error.message);
        setClasses([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Critical error in fetchData:', error);
      setLoading(false);
    }
  };

  const showAlertMessage = (header, message) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setShowAlert(true);
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

  console.log('[AdminVideosScreen] Rendering JSX, loading:', loading, 'videos:', videos.length);
  
  return (
    <IonPage style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <IonHeader className="admin-videos-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin" />
          </IonButtons>
          <IonTitle>Media & Video Library</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-videos-content" style={{ '--background': '#f8fafc', background: '#f1f5f9' }}>
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
                  <div 
                    style={{ cursor: 'pointer', marginBottom: '10px' }}
                    onClick={() => setPreviewVideo(video)}
                  >
                    <h4 style={{ margin: '0 0 5px 0', color: '#3880ff' }}>
                      <IonIcon icon={playCircleOutline} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                      {video.title}
                    </h4>
                    <p style={{ color: '#666', fontSize: '14px', margin: '0 0 10px 0' }}>Category: {video.category}</p>
                    {video.description && (
                      <p style={{ color: '#888', fontSize: '13px', margin: '0 0 10px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {video.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {video.tags && video.tags.slice(0, 3).map((tag, idx) => (
                        <IonChip key={idx} style={{ margin: 0, height: '24px', fontSize: '12px' }}>
                          <IonLabel>{tag}</IonLabel>
                        </IonChip>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <IonButton size="small" fill="outline" onClick={() => handleEdit(video)}>Edit</IonButton>
                    <IonButton size="small" color="danger" fill="outline" onClick={() => setDeleteId(video._id || video.id)}>Delete</IonButton>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Video Preview Modal */}
        <IonModal
          isOpen={!!previewVideo}
          onDidDismiss={() => setPreviewVideo(null)}
          cssClass="video-preview-modal"
          style={{
            '--height': 'auto',
            '--max-height': '90vh',
            '--width': '95%',
            '--max-width': '900px',
            '--border-radius': '12px',
          }}
        >
          <div style={{ padding: '20px', background: '#ffffff', minHeight: '200px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{previewVideo?.title}</h2>
              <IonButton 
                fill="clear" 
                onClick={() => setPreviewVideo(null)}
                style={{ padding: '0', minWidth: '40px' }}
              >
                <IonIcon icon={closeOutline} style={{ fontSize: '24px' }} />
              </IonButton>
            </div>
            {previewVideo && <VideoPlayer video={previewVideo} onClose={() => setPreviewVideo(null)} />}
            {previewVideo?.description && (
              <div style={{ marginTop: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: '#555', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                  {previewVideo.description}
                </p>
              </div>
            )}
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <IonChip style={{ margin: 0 }}>
                <IonIcon icon={filmOutline} />
                <IonLabel>{previewVideo?.category}</IonLabel>
              </IonChip>
              {previewVideo?.duration && (
                <IonChip style={{ margin: 0 }}>
                  <IonIcon icon={playCircleOutline} />
                  <IonLabel>{Math.floor(previewVideo.duration / 60)}:{(previewVideo.duration % 60).toString().padStart(2, '0')}</IonLabel>
                </IonChip>
              )}
              {previewVideo?.tags && previewVideo.tags.map((tag, idx) => (
                <IonChip key={idx} style={{ margin: 0 }}>
                  <IonLabel>#{tag}</IonLabel>
                </IonChip>
              ))}
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

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={!!deleteId}
          onDidDismiss={() => setDeleteId(null)}
          header="Confirm Delete"
          message="Are you sure you want to delete this video?"
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => setDeleteId(null)
            },
            {
              text: 'Delete',
              role: 'destructive',
              handler: () => handleDelete(deleteId)
            }
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default AdminVideosScreen;