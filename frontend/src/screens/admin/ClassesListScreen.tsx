/**
 * Admin Classes List Screen (Ionic React Version)
 * Manage school classes
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
  IonList,
  IonItem,
  IonCard,
  IonCardContent,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { addCircleOutline, refreshOutline, createOutline, trashOutline, schoolOutline } from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import { Class } from '../../types';
import './ClassesListScreen.css';

const ClassesListScreen: React.FC = () => {
  const history = useHistory();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [classToDelete, setClassToDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchClasses = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const response = await adminAPI.getClasses();
      if (response.success && response.data) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    await fetchClasses(true);
    event.detail.complete();
  };

  const handleDeleteClick = (classId: string, className: string) => {
    setClassToDelete({ id: classId, name: className });
    setShowDeleteAlert(true);
  };

  const handleDeleteConfirm = async () => {
    if (!classToDelete) return;
    try {
      const response = await adminAPI.deleteClass(classToDelete.id);
      if (response.success) {
        fetchClasses();
      }
    } catch (error) {
      console.error('Error deleting class:', error);
    }
    setShowDeleteAlert(false);
    setClassToDelete(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading && classes.length === 0) {
    return (
      <IonPage>
        <IonContent className="classes-list-content">
          <div className="loading-state-modern">
            <IonSpinner name="crescent" color="primary" />
            <p className="loading-text">Loading classes...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="classes-list-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle>Classes & Sections</IonTitle>
          <IonButton
            slot="end"
            className="add-header-btn"
            onClick={() => history.push('/admin/classes/create')}
          >
            <IonIcon icon={addCircleOutline} slot="start" /> Add Class
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="classes-list-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        <div className="classes-container-wrapper">
          {/* Header Stats / Banner Section */}
          <div className="classes-summary-card">
            <div>
              <h2>🏫 Manage Classes</h2>
              <p>Configure classes, sections, and structural details</p>
            </div>
            <div className="summary-badge">{classes.length} Total Classes</div>
          </div>

          {classes.length === 0 ? (
            <div className="empty-container-modern">
              <IonIcon icon={schoolOutline} className="empty-icon-modern" />
              <h3 className="empty-title-modern">No classes found</h3>
              <p className="empty-text-modern">Add your first class to get started</p>
            </div>
          ) : (
            <IonList className="class-list-modern">
              {classes.map((item) => {
                const classFullName = item.section ? `${item.name} - ${item.section}` : item.name;
                return (
                  <IonItem key={item.id} className="class-item-modern" lines="none">
                    <IonCard className="class-card-modern">
                      <IonCardContent className="class-card-content-modern">
                        <div className="class-card-left">
                          <div className="class-icon-modern">
                            <IonIcon icon={schoolOutline} />
                          </div>
                          <div className="class-info-modern">
                            <h3 className="class-name-modern">{classFullName}</h3>
                            <p className="class-date-modern">Created: {formatDate(item.createdAt)}</p>
                            <div className="class-stats-modern">
                              <span className="class-stat-badge">Active Class</span>
                            </div>
                          </div>
                        </div>

                        <div className="class-actions-modern">
                          <button
                            type="button"
                            className="action-btn-small"
                            title="Edit Class"
                            onClick={(e) => {
                              e.stopPropagation();
                              history.push(`/admin/classes/${item.id}`);
                            }}
                          >
                            <IonIcon icon={createOutline} />
                          </button>
                          <button
                            type="button"
                            className="action-btn-small delete-btn"
                            title="Delete Class"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(item.id, classFullName);
                            }}
                          >
                            <IonIcon icon={trashOutline} />
                          </button>
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonItem>
                );
              })}
            </IonList>
          )}
        </div>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Class"
          message={`Are you sure you want to delete "${classToDelete?.name}"? This action cannot be undone.`}
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

export default ClassesListScreen;