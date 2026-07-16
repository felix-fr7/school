/**
 * Class Students List Screen (Ionic React Version)
 * View and manage students for the class
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSpinner,
  IonText,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonBadge,
  IonSearchbar,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
  IonFab,
  IonFabButton,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/react';
import {
  searchOutline,
  personAddOutline,
  keyOutline,
  trashOutline,
  refreshCircleOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { classControllerAPI } from '../../services/api';
import './ClassStudentsListScreen.css';

interface Student {
  id: string;
  email: string;
  name: string;
  studentId: string;
  createdAt: string;
}

const ClassStudentsListScreen: React.FC = () => {
  const history = useHistory();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showResetAlert, setShowResetAlert] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const fetchStudents = async (refresh = false, search = '', pageNum = 1) => {
    try {
      const response = await classControllerAPI.getStudents('', pageNum, 50, search);
      
      if (response.success && response.data) {
        const studentsData: Student[] = response.data.students.map(s => ({
          id: s.id,
          email: s.email,
          name: s.name,
          studentId: s.studentId || '',
          createdAt: s.createdAt,
        }));
        
        if (refresh) {
          setStudents(studentsData);
        } else {
          setStudents(prev => [...prev, ...studentsData]);
        }
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    setRefreshing(true);
    await fetchStudents(true, searchQuery);
    event.detail.complete();
  };

  const handleSearch = (event: CustomEvent) => {
    const query = event.detail.value || '';
    setSearchQuery(query);
    fetchStudents(true, query);
  };

  const handleStudentPress = (student: Student) => {
    history.push(`/class-controller/students/${student.id}/edit`);
  };

  const handleDeleteStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowDeleteAlert(true);
  };

  const handleResetPassword = (student: Student) => {
    setSelectedStudent(student);
    setShowResetAlert(true);
  };

  const confirmDelete = async () => {
    if (!selectedStudent) return;
    
    // Note: deleteStudent API not available in classControllerAPI
    // This would need to be implemented in the backend
    console.log('Delete student:', selectedStudent.id);
    setShowDeleteAlert(false);
    setSelectedStudent(null);
  };

  const confirmResetPassword = async () => {
    if (!selectedStudent) return;
    
    // Note: resetStudentPassword API not available in classControllerAPI
    // This would need to be implemented in the backend
    console.log('Reset password for:', selectedStudent.id);
    setShowResetAlert(false);
    setSelectedStudent(null);
  };

  const handleLoadMore = async (event: CustomEvent) => {
    if (page >= totalPages) {
      event.detail.complete();
      return;
    }
    
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchStudents(false, searchQuery, nextPage);
    event.detail.complete();
  };

  if (loading && students.length === 0) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center students-loading">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p className="loading-text">Loading students...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Students</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={searchQuery}
            onIonInput={handleSearch}
            placeholder="Search by name, email, or ID..."
            debounce={300}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent className="students-list-content" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent
            pullingIcon={refreshCircleOutline}
            refreshingSpinner="crescent"
          />
        </IonRefresher>

        {students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <IonText>
              <h3>No students found</h3>
              <p className="empty-subtext">Add your first student to get started</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {students.map((student) => (
              <IonItem
                key={student.id}
                className="student-card"
                button
                onClick={() => handleStudentPress(student)}
                detail={false}
              >
                <IonAvatar slot="start" className="student-avatar">
                  <span>{student.name.charAt(0).toUpperCase()}</span>
                </IonAvatar>
                <IonLabel className="student-info">
                  <h3 className="student-name">{student.name}</h3>
                  <p className="student-email">{student.email}</p>
                  <IonBadge color="secondary" className="student-id-badge">
                    {student.studentId}
                  </IonBadge>
                </IonLabel>
                <div className="student-actions" slot="end">
                  <IonButton
                    fill="clear"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetPassword(student);
                    }}
                  >
                    <IonIcon icon={keyOutline} slot="icon-only" />
                  </IonButton>
                  <IonButton
                    fill="clear"
                    size="small"
                    color="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteStudent(student);
                    }}
                  >
                    <IonIcon icon={trashOutline} slot="icon-only" />
                  </IonButton>
                </div>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonInfiniteScroll
          onIonInfinite={handleLoadMore}
          disabled={page >= totalPages}
        >
          <IonInfiniteScrollContent
            loadingSpinner="crescent"
            loadingText="Loading more students..."
          />
        </IonInfiniteScroll>
      </IonContent>

      {/* Floating Add Button */}
      <IonFab
        vertical="bottom"
        horizontal="end"
        slot="fixed"
        onClick={() => history.push('/class-controller/students/add')}
      >
        <IonFabButton color="secondary">
          <IonIcon icon={personAddOutline} />
        </IonFabButton>
      </IonFab>

      {/* Delete Confirmation Alert */}
      <IonAlert
        isOpen={showDeleteAlert}
        onDidDismiss={() => setShowDeleteAlert(false)}
        header="Delete Student"
        message={`Are you sure you want to delete ${selectedStudent?.name}?`}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Delete',
            role: 'destructive',
            handler: confirmDelete,
          },
        ]}
      />

      {/* Reset Password Alert */}
      <IonAlert
        isOpen={showResetAlert}
        onDidDismiss={() => setShowResetAlert(false)}
        header="Reset Password"
        message={`Reset password for ${selectedStudent?.name} to Student@123?`}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Reset',
            handler: confirmResetPassword,
          },
        ]}
      />
    </IonPage>
  );
};

export default ClassStudentsListScreen;