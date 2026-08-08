import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';

const NewsScreen = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>News & Announcements</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>News and announcements will appear here.</p>
      </IonContent>
    </IonPage>
  );
};

export default NewsScreen;