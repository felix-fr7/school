/**
 * Student Report Card Search Screen
 * Allows admin to:
 * 1. Search by student name or roll number to find ALL report cards for that student (no filters needed)
 * 2. Select a class, term, and academic year to see all report cards matching those criteria
 * 
 * IMPORTANT: These are TWO SEPARATE search modes:
 * - Mode 1 (Student Search): Only enter name/roll number -> shows ALL report cards for that student
 * - Mode 2 (Class Filter): Select class + term + year -> shows report cards matching ALL three criteria
 */

import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonCard,
  IonCardContent,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonChip,
  IonLabel,
  IonToast,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react';
import {
  searchOutline,
  personOutline,
  documentOutline,
  calendarOutline,
  eyeOutline,
  closeCircleOutline,
  informationCircleOutline,
  schoolOutline,
  peopleOutline,
  bookOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import './StudentReportCardSearchScreen.css';

const StudentReportCardSearchScreen = () => {
  // Search mode: 'student' = search by name/roll, 'class' = filter by class/term/year
  const [searchMode, setSearchMode] = useState('student');
  
  // Class selection state (for class filter mode)
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  
  // Student search state (for student search mode)
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [classLoaded, setClassLoaded] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', color: 'success' });

  // Load classes on mount
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const response = await adminAPI.getClasses();
        if (response.success) {
          setClasses(response.data || []);
          setClassLoaded(true);
        }
      } catch (err) {
        console.error('Error loading classes:', err);
      }
    };
    loadClasses();
  }, []);

  // Load available years when class is selected (for class filter mode)
  useEffect(() => {
    if (selectedClass && searchMode === 'class') {
      const loadYears = async () => {
        try {
          const response = await adminAPI.getReportCards({
            classId: selectedClass
          });
          
          if (response.success && response.data) {
            const years = [...new Set(response.data.map(rc => rc.academicYear))].sort().reverse();
            setAvailableYears(years);
            
            // Auto-select latest year
            if (years.length > 0 && !selectedYear) {
              setSelectedYear(years[0]);
            }
          }
        } catch (err) {
          console.error('Error loading years:', err);
        }
      };
      loadYears();
    }
  }, [selectedClass, searchMode]);

  // Handle student search (by name or roll number)
  const handleStudentSearch = async () => {
    // Validate - at least name or roll number is required
    if (!studentName && !rollNumber) {
      setError('Please enter student name or roll number');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setSearched(true);

    try {
      // Use the dedicated endpoint for searching by student name/roll number
      // This returns ALL report cards for the matching student across all classes, terms, and years
      const response = await adminAPI.getReportCardsByStudent(studentName, rollNumber);

      if (response.success) {
        const data = response.data;
        setResult({
          reportCards: data.reportCards || [],
          count: data.reportCards ? data.reportCards.length : 0,
          student: data.student,
          searchType: 'student',
          searchQuery: studentName || rollNumber
        });
      }
    } catch (err) {
      console.error('Student search error:', err);
      const errorMessage = err?.response?.data?.error?.message || 'Failed to search report cards';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle class/term/year filter search
  const handleClassFilterSearch = async () => {
    // Validate - class, term, and year are ALL required
    if (!selectedClass) {
      setError('Please select a class');
      return;
    }
    
    if (!selectedTerm) {
      setError('Please select a term');
      return;
    }
    
    if (!selectedYear) {
      setError('Please select an academic year');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setSearched(true);

    try {
      // Get report cards for the selected class, term, AND year (ALL must match)
      const response = await adminAPI.getReportCards({
        classId: selectedClass,
        term: selectedTerm,
        academicYear: selectedYear
      });

      if (response.success) {
        const reportCards = response.data || [];
        
        setResult({
          reportCards: reportCards,
          count: reportCards.length,
          searchType: 'class',
          className: reportCards[0]?.student?.class?.name || 
                     classes.find(c => c._id === selectedClass)?.name
        });
      }
    } catch (err) {
      console.error('Class filter search error:', err);
      const errorMessage = err?.response?.data?.error?.message || 'Failed to search report cards';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setStudentName('');
    setRollNumber('');
    setSelectedClass('');
    setSelectedTerm('');
    setSelectedYear('');
    setResult(null);
    setSearched(false);
    setError('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleModeChange = (mode) => {
    setSearchMode(mode);
    handleClear();
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin" />
          </IonButtons>
          <IonTitle>Student Report Card Search</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="student-search-content" fullscreen>
        {/* Search Section */}
        <div className="search-section">
          <div className="search-header">
            <IonIcon icon={searchOutline} size="large" />
            <h2>Find Student Report Cards</h2>
            <p>Search by student name/roll number OR filter by class/term/year</p>
          </div>

          {/* Search Mode Selector */}
          <IonCard className="mode-selector-card">
            <IonCardContent>
              <IonSegment value={searchMode} onIonChange={(e) => handleModeChange(e.detail.value)}>
                <IonSegmentButton value="student">
                  <IonIcon icon={personOutline} />
                  <IonLabel>Search by Student</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="class">
                  <IonIcon icon={bookOutline} />
                  <IonLabel>Filter by Class</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </IonCardContent>
          </IonCard>

          {/* Student Search Mode */}
          {searchMode === 'student' && (
            <IonCard className="search-card">
              <IonCardContent>
                <div className="step-indicator">
                  <span className="step-number">1</span>
                  <span className="step-title">
                    <IonIcon icon={personOutline} size="small" />
                    Search by Student Name or Roll Number
                  </span>
                </div>
                <IonGrid>
                  <IonRow>
                    <IonCol size="12" size-md="6">
                      <div className="input-group">
                        <label>
                          <IonIcon icon={personOutline} size="small" />
                          Student Name
                        </label>
                        <IonInput
                          value={studentName}
                          onIonInput={(e) => setStudentName(e.detail.value)}
                          placeholder="Enter student name (e.g., John)"
                          clearInput
                        />
                      </div>
                    </IonCol>
                    <IonCol size="12" size-md="6">
                      <div className="input-group">
                        <label>
                          <IonIcon icon={documentOutline} size="small" />
                          Roll Number
                        </label>
                        <IonInput
                          value={rollNumber}
                          onIonInput={(e) => setRollNumber(e.detail.value)}
                          placeholder="Enter roll number (e.g., 001)"
                          clearInput
                          type="text"
                        />
                      </div>
                    </IonCol>
                  </IonRow>
                  <IonRow>
                    <IonCol size="12" size-md="4" offset-md="8">
                      <IonButton 
                        expand="block" 
                        color="primary" 
                        onClick={handleStudentSearch}
                        disabled={loading || (!studentName && !rollNumber)}
                      >
                        {loading ? <IonSpinner name="crescent" size="small" /> : <IonIcon icon={searchOutline} />}
                        Search
                      </IonButton>
                    </IonCol>
                  </IonRow>
                  <IonRow>
                    <IonCol>
                      <div className="search-hint">
                        <IonIcon icon={informationCircleOutline} size="small" />
                        <span>Enter name or roll number to find ALL report cards for that student across all classes, terms, and years.</span>
                      </div>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>
          )}

          {/* Class Filter Mode */}
          {searchMode === 'class' && (
            <>
              {/* Step 1: Class Selection */}
              <IonCard className="search-card">
                <IonCardContent>
                  <div className="step-indicator">
                    <span className="step-number">1</span>
                    <span className="step-title">Select Class</span>
                  </div>
                  <IonGrid>
                    <IonRow>
                      <IonCol size="12" size-md="6">
                        <div className="input-group">
                          <label>
                            <IonIcon icon={peopleOutline} size="small" />
                            Class <span className="required">*</span>
                          </label>
                          <select 
                            className="custom-select"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                          >
                            <option value="">-- Select Class --</option>
                            {classes.map(cls => (
                              <option key={cls._id} value={cls._id}>
                                {cls.name} - {cls.section} ({cls.classCode})
                              </option>
                            ))}
                          </select>
                        </div>
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                </IonCardContent>
              </IonCard>

              {/* Step 2: Term and Year Selection (Required) */}
              <IonCard className="search-card">
                <IonCardContent>
                  <div className="step-indicator">
                    <span className="step-number">2</span>
                    <span className="step-title">Select Term & Year</span>
                  </div>
                  <IonGrid>
                    <IonRow>
                      <IonCol size="12" size-md="4">
                        <div className="input-group">
                          <label>
                            <IonIcon icon={calendarOutline} size="small" />
                            Term <span className="required">*</span>
                          </label>
                          <select 
                            className="custom-select"
                            value={selectedTerm}
                            onChange={(e) => setSelectedTerm(e.target.value)}
                            disabled={!selectedClass}
                          >
                            <option value="">-- Select Term --</option>
                            <option value="Term 1">Term 1</option>
                            <option value="Term 2">Term 2</option>
                            <option value="Term 3">Term 3</option>
                            <option value="Half Yearly">Half Yearly</option>
                            <option value="Annual">Annual</option>
                          </select>
                        </div>
                      </IonCol>
                      <IonCol size="12" size-md="4">
                        <div className="input-group">
                          <label>
                            <IonIcon icon={calendarOutline} size="small" />
                            Academic Year <span className="required">*</span>
                          </label>
                          <select 
                            className="custom-select"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            disabled={!selectedClass || availableYears.length === 0}
                          >
                            <option value="">-- Select Year --</option>
                            {availableYears.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                      </IonCol>
                      <IonCol size="12" size-md="4" className="button-col">
                        <IonButton 
                          expand="block" 
                          color="primary" 
                          onClick={handleClassFilterSearch}
                          disabled={loading || !selectedClass || !selectedTerm || !selectedYear}
                        >
                          {loading ? <IonSpinner name="crescent" size="small" /> : <IonIcon icon={searchOutline} />}
                          Search
                        </IonButton>
                      </IonCol>
                    </IonRow>
                    <IonRow>
                      <IonCol>
                        <div className="search-hint">
                          <IonIcon icon={informationCircleOutline} size="small" />
                          <span>Select class first to load available years, then choose term and year. Only report cards matching ALL three criteria will be shown.</span>
                        </div>
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                </IonCardContent>
              </IonCard>
            </>
          )}

          {result && (
            <IonButton 
              fill="clear" 
              color="medium" 
              onClick={handleClear}
              className="clear-button"
            >
              <IonIcon icon={closeCircleOutline} slot="start" />
              Clear Search
            </IonButton>
          )}
        </div>

        {/* Results Section */}
        {loading && (
          <div className="loading-container">
            <IonSpinner name="crescent" size="large" />
            <p>Searching for report cards...</p>
          </div>
        )}

        {error && (
          <div className="error-container">
            <IonIcon icon={closeCircleOutline} size="large" color="danger" />
            <h3>Search Error</h3>
            <p>{error}</p>
            <IonButton color="primary" onClick={handleClear}>
              Try Again
            </IonButton>
          </div>
        )}

        {result && !loading && (
          <div className="results-section">
            {/* Summary Card */}
            <IonCard className="student-info-card">
              <IonCardContent>
                <div className="student-info-header">
                  <div className="student-avatar-large" style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}>
                    <IonIcon icon={result.searchType === 'student' ? personOutline : peopleOutline} style={{ fontSize: '2rem' }} />
                  </div>
                  <div className="student-info-details">
                    <h3>
                      {result.searchType === 'student' 
                        ? (result.student?.name || 'Student Report Cards')
                        : (result.className || 'Class Report Cards')}
                    </h3>
                    <p className="roll-number">
                      {result.count} Report Card{result.count !== 1 ? 's' : ''} Found
                    </p>
                    {result.searchType === 'student' && result.searchQuery && (
                      <p className="email">
                        Searched by: {result.student?.rollNumber ? `Roll: "${result.student.rollNumber}"` : `Name: "${result.searchQuery}"`}
                      </p>
                    )}
                    {result.searchType === 'class' && (
                      <p className="email">
                        Filter: {result.className} | Term: {selectedTerm} | Year: {selectedYear}
                      </p>
                    )}
                  </div>
                </div>
              </IonCardContent>
            </IonCard>

            {/* Report Cards List */}
            {result.count === 0 ? (
              <div className="no-reports-container">
                <IonIcon icon={documentOutline} size="large" />
                <h3>No Report Cards Found</h3>
                <p>
                  {result.searchType === 'student'
                    ? 'No report cards found for this student.'
                    : 'No report cards match the selected class, term, and year. Try adjusting the filters.'}
                </p>
              </div>
            ) : (
              <div className="report-cards-list">
                <h4 className="results-title">
                  <IonIcon icon={documentOutline} />
                  Report Cards
                </h4>
                
                {/* Group report cards by student */}
                {(() => {
                  // Group by student
                  const studentGroups = {};
                  result.reportCards.forEach(rc => {
                    const studentId = rc.student?._id;
                    if (!studentId) return;
                    
                    if (!studentGroups[studentId]) {
                      studentGroups[studentId] = {
                        student: rc.student,
                        reportCards: []
                      };
                    }
                    studentGroups[studentId].reportCards.push(rc);
                  });
                  
                  return Object.values(studentGroups).map((group, groupIdx) => (
                    <div key={groupIdx} className="student-group">
                      <div className="student-group-header">
                        <div className="student-group-avatar">
                          {group.student?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="student-group-info">
                          <h4>{group.student?.name || 'Unknown Student'}</h4>
                          <p>Roll: {group.student?.rollNumber || 'N/A'} | {group.reportCards.length} report card(s)</p>
                        </div>
                      </div>
                      
                      {group.reportCards.map((reportCard) => (
                        <IonCard key={reportCard._id} className="report-card-item">
                          <IonCardContent>
                            <div className="report-card-header">
                              <div className="report-meta">
                                <IonChip color="primary">
                                  <IonIcon icon={calendarOutline} />
                                  <IonLabel>{reportCard.term}</IonLabel>
                                </IonChip>
                                <span className="academic-year">{reportCard.academicYear}</span>
                              </div>
                              <IonBadge color={reportCard.isPublished ? 'success' : 'warning'}>
                                {reportCard.isPublished ? 'Sent' : 'Draft'}
                              </IonBadge>
                            </div>

                            {/* File Preview */}
                            {reportCard.reportCardFileUrl && (
                              <div className="file-preview-section">
                                {reportCard.reportCardFileType === 'image' ? (
                                  <img 
                                    src={reportCard.reportCardFileUrl} 
                                    alt="Report Card" 
                                    className="report-card-preview"
                                  />
                                ) : (
                                  <div className="pdf-preview">
                                    <IonIcon icon={documentOutline} size="large" />
                                    <span>PDF Report Card</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Subjects & Grades */}
                            {reportCard.subjects && reportCard.subjects.length > 0 && (
                              <div className="subjects-summary">
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
                                        <td>
                                          <IonBadge 
                                            color={subject.grade === 'E' ? 'danger' : subject.grade === 'D' ? 'warning' : 'success'}
                                          >
                                            {subject.grade}
                                          </IonBadge>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Overall Results */}
                            <div className="overall-results">
                              {reportCard.totalPercentage > 0 && (
                                <div className="result-item">
                                  <span className="label">Percentage:</span>
                                  <span className="value">{reportCard.totalPercentage}%</span>
                                </div>
                              )}
                              {reportCard.overallGrade && reportCard.overallGrade !== 'N/A' && (
                                <div className="result-item">
                                  <span className="label">Grade:</span>
                                  <IonBadge color="primary" className="grade-badge">
                                    {reportCard.overallGrade}
                                  </IonBadge>
                                </div>
                              )}
                            </div>

                            {/* Remarks */}
                            {reportCard.teacherRemarks && (
                              <div className="remarks-section">
                                <strong>Teacher's Remarks:</strong>
                                <p>{reportCard.teacherRemarks}</p>
                              </div>
                            )}
                            {reportCard.principalRemarks && (
                              <div className="remarks-section">
                                <strong>Principal's Remarks:</strong>
                                <p>{reportCard.principalRemarks}</p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="report-card-actions">
                              {reportCard.reportCardFileUrl && (
                                <IonButton
                                  size="small"
                                  fill="outline"
                                  onClick={() => window.open(reportCard.reportCardFileUrl, '_blank')}
                                >
                                  <IonIcon icon={eyeOutline} slot="start" />
                                  View File
                                </IonButton>
                              )}
                              {reportCard.isPublished && reportCard.issuedDate && (
                                <IonChip outline>
                                  <IonIcon icon={checkmarkCircleOutline} />
                                  <IonLabel>Sent: {formatDate(reportCard.issuedDate)}</IonLabel>
                                </IonChip>
                              )}
                            </div>
                          </IonCardContent>
                        </IonCard>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!searched && !loading && (
          <div className="initial-state">
            <IonIcon icon={schoolOutline} size="large" />
            <h3>Search Student Report Cards</h3>
            <p>
              Use "Search by Student" to find all report cards for a specific student,<br/>
              or use "Filter by Class" to view report cards for a specific class, term, and year.
            </p>
          </div>
        )}
      </IonContent>

      <IonToast
        isOpen={toast.show}
        onDidDismiss={() => setToast({ ...toast, show: false })}
        message={toast.message}
        color={toast.color}
        duration={3000}
      />
    </IonPage>
  );
};

export default StudentReportCardSearchScreen;