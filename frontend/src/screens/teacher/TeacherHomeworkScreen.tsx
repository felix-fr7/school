/**
 * Teacher Homework Screen (Ionic React Version)
 * Create and manage homework assignments for the teacher's class
 * Supports full CRUD operations with teacher-scoped validation
 */

import React, { useEffect, useState } from 'react';
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
  IonText,
  IonSpinner,
  IonList,
  IonItem,
  IonCard,
  IonCardContent,
  IonInput,
  IonTextarea,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
  IonBadge,
} from '@ionic/react';
import { refreshOutline, addCircleOutline, bookOutline } from 'ionicons/icons';
import { teacherAPI } from '../../services/api';
import './TeacherHomeworkScreen.css';

interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate?: string;
  createdAt: string;
  isPublished?: boolean;
}

const TeacherHomeworkScreen: React.FC = () => {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [homeworkToDelete, setHomeworkToDelete] = useState<Homework | null>(null);

  const fetchHomeworks = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const response = await teacherAPI.getHomework(1, 50);
      if (response.success && response.data) {
        setHomeworks(response.data.homeworks);
      }
    } catch (error) {
      console.error('Error fetching homework:', error);
      setAlertMessage('Failed to load homework');
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHomeworks();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    await fetchHomeworks(true);
    event.detail.complete();
  };

  const validateForm = () => {
    if (!subject.trim()) {
      setAlertMessage('Please enter subject');
      setIsSuccess(false);
      setShowAlert(true);
      return false;
    }
    if (!title.trim()) {
      setAlertMessage('Please enter homework title');
      setIsSuccess(false);
      setShowAlert(true);
      return false;
    }
    if (!description.trim()) {
      setAlertMessage('Please enter description');
      setIsSuccess(false);
      setShowAlert(true);
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setSubject('');
    setTitle('');
    setDescription('');
    setDueDate('');
    setEditingHomework(null);
    setShowForm(false);
  };

  const handleCreateHomework = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const response = await teacherAPI.createHomework({
        subject: subject.trim(),
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });

      if (response.success) {
        setAlertMessage('Homework assigned successfully!');
        setIsSuccess(true);
        setShowAlert(true);
        resetForm();
        fetchHomeworks();
      }
    } catch (error: any) {
      setAlertMessage(error.response?.data?.error?.message || 'Failed to create homework');
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateHomework = async () => {
    if (!validateForm() || !editingHomework) return;

    try {
      setSaving(true);
      const response = await teacherAPI.updateHomework(editingHomework.id, {
        subject: subject.trim(),
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });

      if (response.success) {
        setAlertMessage('Homework updated successfully!');
        setIsSuccess(true);
        setShowAlert(true);
        resetForm();
        fetchHomeworks();
      }
    } catch (error: any) {
      setAlertMessage(error.response?.data?.error?.message || 'Failed to update homework');
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (homework: Homework) => {
    setHomeworkToDelete(homework);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!homeworkToDelete) return;
    try {
      const response = await teacherAPI.deleteHomework(homeworkToDelete.id);
      if (response.success) {
        setAlertMessage('Homework deleted successfully');
        setIsSuccess(true);
        setShowAlert(true);
        fetchHomeworks();
      }
    } catch (error: any) {
      setAlertMessage(error.response?.data?.error?.message || 'Failed to delete homework');
      setIsSuccess(false);
      setShowAlert(true);
    }
    setShowDeleteConfirm(false);
    setHomeworkToDelete(null);
  };

  const handleEditHomework = (homework: Homework) => {
    setEditingHomework(homework);
    setSubject(homework.subject);
    setTitle(homework.title);
    setDescription(homework.description);
    const dueDateValue: string = homework.dueDate ? String(homework.dueDate.split('T')[0]) : '';
    setDueDate(dueDateValue);
    setShowForm(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Loading homework...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/teacher/dashboard" />
          </IonButtons>
          <IonTitle>Homework</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="teacher-homework-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {/* Create/Edit Homework Toggle */}
        <div className="form-toggle" onClick={() => (showForm ? resetForm() : setShowForm(true))}>
          <IonText color="light">
            <IonIcon icon={showForm ? 'close-circle-outline' : 'add-circle-outline'} />
            <span>{showForm ? 'Cancel' : 'Assign New Homework'}</span>
          </IonText>
        </div>

        {/* Create/Edit Homework Form */}
        {showForm && (
          <IonCard className="form-card">
            <IonCardContent>
              <h3 className="form-title">
                {editingHomework ? 'Edit Homework' : 'Assign New Homework'}
              </h3>

              <div className="input-group">
                <label className="input-label">Subject *</label>
                <IonInput
                  placeholder="e.g., Mathematics, Science, English"
                  value={subject}
                  onIonInput={(e) => setSubject(e.detail.value || '')}
                  autocapitalize="words"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Title *</label>
                <IonInput
                  placeholder="e.g., Chapter 5 Exercises"
                  value={title}
                  onIonInput={(e) => setTitle(e.detail.value || '')}
                  autocapitalize="words"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Description *</label>
                <IonTextarea
                  placeholder="Enter homework details and instructions..."
                  value={description}
                  onIonInput={(e) => setDescription(e.detail.value || '')}
                  rows={4}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Due Date (Optional)</label>
                <IonInput
                  type="date"
                  value={dueDate}
                  onIonInput={(e) => setDueDate(e.detail.value || '')}
                />
              </div>

              <IonButton
                expand="block"
                color="secondary"
                onClick={editingHomework ? handleUpdateHomework : handleCreateHomework}
                disabled={saving}
              >
                {saving ? <IonSpinner name="crescent" /> : (editingHomework ? 'Update Homework' : 'Assign Homework')}
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {/* Homework List */}
        {homeworks.length === 0 ? (
          <div className="empty-container">
            <IonIcon icon={bookOutline} className="empty-icon" />
            <IonText color="medium">
              <h3>No homework assigned yet</h3>
              <p>Use the form above to assign homework</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {homeworks.map((item) => (
              <IonItem key={item.id} className="homework-item" button onClick={() => handleEditHomework(item)}>
                <IonCard className="homework-card">
                  <IonCardContent>
                    <div className="homework-header">
                      <IonBadge color="secondary" className="subject-badge">
                        {item.subject}
                      </IonBadge>
                      {item.dueDate && (
                        <span className="due-date">Due: {formatDate(item.dueDate)}</span>
                      )}
                    </div>
                    <h4 className="homework-title">{item.title}</h4>
                    <p className="homework-desc">{item.description}</p>
                    <p className="homework-date">Assigned: {formatDate(item.createdAt)}</p>
                    <div className="action-hint">
                      <IonText color="medium">
                        <small>Tap to edit • Long press to delete</small>
                      </IonText>
                    </div>
                  </IonCardContent>
                </IonCard>
                <IonButton
                  slot="end"
                  fill="clear"
                  color="danger"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(item);
                  }}
                >
                  <IonIcon icon="trash-outline" />
                </IonButton>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={isSuccess ? 'Success' : 'Error'}
          message={alertMessage}
          buttons={['OK']}
        />

        <IonAlert
          isOpen={showDeleteConfirm}
          onDidDismiss={() => { setShowDeleteConfirm(false); setHomeworkToDelete(null); }}
          header="Delete Homework"
          message={`Are you sure you want to delete "${homeworkToDelete?.title}"? This action cannot be undone.`}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: handleDeleteConfirm,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default TeacherHomeworkScreen;