/**
 * Admin Teachers List Screen (Modern Admin Design)
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
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
  IonInput,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { 
  addCircleOutline, 
  refreshOutline, 
  personOutline, 
  searchOutline,
  createOutline,
  trashOutline
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import './TeachersListScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const TeachersListScreen = () => {
  const history = useHistory();
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(undefined);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0, limit: 10 });
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);

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
        if (Array.isArray(response.data)) {
          setTeachers(response.data);
          setPagination(prev => ({ ...prev, page: 1, total: response.data.length, pages: 1 }));
        } else if (response.data.teachers) {
          setTeachers(response.data.teachers);
          setPagination(response.data.pagination);
        }
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async (event) => {
    setPagination(prev => ({ ...prev, page: 1 }));
    await fetchTeachers(true);
    event.detail.complete();
  };

  const handleDeleteClick = (teacherId, teacherName) => {
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

  if (loading && teachers.length === 0) {
    return (
      <IonPage>
        <IonHeader className="teachers-list-header">
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/dashboard" />
            </IonButtons>
            <IonTitle className="admin-page-title">Teachers</IonTitle>
            <IonButton slot="end" onClick={() => history.push('/admin/teachers/create')}>
              <IonIcon icon={addCircleOutline} slot="start" />
              Add Teacher
            </IonButton>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="teachers-list-content">
          <div className="loading-state-modern">
            <IonSpinner name="crescent" color="primary" />
            <span className="loading-text">Loading teachers...</span>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="teachers-list-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle className="admin-page-title">Teachers</IonTitle>
          <IonButton slot="end" onClick={() => history.push('/admin/teachers/create')}>
            <IonIcon icon={addCircleOutline} slot="start" />
            Add Teacher
          </IonButton>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="teachers-list-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {/* Search Bar */}
        <div className="filter-bar-modern">
          <div className="search-container-modern">
            <IonIcon icon={searchOutline} className="search-icon-slot" />
            <IonInput
              placeholder="Search teachers by name or email..."
              value={searchQuery}
              onIonInput={(e) => {
                setSearchQuery(e.detail.value || '');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="search-input-modern"
            />
          </div>
        </div>

        {/* Class Filter */}
        <div className="filter-row-modern">
          <IonSelect
            value={selectedClassId}
            placeholder="Filter by Class"
            interface="popover"
            onIonChange={(e) => {
              setSelectedClassId(e.detail.value || undefined);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="class-filter-modern"
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
          <div className="empty-container-modern">
            <IonIcon icon={personOutline} className="empty-icon-modern" />
            <h3 className="empty-title-modern">No teachers found</h3>
            <p className="empty-text-modern">
              {searchQuery || selectedClassId ? 'Try adjusting your filters' : 'Add your first teacher to get started'}
            </p>
          </div>
        ) : (
          <div className="teacher-list-modern">
            {teachers.map((item) => {
              const classFullName = item.class?.section
                ? `${item.class.name} - ${item.class.section}`
                : item.class?.name || null;

              return (
                <div key={item.id} className="teacher-item-modern">
                  <div 
                    className="teacher-card-modern"
                    onClick={() => history.push(`/admin/teachers/${item.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="teacher-card-content-modern">
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="teacher-avatar-modern">
                          {item.name ? item.name.charAt(0).toUpperCase() : 'T'}
                        </div>
                        <div className="teacher-info-modern">
                          <h3 className="teacher-name-modern">{item.name}</h3>
                          <p className="teacher-email-modern">{item.email}</p>
                          {item.phone && <p className="teacher-phone-modern">{item.phone}</p>}
                          {classFullName && (
                            <span className="teacher-class-badge-modern">
                              <IonIcon icon={personOutline} style={{ fontSize: '10px' }} />
                              {classFullName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="teacher-actions-modern">
                        <button 
                          className="action-btn-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            history.push(`/admin/teachers/${item.id}`);
                          }}
                          title="Edit Teacher"
                        >
                          <IonIcon icon={createOutline} />
                        </button>
                        <button 
                          className="action-btn-small delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(item.id, item.name);
                          }}
                          title="Delete Teacher"
                        >
                          <IonIcon icon={trashOutline} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination-modern">
            <span className="pagination-text">
              Page {pagination.page} of {pagination.pages} ({pagination.total} teachers)
            </span>
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