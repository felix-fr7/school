import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '../components/ui';

const ContactsScreen = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>School Contacts</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>School contact information will appear here.</p>
      </IonContent>
    </IonPage>
  );
};

export default ContactsScreen;