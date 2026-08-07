/**
 * Subject Manager Component
 * Allows teachers to manage subjects (add, edit, delete) for homework assignments
 */

import React, { useState, useEffect } from 'react';
import {
  IonModal,
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
  IonList,
  IonListHeader,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonSearchbar,
  IonChip,
  IonBadge,
} from '@ionic/react';
import {
  addOutline,
  createOutline,
  trashOutline,
  closeOutline,
  bookOutline,
  searchOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { classControllerAPI } from '../services/api';
import './SubjectManager.css';

const SubjectManager = ({ isOpen, onDidDismiss, onSubjectSelect, selectedSubject }) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('success');

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });

  // Fetch subjects on mount or when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSubjects();
    }
  }, [isOpen]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const response = await classControllerAPI.getSubjects();
      if (response.success) {
        setSubjects(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setToastMessage('Failed to load subjects');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '' });
    setEditingSubject(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSubject = async () => {
    if (!formData.name.trim()) {
      setToastMessage('Subject name is required');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code ? formData.code.trim() : undefined,
        description: formData.description ? formData.description.trim() : ''
      };

      const response = await classControllerAPI.createSubject(payload);
      if (response.success) {
        setToastMessage('Subject created successfully');
        setToastColor('success');
        setShowToast(true);
        fetchSubjects();
        setShowAddModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error creating subject:', error);
      setToastMessage(error.response?.data?.message || error.message || 'Failed to create subject');
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const handleEditSubject = async () => {
    if (!formData.name.trim()) {
      setToastMessage('Subject name is required');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code ? formData.code.trim() : undefined,
        description: formData.description ? formData.description.trim() : ''
      };

      const response = await classControllerAPI.updateSubject(editingSubject._id, payload);
      if (response.success) {
        setToastMessage('Subject updated successfully');
        setToastColor('success');
        setShowToast(true);
        fetchSubjects();
        setShowEditModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error updating subject:', error);
      setToastMessage(error.response?.data?.message || error.message || 'Failed to update subject');
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const handleDeleteSubject = async (subjectId, subjectName) => {
    if (!window.confirm(`Are you sure you want to delete "${subjectName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await classControllerAPI.deleteSubject(subjectId);
      if (response.success) {
        setToastMessage('Subject deleted successfully');
        setToastColor('success');
        setShowToast(true);
        fetchSubjects();
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      setToastMessage(error.response?.data?.message || 'Failed to delete subject');
      setToastColor('danger');
      setShowToast(true);
    }
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name || '',
      code: subject.code || '',
      description: subject.description || '',
    });
    setShowEditModal(true);
  };

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubjectClick = (subject) => {
    if (onSubjectSelect) {
      onSubjectSelect(subject.name);
    }
    onDidDismiss();
  };

  return (
    <>
      <IonModal 
        isOpen={isOpen} 
        onDidDismiss={() => {
          resetForm();
          onDidDismiss();
        }}
        className="subject-manager-modal"
        breakpoints={[0.5, 0.75, 0.9]}
        initialBreakpoint={0.75}
      >
        <IonHeader className="ion-no-border">
          <IonToolbar color="primary" className="modal-toolbar">
            <IonButtons slot="start">
              <IonButton onClick={() => {
                resetForm();
                onDidDismiss();
              }}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
            <IonTitle>Manage Subjects</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowAddModal(true)}>
                <IonIcon icon={addOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="subject-manager-content" fullscreen>
          {/* Search Bar */}
          <div className="search-container">
            <IonSearchbar
              value={searchQuery}
              onIonInput={(e) => setSearchQuery(e.detail.value || '')}
              placeholder="Search subjects..."
              className="custom-searchbar"
            />
          </div>

          {/* Subjects List */}
          {loading ? (
            <div className="loading-container">
              <IonSpinner name="crescent" />
              <p>Loading subjects...</p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="empty-state">
              <IonIcon icon={bookOutline} className="empty-icon" />
              <h3>No Subjects Found</h3>
              <p>Add your first subject to get started</p>
              <IonButton onClick={() => setShowAddModal(true)}>
                <IonIcon icon={addOutline} slot="start" />
                Add Subject
              </IonButton>
            </div>
          ) : (
            <IonList className="subjects-list">
              {filteredSubjects.map((subject) => (
                <IonItemSliding key={subject._id}>
                  <IonItem 
                    button 
                    onClick={() => handleSubjectClick(subject)}
                    className={`subject-item ${selectedSubject === subject.name ? 'selected' : ''}`}
                  >
                    <div className="subject-icon">
                      <IonIcon icon={bookOutline} />
                    </div>
                    <div className="subject-info">
                      <IonLabel>
                        <h3>{subject.name}</h3>
                        <p>{subject.code}</p>
                        {subject.description && <p className="description">{subject.description}</p>}
                      </IonLabel>
                    </div>
                    {selectedSubject === subject.name && (
                      <IonIcon icon={checkmarkCircleOutline} className="selected-icon" color="success" />
                    )}
                  </IonItem>
                  <IonItemOptions side="end">
                    <IonItemOption
                      color="primary"
                      onClick={() => openEditModal(subject)}
                    >
                      <IonIcon icon={createOutline} slot="icon-only" />
                    </IonItemOption>
                    <IonItemOption
                      color="danger"
                      onClick={() => handleDeleteSubject(subject._id, subject.name)}
                    >
                      <IonIcon icon={trashOutline} slot="icon-only" />
                    </IonItemOption>
                  </IonItemOptions>
                </IonItemSliding>
              ))}
            </IonList>
          )}
        </IonContent>
      </IonModal>

      {/* Add Subject Modal */}
      <IonModal
        isOpen={showAddModal}
        onDidDismiss={() => {
          setShowAddModal(false);
          resetForm();
        }}
        className="subject-form-modal"
      >
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
            <IonTitle>Add New Subject</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={handleAddSubject} disabled={loading}>
                {loading ? <IonSpinner name="crescent" size="small" /> : 'Save'}
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding">
          <div className="form-container">
            <IonItem>
              <IonLabel position="stacked">Subject Name *</IonLabel>
              <IonInput
                name="name"
                value={formData.name}
                onIonInput={handleInputChange}
                placeholder="e.g., Mathematics"
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Subject Code *</IonLabel>
              <IonInput
                name="code"
                value={formData.code}
                onIonInput={handleInputChange}
                placeholder="e.g., MATH"
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Description</IonLabel>
              <IonTextarea
                name="description"
                value={formData.description}
                onIonInput={handleInputChange}
                placeholder="Optional description..."
                rows={3}
              />
            </IonItem>
          </div>
        </IonContent>
      </IonModal>

      {/* Edit Subject Modal */}
      <IonModal
        isOpen={showEditModal}
        onDidDismiss={() => {
          setShowEditModal(false);
          resetForm();
        }}
        className="subject-form-modal"
      >
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => {
                setShowEditModal(false);
                resetForm();
              }}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
            <IonTitle>Edit Subject</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={handleEditSubject} disabled={loading}>
                {loading ? <IonSpinner name="crescent" size="small" /> : 'Update'}
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding">
          <div className="form-container">
            <IonItem>
              <IonLabel position="stacked">Subject Name *</IonLabel>
              <IonInput
                name="name"
                value={formData.name}
                onIonInput={handleInputChange}
                placeholder="e.g., Mathematics"
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Subject Code *</IonLabel>
              <IonInput
                name="code"
                value={formData.code}
                onIonInput={handleInputChange}
                placeholder="e.g., MATH"
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Description</IonLabel>
              <IonTextarea
                name="description"
                value={formData.description}
                onIonInput={handleInputChange}
                placeholder="Optional description..."
                rows={3}
              />
            </IonItem>
          </div>
        </IonContent>
      </IonModal>

      {/* Toast */}
      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        position="bottom"
        color={toastColor}
        icon={toastColor === 'success' ? checkmarkCircleOutline : alertCircleOutline}
      />
    </>
  );
};

export default SubjectManager;