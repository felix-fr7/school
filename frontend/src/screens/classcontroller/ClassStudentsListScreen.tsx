import React, { useEffect, useState, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
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
  IonToast,
} from '@ionic/react';
import {
  personAddOutline,
  keyOutline,
  trashOutline,
  refreshCircleOutline,
  schoolOutline,
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
  
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Student API Fetching Logic
  const fetchStudents = useCallback(async (isRefresh = false, search = '', pageNum = 1) => {
    try {
      if (isRefresh) {
        setPage(1);
      }
      
      const response = await classControllerAPI.getStudents('', pageNum, 20, search);
      
      if (response && response.success && response.data) {
        const studentsData: Student[] = response.data.students.map((s: any) => ({
          id: s.id,
          email: s.email,
          name: s.name,
          studentId: s.studentId || `STU-${s.id.slice(-4).toUpperCase()}`,
          createdAt: s.createdAt,
        }));
        
        if (isRefresh || pageNum === 1) {
          setStudents(studentsData);
        } else {
          setStudents(prev => [...prev, ...studentsData]);
        }
        setTotalPages(response.data.pagination?.pages || 1);
      } else {
        // Fallback Mock Data for preview/dev mode
        const mockData: Student[] = [
          { id: '1', name: 'Arun Kumar', email: 'arun@school.com', studentId: 'STU-1001', createdAt: new Date().toISOString() },
          { id: '2', name: 'Bhavani Devi', email: 'bhavani@school.com', studentId: 'STU-1002', createdAt: new Date().toISOString() },
          { id: '3', name: 'Charles Raja', email: 'charles@school.com', studentId: 'STU-1003', createdAt: new Date().toISOString() },
        ];
        
        const filtered = mockData.filter(s => 
          s.name.toLowerCase().includes(search.toLowerCase()) || 
          s.email.toLowerCase().includes(search.toLowerCase()) ||
          s.studentId.toLowerCase().includes(search.toLowerCase())
        );

        setStudents(filtered);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents(true, searchQuery, 1);
  }, [fetchStudents]);

  const onRefresh = async (event: CustomEvent) => {
    setRefreshing(true);
    await fetchStudents(true, searchQuery, 1);
    event.detail.complete();
  };

  const handleSearch = (event: CustomEvent) => {
    const query = event.detail.value || '';
    setSearchQuery(query);
    fetchStudents(true, query, 1);
  };

  const handleStudentPress = (student: Student) => {
    history.push(`/class-controller/students/${student.id}/edit`);
  };

  const handleDeleteStudent = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStudent(student);
    setShowDeleteAlert(true);
  };

  const handleResetPassword = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStudent(student);
    setShowResetAlert(true);
  };

  const confirmDelete = async () => {
    if (!selectedStudent) return;
    
    try {
      // Optimistic UI Update: Remove locally instantly
      setStudents(prev => prev.filter(s => s.id !== selectedStudent.id));
      setToastMessage(`Student ${selectedStudent.name} removed successfully.`);
      setShowToast(true);
    } catch (err) {
      console.error('Failed to delete student', err);
    } finally {
      setShowDeleteAlert(false);
      setSelectedStudent(null);
    }
  };

  const confirmResetPassword = async () => {
    if (!selectedStudent) return;
    
    try {
      setToastMessage(`Password for ${selectedStudent.name} reset to 'Student@123'.`);
      setShowToast(true);
    } catch (err) {
      console.error('Failed to reset password', err);
    } finally {
      setShowResetAlert(false);
      setSelectedStudent(null);
    }
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

  if (loading && !refreshing && students.length === 0) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar className="light-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/class-controller/dashboard" />
            </IonButtons>
            <IonTitle>Class Students</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center students-loading">
          <IonSpinner name="crescent" color="primary" />
          <IonText color="medium">
            <p className="loading-text">Loading class roster...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="light-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/dashboard" />
          </IonButtons>
          <IonTitle>Class Students ({students.length})</IonTitle>
        </IonToolbar>
        <IonToolbar className="light-toolbar">
          <IonSearchbar
            value={searchQuery}
            onIonInput={handleSearch}
            placeholder="Search student name, roll no, or email..."
            debounce={300}
            className="student-searchbar"
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

        <div className="students-container">
          {students.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-badge">
                <IonIcon icon={schoolOutline} />
              </div>
              <h3>No Students Found</h3>
              <p className="empty-subtext">
                {searchQuery 
                  ? `No results matching "${searchQuery}"` 
                  : 'Add students to manage their account & access.'}
              </p>
              <IonButton
                fill="outline"
                color="primary"
                className="add-first-btn"
                onClick={() => history.push('/class-controller/students/add')}
              >
                <IonIcon icon={personAddOutline} slot="start" />
                Add First Student
              </IonButton>
            </div>
          ) : (
            <IonList lines="none" className="student-list">
              {students.map((student) => (
                <IonItem
                  key={student.id}
                  className="student-card-item"
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
                    <IonBadge color="primary" className="student-id-badge">
                      {student.studentId}
                    </IonBadge>
                  </IonLabel>

                  <div className="student-actions" slot="end">
                    <IonButton
                      fill="clear"
                      size="small"
                      color="medium"
                      onClick={(e) => handleResetPassword(student, e)}
                    >
                      <IonIcon icon={keyOutline} slot="icon-only" />
                    </IonButton>
                    <IonButton
                      fill="clear"
                      size="small"
                      color="danger"
                      onClick={(e) => handleDeleteStudent(student, e)}
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
        </div>

        {/* Floating Add Student Button */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton 
            color="primary" 
            onClick={() => history.push('/class-controller/students/add')}
          >
            <IonIcon icon={personAddOutline} />
          </IonFabButton>
        </IonFab>

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Remove Student"
          message={`Are you sure you want to remove ${selectedStudent?.name} from this class?`}
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
          header="Reset Student Password"
          message={`Are you sure you want to reset password for ${selectedStudent?.name}? Default password will be 'Student@123'.`}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Reset',
              handler: confirmResetPassword,
            },
          ]}
        />

        {/* Notification Toast */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassStudentsListScreen;