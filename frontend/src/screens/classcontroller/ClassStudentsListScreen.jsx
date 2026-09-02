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
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { classControllerAPI } from '../../services/api';
import './ClassStudentsListScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const ClassStudentsListScreen = () => {
  const history = useHistory();
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showResetAlert, setShowResetAlert] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastColor, setToastColor] = useState('dark');

  // Student API Fetching Logic
  const fetchStudents = useCallback(async (isRefresh = false, search = '', pageNum = 1) => {
    try {
      if (isRefresh) {
        setPage(1);
      }
      
      const response = await classControllerAPI.getStudents('', pageNum, 50, search);
      
      if (response && response.success && response.data) {
        const studentsData = response.data.students.map((s) => ({
          id: s.id,
          email: s.email,
          name: s.name,
          rollNumber: s.rollNumber || s.studentId || `STU-${s.id.slice(-4).toUpperCase()}`,
          studentId: s.studentId,
          createdAt: s.createdAt,
        }));
        
        if (isRefresh || pageNum === 1) {
          setStudents(studentsData);
        } else {
          setStudents(prev => [...prev, ...studentsData]);
        }
        setTotalPages(response.data.pagination?.pages || 1);
      } else {
        setStudents([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setToastMessage('Failed to load students. Please try again.');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents(true, searchQuery, 1);
  }, [fetchStudents]);

  const onRefresh = async (event) => {
    setRefreshing(true);
    await fetchStudents(true, searchQuery, 1);
    event.detail.complete();
  };

  const handleSearch = (event) => {
    const query = event.detail.value || '';
    setSearchQuery(query);
    fetchStudents(true, query, 1);
  };

  const handleStudentPress = (student) => {
    history.push(`/class-controller/students/${student.id}/edit`);
  };

  const handleDeleteStudent = (student, e) => {
    e.stopPropagation();
    setSelectedStudent(student);
    setShowDeleteAlert(true);
  };

  const handleResetPassword = (student, e) => {
    e.stopPropagation();
    setSelectedStudent(student);
    setShowResetAlert(true);
  };

  const confirmDelete = async () => {
    if (!selectedStudent) return;
    
    try {
      const response = await classControllerAPI.deleteStudent(selectedStudent.id);
      
      if (response.success) {
        // Update UI optimistically
        setStudents(prev => prev.filter(s => s.id !== selectedStudent.id));
        setToastMessage(`Student ${selectedStudent.name} removed successfully.`);
        setToastColor('success');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Failed to delete student', error);
      setToastMessage(`Failed to remove ${selectedStudent.name}. Please try again.`);
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setShowDeleteAlert(false);
      setSelectedStudent(null);
    }
  };

  const confirmResetPassword = async (newPassword = 'Student@123') => {
    if (!selectedStudent) return;
    
    try {
      const response = await classControllerAPI.resetPassword(selectedStudent.id, newPassword);
      
      if (response.success) {
        setToastMessage(`Password for ${selectedStudent.name} reset to '${response.data.password}'.`);
        setToastColor('success');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Failed to reset password', error);
      const errorMsg = error?.response?.data?.error?.message || `Failed to reset password for ${selectedStudent.name}`;
      setToastMessage(errorMsg);
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setShowResetAlert(false);
      setSelectedStudent(null);
    }
  };

  const handleLoadMore = async (event) => {
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
          <HomeLogoutButtons />
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
        <HomeLogoutButtons />
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
            <div className="student-badges">
              <IonBadge color="primary" className="student-id-badge">
                ID: {student.studentId}
              </IonBadge>
              <IonBadge color="secondary" className="student-roll-badge">
                Roll: {student.rollNumber}
              </IonBadge>
            </div>
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
          message={`Are you sure you want to remove ${selectedStudent?.name} from this class? This action cannot be undone.`}
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
              text: 'Reset to Default',
              handler: () => confirmResetPassword('Student@123'),
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
          color={toastColor}
          icon={toastColor === 'success' ? checkmarkCircleOutline : undefined}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassStudentsListScreen;