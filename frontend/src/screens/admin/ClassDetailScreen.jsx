/**
 * Class Detail Screen 
 * Shows class information and provides quick access to class-specific features
 * including report cards management
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
  IonSpinner,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonText,
  IonFab,
  IonFabButton,
  IonToast,
  IonChip,
  IonAlert,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonTextarea,
  IonItem,
  IonLabel,
} from '@ionic/react';
import { useHistory, useParams } from 'react-router-dom';
import {
  peopleOutline,
  documentOutline,
  calendarOutline,
  schoolOutline,
  addCircleOutline,
  sendOutline,
  eyeOutline,
  chevronForwardOutline,
  bookOutline,
  closeOutline,
  uploadOutline,
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import './ClassDetailScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const ClassDetailScreen = () => {
  const { id } = useParams();
  const history = useHistory();
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', color: 'success' });
  const [showSendAlert, setShowSendAlert] = useState(false);
  const [cardToSend, setCardToSend] = useState(null);
  const [showSendAllAlert, setShowSendAllAlert] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    studentId: '',
    term: '',
    academicYear: '',
    teacherRemarks: '',
    principalRemarks: '',
    file: null
  });
  const [classStudents, setClassStudents] = useState([]);

  const terms = ['Term 1', 'Term 2', 'Term 3', 'Half Yearly', 'Annual', 'Unit Test 1', 'Unit Test 2', 'Unit Test 3'];
  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear - 1}-${currentYear}`,
    `${currentYear - 2}-${currentYear - 1}`,
  ];

  useEffect(() => {
    fetchClassData();
  }, [id]);

  // Fetch students in this class for the upload modal
  useEffect(() => {
    if (showUploadModal && id) {
      fetchClassStudents(id);
    }
  }, [showUploadModal, id]);

  const fetchClassStudents = async (classId) => {
    try {
      const response = await adminAPI.getStudents(1, 100, '', classId);
      if (response.success) {
        setClassStudents(response.data.students || []);
      }
    } catch (error) {
      console.error('Error fetching class students:', error);
      setClassStudents([]);
    }
  };

  const fetchClassData = async () => {
    try {
      setLoading(true);
      // Fetch class details
      const classResponse = await adminAPI.getClass(id);
      if (classResponse.success) {
        setClassData(classResponse.data);
      }

      // Fetch students in this class
      const studentsResponse = await adminAPI.getStudents(1, 100, '', id);
      if (studentsResponse.success) {
        setStudents(studentsResponse.data.students || []);
      }

      // Fetch report cards for this class
      const reportCardsResponse = await adminAPI.getReportCards({ classId: id });
      if (reportCardsResponse.success) {
        setReportCards(reportCardsResponse.data || []);
      }
    } catch (error) {
      console.error('Error fetching class data:', error);
      setToast({ show: true, message: 'Error loading class data', color: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s._id === studentId || s.id === studentId);
    return student ? student.name : 'Unknown Student';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleSend = async () => {
    if (!cardToSend) return;

    try {
      const response = await adminAPI.publishReportCard(cardToSend);
      if (response.success) {
        setToast({ show: true, message: response.message || 'Report card sent to student successfully', color: 'success' });
        setShowSendAlert(false);
        setCardToSend(null);
        fetchClassData();
      } else {
        setToast({ show: true, message: 'Failed to send report card', color: 'danger' });
      }
    } catch (error) {
      setToast({ show: true, message: 'Failed to send: ' + error.message, color: 'danger' });
    }
  };

  const handleSendAll = async () => {
    try {
      const response = await adminAPI.publishAllReportCardsForClass(id);
      if (response.success) {
        setToast({ show: true, message: response.message || `${response.data?.publishedCount || 0} report card(s) sent successfully`, color: 'success' });
        setShowSendAllAlert(false);
        fetchClassData();
      } else {
        setToast({ show: true, message: response.message || 'No unpublished report cards found for this class', color: 'warning' });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to send report cards';
      setToast({ show: true, message: errorMsg, color: 'danger' });
    }
  };

  const handleUploadChange = (key, value) => {
    setUploadForm(prev => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.studentId || !uploadForm.term || !uploadForm.academicYear || !uploadForm.file) {
      setToast({ show: true, message: 'Please fill all required fields', color: 'danger' });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('studentId', uploadForm.studentId);
      formData.append('term', uploadForm.term);
      formData.append('academicYear', uploadForm.academicYear);
      formData.append('teacherRemarks', uploadForm.teacherRemarks || '');
      formData.append('principalRemarks', uploadForm.principalRemarks || '');
      formData.append('reportCardFile', uploadForm.file);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/reportcards/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setToast({ show: true, message: 'Report card uploaded successfully', color: 'success' });
        setShowUploadModal(false);
        resetUploadForm();
        fetchClassData();
      } else {
        setToast({ show: true, message: data.error?.message || 'Upload failed', color: 'danger' });
      }
    } catch (error) {
      setToast({ show: true, message: 'Upload failed: ' + error.message, color: 'danger' });
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      studentId: '',
      term: '',
      academicYear: '',
      teacherRemarks: '',
      principalRemarks: '',
      file: null
    });
    setClassStudents([]);
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/classes" />
            </IonButtons>
            <IonTitle>Class Details</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
        </IonContent>
      </IonPage>
    );
  }

  if (!classData) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/classes" />
            </IonButtons>
            <IonTitle>Class Not Found</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <IonText color="danger">
            <h3>Class not found</h3>
            <p>The requested class could not be found.</p>
          </IonText>
          <IonButton onClick={() => history.push('/admin/classes')}>
            Back to Classes
          </IonButton>
        </IonContent>
      </IonPage>
    );
  }

  const classFullName = classData.section ? `${classData.name} - ${classData.section}` : classData.name;
  const publishedCount = reportCards.filter(rc => rc.isPublished).length;
  const pendingCount = reportCards.filter(rc => !rc.isPublished).length;

  return (
    <IonPage>
      <IonHeader className="class-detail-header ion-no-border">
        <IonToolbar className="custom-nav-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/classes" className="custom-nav-back-btn" />
          </IonButtons>
          <IonTitle className="custom-nav-title">{classFullName}</IonTitle>
          <IonButton
            slot="end"
            fill="clear"
            className="add-header-btn"
            onClick={() => history.push(`/admin/report-cards?classId=${id}`)}
          >
            <IonIcon icon={documentOutline} slot="start" /> Report Cards
          </IonButton>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="class-detail-content">
        <div className="class-detail-wrapper">
          {/* Class Info Card */}
          <IonCard className="class-info-card">
            <IonCardContent>
              <div className="class-header-info">
                <div className="class-icon-wrapper">
                  <IonIcon icon={schoolOutline} />
                </div>
                <div className="class-title-info">
                  <h2>{classFullName}</h2>
                  <p>Class Code: <strong>{classData.classCode || 'N/A'}</strong></p>
                </div>
              </div>
              
              <div className="class-stats-row">
                <div className="stat-item">
                  <IonIcon icon={peopleOutline} />
                  <span className="stat-value">{students.length}</span>
                  <span className="stat-label">Students</span>
                </div>
                <div className="stat-item">
                  <IonIcon icon={documentOutline} />
                  <span className="stat-value">{reportCards.length}</span>
                  <span className="stat-label">Report Cards</span>
                </div>
                <div className="stat-item">
                  <IonIcon icon={calendarOutline} />
                  <span className="stat-value">{formatDate(classData.createdAt)}</span>
                  <span className="stat-label">Created</span>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Quick Actions */}
          <div className="section-title">Quick Actions</div>
          <IonGrid className="quick-actions-grid">
            <IonRow>
              <IonCol size="6" size-md="3">
                <IonCard 
                  className="action-card" 
                  onClick={() => history.push(`/admin/students?classId=${id}`)}
                >
                  <IonCardContent>
                    <IonIcon icon={peopleOutline} color="primary" />
                    <span>Students</span>
                  </IonCardContent>
                </IonCard>
              </IonCol>
              <IonCol size="6" size-md="3">
                <IonCard 
                  className="action-card" 
                  onClick={() => {
                    if (pendingCount > 0) {
                      setShowSendAllAlert(true);
                    } else {
                      history.push(`/admin/report-cards?classId=${id}`);
                    }
                  }}
                >
                  <IonCardContent>
                    <IonIcon icon={documentOutline} color="success" />
                    <span>Report Cards</span>
                  </IonCardContent>
                </IonCard>
              </IonCol>
              <IonCol size="6" size-md="3">
                <IonCard 
                  className="action-card send-report-card-btn" 
                  onClick={() => setShowUploadModal(true)}
                >
                  <IonCardContent>
                    <IonIcon icon={sendOutline} color="tertiary" />
                    <span>Send Report Card</span>
                  </IonCardContent>
                </IonCard>
              </IonCol>
              <IonCol size="6" size-md="3">
                <IonCard 
                  className="action-card" 
                  onClick={() => history.push(`/admin/exams?classId=${id}`)}
                >
                  <IonCardContent>
                    <IonIcon icon={calendarOutline} color="danger" />
                    <span>Exams</span>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>

          {/* Report Cards Section */}
          <div className="section-header">
            <div className="section-title-row">
              <IonIcon icon={documentOutline} />
              <h3>Report Cards</h3>
            </div>
            <div className="section-header-actions">
              {pendingCount > 0 && (
                <IonButton 
                  fill="clear" 
                  size="small"
                  color="primary"
                  onClick={() => setShowSendAllAlert(true)}
                  className="send-all-btn"
                >
                  <IonIcon icon={sendOutline} /> Send All ({pendingCount})
                </IonButton>
              )}
              <IonButton 
                fill="clear" 
                size="small"
                onClick={() => history.push(`/admin/report-cards?classId=${id}`)}
              >
                View All <IonIcon icon={chevronForwardOutline} />
              </IonButton>
            </div>
          </div>

          {reportCards.length === 0 ? (
            <IonCard className="empty-card">
              <IonCardContent className="ion-text-center">
                <IonIcon icon={documentOutline} className="empty-icon" />
                <h4>No Report Cards Yet</h4>
                <p>Upload report cards for students in this class</p>
                <IonButton 
                  size="small"
                  onClick={() => history.push(`/admin/report-cards?classId=${id}`)}
                >
                  <IonIcon icon={addCircleOutline} /> Add Report Card
                </IonButton>
              </IonCardContent>
            </IonCard>
          ) : (
            <div className="report-cards-summary">
              <div className="summary-cards-row">
                <IonCard className="summary-card published">
                  <IonCardContent>
                    <div className="summary-number">{publishedCount}</div>
                    <div className="summary-label">Sent</div>
                  </IonCardContent>
                </IonCard>
                <IonCard className="summary-card pending">
                  <IonCardContent>
                    <div className="summary-number">{pendingCount}</div>
                    <div className="summary-label">Pending</div>
                  </IonCardContent>
                </IonCard>
              </div>

              {/* Recent Report Cards */}
              <div className="recent-cards-title">Recent Report Cards</div>
              {reportCards.slice(0, 5).map((card) => (
                <IonCard key={card._id} className="report-card-item">
                  <IonCardContent>
                    <div className="card-row">
                      <div 
                        className="card-info clickable" 
                        onClick={() => {
                          const fileUrl = card.reportCardFileUrl || card.pdfReportUrl;
                          if (fileUrl) {
                            window.open(fileUrl, '_blank');
                          } else {
                            setToast({ show: true, message: 'No file attached to this report card', color: 'warning' });
                          }
                        }}
                      >
                        <span className="student-name">{getStudentName(card.student)}</span>
                        <span className="card-term">{card.term} {card.academicYear}</span>
                      </div>
                      <div className="card-actions">
                        {card.isPublished ? (
                          <IonBadge color="success">Sent</IonBadge>
                        ) : (
                          <div className="pending-actions">
                            <IonBadge color="warning">Pending</IonBadge>
                            <IonButton
                              size="small"
                              fill="clear"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCardToSend(card._id);
                                setShowSendAlert(true);
                              }}
                            >
                              <IonIcon icon={sendOutline} />
                            </IonButton>
                          </div>
                        )}
                      </div>
                    </div>
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          )}

          {/* Students Section */}
          <div className="section-header">
            <div className="section-title-row">
              <IonIcon icon={peopleOutline} />
              <h3>Students</h3>
            </div>
            <IonButton 
              fill="clear" 
              size="small"
              onClick={() => history.push(`/admin/students?classId=${id}`)}
            >
              View All <IonIcon icon={chevronForwardOutline} />
            </IonButton>
          </div>

          {students.length === 0 ? (
            <IonCard className="empty-card">
              <IonCardContent className="ion-text-center">
                <IonIcon icon={peopleOutline} className="empty-icon" />
                <h4>No Students Yet</h4>
                <p>Add students to this class</p>
                <IonButton 
                  size="small"
                  onClick={() => history.push(`/admin/students/create?classId=${id}`)}
                >
                  <IonIcon icon={addCircleOutline} /> Add Student
                </IonButton>
              </IonCardContent>
            </IonCard>
          ) : (
            <div className="students-grid">
              {students.slice(0, 6).map((student) => (
                <IonChip key={student._id || student.id} className="student-chip">
                  <IonIcon icon={peopleOutline} />
                  <span>{student.name}</span>
                </IonChip>
              ))}
              {students.length > 6 && (
                <IonChip className="student-chip more-chip">
                  <span>+{students.length - 6} more</span>
                </IonChip>
              )}
            </div>
          )}
        </div>

        {/* Floating Action Button for adding report card */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => history.push(`/admin/report-cards?classId=${id}`)}>
            <IonIcon icon={documentOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>

      {/* Toast Notifications */}
      <IonToast
        isOpen={toast.show}
        onDidDismiss={() => setToast({ ...toast, show: false })}
        message={toast.message}
        duration={3000}
        color={toast.color}
        position="top"
      />

      {/* Send Confirmation Alert */}
      <IonAlert
        isOpen={showSendAlert}
        onDidDismiss={() => {
          setShowSendAlert(false);
          setCardToSend(null);
        }}
        header="Send Report Card"
        message="Are you sure you want to send this report card to the student? The student will be able to view it immediately."
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          { text: 'Send', handler: handleSend }
        ]}
      />

      {/* Send All Confirmation Alert */}
      <IonAlert
        isOpen={showSendAllAlert}
        onDidDismiss={() => setShowSendAllAlert(false)}
        header="Send All Report Cards"
        message={`Are you sure you want to send ${pendingCount} pending report card(s) to all students in this class? All students will be able to view their report cards immediately.`}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          { text: 'Send All', handler: handleSendAll }
        ]}
      />

      {/* Upload Report Card Modal */}
      <IonModal 
        isOpen={showUploadModal} 
        onDidDismiss={() => { setShowUploadModal(false); resetUploadForm(); }}
        className="upload-report-card-modal"
      >
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => { setShowUploadModal(false); resetUploadForm(); }}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
            <IonTitle>Send Report Card</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="upload-form-container">
            <h4>Upload Report Card for Student</h4>
            <p className="form-description">Select a student and upload their report card (image or PDF).</p>

            {/* Student Selection */}
            <IonItem>
              <IonLabel position="stacked">Student *</IonLabel>
              <IonSelect
                value={uploadForm.studentId}
                placeholder="Select Student"
                onIonChange={(e) => handleUploadChange('studentId', e.detail.value)}
                interface="action-sheet"
              >
                {classStudents.length === 0 ? (
                  <IonSelectOption value="" disabled>No students available</IonSelectOption>
                ) : (
                  classStudents.map(student => (
                    <IonSelectOption 
                      key={student._id || student.id} 
                      value={student._id || student.id}
                    >
                      {student.name} {student.rollNumber || student.roll_number ? `- Roll ${student.rollNumber || student.roll_number}` : ''}
                    </IonSelectOption>
                  ))
                )}
              </IonSelect>
            </IonItem>

            {/* Term Selection */}
            <IonItem>
              <IonLabel position="stacked">Term *</IonLabel>
              <IonSelect
                value={uploadForm.term}
                placeholder="Select Term"
                onIonChange={(e) => handleUploadChange('term', e.detail.value)}
                interface="action-sheet"
              >
                {terms.map(term => (
                  <IonSelectOption key={term} value={term}>{term}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {/* Academic Year Selection */}
            <IonItem>
              <IonLabel position="stacked">Academic Year *</IonLabel>
              <IonSelect
                value={uploadForm.academicYear}
                placeholder="Select Year"
                onIonChange={(e) => handleUploadChange('academicYear', e.detail.value)}
                interface="action-sheet"
              >
                {academicYears.map(year => (
                  <IonSelectOption key={year} value={year}>{year}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {/* File Upload */}
            <IonItem>
              <IonLabel position="stacked">Report Card File (Image/PDF) *</IonLabel>
              <input 
                type="file" 
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="file-input-custom"
              />
            </IonItem>

            {/* Teacher Remarks */}
            <IonItem>
              <IonLabel position="stacked">Teacher Remarks</IonLabel>
              <IonTextarea
                value={uploadForm.teacherRemarks}
                onIonChange={(e) => handleUploadChange('teacherRemarks', e.detail.value)}
                rows={3}
                placeholder="Optional comments about student performance"
              />
            </IonItem>

            {/* Principal Remarks */}
            <IonItem>
              <IonLabel position="stacked">Principal Remarks</IonLabel>
              <IonTextarea
                value={uploadForm.principalRemarks}
                onIonChange={(e) => handleUploadChange('principalRemarks', e.detail.value)}
                rows={3}
                placeholder="Optional comments from principal"
              />
            </IonItem>

            {/* Upload Button */}
            <IonButton expand="block" onClick={handleUpload} className="upload-submit-btn">
              <IonIcon icon={uploadOutline} /> Upload & Send Report Card
            </IonButton>
          </div>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default ClassDetailScreen;
