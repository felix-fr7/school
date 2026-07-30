import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';

const TeacherHomeworkScreen: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Homework Management</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>Manage and assign homework here.</p>
      </IonContent>
    </IonPage>
  );
};

export default TeacherHomeworkScreen;