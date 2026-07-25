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
  IonInput,
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
import { adminAPI } from '../../services/api';
import { Class, ExamSchedule } from '../../types';
import './AdminExamsScreen.css';

interface ExamItemProps {
  item: ExamSchedule;
  classes: Class[];
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string, classId: string | null) => void;
}

const ExamItem: React.FC<ExamItemProps> = ({ item, classes, onDelete, onEdit }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editClassId, setEditClassId] = useState<string | undefined>(item.classId || undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isImageFile = (url: string | undefined) => {
    if (!url) return false;
    const ext = url.split('.').pop()?.toLowerCase();
    return ['jpeg', 'jpg', 'png', 'webp'].includes(ext || '');
  };

  const isPdfFile = (url: string | undefined) => {
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <div className="exam-card-modern">
        <div className="exam-card-preview">
          {isImageFile(item.fileUrl) ? (
            <div className="image-thumbnail-wrapper">
              <img 
                src={item.fileUrl} 
                alt={item.title} 
                className="exam-thumbnail"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <a 
                href={item.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="thumbnail-overlay"
              >
                <IonIcon icon={eyeOutline} />
                <span>View Full</span>
              </a>
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
            {isPdfFile(item.fileUrl) && (
              <a 
                href={item.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="view-pdf-btn"
              >
                <IonIcon icon={downloadOutline} />
                View PDF
              </a>
            )}
          </div>
        </div>

        <div className="exam-card-actions-modern">
          <button 
            className="action-btn-modern edit-btn" 
            onClick={() => setShowEditModal(true)}
            title="Edit"
          >
            <IonIcon icon={createOutline} />
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

      {/* Edit Modal */}
      <IonModal 
        isOpen={showEditModal} 
        onDidDismiss={() => setShowEditModal(false)}
        className="edit-modal-modern"
      >
        <div className="modal-container">
          <div className="modal-header">
            <h2>Edit Timetable</h2>
            <button className="modal-close" onClick={() => setShowEditModal(false)}>
              <IonIcon icon={closeCircleOutline} />
            </button>
          </div>

          <div className="modal-content">
            <div className="form-group">
              <IonLabel position="stacked">Timetable Title *</IonLabel>
              <IonInput
                type="text"
                value={editTitle}
                onIonInput={(e) => setEditTitle(e.detail.value || '')}
                placeholder="Enter timetable title"
                className="modern-input"
              />
            </div>

            <div className="form-group">
              <IonLabel position="stacked">Target Class</IonLabel>
              <IonSelect
                value={editClassId}
                placeholder="Select Class (Default: All Classes)"
                onIonChange={(e) => setEditClassId(e.detail.value)}
                interface="popover"
                className="modern-select"
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

          <div className="modal-footer">
            <IonButton 
              fill="outline" 
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

const AdminExamsScreen: React.FC = () => {
  const [examList, setExamList] = useState<ExamSchedule[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'upload' | 'list'>('upload');

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timetable title state
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
      const response = await adminAPI.getExamSchedules(1, 50);
      if (response.success && response.data) {
        setExamList(response.data.examSchedules || []);
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

  const showAlertMessage = (header: string, message: string) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setFilePreview(reader.result as string);
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

  const isValidUUID = (value: string | undefined | null): boolean => {
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
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title.trim());
      if (isValidUUID(selectedClassId)) {
        formData.append('classId', selectedClassId as string);
      }

      const response = await adminAPI.createExamSchedule(formData as any);

      if (response.success) {
        showAlertMessage('Success', 'Exam timetable published successfully!');
        handleRemoveFile();
        setSelectedClassId(undefined);
        setTitle('');
        fetchExams();
        setActiveTab('list'); // Automatically switch to view published timetables
      }
    } catch (error: any) {
      showAlertMessage('Error', error.response?.data?.error?.message || 'Failed to upload timetable');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await adminAPI.deleteExamSchedule(id);
      if (response.success) {
        setExamList(prev => prev.filter(item => item.id !== id));
        showAlertMessage('Success', 'Exam schedule deleted successfully');
      }
    } catch (error) {
      showAlertMessage('Error', 'Failed to delete exam schedule');
    }
  };

  const handleEdit = async (id: string, newTitle: string, newClassId: string | null) => {
    try {
      const response = await adminAPI.updateExamSchedule(id, {
        title: newTitle,
        classId: newClassId
      });
      if (response.success) {
        showAlertMessage('Success', 'Exam schedule updated successfully');
        fetchExams();
      }
    } catch (error: any) {
      showAlertMessage('Error', error.response?.data?.error?.message || 'Failed to update timetable');
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
          {/* Header Banner */}
          <div className="page-header">
            <div className="header-content">
              <h1 className="page-title">📅 Exam Schedule Management</h1>
              <p className="page-subtitle">Upload, manage, and publish exam timetables for your school</p>
            </div>
          </div>

          {/* Tab View Switcher */}
          <div className="view-segment-container">
            <IonSegment 
              value={activeTab} 
              onIonChange={(e) => setActiveTab(e.detail.value as 'upload' | 'list')}
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

          {/* Section 1: Upload Form */}
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

          {/* Section 2: Published Timetables List */}
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