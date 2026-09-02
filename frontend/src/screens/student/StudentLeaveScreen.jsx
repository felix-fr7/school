import React, { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonBadge, IonButton, IonIcon, IonFab, IonFabButton } from '@ionic/react';
import { addOutline, checkmarkCircle, closeCircle, timeOutline } from 'ionicons/icons';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const StudentLeaveScreen = () => {
  const [leaves, setLeaves] = useState([
    { id: 1, type: 'Sick', startDate: '2024-01-10', endDate: '2024-01-12', status: 'approved', reason: 'Fever' },
    { id: 2, type: 'Personal', startDate: '2024-01-05', endDate: '2024-01-05', status: 'pending', reason: 'Family function' },
  ]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <IonBadge color="success">Approved</IonBadge>;
      case 'rejected': return <IonBadge color="danger">Rejected</IonBadge>;
      case 'pending': return <IonBadge color="warning">Pending</IonBadge>;
      default: return <IonBadge>{status}</IonBadge>;
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Leave Requests</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {leaves.map((leave) => (
            <IonItem key={leave.id}>
              <IonLabel>
                <h3>{leave.type} Leave</h3>
                <p>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</p>
                <p>{leave.reason}</p>
              </IonLabel>
              {getStatusBadge(leave.status)}
            </IonItem>
          ))}
        </IonList>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default StudentLeaveScreen;