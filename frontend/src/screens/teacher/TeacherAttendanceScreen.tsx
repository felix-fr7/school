import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';

const TeacherAttendanceScreen: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Mark Attendance</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>Mark student attendance here.</p>
      </IonContent>
    </IonPage>
  );
};

export default TeacherAttendanceScreen;