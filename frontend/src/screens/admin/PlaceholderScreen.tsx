/**
 * Placeholder Screen Component (Ionic React Version)
 * Used as a temporary placeholder for screens under development
 */

import React from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonIcon,
} from '@ionic/react';
import { constructOutline } from 'ionicons/icons';
import './PlaceholderScreen.css';

interface PlaceholderScreenProps {
  title: string;
  description?: string;
}

const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ title, description }) => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="placeholder-content">
        <div className="placeholder-container">
          <IonIcon icon={constructOutline} className="placeholder-icon" />
          <h2 className="placeholder-title">{title}</h2>
          {description && <p className="placeholder-description">{description}</p>}
          <p className="placeholder-subtext">Coming Soon</p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PlaceholderScreen;