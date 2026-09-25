import React from 'react';
import { IonButtons, IonButton, IonIcon } from '@ionic/react';
import { homeOutline, logOutOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomeLogoutButtons = () => {
  const history = useHistory();
  const { logout, isStudent } = useAuth();

  const handleHome = () => history.push(isStudent ? '/student/dashboard' : '/login');

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      history.push('/login');
    }
  };

  return (
    <IonButtons slot="end">
      <IonButton onClick={handleHome} title="Home">
        <IonIcon slot="icon-only" icon={homeOutline} />
      </IonButton>
      <IonButton onClick={handleLogout} title="Logout">
        <IonIcon slot="icon-only" icon={logOutOutline} />
      </IonButton>
    </IonButtons>
  );
};

export default HomeLogoutButtons;
