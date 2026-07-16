/**
 * Admin Teachers List Screen (Ionic React Version)
 * Manage school teachers with search and filtering
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
  IonInput,
  IonSelect,
  IonSelectOption,
  IonBadge,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { addCircleOutline, refreshOutline, personOutline, searchOutline } from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import { User, Class } from '../../types';
import './TeachersListScreen.css';

const TeachersListScreen: React.FC = () => {
  const history = useHistory();
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(undefined);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0, limit: 10 });
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, [pagination.page, searchQuery, selectedClassId]);

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

  const fetchTeachers = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const response = await adminAPI.getTeachers(
        pagination.page,
        pagination.limit,
        selectedClassId || '',
        searchQuery
      );
      if (response.success && response.data) {
        setTeachers(response.data.teachers);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async (event: CustomEvent) => {
    setPagination(prev => ({ ...prev, page: 1 }));
    await fetchTeachers(true);
    event.detail.complete();
  };

  const handleDeleteClick = (teacherId: string, teacherName: string) => {
    setTeacherToDelete({ id: teacherId, name: teacherName });
    setShowDeleteAlert(true);
  };

  const handleDeleteConfirm = async () => {
    if (!teacherToDelete) return;
    try {
      const response = await adminAPI.deleteTeacher(teacherToDelete.id);
      if (response.success) {
        fetchTeachers();
      } else {
        console.error(response.error?.message || 'Failed to delete teacher');
      }
    } catch (error) {
      console.error('Error deleting teacher:', error);
    }
    setShowDeleteAlert(false);
    setTeacherToDelete(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading && teachers.length === 0) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Loading teachers...</p>
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
          <IonTitle>Teachers</IonTitle>
          <IonButton slot="end" onClick={() => history.push('/admin/teachers/create')}>
            <IonIcon icon={addCircleOutline} /> Add
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="teachers-list-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {/* Search and Filter */}
        <div className="filter-bar">
          <div className="search-container">
            <IonInput
              placeholder="Search teachers..."
              value={searchQuery}
              onIonInput={(e) => {
                setSearchQuery(e.detail.value || '');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            >
              <IonIcon icon={searchOutline} slot="start" />
            </IonInput>
          </div>
        </div>

        <div className="filter-row">
          <IonSelect
            value={selectedClassId}
            placeholder="Filter by Class"
            interface="popover"
            onIonChange={(e) => {
              setSelectedClassId(e.detail.value || undefined);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="class-filter"
          >
            <IonSelectOption value="">All Classes</IonSelectOption>
            {classes.map((cls) => (
              <IonSelectOption key={cls.id} value={cls.id}>
                {cls.section ? `${cls.name} - ${cls.section}` : cls.name}
              </IonSelectOption>
            ))}
          </IonSelect>
        </div>

        {/* Teachers List */}
        {teachers.length === 0 ? (
          <div className="empty-container">
            <IonIcon icon={personOutline} className="empty-icon" />
            <IonText color="medium">
              <h3>No teachers found</h3>
              <p>{searchQuery || selectedClassId ? 'Try adjusting your filters' : 'Add your first teacher to get started'}</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {teachers.map((item) => {
              const classFullName = item.class?.section
                ? `${item.class.name} - ${item.class.section}`
                : item.class?.name || null;

              return (
                <IonItem key={item.id} className="teacher-item">
                  <IonCard className="teacher-card" button onClick={() => history.push(`/admin/teachers/${item.id}`)}>
                    <IonCardContent>
                      <div className="teacher-info">
                        <h3 className="teacher-name">{item.name}</h3>
                        <p className="teacher-email">{item.email}</p>
                        {item.phone && <p className="teacher-phone">{item.phone}</p>}
                        {classFullName && (
                          <IonBadge color="primary" className="class-badge">
                            {classFullName}
                          </IonBadge>
                        )}
                      </div>
                      <div className="teacher-actions">
                        <IonButton
                          fill="outline"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            history.push(`/admin/teachers/${item.id}`);
                          }}
                        >
                          Edit
                        </IonButton>
                        <IonButton
                          fill="outline"
                          color="danger"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(item.id, item.name);
                          }}
                        >
                          Delete
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>
                </IonItem>
              );
            })}
          </IonList>
        )}

        {/* Pagination Info */}
        {pagination.pages > 1 && (
          <div className="pagination-info">
            <IonText color="medium">
              <p>Page {pagination.page} of {pagination.pages} ({pagination.total} teachers)</p>
            </IonText>
          </div>
        )}

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Teacher"
          message={`Are you sure you want to delete "${teacherToDelete?.name}"? This action cannot be undone.`}
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

export default TeachersListScreen;