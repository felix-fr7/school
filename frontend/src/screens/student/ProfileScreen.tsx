/**
 * Student Profile Screen (Ionic React Version)
 * Displays student profile information
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonBackButton,
  IonButtons,
  IonAvatar,
  IonCard,
  IonCardContent,
  IonText,
  IonSpinner,
  IonIcon,
  IonList,
  IonItem,
} from '@ionic/react';
import { personOutline, mailOutline, schoolOutline, bookOutline, businessOutline } from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI } from '../../services/api';
import { User } from '../../types';
import './ProfileScreen.css';

const StudentProfileScreen: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await studentAPI.getProfile();
        if (response.success && response.data) {
          setUser(response.data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/student/dashboard" />
            </IonButtons>
            <IonTitle>Profile</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
        </IonContent>
      </IonPage>
    );
  }

  const profile = user || currentUser;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/student/dashboard" />
          </IonButtons>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="profile-content">
        {/* Header */}
        <div className="profile-header">
          <IonAvatar className="profile-avatar">
            <span>{profile?.name?.charAt(0) || 'S'}</span>
          </IonAvatar>
          <h2 className="profile-name">{profile?.name}</h2>
          <IonText color="light" className="profile-email">
            <IonIcon icon={mailOutline} /> {profile?.email}
          </IonText>
        </div>

        {/* Student Information */}
        <IonCard className="info-card">
          <IonCardContent>
            <h3 className="section-title">Student Information</h3>
            <IonList>
              {profile?.studentId && (
                <IonItem>
                  <IonIcon icon={personOutline} slot="start" />
                  <IonText>
                    <span className="label">Student ID:</span>
                    <span className="value">{profile.studentId}</span>
                  </IonText>
                </IonItem>
              )}
              {profile?.class && (
                <IonItem>
                  <IonIcon icon={bookOutline} slot="start" />
                  <IonText>
                    <span className="label">Class:</span>
                    <span className="value">
                      {profile.class.name}{profile.class.section ? ` - ${profile.class.section}` : ''}
                    </span>
                  </IonText>
                </IonItem>
              )}
              {profile?.tenant && (
                <IonItem>
                  <IonIcon icon={businessOutline} slot="start" />
                  <IonText>
                    <span className="label">School:</span>
                    <span className="value">{profile.tenant.name}</span>
                  </IonText>
                </IonItem>
              )}
            </IonList>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default StudentProfileScreen;