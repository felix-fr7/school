import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonToggle, IonIcon, IonButton } from '@ionic/react';
import { settingsOutline, notificationsOutline, lockClosedOutline, colorPaletteOutline, languageOutline, helpCircleOutline, logOutOutline } from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const AdminSettingsScreen = () => {
  const { logout } = useAuth();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonList>
          <IonItem>
            <IonIcon icon={notificationsOutline} slot="start" />
            <IonLabel>Push Notifications</IonLabel>
            <IonToggle defaultChecked />
          </IonItem>
          <IonItem>
            <IonIcon icon={lockClosedOutline} slot="start" />
            <IonLabel>Change Password</IonLabel>
          </IonItem>
          <IonItem>
            <IonIcon icon={colorPaletteOutline} slot="start" />
            <IonLabel>Theme</IonLabel>
          </IonItem>
          <IonItem>
            <IonIcon icon={languageOutline} slot="start" />
            <IonLabel>Language</IonLabel>
          </IonItem>
          <IonItem>
            <IonIcon icon={helpCircleOutline} slot="start" />
            <IonLabel>Help & Support</IonLabel>
          </IonItem>
        </IonList>
        
        <div className="ion-padding-top">
          <IonButton expand="block" color="danger" onClick={logout}>
            <IonIcon icon={logOutOutline} slot="start" />
            Logout
          </IonButton>
        </div>

        <p className="ion-text-center ion-margin-top" style={{ fontSize: '12px', color: '#888' }}>
          MACVEL School Management App v1.0.0
        </p>
      </IonContent>
    </IonPage>
  );
};

export default AdminSettingsScreen;