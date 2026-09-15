/**
 * Admin Report Cards Screen
 * Full report cards management with class selection, individual upload, 
 * bulk upload, edit, delete, and publish functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonModal,
  IonAlert,
  IonSpinner,
  IonChip,
  IonLabel,
  IonBadge,
  IonFab,
  IonFabButton,
  IonToast,
  IonGrid,
  IonRow,
  IonCol,
  IonThumbnail,
  IonImg,
  IonDatetime,
  useIonLoading,
} from '@ionic/react';
import {
  documentOutline,
  cloudUploadOutline,
  addCircleOutline,
  createOutline,
  trashOutline,
  sendOutline,
  downloadOutline,
  eyeOutline,
  searchOutline,
  schoolOutline,
  calendarOutline,
  calendarNumberOutline,
  statsChartOutline,
  ribbonOutline,
  personOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  informationCircleOutline,
  peopleOutline,
} from 'ionicons/icons';
import { adminAPI, classControllerAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './ReportCardsScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const ReportCardsScreen = () => {
  const { isClass, currentClass } = useAuth();
  const classAccountId = currentClass?.id || currentClass?._id || '';

  // State management
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [term, setTerm] = useState('');
  // Set default academic year to current year (e.g., "2025-2026")
  const currentYear = new Date().getFullYear();
  const defaultAcademicYear = `${currentYear}-${currentYear + 1}`;
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear);
  const [reportCards, setReportCards] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportCard, setSelectedReportCard] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showPublishAlert, setShowPublishAlert] = useState(false);
  const [selectedReportCards, setSelectedReportCards] = useState([]);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploadResult, setBulkUploadResult] = useState(null);
  const [presentLoading, dismissLoading] = useIonLoading();
  const [toast, setToast] = useState({ show: false, message: '', color: 'success' });
  const fileInputRef = useRef(null);
  const bulkFileInputRef = useRef(null);

  // Form state for individual marks entry
  const [uploadForm, setUploadForm] = useState({
    studentId: '',
    studentName: '',
    teacherRemarks: '',
    principalRemarks: '',
    subjects: [{ subjectName: '', marksObtained: '', totalMarks: 100 }],
  });

  // Form state for edit
  const [editForm, setEditForm] = useState({
    teacherRemarks: '',
    principalRemarks: '',
    subjects: [],
  });

  // Academic year options
  const academicYearOptions = [];
  for (let i = currentYear - 2; i <= currentYear + 1; i++) {
    academicYearOptions.push(`${i}-${i + 1}`);
  }

  // Term options
  const termOptions = [
    'Term 1',
    'Term 2',
    'Term 3',
    'Half Yearly',
    'Annual',
    'Unit Test 1',
    'Unit Test 2',
    'Unit Test 3',
  ];

  // Fetch classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch students when class is selected
  useEffect(() => {
    if (selectedClassId) {
      fetchClassStudents();
    }
  }, [selectedClassId]);

  // Debounce search query to avoid too many API calls
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch report cards when filters change (including search)
  useEffect(() => {
    // If search query exists, fetch report cards even without class/term/year
    // Otherwise, require all filters to be selected
    if (debouncedSearchQuery) {
      fetchReportCards();
    } else if (selectedClassId && term && academicYear) {
      fetchReportCards();
    }
  }, [selectedClassId, term, academicYear, debouncedSearchQuery]);

  const fetchClasses = async () => {
    try {
      // Class accounts can only access their own class
      if (isClass) {
        setClasses([{
          id: classAccountId,
          _id: classAccountId,
          name: currentClass?.name || 'My Class',
          section: currentClass?.section || '',
        }]);
        if (classAccountId) setSelectedClassId(classAccountId);
        return;
      }
      const response = await adminAPI.getClasses();
      if (response.success && response.data) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      showToast('Failed to load classes', 'danger');
    }
  };

  const fetchClassStudents = async () => {
    if (!selectedClassId) return;
    
    try {
      // Class accounts fetch their own roster via the class-controller API
      if (isClass) {
        const classResponse = await classControllerAPI.getStudents('', 1, 1000, '');
        if (classResponse && classResponse.success && classResponse.data) {
          setClassStudents(classResponse.data.students || []);
        } else {
          setClassStudents([]);
        }
        return;
      }
      const response = await adminAPI.getStudents(1, 200, '', selectedClassId);
      if (response.success && response.data) {
        setClassStudents(response.data.students || response.data || []);
      } else {
        setClassStudents([]);
      }
    } catch (error) {
      console.error('Error fetching class students:', error);
      setClassStudents([]);
    }
  };

  const fetchReportCards = async () => {
    // Allow fetch if search query exists OR all filters are selected
    if (!debouncedSearchQuery && (!selectedClassId || !term || !academicYear)) return;
    
    setLoading(true);
    try {
      const response = await adminAPI.getReportCards({
        classId: selectedClassId || undefined,
        term: term || undefined,
        academicYear: academicYear || undefined,
        search: debouncedSearchQuery || undefined,  // Send debounced search query to backend
        limit: 100,
      });
      if (response.success) {
        setReportCards(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching report cards:', error);
      showToast('Failed to load report cards', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, color = 'success') => {
    setToast({ show: true, message, color });
  };

  // Handle individual file upload
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const isImage = file.type.startsWith('image/');
      const preview = isImage ? URL.createObjectURL(file) : null;
      setUploadForm({
        ...uploadForm,
        file,
        filePreview: preview,
      });
    }
  };

  const handleStudentSelect = (studentId) => {
    // First check if student already has a report card (to pre-fill remarks and subjects)
    const existingReportCard = reportCards.find(rc => rc.student?._id === studentId || rc.student?.id === studentId);
    
    // Get student info from class students list
    const student = classStudents.find(s => s._id === studentId || s.id === studentId);
    
    if (student) {
      if (existingReportCard && existingReportCard.subjects && existingReportCard.subjects.length > 0) {
        // Pre-fill with existing subjects
        setUploadForm({
          studentId,
          studentName: student.name || '',
          teacherRemarks: existingReportCard.teacherRemarks || '',
          principalRemarks: existingReportCard.principalRemarks || '',
          subjects: existingReportCard.subjects.map(s => ({
            subjectName: s.subjectName,
            marksObtained: s.marksObtained,
            totalMarks: s.totalMarks,
          })),
        });
      } else {
        setUploadForm({
          studentId,
          studentName: student.name || '',
          teacherRemarks: existingReportCard?.teacherRemarks || '',
          principalRemarks: existingReportCard?.principalRemarks || '',
          subjects: [{ subjectName: '', marksObtained: '', totalMarks: 100 }],
        });
      }
    } else {
      setUploadForm({
        ...uploadForm,
        studentId,
        studentName: '',
      });
    }
  };

  // Add subject row
  const addSubject = () => {
    setUploadForm({
      ...uploadForm,
      subjects: [...uploadForm.subjects, { subjectName: '', marksObtained: '', totalMarks: 100 }],
    });
  };

  // Remove subject row
  const removeSubject = (index) => {
    const newSubjects = [...uploadForm.subjects];
    newSubjects.splice(index, 1);
    setUploadForm({ ...uploadForm, subjects: newSubjects });
  };

  // Update subject field
  const updateSubject = (index, field, value) => {
    const newSubjects = [...uploadForm.subjects];
    newSubjects[index] = { ...newSubjects[index], [field]: value };
    setUploadForm({ ...uploadForm, subjects: newSubjects });
  };

  const handleUpload = async () => {
    // Validate student
    if (!uploadForm.studentId) {
      showToast('Please select a student', 'danger');
      return;
    }

    // Validate subjects
    const validSubjects = uploadForm.subjects.filter(s => s.subjectName && s.marksObtained !== '' && s.totalMarks);
    if (validSubjects.length === 0) {
      showToast('Please add at least one subject with marks', 'danger');
      return;
    }

    // Validate marks
    for (const subject of validSubjects) {
      if (parseFloat(subject.marksObtained) > parseFloat(subject.totalMarks)) {
        showToast(`Marks obtained cannot exceed max marks for ${subject.subjectName}`, 'danger');
        return;
      }
      if (parseFloat(subject.marksObtained) < 0) {
        showToast(`Marks cannot be negative for ${subject.subjectName}`, 'danger');
        return;
      }
    }

    await presentLoading();
    try {
      // Prepare subjects data
      const subjects = validSubjects.map(s => ({
        subjectName: s.subjectName,
        marksObtained: parseFloat(s.marksObtained),
        totalMarks: parseFloat(s.totalMarks),
      }));

      const payload = {
        studentId: uploadForm.studentId,
        classId: selectedClassId,  // Send the selected class ID
        term,
        academicYear,
        subjects,
        teacherRemarks: uploadForm.teacherRemarks,
        principalRemarks: uploadForm.principalRemarks,
      };

      const response = await adminAPI.createReportCard(payload);
      
      if (response.success) {
        showToast('Report card created successfully', 'success');
        resetUploadForm();
        setShowUploadModal(false);
        fetchReportCards();
      } else {
        showToast(response.error?.message || 'Failed to create report card', 'danger');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error?.response?.data?.error?.message || error?.message || 'Failed to create report card', 'danger');
    } finally {
      await dismissLoading();
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      studentId: '',
      studentName: '',
      teacherRemarks: '',
      principalRemarks: '',
      subjects: [{ subjectName: '', marksObtained: '', totalMarks: 100 }],
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle bulk upload
  const handleBulkFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBulkUploadFile(file);
      setBulkUploadResult(null);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkUploadFile || !term || !academicYear || !selectedClassId) {
      showToast('Please select class, term, academic year and Excel file', 'danger');
      return;
    }

    await presentLoading();
    try {
      const formData = new FormData();
      formData.append('classId', selectedClassId);
      formData.append('term', term);
      formData.append('academicYear', academicYear);
      formData.append('excelFile', bulkUploadFile);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/reportcards/bulk-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setBulkUploadResult(data.data);
        showToast(`Processed ${data.data.totalRows} rows`, 'success');
        fetchReportCards();
      } else {
        showToast(data.error?.message || 'Bulk upload failed', 'danger');
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      showToast('Bulk upload failed', 'danger');
    } finally {
      await dismissLoading();
    }
  };

  const resetBulkUpload = () => {
    setBulkUploadFile(null);
    setBulkUploadResult(null);
    if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
    setShowBulkUploadModal(false);
  };

  // Handle publish
  const handlePublish = async (id) => {
    await presentLoading();
    try {
      const response = await adminAPI.publishReportCard(id);
      if (response.success) {
        showToast('Report card sent to student successfully', 'success');
        fetchReportCards();
      } else {
        showToast(response.error?.message || 'Failed to send', 'danger');
      }
    } catch (error) {
      console.error('Publish error:', error);
      showToast('Failed to send report card', 'danger');
    } finally {
      await dismissLoading();
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedReportCard) return;
    
    await presentLoading();
    try {
      const response = await adminAPI.deleteReportCard(selectedReportCard._id || selectedReportCard.id);
      if (response.success) {
        showToast('Report card deleted successfully', 'success');
        fetchReportCards();
      } else {
        showToast(response.error?.message || 'Failed to delete', 'danger');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete report card', 'danger');
    } finally {
      await dismissLoading();
      setShowDeleteAlert(false);
      setSelectedReportCard(null);
    }
  };

  // Add subject row in edit form
  const addEditSubject = () => {
    setEditForm({
      ...editForm,
      subjects: [...editForm.subjects, { subjectName: '', marksObtained: '', totalMarks: 100 }],
    });
  };

  // Remove subject row in edit form
  const removeEditSubject = (index) => {
    const newSubjects = [...editForm.subjects];
    newSubjects.splice(index, 1);
    setEditForm({ ...editForm, subjects: newSubjects });
  };

  // Update subject field in edit form
  const updateEditSubject = (index, field, value) => {
    const newSubjects = [...editForm.subjects];
    newSubjects[index] = { ...newSubjects[index], [field]: value };
    setEditForm({ ...editForm, subjects: newSubjects });
  };

  // Handle edit save
  const handleEditSave = async () => {
    if (!selectedReportCard) return;
    
    // Validate subjects
    const validSubjects = editForm.subjects.filter(s => s.subjectName && s.marksObtained !== '' && s.totalMarks);
    if (validSubjects.length === 0) {
      showToast('Please add at least one subject with marks', 'danger');
      return;
    }

    // Validate marks
    for (const subject of validSubjects) {
      if (parseFloat(subject.marksObtained) > parseFloat(subject.totalMarks)) {
        showToast(`Marks obtained cannot exceed max marks for ${subject.subjectName}`, 'danger');
        return;
      }
      if (parseFloat(subject.marksObtained) < 0) {
        showToast(`Marks cannot be negative for ${subject.subjectName}`, 'danger');
        return;
      }
    }
    
    await presentLoading();
    try {
      const subjects = validSubjects.map(s => ({
        subjectName: s.subjectName,
        marksObtained: parseFloat(s.marksObtained),
        totalMarks: parseFloat(s.totalMarks),
      }));

      const payload = {
        subjects,
        teacherRemarks: editForm.teacherRemarks,
        principalRemarks: editForm.principalRemarks,
      };

      const response = await adminAPI.updateReportCard(selectedReportCard._id || selectedReportCard.id, payload);
      if (response.success) {
        showToast('Report card updated successfully', 'success');
        fetchReportCards();
        setShowEditModal(false);
      } else {
        showToast(response.error?.message || 'Failed to update', 'danger');
      }
    } catch (error) {
      console.error('Update error:', error);
      showToast('Failed to update report card', 'danger');
    } finally {
      await dismissLoading();
    }
  };

  const openEditModal = (reportCard) => {
    setSelectedReportCard(reportCard);
    setEditForm({
      teacherRemarks: reportCard.teacherRemarks || '',
      principalRemarks: reportCard.principalRemarks || '',
      subjects: reportCard.subjects ? reportCard.subjects.map(s => ({
        subjectName: s.subjectName,
        marksObtained: s.marksObtained,
        totalMarks: s.totalMarks,
      })) : [],
    });
    setShowEditModal(true);
  };

  const openDeleteAlert = (reportCard) => {
    setSelectedReportCard(reportCard);
    setShowDeleteAlert(true);
  };

  const openPublishAlert = (reportCard) => {
    setSelectedReportCard(reportCard);
    setShowPublishAlert(true);
  };

  // Filter report cards by search query
  const filteredReportCards = reportCards.filter(rc => {
    const studentName = rc.student?.name?.toLowerCase() || '';
    const searchLower = searchQuery.toLowerCase();
    return studentName.includes(searchLower);
  });

  // Get unpublished count
  const unpublishedCount = reportCards.filter(rc => !rc.isPublished).length;
  const publishedCount = reportCards.filter(rc => rc.isPublished).length;

  // Selected class display name
  const selectedClassName = classes.find(c => (c.id || c._id) === selectedClassId)?.name || '';
  const selectedClassSection = classes.find(c => (c.id || c._id) === selectedClassId)?.section || '';
  const selectedClassLabel =
    (selectedClassName ? `Class ${selectedClassName}` : 'Select a class') +
    (selectedClassName && selectedClassSection ? ` - ${selectedClassSection}` : '');

  const publishPercent = reportCards.length > 0 ? Math.round((publishedCount / reportCards.length) * 100) : 0;

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="report-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref={isClass ? '/class-controller/dashboard' : '/admin/dashboard'} color="dark" />
          </IonButtons>
          <IonTitle>
            <div className="report-toolbar-title">
              <IonIcon icon={statsChartOutline} className="report-toolbar-icon" />
              <span>Report Card Management</span>
            </div>
          </IonTitle>
          <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="report-cards-content" fullscreen>
        {/* Hero Summary */}
        <div className="report-hero">
          <div className="report-hero-glow"></div>
          <div className="report-hero-top">
            <div className="report-hero-badge">
              <IonIcon icon={ribbonOutline} />
              <span>{isClass ? 'Class In-Charge Portal' : 'School Admin Portal'}</span>
            </div>
            {(selectedClassId && term && academicYear) && (
              <div className="report-hero-code">
                <IonIcon icon={schoolOutline} />
                <span>{selectedClassLabel}</span>
              </div>
            )}
          </div>
          <div className="report-hero-main">
            <h1 className="report-hero-title">Report Cards</h1>
            <p className="report-hero-subtitle">Create, manage and send academic report cards to students.</p>
            <div className="report-hero-meta">
              {term && <span><IonIcon icon={calendarOutline} /> {term}</span>}
              {academicYear && <span><IonIcon icon={calendarNumberOutline} /> {academicYear}</span>}
              {reportCards.length > 0 && <span><IonIcon icon={peopleOutline} /> {reportCards.length} record{reportCards.length !== 1 ? 's' : ''}</span>}
            </div>
          </div>
          <div className="report-hero-percent">
            <div className="percent-circle" style={{ '--p': `${publishPercent * 3.6}deg` }}>
              <span>{publishPercent}%</span>
            </div>
            <p>Published</p>
          </div>
        </div>

        {/* Filter Section */}
        <div className="filter-section">
          <div className="filter-header">
            <h4>
              <IonIcon icon={searchOutline} /> Filter Report Cards
            </h4>
            <p className="filter-hint">
              Select a class, term, and academic year to view report cards. Academic year is pre-selected to current year.
            </p>
          </div>
          <IonCard className="filter-card">
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol size="12" size-md="3">
                    <label className="filter-label">
                      Class <span className="required">*</span>
                    </label>
                    <IonSelect
                      value={selectedClassId}
                      onIonChange={(e) => setSelectedClassId(e.detail.value)}
                      placeholder="Select Class"
                      interface="popover"
                      className={!selectedClassId ? 'filter-required' : ''}
                      disabled={isClass}
                    >
                      {classes.map((cls) => (
                        <IonSelectOption key={cls._id} value={cls._id}>
                          Class {cls.name} {cls.section ? `(${cls.section})` : ''}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonCol>
                  <IonCol size="12" size-md="3">
                    <label className="filter-label">
                      Term <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="editable-filter-input"
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      placeholder="Type or select a term"
                      list="term-options-list"
                    />
                    <datalist id="term-options-list">
                      {termOptions.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </IonCol>
                  <IonCol size="12" size-md="3">
                    <label className="filter-label">
                      Academic Year <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="editable-filter-input"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="Type or select a year (e.g., 2025-2026)"
                      list="academic-year-options-list"
                    />
                    <datalist id="academic-year-options-list">
                      {academicYearOptions.map((y) => (
                        <option key={y} value={y} />
                      ))}
                    </datalist>
                  </IonCol>
                  <IonCol size="12" size-md="3" className="search-col">
                    <label className="filter-label">Search Student</label>
                    <div className="search-box">
                      <IonIcon icon={searchOutline} />
                      <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </IonCol>
                </IonRow>
                {/* Status indicator */}
                <IonRow className="filter-status-row">
                  <IonCol>
                    <div className={`filter-status ${selectedClassId && term && academicYear ? 'ready' : 'pending'}`}>
                      <IonIcon icon={selectedClassId && term && academicYear ? checkmarkCircleOutline : informationCircleOutline} />
                      <span>
                        {selectedClassId && term && academicYear
                          ? `Showing report cards for Class ${classes.find(c => c.id === selectedClassId)?.name || ''} | ${term} | ${academicYear}`
                          : 'Please select all filters above to view report cards'}
                      </span>
                    </div>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>
        </div>

        {/* Action Buttons */}
        <div className="action-bar">
          <IonButton color="primary" onClick={() => setShowUploadModal(true)} disabled={!selectedClassId || !term || !academicYear}>
            <IonIcon icon={addCircleOutline} slot="start" />
            Upload Report Card
          </IonButton>
          <IonButton color="secondary" onClick={() => setShowBulkUploadModal(true)} disabled={!selectedClassId || !term || !academicYear}>
            <IonIcon icon={cloudUploadOutline} slot="start" />
            Bulk Upload
          </IonButton>
          {unpublishedCount > 0 && (
            <IonButton color="success" onClick={async () => {
              await presentLoading();
              try {
                const response = await adminAPI.publishAllReportCardsForClass(selectedClassId);
                if (response.success) {
                  showToast(response.message, 'success');
                  fetchReportCards();
                }
              } catch (error) {
                showToast('Failed to publish all', 'danger');
              } finally {
                await dismissLoading();
              }
            }} disabled={!selectedClassId || !term || !academicYear}>
            <IonIcon icon={sendOutline} slot="start" />
            Send All ({unpublishedCount})
          </IonButton>
          )}
        </div>

        {/* Stats Summary */}
        <div className="stats-row">
          <div className="metric-card metric-total">
            <div className="metric-icon"><IonIcon icon={documentOutline} /></div>
            <div className="metric-info">
              <div className="stat-value">{reportCards.length}</div>
              <div className="stat-label">Total Report Cards</div>
            </div>
          </div>
          <div className="metric-card metric-sent">
            <div className="metric-icon"><IonIcon icon={sendOutline} /></div>
            <div className="metric-info">
              <div className="stat-value">{publishedCount}</div>
              <div className="stat-label">Sent to Students</div>
            </div>
          </div>
          <div className="metric-card metric-pending">
            <div className="metric-icon"><IonIcon icon={cloudUploadOutline} /></div>
            <div className="metric-info">
              <div className="stat-value">{unpublishedCount}</div>
              <div className="stat-label">Pending Review</div>
            </div>
          </div>
          <div className="metric-card metric-percent">
            <div className="metric-icon"><IonIcon icon={statsChartOutline} /></div>
            <div className="metric-info">
              <div className="stat-value">{publishPercent}%</div>
              <div className="stat-label">Published Rate</div>
            </div>
          </div>
        </div>

        {/* Report Cards List */}
        {loading ? (
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading report cards...</p>
          </div>
        ) : filteredReportCards.length === 0 ? (
          <div className="empty-state">
            <IonIcon icon={documentOutline} />
            <h3>No Report Cards Found</h3>
            <p>
              {!selectedClassId || !term || !academicYear
                ? 'Please select a class, term, and academic year above to view report cards.'
                : 'No report cards found for this combination. Click "Upload Report Card" to add one.'}
            </p>
            {!selectedClassId && (
              <IonButton color="primary" onClick={() => document.querySelector('.filter-card')?.scrollIntoView({ behavior: 'smooth' })}>
                <IonIcon icon={schoolOutline} slot="start" />
                Select a Class
              </IonButton>
            )}
            {!term && selectedClassId && (
              <IonButton color="primary" onClick={() => document.querySelector('.filter-card')?.scrollIntoView({ behavior: 'smooth' })}>
                <IonIcon icon={calendarOutline} slot="start" />
                Select a Term
              </IonButton>
            )}
          </div>
        ) : (
          <div className="report-cards-grid">
            {filteredReportCards.map((reportCard) => (
              <IonCard key={reportCard._id || reportCard.id} className="report-card-item">
                <IonCardContent>
                  <div className="report-card-header">
                    <div className="student-info">
                      <IonThumbnail>
                        <div className="student-avatar">
                          {reportCard.student?.name?.charAt(0) || 'S'}
                        </div>
                      </IonThumbnail>
                      <div className="student-details">
                        <h4>{reportCard.student?.name || 'Unknown Student'}</h4>
                        <p>Roll: {reportCard.student?.rollNumber || 'N/A'}</p>
                      </div>
                    </div>
                    <IonBadge className={`status-badge ${reportCard.isPublished ? 'badge-sent' : 'badge-draft'}`} color={reportCard.isPublished ? 'success' : 'warning'}>
                      {reportCard.isPublished ? 'Sent' : 'Draft'}
                    </IonBadge>
                  </div>

                  {(reportCard.overallGrade || (reportCard.totalPercentage !== undefined && reportCard.totalPercentage > 0)) && (
                    <div className="score-strip">
                      {reportCard.overallGrade && reportCard.overallGrade !== 'N/A' && (
                        <div className="score-block">
                          <span className="score-value">{reportCard.overallGrade}</span>
                          <span className="score-label">Grade</span>
                        </div>
                      )}
                      {reportCard.totalPercentage !== undefined && reportCard.totalPercentage > 0 && (
                        <div className="score-block">
                          <span className="score-value">{reportCard.totalPercentage}%</span>
                          <span className="score-label">Percentage</span>
                        </div>
                      )}
                      <div className="score-block">
                        <span className="score-value">{reportCard.subjects?.length ?? 0}</span>
                        <span className="score-label">Subjects</span>
                      </div>
                    </div>
                  )}

                  {reportCard.reportCardFileUrl && (
                    <div className="file-preview">
                      {reportCard.reportCardFileType === 'image' ? (
                        <IonImg src={reportCard.reportCardFileUrl} alt="Report Card" />
                      ) : (
                        <div className="pdf-preview">
                          <IonIcon icon={documentOutline} size="large" />
                          <span>PDF Report Card</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="report-card-meta">
                    <span><IonIcon icon={calendarOutline} /> {reportCard.term}</span>
                    <span>{reportCard.academicYear}</span>
                  </div>

                  {reportCard.subjects && reportCard.subjects.length > 0 && (
                    <div className="subjects-summary">
                      <h5>Subject Results</h5>
                      <table className="subjects-table">
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th>Marks</th>
                            <th>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportCard.subjects.map((subject, idx) => (
                            <tr key={idx}>
                              <td>{subject.subjectName}</td>
                              <td>{subject.marksObtained}/{subject.totalMarks}</td>
                              <td><IonBadge className="grade-badge" color={subject.grade === 'E' ? 'danger' : 'success'}>{subject.grade || '—'}</IonBadge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {reportCard.teacherRemarks && (
                    <p className="remarks">
                      <strong>Teacher:</strong> {reportCard.teacherRemarks}
                    </p>
                  )}

                  <div className="report-card-actions">
                    {reportCard.reportCardFileUrl && (
                      <IonButton
                        size="small"
                        fill="outline"
                        onClick={() => window.open(reportCard.reportCardFileUrl, '_blank')}
                      >
                        <IonIcon icon={eyeOutline} slot="start" />
                        View
                      </IonButton>
                    )}
                    <IonButton
                      size="small"
                      fill="outline"
                      color="secondary"
                      onClick={() => openEditModal(reportCard)}
                    >
                      <IonIcon icon={createOutline} slot="start" />
                      Edit
                    </IonButton>
                    {!reportCard.isPublished && (
                      <IonButton
                        size="small"
                        fill="outline"
                        color="success"
                        onClick={() => openPublishAlert(reportCard)}
                      >
                        <IonIcon icon={sendOutline} slot="start" />
                        Send
                      </IonButton>
                    )}
                    <IonButton
                      size="small"
                      fill="outline"
                      color="danger"
                      onClick={() => openDeleteAlert(reportCard)}
                    >
                      <IonIcon icon={trashOutline} slot="start" />
                      Delete
                    </IonButton>
                  </div>
                </IonCardContent>
              </IonCard>
            ))}
          </div>
        )}

        {/* Upload Modal - Manual Marks Entry */}
        <IonModal isOpen={showUploadModal} onDidDismiss={() => { setShowUploadModal(false); resetUploadForm(); }}>
          <div className="modal-content">
            <IonHeader>
              <IonToolbar>
                <IonTitle>Enter Report Card Marks</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => { setShowUploadModal(false); resetUploadForm(); }}>
                    <IonIcon icon={closeCircleOutline} />
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
              <div className="form-group">
                <label>Select Student</label>
                <IonSelect
                  value={uploadForm.studentId}
                  onIonChange={(e) => handleStudentSelect(e.detail.value)}
                  placeholder="Select Student"
                  disabled={classStudents.length === 0}
                >
                  {classStudents.map((student) => (
                    <IonSelectOption key={student._id || student.id} value={student._id || student.id}>
                      {student.name} {student.rollNumber ? `(Roll: ${student.rollNumber})` : ''}
                    </IonSelectOption>
                  ))}
                </IonSelect>
                {classStudents.length === 0 && selectedClassId && (
                  <p className="no-students-msg">No students found in this class.</p>
                )}
              </div>

              <div className="subjects-entry-section">
                <div className="section-header">
                  <h4>Subjects & Marks</h4>
                  <IonButton size="small" color="primary" onClick={addSubject}>
                    <IonIcon icon={addCircleOutline} slot="start" />
                    Add Subject
                  </IonButton>
                </div>

                {uploadForm.subjects.map((subject, index) => (
                  <div key={index} className="subject-row">
                    <div className="subject-input-group">
                      <IonInput
                        value={subject.subjectName}
                        onIonInput={(e) => updateSubject(index, 'subjectName', e.detail.value)}
                        placeholder="Subject Name (e.g., Mathematics)"
                        className="subject-name-input"
                      />
                      <IonInput
                        type="number"
                        value={subject.marksObtained}
                        onIonInput={(e) => updateSubject(index, 'marksObtained', e.detail.value)}
                        placeholder="Marks"
                        className="marks-input"
                      />
                      <span className="separator">/</span>
                      <IonInput
                        type="number"
                        value={subject.totalMarks}
                        onIonInput={(e) => updateSubject(index, 'totalMarks', e.detail.value)}
                        placeholder="Max"
                        className="max-marks-input"
                      />
                      {uploadForm.subjects.length > 1 && (
                        <IonButton
                          size="small"
                          color="danger"
                          fill="clear"
                          onClick={() => removeSubject(index)}
                        >
                          <IonIcon icon={trashOutline} />
                        </IonButton>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label>Teacher Remarks (Optional)</label>
                <IonInput
                  value={uploadForm.teacherRemarks}
                  onIonInput={(e) => setUploadForm({ ...uploadForm, teacherRemarks: e.detail.value })}
                  placeholder="Enter remarks..."
                />
              </div>

              <div className="form-group">
                <label>Principal Remarks (Optional)</label>
                <IonInput
                  value={uploadForm.principalRemarks}
                  onIonInput={(e) => setUploadForm({ ...uploadForm, principalRemarks: e.detail.value })}
                  placeholder="Enter remarks..."
                />
              </div>

              <IonButton 
                expand="block" 
                onClick={handleUpload} 
                disabled={!uploadForm.studentId || uploadForm.subjects.every(s => !s.subjectName || s.marksObtained === '')}
                color="success"
              >
                <IonIcon icon={checkmarkCircleOutline} slot="start" />
                Create Report Card
              </IonButton>
            </IonContent>
          </div>
        </IonModal>

        {/* Bulk Upload Modal */}
        <IonModal isOpen={showBulkUploadModal} onDidDismiss={resetBulkUpload}>
          <div className="modal-content">
            <IonHeader>
              <IonToolbar>
                <IonTitle>Bulk Upload Report Cards</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={resetBulkUpload}>
                    <IonIcon icon={closeCircleOutline} />
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
              <div className="bulk-upload-info">
                <IonIcon icon={informationCircleOutline} size="large" />
                <h4>Instructions</h4>
                <p>Upload an Excel file (.xlsx, .xls) with one of the following formats:</p>
                
                <div className="format-section">
                  <h5>Format 1: Marks Entry (Recommended)</h5>
                  <p>Create report cards with subjects and marks. Each row represents one subject for one student.</p>
                  <table className="format-table">
                    <thead>
                      <tr><th>Student Name</th><th>Roll Number</th><th>Subject</th><th>Max Marks</th><th>Marks Obtained</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>John Doe</td><td>001</td><td>Mathematics</td><td>100</td><td>85</td></tr>
                      <tr><td>John Doe</td><td>001</td><td>Science</td><td>100</td><td>78</td></tr>
                      <tr><td>Jane Smith</td><td>002</td><td>Mathematics</td><td>100</td><td>92</td></tr>
                    </tbody>
                  </table>
                  <p className="format-note">✓ Auto-calculates total percentage and grade (A1, A2, B1, etc.)</p>
                </div>

                <div className="format-section">
                  <h5>Format 2: File Upload (Legacy)</h5>
                  <p>Upload pre-made PDF/image report cards.</p>
                  <table className="format-table">
                    <thead>
                      <tr><th>Student Name</th><th>Roll Number</th><th>PDF Filename</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>John Doe</td><td>001</td><td>report_001.pdf</td></tr>
                      <tr><td>Jane Smith</td><td>002</td><td>report_002.pdf</td></tr>
                    </tbody>
                  </table>
                  <p className="format-note">Note: PDF/image files must be uploaded to <code>uploads/reportcards/</code> folder first.</p>
                </div>
              </div>

              <div className="form-group">
                <label>Upload Excel File</label>
                <div className="file-upload-area" onClick={() => bulkFileInputRef.current?.click()}>
                  <input
                    ref={bulkFileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleBulkFileSelect}
                    style={{ display: 'none' }}
                  />
                  <IonIcon icon={documentOutline} size="large" />
                  <p>{bulkUploadFile ? bulkUploadFile.name : 'Click to upload Excel file'}</p>
                </div>
              </div>

              {bulkUploadResult && (
                <div className="bulk-result">
                  <h4>Upload Results</h4>
                  <IonGrid>
                    <IonRow>
                      <IonCol>
                        <div className="result-stat success">
                          <IonIcon icon={checkmarkCircleOutline} />
                          Success: {bulkUploadResult.successCount}
                        </div>
                      </IonCol>
                      <IonCol>
                        <div className="result-stat failed">
                          <IonIcon icon={closeCircleOutline} />
                          Failed: {bulkUploadResult.failedCount}
                        </div>
                      </IonCol>
                      <IonCol>
                        <div className="result-stat not-found">
                          <IonIcon icon={informationCircleOutline} />
                          Not Found: {bulkUploadResult.notFoundCount}
                        </div>
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                </div>
              )}

              <IonButton expand="block" onClick={handleBulkUpload} disabled={!bulkUploadFile}>
                <IonIcon icon={cloudUploadOutline} slot="start" />
                Process Bulk Upload
              </IonButton>
            </IonContent>
          </div>
        </IonModal>

        {/* Edit Modal */}
        <IonModal isOpen={showEditModal} onDidDismiss={() => setShowEditModal(false)}>
          <div className="modal-content">
            <IonHeader>
              <IonToolbar>
                <IonTitle>Edit Report Card</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setShowEditModal(false)}>
                    <IonIcon icon={closeCircleOutline} />
                  </IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
              {selectedReportCard && (
                <>
                  <div className="student-info-card">
                    <h4>{selectedReportCard.student?.name}</h4>
                    <p>Roll: {selectedReportCard.student?.rollNumber}</p>
                    <p>
                      {selectedReportCard.term} - {selectedReportCard.academicYear}
                    </p>
                  </div>

                  <div className="subjects-entry-section">
                    <div className="section-header">
                      <h4>Subjects & Marks (Editable)</h4>
                      <IonButton size="small" color="primary" onClick={addEditSubject}>
                        <IonIcon icon={addCircleOutline} slot="start" />
                        Add Subject
                      </IonButton>
                    </div>

                    {editForm.subjects.map((subject, index) => (
                      <div key={index} className="subject-row">
                        <div className="subject-input-group">
                          <IonInput
                            value={subject.subjectName}
                            onIonInput={(e) => updateEditSubject(index, 'subjectName', e.detail.value)}
                            placeholder="Subject Name"
                            className="subject-name-input"
                          />
                          <IonInput
                            type="number"
                            value={subject.marksObtained}
                            onIonInput={(e) => updateEditSubject(index, 'marksObtained', e.detail.value)}
                            placeholder="Marks"
                            className="marks-input"
                          />
                          <span className="separator">/</span>
                          <IonInput
                            type="number"
                            value={subject.totalMarks}
                            onIonInput={(e) => updateEditSubject(index, 'totalMarks', e.detail.value)}
                            placeholder="Max"
                            className="max-marks-input"
                          />
                          {editForm.subjects.length > 1 && (
                            <IonButton
                              size="small"
                              color="danger"
                              fill="clear"
                              onClick={() => removeEditSubject(index)}
                            >
                              <IonIcon icon={trashOutline} />
                            </IonButton>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="form-group">
                    <label>Teacher Remarks</label>
                    <IonInput
                      value={editForm.teacherRemarks}
                      onIonInput={(e) => setEditForm({ ...editForm, teacherRemarks: e.detail.value })}
                      placeholder="Enter remarks..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Principal Remarks</label>
                    <IonInput
                      value={editForm.principalRemarks}
                      onIonInput={(e) => setEditForm({ ...editForm, principalRemarks: e.detail.value })}
                      placeholder="Enter remarks..."
                    />
                  </div>

                  <IonButton expand="block" onClick={handleEditSave} color="success">
                    <IonIcon icon={checkmarkCircleOutline} slot="start" />
                    Save Changes
                  </IonButton>
                </>
              )}
            </IonContent>
          </div>
        </IonModal>

        {/* Delete Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Report Card"
          message="Are you sure you want to delete this report card? This action cannot be undone."
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: handleDelete,
            },
          ]}
        />

        {/* Publish Alert */}
        <IonAlert
          isOpen={showPublishAlert}
          onDidDismiss={() => setShowPublishAlert(false)}
          header="Send Report Card"
          message="Send this report card to the student? They will be able to view it in their portal."
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Send',
              handler: () => {
                handlePublish(selectedReportCard._id || selectedReportCard.id);
              },
            },
          ]}
        />

        {/* Toast */}
        <IonToast
          isOpen={toast.show}
          onDidDismiss={() => setToast({ ...toast, show: false })}
          message={toast.message}
          duration={3000}
          color={toast.color}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default ReportCardsScreen;