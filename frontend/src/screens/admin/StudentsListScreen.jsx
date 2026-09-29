/**
 * Admin Students List Screen (Modern Admin Design)
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
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
  IonInput,
  IonBadge,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { 
  addCircleOutline, 
  refreshOutline, 
  peopleOutline, 
  searchOutline, 
  createOutline, 
  trashOutline,
  personOutline
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import './AdminTheme.css';
// Layout + card styling for this screen (centred wrapper, card grid, search bar)
// lives here. Without this import the list renders edge-to-edge with no padding.
import './StudentsListScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const StudentsListScreen = () => {
  console.log('[StudentsList] Component rendered');
  const history = useHistory();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0, limit: 10 });
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, [pagination?.page, searchQuery]);

  const fetchStudents = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      console.log('[StudentsList] Fetching students with params:', {
        page: pagination.page,
        limit: pagination.limit,
        searchQuery
      });

      const response = await adminAPI.getStudents(pagination.page, pagination.limit, searchQuery);
      console.log('[StudentsList] API Response:', response);

      // Check if response indicates an error about tenant/admin
      if (response.message && response.message.includes('not associated with a school')) {
        console.error('[StudentsList] Admin not associated with a school:', response.message);
      }

      if (response.success && response.data) {
        // Backend returns data as array directly, not nested as { students: [] }
        const studentsData = Array.isArray(response.data) ? response.data : (response.data.students || []);
        console.log('[StudentsList] Setting students:', studentsData.length, 'students');
        setStudents(studentsData);
        
        // Handle pagination - could be in response.pagination or response.data.pagination
        const paginationData = response.pagination || response.data.pagination;
        if (paginationData) {
          console.log('[StudentsList] Setting pagination:', paginationData);
          setPagination(paginationData);
        }
      } else {
        console.warn('[StudentsList] Response not successful or no data:', response);
        setStudents([]);
      }
    } catch (error) {
      console.error('[StudentsList] Error fetching students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async (event) => {
    setPagination(prev => ({ ...prev, page: 1 }));
    await fetchStudents(true);
    event.detail.complete();
  };

  const handleDeleteClick = (studentId, studentName) => {
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

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  if (loading && students.length === 0) {
    return (
      <IonPage>
        <IonHeader className="students-list-header">
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/dashboard" className="students-back-btn" />
            </IonButtons>
            <IonTitle className="admin-page-title">Students</IonTitle>
            <IonButton slot="end" onClick={() => history.push('/admin/students/create')}>
              <IonIcon icon={addCircleOutline} slot="start" />
              Add Student
            </IonButton>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="students-list-content">
          <div className="loading-state-modern">
            <IonSpinner name="crescent" color="primary" />
            <span className="loading-text">Loading students...</span>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="students-list-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" className="students-back-btn" />
          </IonButtons>
          <IonTitle className="admin-page-title">Students</IonTitle>
          <IonButton slot="end" onClick={() => history.push('/admin/students/create')}>
            <IonIcon icon={addCircleOutline} slot="start" />
            Add Student
          </IonButton>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="students-list-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {/* The centred wrapper (max-width + side padding) lives in
            StudentsListScreen.css as `.students-container-wrapper`; the markup
            below must sit inside it or the list stretches edge to edge. */}
        <div className="students-container-wrapper">
          {/* Search Bar */}
          <div className="filter-bar-modern">
          <div className="search-container-modern">
            <IonIcon icon={searchOutline} className="search-icon-slot" />
            <IonInput
              placeholder="Search students by name, email, or ID..."
              value={searchQuery}
              onIonInput={(e) => {
                setSearchQuery(e.detail.value || '');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="search-input-modern"
            />
          </div>
        </div>

        {/* Students List */}
        {students.length === 0 ? (
          <div className="empty-container-modern">
            <IonIcon icon={peopleOutline} className="empty-icon-modern" />
            <h3 className="empty-title-modern">No students found</h3>
            <p className="empty-text-modern">
              {searchQuery ? 'Try a different search term' : 'Add your first student to get started'}
            </p>
          </div>
        ) : (
          <div className="student-list-modern">
            {students.map((item) => {
              // Handle both nested class object and flat className/section fields
              const className = item.class?.name || item.className;
              const section = item.class?.section || item.section;
              const classFullName = section
                ? `${className} - ${section}`
                : className || null;

              return (
                <div key={item.id} className="student-item-modern">
                  <div 
                    className="student-card-modern"
                    onClick={() => history.push(`/admin/students/edit/${item.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="student-card-content-modern">
                      <div className="student-card-left">
                        <div className="student-avatar-modern">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="student-info-modern">
                          <h3 className="student-name-modern">{item.name}</h3>
                          <p className="student-email-modern">{item.email}</p>
                          <p className="student-id-modern">ID: {item.studentId}</p>
                          {classFullName && (
                            <span className="student-class-badge-modern">
                              <IonIcon icon={peopleOutline} style={{ fontSize: '10px' }} />
                              {classFullName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="student-actions-modern">
                        <button 
                          className="action-btn-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            history.push(`/admin/students/edit/${item.id}`);
                          }}
                          title="Edit Student"
                        >
                          <IonIcon icon={createOutline} />
                        </button>
                        <button 
                          className="action-btn-small delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(item.id, item.name);
                          }}
                          title="Delete Student"
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
              Page {pagination.page} of {pagination.pages} ({pagination.total} students)
            </span>
            <div className="pagination-controls">
              <button 
                className="page-btn"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Prev
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                let pageNum;
                if (pagination.pages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.pages - 2) {
                  pageNum = pagination.pages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`page-btn ${pagination.page === pageNum ? 'active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button 
                className="page-btn"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </button>
            </div>
          </div>
        )}

        </div>

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