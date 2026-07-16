/**
 * Class Attendance List Screen (Ionic React Version)
 * View attendance records and mark attendance for the class
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
  IonCard,
  IonCardContent,
  IonBadge,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonButton,
  IonList,
  IonItem,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { 
  calendarOutline, 
  checkmarkCircleOutline, 
  closeCircleOutline, 
  timeOutline,
  refreshOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { classControllerAPI } from '../../services/api';
import './ClassAttendanceListScreen.css';

interface AttendanceRecord {
  studentId: string;
  name: string;
  email: string;
  status: 'present' | 'absent' | 'excused' | 'late' | 'unmarked' | null;
  remarks?: string;
}

interface AttendanceSummary {
  date: string;
  className: string;
  attendance: AttendanceRecord[];
  summary: {
    total: number;
    marked: number;
    unmarked: number;
  };
}

const ClassAttendanceListScreen: React.FC = () => {
  const history = useHistory();
  
  const [attendanceData, setAttendanceData] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const fetchAttendance = async (date?: string) => {
    const fetchDate = date || selectedDate;
    try {
      // Note: classControllerAPI.getAttendance not available, using console.log fallback
      console.log('Fetching attendance for date:', fetchDate);
      
      // Simulate empty response for now
      setAttendanceData(null);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    setRefreshing(true);
    await fetchAttendance();
    event.detail.complete();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStatusColor = (status: string | null): string => {
    const safeStatus = status || 'unmarked';
    switch (safeStatus) {
      case 'present': return 'success';
      case 'absent': return 'danger';
      case 'excused': return 'warning';
      case 'late': return 'primary';
      default: return 'medium';
    }
  };

  const getStatusIcon = (status: string | null): string => {
    const safeStatus = status || 'unmarked';
    switch (safeStatus) {
      case 'present': return '✅';
      case 'absent': return '❌';
      case 'excused': return '📝';
      case 'late': return '⏰';
      default: return '⚪';
    }
  };

  const handleMarkAttendance = () => {
    history.push('/class-controller/mark-attendance', { 
      date: selectedDate 
    });
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Attendance</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center attendance-loading">
          <IonSpinner name="crescent" />
          <IonText color="medium">
            <p className="loading-text">Loading attendance...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Attendance</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="attendance-list-content" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} />
        </IonRefresher>

        {/* Header */}
        <div className="header-section">
          <h1 className="header-title">Attendance</h1>
          <IonText color="medium">
            <p className="header-subtitle">
              {attendanceData ? formatDate(attendanceData.date) : formatDate(selectedDate)}
            </p>
          </IonText>
        </div>

        {/* Summary Cards */}
        {attendanceData ? (
          <div className="summary-container">
            <IonCard className="summary-card">
              <IonCardContent>
                <div className="summary-value">{attendanceData.summary.total}</div>
                <div className="summary-label">Total</div>
              </IonCardContent>
            </IonCard>
            <IonCard className="summary-card present">
              <IonCardContent>
                <div className="summary-value">
                  {attendanceData.attendance.filter(a => a.status === 'present').length}
                </div>
                <div className="summary-label">Present</div>
              </IonCardContent>
            </IonCard>
            <IonCard className="summary-card absent">
              <IonCardContent>
                <div className="summary-value">
                  {attendanceData.attendance.filter(a => a.status === 'absent').length}
                </div>
                <div className="summary-label">Absent</div>
              </IonCardContent>
            </IonCard>
            <IonCard className="summary-card unmarked">
              <IonCardContent>
                <div className="summary-value">{attendanceData.summary.unmarked}</div>
                <div className="summary-label">Unmarked</div>
              </IonCardContent>
            </IonCard>
          </div>
        ) : (
          <div className="summary-container">
            <IonCard className="summary-card">
              <IonCardContent>
                <div className="summary-value">--</div>
                <div className="summary-label">Total</div>
              </IonCardContent>
            </IonCard>
            <IonCard className="summary-card present">
              <IonCardContent>
                <div className="summary-value">--</div>
                <div className="summary-label">Present</div>
              </IonCardContent>
            </IonCard>
            <IonCard className="summary-card absent">
              <IonCardContent>
                <div className="summary-value">--</div>
                <div className="summary-label">Absent</div>
              </IonCardContent>
            </IonCard>
            <IonCard className="summary-card unmarked">
              <IonCardContent>
                <div className="summary-value">--</div>
                <div className="summary-label">Unmarked</div>
              </IonCardContent>
            </IonCard>
          </div>
        )}

        {/* Attendance List */}
        {attendanceData && attendanceData.attendance.length > 0 ? (
          <IonList>
            {attendanceData.attendance.map((item) => (
              <IonItem key={item.studentId} className="student-item">
                <div className="student-info">
                  <div className="student-name">{item.name}</div>
                  <div className="student-email">{item.email}</div>
                </div>
                <IonBadge 
                  color={getStatusColor(item.status)} 
                  className="status-badge"
                >
                  <span className="status-icon">{getStatusIcon(item.status)}</span>
                  <span className="status-text">
                    {(item.status || 'unmarked').charAt(0).toUpperCase() + 
                     (item.status || 'unmarked').slice(1)}
                  </span>
                </IonBadge>
              </IonItem>
            ))}
          </IonList>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <IonText>
              <h3>No attendance records</h3>
              <p className="empty-subtext">Mark attendance for today</p>
            </IonText>
          </div>
        )}

        {/* Mark Attendance Button */}
        <div className="mark-button-container">
          <IonButton
            expand="block"
            className="mark-button"
            onClick={handleMarkAttendance}
          >
            <IonIcon icon={documentTextOutline} slot="start" />
            Mark Attendance
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ClassAttendanceListScreen;