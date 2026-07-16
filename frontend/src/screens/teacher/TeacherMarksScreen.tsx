/**
 * Teacher Marks Screen (Ionic React Version)
 * Batch marks entry matrix for teachers to enter marks for all students
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
  IonText,
  IonSpinner,
  IonList,
  IonItem,
  IonCard,
  IonCardContent,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
  IonAvatar,
} from '@ionic/react';
import { refreshOutline, barChartOutline } from 'ionicons/icons';
import { teacherAPI } from '../../services/api';
import './TeacherMarksScreen.css';

interface Student {
  id: string;
  name: string;
  email: string;
  studentId?: string;
}

interface MarkEntry {
  studentId: string;
  marks: string;
}

const EXAM_TYPES = ['Mid-Term', 'Quarterly', 'Annual', 'Unit Test', 'Half-Yearly'];
const SUBJECTS = ['Mathematics', 'Science', 'English', 'History', 'Geography', 'Hindi', 'Computer'];

const TeacherMarksScreen: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExam, setSelectedExam] = useState(EXAM_TYPES[0]);
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [totalMarks, setTotalMarks] = useState('100');
  const [markEntries, setMarkEntries] = useState<MarkEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const fetchStudents = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const response = await teacherAPI.getMyStudents(1, 50);
      if (response.success && response.data) {
        setStudents(response.data.students);
        setMarkEntries(response.data.students.map(s => ({ studentId: s.id, marks: '' })));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setAlertMessage('Failed to load students');
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    await fetchStudents(true);
    event.detail.complete();
  };

  const updateMark = (studentId: string, marks: string) => {
    // Only allow numeric input
    if (marks && !/^\d*$/.test(marks)) return;
    setMarkEntries(prev =>
      prev.map(entry => entry.studentId === studentId ? { ...entry, marks } : entry)
    );
  };

  const validateForm = () => {
    if (!totalMarks || parseInt(totalMarks) <= 0) {
      setAlertMessage('Please enter valid total marks');
      setIsSuccess(false);
      setShowAlert(true);
      return false;
    }
    const emptyMarks = markEntries.filter(e => !e.marks);
    if (emptyMarks.length > 0) {
      setAlertMessage('Please enter marks for all students');
      setIsSuccess(false);
      setShowAlert(true);
      return false;
    }
    const invalidMarks = markEntries.filter(e => parseInt(e.marks) > parseInt(totalMarks) || parseInt(e.marks) < 0);
    if (invalidMarks.length > 0) {
      setAlertMessage(`Marks cannot exceed total marks (${totalMarks}) or be negative`);
      setIsSuccess(false);
      setShowAlert(true);
      return false;
    }
    return true;
  };

  const handleSubmitMarks = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const marksData = markEntries.map(entry => ({
        studentId: entry.studentId,
        subject: selectedSubject || 'Mathematics',
        marksObtained: parseInt(entry.marks),
        totalMarks: parseInt(totalMarks),
        examType: selectedExam || 'Mid-Term',
      }));

      const response = await teacherAPI.createMarks(marksData);

      if (response.success && response.data) {
        setAlertMessage(`${response.data.length} marks submitted successfully!`);
        setIsSuccess(true);
        setShowAlert(true);
        setMarkEntries(students.map(s => ({ studentId: s.id, marks: '' })));
      }
    } catch (error: any) {
      setAlertMessage(error.response?.data?.error?.message || 'Failed to submit marks');
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
            <IonBackButton defaultHref="/teacher/dashboard" />
          </IonButtons>
          <IonTitle>Enter Marks</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="teacher-marks-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {/* Filters Section */}
        <IonCard className="filters-card">
          <IonCardContent>
            <h3 className="filters-title">Marks Entry</h3>

            <div className="filters-row">
              <div className="filter-item">
                <label className="filter-label">Exam Type</label>
                <IonSelect
                  value={selectedExam}
                  interface="popover"
                  onIonChange={(e) => setSelectedExam(e.detail.value)}
                >
                  {EXAM_TYPES.map(type => (
                    <IonSelectOption key={type} value={type}>{type}</IonSelectOption>
                  ))}
                </IonSelect>
              </div>

              <div className="filter-item">
                <label className="filter-label">Subject</label>
                <IonSelect
                  value={selectedSubject}
                  interface="popover"
                  onIonChange={(e) => setSelectedSubject(e.detail.value)}
                >
                  {SUBJECTS.map(subj => (
                    <IonSelectOption key={subj} value={subj}>{subj}</IonSelectOption>
                  ))}
                </IonSelect>
              </div>
            </div>

            <div className="total-marks-row">
              <label className="filter-label">Total Marks</label>
              <IonInput
                type="number"
                value={totalMarks}
                onIonInput={(e) => setTotalMarks(e.detail.value || '')}
                className="total-marks-input"
              />
            </div>
          </IonCardContent>
        </IonCard>

        {/* Students Matrix */}
        {students.length === 0 ? (
          <div className="empty-container">
            <IonIcon icon={barChartOutline} className="empty-icon" />
            <IonText color="medium">
              <h3>No students in your class</h3>
            </IonText>
          </div>
        ) : (
          <>
            <div className="matrix-header">
              <IonText>
                <strong>Students ({students.length})</strong>
              </IonText>
              <IonText color="secondary">
                <small>{selectedSubject} - {selectedExam}</small>
              </IonText>
            </div>

            <IonList>
              {students.map((item, index) => {
                const entry = markEntries.find(e => e.studentId === item.id);
                return (
                  <IonItem key={item.id} className="student-row">
                    <IonAvatar slot="start" className="student-index">
                      <span>{index + 1}</span>
                    </IonAvatar>
                    <div className="student-info">
                      <h4 className="student-name">{item.name}</h4>
                      <p className="student-roll">{item.studentId || 'N/A'}</p>
                    </div>
                    <div className="mark-input-container">
                      <IonInput
                        type="number"
                        placeholder="0"
                        value={entry?.marks || ''}
                        onIonInput={(e) => updateMark(item.id, e.detail.value || '')}
                        className="mark-input"
                        maxlength={3}
                      />
                      <span className="mark-max">/{totalMarks}</span>
                    </div>
                  </IonItem>
                );
              })}
            </IonList>

            {/* Submit Button */}
            <div className="footer">
              <IonButton
                expand="block"
                color="secondary"
                onClick={handleSubmitMarks}
                disabled={saving}
              >
                {saving ? <IonSpinner name="crescent" /> : 'Submit Batch Marks'}
              </IonButton>
            </div>
          </>
        )}

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={isSuccess ? 'Success' : 'Error'}
          message={alertMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default TeacherMarksScreen;