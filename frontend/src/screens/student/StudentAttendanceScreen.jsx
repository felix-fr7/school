import React, { useState, useEffect } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonBadge, IonIcon } from '@ionic/react';
import { checkmarkCircle, closeCircle, timeOutline } from 'ionicons/icons';

const StudentAttendanceScreen = () => {
  const [attendance, setAttendance] = useState([
    { date: '2024-01-15', status: 'present' },
    { date: '2024-01-14', status: 'present' },
    { date: '2024-01-13', status: 'absent' },
    { date: '2024-01-12', status: 'late' },
    { date: '2024-01-11', status: 'present' },
  ]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return { icon: checkmarkCircle, color: 'success' };
      case 'absent': return { icon: closeCircle, color: 'danger' };
      case 'late': return { icon: timeOutline, color: 'warning' };
      default: return { icon: checkmarkCircle, color: 'success' };
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Attendance</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {attendance.map((item, index) => {
            const statusInfo = getStatusIcon(item.status);
            return (
              <IonItem key={index}>
                <IonIcon icon={statusInfo.icon} color={statusInfo.color} slot="start" />
                <IonLabel>
                  <h3>{new Date(item.date).toLocaleDateString()}</h3>
                  <p>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</p>
                </IonLabel>
              </IonItem>
            );
          })}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default StudentAttendanceScreen;