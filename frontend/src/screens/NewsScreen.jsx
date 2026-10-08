import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '../components/ui';

const NewsScreen = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>School Bulletin</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>School bulletin posts and announcements will appear here.</p>
      </IonContent>
    </IonPage>
  );
};

export default NewsScreen;