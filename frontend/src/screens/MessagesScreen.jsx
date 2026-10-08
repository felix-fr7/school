import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '../components/ui';

const MessagesScreen = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Messages</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>Messages will appear here.</p>
      </IonContent>
    </IonPage>
  );
};

export default MessagesScreen;