/**
 * Teacher Attendance Screen (Ionic React Version)
 * Mark daily attendance for students in teacher's class
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
  IonAlert,
  IonAvatar,
  IonBadge,
} from '@ionic/react';
import { checkmarkCircleOutline, timeOutline, closeCircleOutline, helpCircleOutline } from 'ionicons/icons';
import { teacherAPI } from '../../services/api';
import './TeacherAttendanceScreen.css';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null;

interface Student {
  studentId: string;
  name: string;
  email: string;
  studentCode: string;
  status: AttendanceStatus;
  remarks?: string;
}

const TeacherAttendanceScreen: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [summary, setSummary] = useState({ total: 0, marked: 0, unmarked: 0 });
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showUnmarkedAlert, setShowUnmarkedAlert] = useState(false);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await teacherAPI.getClassAttendance(selectedDate);
      if (response.success && response.data) {
        const attendance = response.data.attendance.map(s => ({
          ...s,
          status: s.status as AttendanceStatus,
        }));
        setStudents(attendance);
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAlertMessage('Failed to load attendance');
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const toggleStatus = (studentId: string) => {
    setStudents(prev =>
      prev.map(student => {
        if (student.studentId === studentId) {
          const statusCycle: AttendanceStatus[] = [null, 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
          const currentIndex = statusCycle.indexOf(student.status);
          const nextIndex = (currentIndex + 1) % statusCycle.length;
          const newStatus: AttendanceStatus = statusCycle[nextIndex] || null;
          return { ...student, status: newStatus };
        }
        return student;
      })
    );
  };

  const markAllPresent = () => {
    setStudents(prev =>
      prev.map(student => ({ ...student, status: 'PRESENT' as AttendanceStatus }))
    );
  };

  const handleSave = async () => {
    const unmarkedStudents = students.filter(s => s.status === null);
    if (unmarkedStudents.length > 0) {
      setShowUnmarkedAlert(true);
      return;
    }
    await saveAttendance();
  };

  const handleMarkUnmarkedAbsent = async () => {
    setStudents(prev =>
      prev.map(s => s.status === null ? { ...s, status: 'ABSENT' as AttendanceStatus } : s)
    );
    setShowUnmarkedAlert(false);
    setTimeout(() => saveAttendance(), 100);
  };

  const saveAttendance = async () => {
    try {
      setSaving(true);
      const attendanceData = students.map(student => ({
        studentId: student.studentId,
        status: student.status || 'ABSENT',
        remarks: student.remarks,
      }));

      const response = await teacherAPI.markAttendance(selectedDate, attendanceData);
      if (response.success && response.data) {
        setAlertMessage(`Attendance marked for ${response.data.marked} students`);
        setIsSuccess(true);
        setShowAlert(true);
        fetchAttendance();
      }
    } catch (error: any) {
      setAlertMessage(error.response?.data?.error?.message || 'Failed to save attendance');
      setIsSuccess(false);
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: Student['status']) => {
    switch (status) {
      case 'PRESENT': return 'success';
      case 'ABSENT': return 'danger';
      case 'LATE': return 'warning';
      case 'EXCUSED': return 'primary';
      default: return 'medium';
    }
  };

  const getStatusLabel = (status: Student['status']) => {
    switch (status) {
      case 'PRESENT': return 'Present';
      case 'ABSENT': return 'Absent';
      case 'LATE': return 'Late';
      case 'EXCUSED': return 'Excused';
      default: return 'Tap to mark';
    }
  };

  const getStatusIcon = (status: Student['status']) => {
    switch (status) {
      case 'PRESENT': return checkmarkCircleOutline;
      case 'ABSENT': return closeCircleOutline;
      case 'LATE': return timeOutline;
      case 'EXCUSED': return helpCircleOutline;
      default: return null;
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p>Loading attendance...</p>
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
          <IonTitle>Mark Attendance</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="teacher-attendance-content">
        {/* Date and Actions */}
        <div className="header-section">
          <div className="date-container">
            <IonText color="medium">Date: </IonText>
            <IonText><strong>{selectedDate}</strong></IonText>
          </div>
          <IonButton size="small" color="success" onClick={markAllPresent}>
            ✓ Mark All Present
          </IonButton>
        </div>

        {/* Summary */}
        <div className="summary-row">
          <div className="summary-item">
            <span className="summary-value">{summary.total}</span>
            <span className="summary-label">Total</span>
          </div>
          <div className="summary-item summary-marked">
            <span className="summary-value">{summary.marked}</span>
            <span className="summary-label">Marked</span>
          </div>
          <div className="summary-item summary-unmarked">
            <span className="summary-value">{summary.unmarked}</span>
            <span className="summary-label">Unmarked</span>
          </div>
        </div>

        {/* Student List */}
        {students.length === 0 ? (
          <div className="empty-container">
            <IonText color="medium">
              <h3>No students found in your class</h3>
            </IonText>
          </div>
        ) : (
          <IonList>
            {students.map((item) => (
              <IonItem
                key={item.studentId}
                className="student-card"
                button
                onClick={() => toggleStatus(item.studentId)}
              >
                <IonAvatar slot="start" className="student-avatar">
                  <span>{item.name.charAt(0).toUpperCase()}</span>
                </IonAvatar>
                <div className="student-info">
                  <h4 className="student-name">{item.name}</h4>
                  <p className="student-code">{item.studentCode}</p>
                </div>
                <IonBadge slot="end" color={getStatusColor(item.status)} className="status-badge">
                  {getStatusLabel(item.status)}
                </IonBadge>
              </IonItem>
            ))}
          </IonList>
        )}

        {/* Save Button */}
        <div className="save-section">
          <IonButton
            expand="block"
            color="secondary"
            onClick={handleSave}
            disabled={saving || students.length === 0}
          >
            {saving ? <IonSpinner name="crescent" /> : 'Save Attendance'}
          </IonButton>
        </div>

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={isSuccess ? 'Success' : 'Error'}
          message={alertMessage}
          buttons={['OK']}
        />

        <IonAlert
          isOpen={showUnmarkedAlert}
          onDidDismiss={() => setShowUnmarkedAlert(false)}
          header="Unmarked Students"
          message={`${students.filter(s => s.status === null).length} students have not been marked. Mark them as absent?`}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Mark Absent',
              role: 'destructive',
              handler: handleMarkUnmarkedAbsent,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default TeacherAttendanceScreen;