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
  IonBadge,
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
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Loading classes...</p>
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
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle>Classes</IonTitle>
          <IonButton slot="end" onClick={() => history.push('/admin/classes/create')}>
            <IonIcon icon={addCircleOutline} /> Add
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="classes-list-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {classes.length === 0 ? (
          <div className="empty-container">
            <IonIcon icon={schoolOutline} className="empty-icon" />
            <IonText color="medium">
              <h3>No classes found</h3>
              <p>Add your first class to get started</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {classes.map((item) => {
              const classFullName = item.section ? `${item.name} - ${item.section}` : item.name;
              return (
                <IonItem key={item.id} className="class-item">
                  <IonCard className="class-card" button onClick={() => history.push(`/admin/classes/${item.id}`)}>
                    <IonCardContent>
                      <div className="class-info">
                        <h3 className="class-name">{classFullName}</h3>
                        <p className="class-date">Created: {formatDate(item.createdAt)}</p>
                      </div>
                      <div className="class-actions">
                        <IonButton
                          fill="outline"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            history.push(`/admin/classes/${item.id}`);
                          }}
                        >
                          <IonIcon icon={createOutline} /> Edit
                        </IonButton>
                        <IonButton
                          fill="outline"
                          color="danger"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(item.id, classFullName);
                          }}
                        >
                          <IonIcon icon={trashOutline} /> Delete
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonItem>
              );
            })}
          </IonList>
        )}

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