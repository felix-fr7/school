/**
 * Admin Students List Screen (Ionic React Version)
 * Manage school students with search functionality
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
  IonBadge,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { addCircleOutline, refreshOutline, peopleOutline, searchOutline } from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import { User } from '../../types';
import './StudentsListScreen.css';

const StudentsListScreen: React.FC = () => {
  const history = useHistory();
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0, limit: 10 });
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [pagination.page, searchQuery]);

  const fetchStudents = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const response = await adminAPI.getStudents(pagination.page, pagination.limit, searchQuery);
      if (response.success && response.data) {
        setStudents(response.data.students);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async (event: CustomEvent) => {
    setPagination(prev => ({ ...prev, page: 1 }));
    await fetchStudents(true);
    event.detail.complete();
  };

  const handleDeleteClick = (studentId: string, studentName: string) => {
    setStudentToDelete({ id: studentId, name: studentName });
    setShowDeleteAlert(true);
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    try {
      const response = await adminAPI.deleteStudent(studentToDelete.id);
      if (response.success) {
        fetchStudents();
      } else {
        console.error(response.error?.message || 'Failed to delete student');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
    }
    setShowDeleteAlert(false);
    setStudentToDelete(null);
  };

  if (loading && students.length === 0) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Loading students...</p>
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
          <IonTitle>Students</IonTitle>
          <IonButton slot="end" onClick={() => history.push('/admin/students/create')}>
            <IonIcon icon={addCircleOutline} /> Add
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="students-list-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {/* Search */}
        <div className="filter-bar">
          <div className="search-container">
            <IonInput
              placeholder="Search students by name or email..."
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

        {/* Students List */}
        {students.length === 0 ? (
          <div className="empty-container">
            <IonIcon icon={peopleOutline} className="empty-icon" />
            <IonText color="medium">
              <h3>No students found</h3>
              <p>{searchQuery ? 'Try a different search term' : 'Add your first student to get started'}</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {students.map((item) => {
              const classFullName = item.class?.section
                ? `${item.class.name} - ${item.class.section}`
                : item.class?.name || null;

              return (
                <IonItem key={item.id} className="student-item">
                  <IonCard className="student-card" button onClick={() => history.push(`/admin/students/${item.id}`)}>
                    <IonCardContent>
                      <div className="student-info">
                        <h3 className="student-name">{item.name}</h3>
                        <p className="student-email">{item.email}</p>
                        <p className="student-id">ID: {item.studentId}</p>
                        {classFullName && (
                          <IonBadge color="primary" className="class-badge">
                            {classFullName}
                          </IonBadge>
                        )}
                      </div>
                      <div className="student-actions">
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
              <p>Page {pagination.page} of {pagination.pages} ({pagination.total} students)</p>
            </IonText>
          </div>
        )}

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Student"
          message={`Are you sure you want to delete "${studentToDelete?.name}"? This action cannot be undone.`}
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

export default StudentsListScreen;