import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '../components/ui';

const CircularsScreen = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Circulars</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>Circulars will appear here.</p>
      </IonContent>
    </IonPage>
  );
};

export default CircularsScreen;