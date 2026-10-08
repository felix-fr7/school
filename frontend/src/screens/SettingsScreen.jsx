import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '../components/ui';

const SettingsScreen = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>Settings will appear here.</p>
      </IonContent>
    </IonPage>
  );
};

export default SettingsScreen;