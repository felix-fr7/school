/**
 * Report Card View Screen
 * Displays a proper report card format with school info, student details, subjects, and grades
 */

import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonContent,
  IonSpinner,
  useIonLoading,
} from '@ionic/react';
import {
  printOutline,
  downloadOutline,
  schoolOutline,
  personOutline,
  calendarOutline,
  bookOutline,
  trophyOutline,
  arrowBackOutline,
  closeCircleOutline,
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import './ReportCardViewScreen.css';

const ReportCardViewScreen = ({ match }) => {
  const reportCardId = match?.params?.id;
  const [reportCard, setReportCard] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [presentLoading, dismissLoading] = useIonLoading();

  useEffect(() => {
    if (reportCardId) {
      fetchReportCard();
    } else {
      setError('No report card ID provided');
      setLoading(false);
    }
  }, [reportCardId]);

  const fetchReportCard = async () => {
    await presentLoading();
    try {
      const response = await adminAPI.getReportCard(reportCardId);
      if (response.success && response.data) {
        setReportCard(response.data);
        // Use school info from the API response
        if (response.data.school) {
          setSchoolInfo({
            name: response.data.school.schoolName,
            code: response.data.school.schoolCode,
            address: response.data.school.address,
            phone: response.data.school.contactPhone,
            email: response.data.school.contactEmail,
            logo: null,
          });
        } else {
          // Fallback: fetch school info separately
          try {
            const schoolResponse = await adminAPI.getSchoolInfo();
            if (schoolResponse.success && schoolResponse.data) {
              setSchoolInfo({
                name: schoolResponse.data.schoolName,
                code: schoolResponse.data.schoolCode,
                address: schoolResponse.data.address,
                phone: schoolResponse.data.contactPhone,
                email: schoolResponse.data.contactEmail,
                logo: null,
              });
            }
          } catch (err) {
            console.error('Error fetching school info:', err);
          }
        }
      } else {
        setError(response?.error?.message || 'Failed to load report card');
      }
    } catch (error) {
      console.error('Error fetching report card:', error);
      setError(error?.response?.data?.error?.message || error?.message || 'Failed to load report card');
    } finally {
      await dismissLoading();
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getGradeColor = (grade) => {
    if (grade === 'A1') return '#10b981';
    if (grade === 'A2') return '#34d399';
    if (grade === 'B1') return '#3b82f6';
    if (grade === 'B2') return '#60a5fa';
    if (grade === 'C1') return '#f59e0b';
    if (grade === 'C2') return '#fbbf24';
    if (grade === 'D') return '#f97316';
    if (grade === 'E') return '#ef4444';
    return '#6b7280';
  };

  const getGradeRemark = (grade) => {
    const remarks = {
      'A1': 'Excellent',
      'A2': 'Very Good',
      'B1': 'Good',
      'B2': 'Above Average',
      'C1': 'Average',
      'C2': 'Below Average',
      'D': 'Needs Improvement',
      'E': 'Fail',
    };
    return remarks[grade] || '';
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading Report Card...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (error) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/report-cards" />
            </IonButtons>
            <IonTitle>Error</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="empty-state">
            <IonIcon icon={closeCircleOutline} size="large" color="danger" />
            <h3>Error Loading Report Card</h3>
            <p>{error}</p>
            <IonButton routerLink="/admin/report-cards">
              <IonIcon icon={arrowBackOutline} slot="start" />
              Back to Report Cards
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!reportCard) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/report-cards" />
            </IonButtons>
            <IonTitle>Not Found</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="empty-state">
            <IonIcon icon={documentOutline} size="large" />
            <h3>Report Card Not Found</h3>
            <p>The requested report card could not be found.</p>
            <IonButton routerLink="/admin/report-cards">
              <IonIcon icon={arrowBackOutline} slot="start" />
              Back to Report Cards
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const student = reportCard.student;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/report-cards" />
          </IonButtons>
          <IonTitle>Report Card - {student?.name || 'Student'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handlePrint}>
              <IonIcon icon={printOutline} slot="start" />
              Print
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="report-card-view-content">
        <div className="report-card-container" id="report-card-to-print">
          {/* School Header */}
          <div className="school-header">
            <div className="school-logo">
              {schoolInfo?.logo ? (
                <img src={schoolInfo.logo} alt="School Logo" />
              ) : (
                <IonIcon icon={schoolOutline} size="large" />
              )}
            </div>
            <div className="school-info">
              <h1>{schoolInfo?.name || 'School Name'}</h1>
              <p>{schoolInfo?.address}</p>
              <p>Phone: {schoolInfo?.phone} | Email: {schoolInfo?.email}</p>
            </div>
          </div>

          {/* Report Card Title */}
          <div className="report-card-title">
            <h2>REPORT CARD</h2>
            <p>{reportCard.term} - {reportCard.academicYear}</p>
          </div>

          {/* Student Information */}
          <div className="student-section">
            <h3>
              <IonIcon icon={personOutline} />
              Student Information
            </h3>
            <div className="student-details-grid">
              <div className="detail-item">
                <span className="label">Student Name:</span>
                <span className="value">{student?.name || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Roll Number:</span>
                <span className="value">{student?.rollNumber || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Class:</span>
                <span className="value">
                  {reportCard.classInfo 
                    ? `Class ${reportCard.classInfo.name} ${reportCard.classInfo.section ? '- Section ' + reportCard.classInfo.section : ''}`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Academic Performance */}
          {reportCard.subjects && reportCard.subjects.length > 0 && (
            <div className="academic-section">
              <h3>
                <IonIcon icon={bookOutline} />
                Academic Performance
              </h3>
              <table className="marks-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Max Marks</th>
                    <th>Marks Obtained</th>
                    <th>Percentage</th>
                    <th>Grade</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCard.subjects.map((subject, idx) => {
                    const percentage = ((subject.marksObtained / subject.totalMarks) * 100).toFixed(1);
                    return (
                      <tr key={idx}>
                        <td className="subject-name">{subject.subjectName}</td>
                        <td>{subject.totalMarks}</td>
                        <td>{subject.marksObtained}</td>
                        <td>{percentage}%</td>
                        <td>
                          <span 
                            className="grade-badge" 
                            style={{ backgroundColor: getGradeColor(subject.grade) }}
                          >
                            {subject.grade}
                          </span>
                        </td>
                        <td>{subject.remarks || getGradeRemark(subject.grade)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Overall Result */}
          <div className="overall-section">
            <div className="overall-result">
              <div className="result-item">
                <span className="result-label">Overall Percentage:</span>
                <span className="result-value">{reportCard.totalPercentage?.toFixed(2) || '0'}%</span>
              </div>
              <div className="result-item">
                <span className="result-label">Overall Grade:</span>
                <span 
                  className="result-grade"
                  style={{ backgroundColor: getGradeColor(reportCard.overallGrade) }}
                >
                  {reportCard.overallGrade || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          {(reportCard.teacherRemarks || reportCard.principalRemarks) && (
            <div className="remarks-section">
              {reportCard.teacherRemarks && (
                <div className="remark-item">
                  <h4>Class Teacher's Remarks:</h4>
                  <p>{reportCard.teacherRemarks}</p>
                </div>
              )}
              {reportCard.principalRemarks && (
                <div className="remark-item">
                  <h4>Principal's Remarks:</h4>
                  <p>{reportCard.principalRemarks}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="report-card-footer">
            <div className="signature-line">
              <div className="sign-left">
                <div className="line"></div>
                <p>Class Teacher</p>
              </div>
              <div className="sign-right">
                <div className="line"></div>
                <p>Principal</p>
              </div>
            </div>
            <p className="footer-note">
              Date of Issue: {new Date(reportCard.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons no-print">
          <IonButton color="primary" onClick={handlePrint}>
            <IonIcon icon={printOutline} slot="start" />
            Print Report Card
          </IonButton>
          <IonButton color="secondary" routerLink="/admin/report-cards">
            <IonIcon icon={arrowBackOutline} slot="start" />
            Back to List
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ReportCardViewScreen;