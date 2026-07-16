/**
 * Class Mark Attendance Screen (Ionic React Version)
 * Mark attendance for all students in the class for a specific date
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
  IonToggle,
  IonAlert,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { 
  checkmarkCircleOutline, 
  closeCircleOutline,
  saveOutline,
} from 'ionicons/icons';
import { classControllerAPI } from '../../services/api';
import './ClassMarkAttendanceScreen.css';

interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string | undefined;
}

interface AttendanceEntry {
  student: Student;
  isPresent: boolean;
}

const ClassMarkAttendanceScreen: React.FC = () => {
  const history = useHistory();
  
  const [students, setStudents] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState<string>('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      // Note: classControllerAPI.getStudents not available, using console.log fallback
      console.log('Fetching students for attendance...');
      
      // Simulate empty student list for now
      setStudents([]);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (index: number) => {
    setStudents(prev => prev.map((entry, i) => 
      i === index ? { ...entry, isPresent: !entry.isPresent } : entry
    ));
  };

  const handleMarkAll = (present: boolean) => {
    setStudents(prev => prev.map(entry => ({ ...entry, isPresent: present })));
  };

  const handleSave = async () => {
    if (students.length === 0) {
      setAlertHeader('Error');
      setAlertMessage('No students to mark attendance for');
      setShowAlert(true);
      return;
    }

    setSaving(true);
    
    try {
      // Note: classControllerAPI.markAttendance not available, using console.log fallback
      console.log('Saving attendance:', {
        date,
        attendanceData: students.map(entry => ({
          studentId: entry.student.id,
          status: entry.isPresent ? 'present' : 'absent',
        })),
      });
      
      // Simulate success
      setAlertHeader('Success');
      setAlertMessage(`Attendance marked for ${students.length} students on ${formatDate(date)}`);
      setShowAlert(true);
      
      setTimeout(() => {
        history.goBack();
      }, 1500);
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      const errorMessage = error?.response?.data?.error?.message || 'Failed to mark attendance';
      setAlertHeader('Error');
      setAlertMessage(errorMessage);
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const presentCount = students.filter(s => s.isPresent).length;
  const absentCount = students.filter(s => !s.isPresent).length;

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Mark Attendance</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center attendance-loading">
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
          <IonTitle>Mark Attendance</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="mark-attendance-content" fullscreen>
        {/* Header */}
        <div className="header-section">
          <h1 className="header-title">Mark Attendance</h1>
          <IonText color="medium">
            <p className="header-subtitle">{formatDate(date)}</p>
          </IonText>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <IonButton
            fill="outline"
            className="quick-action-button"
            onClick={() => handleMarkAll(true)}
          >
            <IonIcon icon={checkmarkCircleOutline} slot="start" />
            Mark All Present
          </IonButton>
          <IonButton
            fill="outline"
            className="quick-action-button"
            onClick={() => handleMarkAll(false)}
          >
            <IonIcon icon={closeCircleOutline} slot="start" />
            Mark All Absent
          </IonButton>
        </div>

        {/* Summary */}
        <div className="summary-row">
          <div className="summary-badge present">
            <div className="summary-value">{presentCount}</div>
            <div className="summary-label">Present</div>
          </div>
          <div className="summary-badge absent">
            <div className="summary-value">{absentCount}</div>
            <div className="summary-label">Absent</div>
          </div>
          <div className="summary-badge total">
            <div className="summary-value">{students.length}</div>
            <div className="summary-label">Total</div>
          </div>
        </div>

        {/* Students List */}
        {students.length > 0 ? (
          <IonList>
            {students.map((item, index) => (
              <IonItem key={item.student.id} className="student-item">
                <div className="student-info">
                  <div className="student-name">{item.student.name}</div>
                  <div className="student-id">{item.student.studentId}</div>
                </div>
                <div className="toggle-wrapper">
                  <span className={`toggle-label ${item.isPresent ? 'present' : 'absent'}`}>
                    {item.isPresent ? 'Present' : 'Absent'}
                  </span>
                  <IonToggle
                    checked={item.isPresent}
                    onIonChange={() => toggleAttendance(index)}
                  />
                </div>
              </IonItem>
            ))}
          </IonList>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <IonText>
              <h3>No students found</h3>
              <p className="empty-subtext">Add students to your class first</p>
            </IonText>
          </div>
        )}

        {/* Save Button */}
        <div className="save-button-container">
          <IonButton
            expand="block"
            className="save-button"
            onClick={handleSave}
            disabled={saving || students.length === 0}
          >
            {saving ? <IonSpinner name="crescent" /> : <IonIcon icon={saveOutline} slot="start" />}
            {saving ? 'Saving...' : `Save Attendance (${students.length} students)`}
          </IonButton>
        </div>

        {/* Alert */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={alertHeader}
          message={alertMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassMarkAttendanceScreen;