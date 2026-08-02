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
  IonSelect,
  IonSelectOption,
  IonButton,
  IonSpinner,
  IonAlert,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonBadge,
  IonLabel,
  IonItem,
  IonModal,
  IonSegment,
  IonSegmentButton
} from '@ionic/react';
import { 
  calendarOutline, 
  trashOutline, 
  cloudUploadOutline,
  documentTextOutline,
  imageOutline,
  closeCircleOutline,
  informationCircleOutline,
  schoolOutline,
  addCircleOutline,
  eyeOutline,
  createOutline,
  downloadOutline,
  listOutline
} from 'ionicons/icons';
import { adminAPI, api, openFileInNewTab } from '../../services/api';
import './AdminExamsScreen.css';

// API Base URL for constructing file URLs
const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.EXPO_PUBLIC_API_URL || 
  'http://localhost:3000/api';

// Helper to get full file URL safely
const getFullFileUrl = (fileUrl) => {
  // Handle undefined, null, empty string, or '/'
  if (!fileUrl || fileUrl === '' || fileUrl === '/') return '';
  
  // Strip trailing /api or / from base URL using regex
  const rawBaseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
  
  // Handle local file:// URIs - extract filename and construct server path
  if (fileUrl.startsWith('file://')) {
    const fileName = fileUrl.split('/').pop() || '';
    if (!fileName) return '';
    return `${rawBaseUrl}/uploads/${fileName}`;
  }
  
  // Full http:// or https:// URLs - return directly
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  
  // Relative paths - combine with base URL
  // Ensure path starts with /uploads/
  let relativePath = fileUrl;
  if (!relativePath.startsWith('/')) {
    relativePath = '/' + relativePath;
  }
  // If it doesn't have /uploads prefix, add it
  if (!relativePath.startsWith('/uploads/')) {
    relativePath = '/uploads' + relativePath;
  }
  
  return `${rawBaseUrl}${relativePath}`;
};

const ExamItem = ({ item, classes, onDelete, onEdit, onTogglePublish, showAlertMessage: parentShowAlert }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSchedulesModal, setShowSchedulesModal] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editClassId, setEditClassId] = useState(item.classId || undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isImageFile = (url) => {
    if (!url) return false;
    const ext = url.split('.').pop()?.toLowerCase();
    return ['jpeg', 'jpg', 'png', 'webp'].includes(ext || '');
  };

  const isPdfFile = (url) => {
    if (!url) return false;
    return url.toLowerCase().endsWith('.pdf');
  };

  const handleEditSubmit = async () => {
    if (!editTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await onEdit(item.id, editTitle.trim(), editClassId || null);
      setShowEditModal(false);
    } catch (error) {
      console.error('Edit failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getClassName = () => {
    if (item.class) {
      return `Class ${item.class.name}${item.class.section ? '-' + item.class.section : ''}`;
    }
    return 'School-wide';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const fetchSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const response = await api.get(`/exams/schedule/${item.id}`);
      if (response.data.success) {
        setSchedules(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleViewSchedules = () => {
    fetchSchedules();
    setShowSchedulesModal(true);
  };

  const handleViewFile = async (examId, fileUrl) => {
    // Directly use the fileUrl since files are served statically from uploads/
    const fullUrl = getFullFileUrl(fileUrl);
    
    // Validate URL before opening
    if (!fullUrl) {
      if (parentShowAlert) {
        parentShowAlert('File Not Available', 'File URL is missing or invalid. Please re-upload the file.');
      }
      console.error('Invalid file URL:', fileUrl);
      return;
    }
    
    // Log for debugging
    console.log('Opening file URL:', fullUrl);
    
    // Open in new tab with security attributes
    if (typeof window !== 'undefined') {
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const fullFileUrl = getFullFileUrl(item.fileUrl);

  return (
    <>
      <div className="exam-card-modern">
        <div className="exam-card-preview" onClick={() => handleViewFile(item.id, item.fileUrl)}>
          {isImageFile(item.fileUrl) ? (
            <div className="image-thumbnail-wrapper">
              <img 
                src={fullFileUrl} 
                alt={item.title} 
                className="exam-thumbnail"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="thumbnail-overlay">
                <IonIcon icon={eyeOutline} />
                <span>View Full</span>
              </div>
            </div>
          ) : (
            <div className="pdf-icon-wrapper">
              <IonIcon icon={documentTextOutline} className="pdf-icon-large" />
              <span className="pdf-label">PDF Document</span>
            </div>
          )}
        </div>

        <div className="exam-card-content">
          <div className="exam-card-header">
            <h3 className="exam-card-title">{item.title || 'Untitled Timetable'}</h3>
            <IonBadge color={item.class ? "primary" : "secondary"} className="class-badge-modern">
              <IonIcon icon={schoolOutline} />
              {getClassName()}
            </IonBadge>
          </div>

          <div className="exam-card-meta">
            <span className="meta-item">
              <IonIcon icon={calendarOutline} />
              {formatDate(item.date)}
            </span>
            <button 
              type="button"
              onClick={() => handleViewFile(item.id, item.fileUrl)}
              className="view-pdf-btn"
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}
            >
              <IonIcon icon={isPdfFile(item.fileUrl) ? downloadOutline : eyeOutline} />
              {isPdfFile(item.fileUrl) ? 'View PDF' : 'View File'}
            </button>
          </div>
        </div>

        <div className="exam-card-actions-modern">
          <button 
            className="action-btn-modern view-btn" 
            onClick={handleViewSchedules}
            title="View Schedules"
          >
            <IonIcon icon={listOutline} />
          </button>
          <button 
            className="action-btn-modern edit-btn" 
            onClick={() => setShowEditModal(true)}
            title="Edit"
          >
            <IonIcon icon={createOutline} />
          </button>
          <button 
            className="action-btn-modern publish-btn" 
            onClick={() => onTogglePublish(item.id, !item.isPublished)}
            title={item.isPublished ? "Unpublish" : "Publish"}
            style={{ background: item.isPublished ? '#10b981' : '#f59e0b' }}
          >
            <IonIcon icon={item.isPublished ? eyeOutline : cloudUploadOutline} />
          </button>
          <button 
            className="action-btn-modern delete-btn" 
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete"
          >
            <IonIcon icon={trashOutline} />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Alert */}
      <IonAlert
        isOpen={showDeleteConfirm}
        onDidDismiss={() => setShowDeleteConfirm(false)}
        header="Delete Timetable"
        message="Are you sure you want to delete this timetable? This action cannot be undone."
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

      {/* Schedules Modal */}
      <IonModal 
        isOpen={showSchedulesModal} 
        onDidDismiss={() => setShowSchedulesModal(false)}
        initialFocus="button.close-schedules-modal"
        backdropBreakpoint={0}
        canDismiss={true}
        style={{
          '--width': '90%',
          '--max-width': '700px',
          '--height': 'auto',
          '--border-radius': '16px',
          '--box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', color: '#1f2937', maxHeight: '80vh', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#111827' }}>
              Exam Schedule - {item.title}
            </h2>
            <button 
              className="close-schedules-modal"
              onClick={() => setShowSchedulesModal(false)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#6b7280' }}
            >
              <IonIcon icon={closeCircleOutline} />
            </button>
          </div>

          {loadingSchedules ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <IonSpinner name="crescent" />
              <p>Loading schedules...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <IonIcon icon={calendarOutline} style={{ fontSize: '48px', marginBottom: '16px' }} />
              <p>No exam schedules found for this exam.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {schedules.map((schedule) => (
                <div key={schedule._id || schedule.id} style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: '#f9fafb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{schedule.subject}</h4>
                    <IonBadge color="primary">{schedule.title}</IonBadge>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem', color: '#6b7280' }}>
                    <span><IonIcon icon={calendarOutline} /> {new Date(schedule.date).toLocaleDateString()}</span>
                    <span><IonIcon icon={calendarOutline} /> {schedule.startTime} - {schedule.endTime}</span>
                    {schedule.roomNo && <span><IonIcon icon={schoolOutline} /> Room: {schedule.roomNo}</span>}
                  </div>
                  {schedule.fileUrl && (
                    <button 
                      style={{ marginTop: '8px', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.875rem' }}
                      onClick={() => handleViewFile(schedule.examId?._id || item.id, schedule.fileUrl)}
                    >
                      <IonIcon icon={documentTextOutline} /> View Schedule File
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </IonModal>

      {/* Inline Styled Edit Modal to prevent Shadow DOM override issues */}
      <IonModal 
        isOpen={showEditModal} 
        onDidDismiss={() => setShowEditModal(false)}
        initialFocus="button.close-edit-modal"
        backdropBreakpoint={0}
        canDismiss={true}
        style={{
          '--width': '90%',
          '--max-width': '460px',
          '--height': 'auto',
          '--border-radius': '16px',
          '--box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', color: '#1f2937' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#111827' }}>Edit Timetable</h2>
            <button 
              className="close-edit-modal"
              onClick={() => setShowEditModal(false)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}
            >
              <IonIcon icon={closeCircleOutline} />
            </button>
          </div>

          {/* Body */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Timetable Title *
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter timetable title"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#f9fafb',
                  color: '#111827'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Target Class
              </label>
              <IonSelect
                value={editClassId}
                placeholder="Select Class (Default: All Classes)"
                onIonChange={(e) => setEditClassId(e.detail.value)}
                interface="popover"
                style={{
                  width: '100%',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  background: '#f9fafb'
                }}
              >
                <IonSelectOption value={undefined}>🏫 All Classes (School-wide)</IonSelectOption>
                {classes.map((cls) => (
                  <IonSelectOption key={cls.id} value={cls.id}>
                    Class {cls.name}{cls.section ? ` - ${cls.section}` : ''}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
            <IonButton 
              fill="outline" 
              color="medium"
              onClick={() => setShowEditModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </IonButton>
            <IonButton 
              color="primary" 
              onClick={handleEditSubmit}
              disabled={isSubmitting || !editTitle.trim()}
            >
              {isSubmitting ? <IonSpinner name="crescent" /> : 'Save Changes'}
            </IonButton>
          </div>
        </div>
      </IonModal>
    </>
  );
};

const AdminExamsScreen = () => {
  const [examList, setExamList] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState(undefined);
  const [activeTab, setActiveTab] = useState('upload');

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    fetchExams();
    fetchClasses();
  }, []);

  const fetchExams = async () => {
    try {
      // Use the /admin/exams endpoint (Exam table for PDF/Image based timetables)
      const response = await adminAPI.getExams(1, 100);
      if (response.success && response.data) {
        setExamList(response.data.exams || []);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
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

  const showAlertMessage = (header, message) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        showAlertMessage('Invalid File', 'Only JPEG, PNG, WEBP images and PDF files are allowed.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showAlertMessage('File Too Large', 'File size must be under 5MB.');
        return;
      }

      setSelectedFile(file);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isValidUUID = (value) => {
    if (!value || typeof value !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  };

  const handleSubmit = async () => {
    if (!title || !title.trim()) {
      showAlertMessage('Title Required', 'Please enter a title for the exam timetable.');
      return;
    }

    if (!selectedFile) {
      showAlertMessage('File Required', 'Please upload an image or PDF file of the exam timetable.');
      return;
    }

    setSubmitting(true);

    try {
      // First, upload the file to get a URL (saves to uploads/exam/)
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      
      // Upload file using the exam-specific upload endpoint
      const uploadResponse = await api.post('/admin-content/upload-exam', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!uploadResponse.data.success) {
        throw new Error('File upload failed');
      }

      const fileUrl = uploadResponse.data.data.url;

      // Then create the exam record with the file URL
      const examData = {
        title: title.trim(),
        classId: isValidUUID(selectedClassId) ? selectedClassId : undefined,
        fileUrl: fileUrl,
      };

      const response = await api.post('/admin/content/exams', examData);

      if (response.data.success) {
        showAlertMessage('Success', 'Exam timetable published successfully!');
        handleRemoveFile();
        setSelectedClassId(undefined);
        setTitle('');
        fetchExams(); // Refresh the list to show the newly created exam
        setActiveTab('list');
      }
    } catch (error) {
      console.error('Error creating exam:', error);
      showAlertMessage('Error', error.response?.data?.error?.message || 'Failed to upload timetable');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      // Use the /admin/content/exams/:id endpoint (Exam table)
      const response = await api.delete(`/admin/content/exams/${id}`);
      if (response.data.success) {
        setExamList(prev => prev.filter(item => item.id !== id));
        showAlertMessage('Success', 'Exam timetable deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting exam:', error);
      showAlertMessage('Error', error.response?.data?.error?.message || 'Failed to delete exam timetable');
    }
  };

  const handleEdit = async (id, newTitle, newClassId) => {
    try {
      // Use the /admin/content/exams/:id endpoint (Exam table)
      const response = await api.put(`/admin/content/exams/${id}`, {
        title: newTitle,
        classId: newClassId
      });
      if (response.data.success) {
        showAlertMessage('Success', 'Exam timetable updated successfully');
        fetchExams();
      }
    } catch (error) {
      console.error('Error updating exam:', error);
      showAlertMessage('Error', error.response?.data?.error?.message || 'Failed to update timetable');
    }
  };

  const handleTogglePublish = async (id, newPublishState) => {
    try {
      const response = await api.put(`/admin/content/exams/${id}`, {
        isPublished: newPublishState
      });
      if (response.data.success) {
        // Update local state
        setExamList(prev => prev.map(item => 
          item.id === id ? { ...item, isPublished: newPublishState } : item
        ));
        showAlertMessage('Success', newPublishState ? 'Exam published successfully!' : 'Exam unpublished');
      }
    } catch (error) {
      console.error('Error toggling publish state:', error);
      showAlertMessage('Error', error.response?.data?.error?.message || 'Failed to update publish state');
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="admin-header">
          <IonToolbar className="admin-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/dashboard" color="light" />
            </IonButtons>
            <IonTitle>Exam Timetables</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="admin-exams-content">
          <div className="loading-container">
            <IonSpinner name="crescent" color="primary" />
            <p>Loading timetables...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="admin-header">
        <IonToolbar className="admin-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" color="light" />
          </IonButtons>
          <IonTitle>Exam Timetable Manager</IonTitle>
          <IonButtons slot="end">
            <IonBadge color="primary" className="header-badge">
              {examList.length} Published
            </IonBadge>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-exams-content" fullscreen>
        <div className="admin-container-modern">
          <div className="page-header">
            <div className="header-content">
              <h1 className="page-title">📅 Exam Schedule Management</h1>
              <p className="page-subtitle">Upload, manage, and publish exam timetables for your school</p>
            </div>
          </div>

          <div className="view-segment-container">
            <IonSegment 
              value={activeTab} 
              onIonChange={(e) => setActiveTab(e.detail.value)}
              className="custom-segment"
            >
              <IonSegmentButton value="upload">
                <IonIcon icon={cloudUploadOutline} />
                <IonLabel>Upload New</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="list">
                <IonIcon icon={listOutline} />
                <IonLabel>Published List ({examList.length})</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </div>

          {activeTab === 'upload' && (
            <IonCard className="admin-card-modern upload-card">
              <IonCardHeader>
                <IonCardTitle className="card-title-modern">
                  <IonIcon icon={cloudUploadOutline} />
                  Upload New Timetable
                </IonCardTitle>
              </IonCardHeader>

              <IonCardContent>
                <div className="form-grid-modern">
                  <div className="input-field-modern">
                    <IonLabel className="field-label-modern">Timetable Title *</IonLabel>
                    <IonItem lines="none" className="custom-input-item-modern">
                      <input
                        type="text"
                        className="custom-text-input-modern"
                        placeholder="Enter timetable title (e.g., Mid-Term Exam Schedule)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </IonItem>
                  </div>

                  <div className="input-field-modern">
                    <IonLabel className="field-label-modern">Target Class</IonLabel>
                    <IonItem lines="none" className="custom-input-item-modern">
                      <IonSelect
                        value={selectedClassId}
                        placeholder="Select Class (Default: All Classes)"
                        onIonChange={(e) => setSelectedClassId(e.detail.value)}
                        interface="popover"
                        className="admin-select"
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

                  <div className="input-field-modern">
                    <IonLabel className="field-label-modern">Upload Timetable Image / PDF *</IonLabel>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/png, image/jpeg, image/webp, application/pdf"
                      style={{ display: 'none' }}
                    />

                    {!selectedFile ? (
                      <div 
                        className="file-upload-dropzone-modern" 
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <IonIcon icon={cloudUploadOutline} className="upload-icon-modern" />
                        <p className="upload-text-modern">
                          <strong>Click to upload</strong> or drag & drop
                        </p>
                        <span className="upload-hint-modern">Supports: PNG, JPG, WEBP, PDF (Max 5MB)</span>
                      </div>
                    ) : (
                      <div className="file-preview-card-modern">
                        <div className="file-info-row-modern">
                          <IonIcon 
                            icon={selectedFile.type === 'application/pdf' ? documentTextOutline : imageOutline} 
                            className="file-type-icon-modern"
                          />
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
                            <img src={filePreview} alt="Timetable preview" className="image-preview-modern" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="info-box-modern">
                    <IonIcon icon={informationCircleOutline} />
                    <span>Uploaded timetables are immediately accessible to students and staff.</span>
                  </div>

                  <IonButton
                    expand="block"
                    className="primary-btn-modern"
                    onClick={handleSubmit}
                    disabled={submitting || !selectedFile}
                  >
                    {submitting ? (
                      <IonSpinner name="crescent" />
                    ) : (
                      <>
                        <IonIcon slot="start" icon={addCircleOutline} />
                        Publish Timetable
                      </>
                    )}
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {activeTab === 'list' && (
            <IonCard className="admin-card-modern list-card-modern">
              <IonCardHeader>
                <IonCardTitle className="card-title-modern">
                  <IonIcon icon={calendarOutline} />
                  Published Timetables
                  <IonBadge color="dark" className="count-badge-modern">{examList.length}</IonBadge>
                </IonCardTitle>
              </IonCardHeader>

              <IonCardContent>
                {examList.length === 0 ? (
                  <div className="empty-state-modern">
                    <IonIcon icon={calendarOutline} className="empty-icon-modern" />
                    <h4>No Timetables Uploaded</h4>
                    <p>Upload a timetable image or PDF to display it here.</p>
                  </div>
                ) : (
                  <div className="exam-list-grid-modern">
                    {examList.map((item) => (
                      <ExamItem
                        key={item.id}
                        item={item}
                        classes={classes}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                        onTogglePublish={handleTogglePublish}
                        showAlertMessage={showAlertMessage}
                      />
                    ))}
                  </div>
                )}
              </IonCardContent>
            </IonCard>
          )}
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

export default AdminExamsScreen;