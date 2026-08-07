/**
 * Class Create Homework Screen - Manual Entry
 */

import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonIcon,
  IonSpinner,
  IonToast,
  IonDatetime,
  IonModal,
  IonChip,
} from '@ionic/react';
import {
  closeOutline,
  bookOutline,
  documentTextOutline,
  calendarOutline,
  addOutline,
  sendOutline,
  imageOutline,
  documentOutline,
  trashOutline,
  attachOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { classControllerAPI, storage } from '../../services/api';
import './ClassCreateHomeworkScreen.css';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const ClassCreateHomeworkScreen = () => {
  const history = useHistory();

  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');
  
  const [showGivenDateModal, setShowGivenDateModal] = useState(false);
  const [showDueDateModal, setShowDueDateModal] = useState(false);

  // Subject Modal States
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [subjectSaving, setSubjectSaving] = useState(false);

  // File Attachments State
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = React.useRef(null);

  // Form State for Manual Entry
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '', // Homework Content
    givenDate: '',   // Publish Date / Given Date
    dueDate: '',     // Due Date
    isPublished: true,
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setSubjectsLoading(true);
    try {
      const response = await classControllerAPI.getSubjects();
      console.log('Fetched subjects response:', response);
      if (response && response.success) {
        const subjectsData = response.data || [];
        console.log('Setting subjects:', subjectsData);
        setSubjects(subjectsData);
      } else {
        console.warn('Subjects response not successful or missing success flag');
        setSubjects([]);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) {
      setToastMessage('Please enter a subject name');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setSubjectSaving(true);
    try {
      const response = await classControllerAPI.createSubject({
        name: newSubjectName.trim(),
      });

      if (response.success) {
        setToastMessage('Subject added successfully');
        setToastColor('success');
        setShowToast(true);
        fetchSubjects();
        setShowAddSubjectModal(false);
        setNewSubjectName('');
      }
    } catch (error) {
      console.error('Error adding subject:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Failed to add subject';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.msg) {
        errorMessage = error.response.data.msg;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to add subjects.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      setToastMessage(errorMessage);
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setSubjectSaving(false);
    }
  };

  // File attachment handlers
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        setToastMessage(`Invalid file type: ${file.name}. Only images and PDFs are allowed.`);
        setToastColor('danger');
        setShowToast(true);
        continue;
      }
      if (file.size > maxSize) {
        setToastMessage(`File too large: ${file.name}. Max size is 10MB.`);
        setToastColor('danger');
        setShowToast(true);
        continue;
      }

      // Upload file to server
      try {
        const formData = new FormData();
        formData.append('files', file);

        const token = await storage.getToken();
        const response = await fetch(`${API_BASE_URL}/class-controller/upload-homework-files`, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: formData,
        });

        const result = await response.json();

        if (result.success && result.data.files && result.data.files.length > 0) {
          const uploadedFile = result.data.files[0];
          const newAttachment = {
            id: Date.now() + Math.random(),
            name: uploadedFile.originalName,
            filename: uploadedFile.filename,
            type: uploadedFile.mimetype,
            url: uploadedFile.url, // Server URL
            size: uploadedFile.size,
          };
          setAttachments(prev => [...prev, newAttachment]);
        } else {
          setToastMessage(`Failed to upload ${file.name}`);
          setToastColor('danger');
          setShowToast(true);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        setToastMessage(`Error uploading ${file.name}`);
        setToastColor('danger');
        setShowToast(true);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = async (id) => {
    const attachment = attachments.find(att => att.id === id);
    if (attachment && attachment.filename) {
      try {
        const token = await storage.getToken();
        await fetch(`${API_BASE_URL}/class-controller/homework-files/${attachment.filename}`, {
          method: 'DELETE',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) {
      return imageOutline;
    }
    return documentOutline;
  };

  const handleSubmitHomework = async () => {
    if (!formData.title.trim()) {
      setToastMessage('Please enter homework title.');
      setToastColor('danger');
      setShowToast(true);
      return;
    }
    if (!formData.subject) {
      setToastMessage('Please select a subject.');
      setToastColor('danger');
      setShowToast(true);
      return;
    }
    if (!formData.description.trim()) {
      setToastMessage('Please enter homework content / instructions.');
      setToastColor('danger');
      setShowToast(true);
      return;
    }
    if (!formData.givenDate) {
      setToastMessage('Please select the publish date (Given Date).');
      setToastColor('danger');
      setShowToast(true);
      return;
    }
    if (!formData.dueDate) {
      setToastMessage('Please select the due date.');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setLoading(true);
    try {
      // Prepare attachments array with URLs (base64 data URLs)
      const attachmentUrls = attachments.map(att => att.url);
      
      const response = await classControllerAPI.createHomework({
        title: formData.title.trim(),
        subject: formData.subject,
        description: formData.description.trim(),
        givenDate: formData.givenDate,
        dueDate: formData.dueDate,
        isPublished: formData.isPublished,
        attachments: attachmentUrls,
      });

      if (response.success) {
        setToastMessage('Homework created and submitted successfully!');
        setToastColor('success');
        setShowToast(true);
        setTimeout(() => {
          history.push('/class-controller/homework');
        }, 1500);
      }
    } catch (error) {
      setToastMessage(error.response?.data?.error?.message || 'Failed to submit homework.');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonButton onClick={() => history.push('/class-controller/homework')}>
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Create Homework</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="homework-create-content" fullscreen>
        <div className="form-container" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
          
          {/* 1. Subject Selection & Add Section */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Select Subject *</h3>
              <IonButton size="small" fill="outline" onClick={() => setShowAddSubjectModal(true)}>
                <IonIcon icon={addOutline} slot="start" /> Add Subject
              </IonButton>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {subjectsLoading ? (
                <p>Loading subjects...</p>
              ) : subjects.length === 0 ? (
                <p style={{ color: 'gray', fontSize: '14px' }}>No subjects found. Click 'Add Subject' to create one.</p>
              ) : (
                subjects.map((subj) => (
                  <IonChip
                    key={subj._id}
                    style={{
                      cursor: 'pointer',
                      background: formData.subject === subj.name ? 'var(--ion-color-primary)' : 'var(--ion-color-step-100, #e0e0e0)',
                      color: formData.subject === subj.name ? '#fff' : '#000'
                    }}
                    onClick={() => setFormData({ ...formData, subject: subj.name })}
                  >
                    <IonIcon icon={bookOutline} />
                    <ion-label>{subj.name}</ion-label>
                  </IonChip>
                ))
              )}
            </div>
          </div>

          {/* 2. Homework Form Inputs */}
          <div className="form-section">
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Homework Details</h3>

            {/* Title */}
            <IonItem className="input-item" style={{ marginBottom: '15px' }}>
              <IonIcon icon={documentTextOutline} slot="start" />
              <IonLabel position="stacked">Homework Title *</IonLabel>
              <IonInput
                value={formData.title}
                onIonInput={(e) => setFormData({ ...formData, title: e.detail.value || '' })}
                placeholder="Enter homework title..."
              />
            </IonItem>

            {/* Homework Content / Description */}
            <IonItem className="input-item" style={{ marginBottom: '15px' }}>
              <IonLabel position="stacked">Homework Content / Instructions *</IonLabel>
              <IonTextarea
                value={formData.description}
                onIonInput={(e) => setFormData({ ...formData, description: e.detail.value || '' })}
                placeholder="Type your homework content here..."
                rows={4}
              />
            </IonItem>

            {/* Publish Date (Given Date) */}
            <IonItem button onClick={() => setShowGivenDateModal(true)} style={{ marginBottom: '15px' }}>
              <IonIcon icon={calendarOutline} slot="start" />
              <IonLabel position="stacked">Publish Date (Given Date) *</IonLabel>
              <IonInput
                readOnly
                value={formData.givenDate ? new Date(formData.givenDate).toLocaleString() : 'Select publish date & time'}
              />
            </IonItem>

            {/* Due Date */}
            <IonItem button onClick={() => setShowDueDateModal(true)} style={{ marginBottom: '20px' }}>
              <IonIcon icon={calendarOutline} slot="start" />
              <IonLabel position="stacked">Due Date & Time *</IonLabel>
              <IonInput
                readOnly
                value={formData.dueDate ? new Date(formData.dueDate).toLocaleString() : 'Select due date & time'}
              />
            </IonItem>

            {/* Attachments Section (Optional) */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Attachments (Optional)</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'gray', marginBottom: '10px' }}>
                Add images or PDFs to supplement your homework. This is optional.
              </p>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              
              {/* Add file button */}
              <IonButton 
                size="small" 
                fill="outline" 
                onClick={() => fileInputRef.current?.click()}
                style={{ marginBottom: '10px' }}
              >
                <IonIcon icon={attachOutline} slot="start" />
                Add Files
              </IonButton>

              {/* File list */}
              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {attachments.map((att) => (
                    <IonChip 
                      key={att.id} 
                      style={{ 
                        background: '#f0f0f0', 
                        padding: '4px 8px',
                        maxWidth: '200px'
                      }}
                    >
                      <IonIcon icon={getFileIcon(att.type)} />
                      <ion-label style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        fontSize: '12px'
                      }}>{att.name}</ion-label>
                      <IonButton 
                        size="small" 
                        fill="clear" 
                        onClick={() => removeAttachment(att.id)}
                        style={{ padding: '0 4px', minWidth: 'auto' }}
                      >
                        <IonIcon icon={trashOutline} slot="icon-only" style={{ fontSize: '14px' }} />
                      </IonButton>
                    </IonChip>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <IonButton 
              expand="block" 
              color="primary" 
              onClick={handleSubmitHomework} 
              disabled={loading}
              style={{ height: '48px', fontSize: '16px', fontWeight: 'bold', marginTop: '30px' }}
            >
              {loading ? (
                <IonSpinner name="crescent" />
              ) : (
                <>
                  <IonIcon icon={sendOutline} slot="start" />
                  Submit Homework
                </>
              )}
            </IonButton>
          </div>
        </div>
      </IonContent>

      {/* Publish Date Modal */}
      <IonModal isOpen={showGivenDateModal} onDidDismiss={() => setShowGivenDateModal(false)}>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Select Publish Date</h2>
          <IonDatetime
            value={formData.givenDate || new Date().toISOString()}
            onIonChange={(e) => setFormData({ ...formData, givenDate: e.detail.value })}
            presentation="date-time"
          />
          <IonButton expand="block" onClick={() => setShowGivenDateModal(false)} style={{ marginTop: '20px' }}>Done</IonButton>
        </div>
      </IonModal>

      {/* Due Date Modal */}
      <IonModal isOpen={showDueDateModal} onDidDismiss={() => setShowDueDateModal(false)}>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Select Due Date</h2>
          <IonDatetime
            value={formData.dueDate || new Date().toISOString()}
            onIonChange={(e) => setFormData({ ...formData, dueDate: e.detail.value })}
            presentation="date-time"
          />
          <IonButton expand="block" onClick={() => setShowDueDateModal(false)} style={{ marginTop: '20px' }}>Done</IonButton>
        </div>
      </IonModal>

      {/* Add Subject Modal */}
      <IonModal isOpen={showAddSubjectModal} onDidDismiss={() => setShowAddSubjectModal(false)}>
        <div style={{ padding: '20px' }}>
          <h2>Add New Subject</h2>
          <IonItem style={{ marginBottom: '20px' }}>
            <IonLabel position="stacked">Subject Name *</IonLabel>
            <IonInput
              value={newSubjectName}
              onIonInput={(e) => setNewSubjectName(e.detail.value || '')}
              placeholder="e.g. Mathematics"
            />
          </IonItem>
          <div style={{ display: 'flex', gap: '10px' }}>
            <IonButton expand="block" color="medium" fill="outline" onClick={() => setShowAddSubjectModal(false)} style={{ flex: 1 }}>Cancel</IonButton>
            <IonButton expand="block" onClick={handleAddSubject} disabled={subjectSaving} style={{ flex: 1 }}>Save Subject</IonButton>
          </div>
        </div>
      </IonModal>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        color={toastColor}
      />
    </IonPage>
  );
};

export default ClassCreateHomeworkScreen;