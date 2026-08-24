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
import { personOutline, schoolOutline, bookOutline, businessOutline, layersOutline } from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI } from '../../services/api';
import './ProfileScreen.css';

const StudentProfileScreen = () => {
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
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

  // Resolve class name & section from multiple possible API shapes
  const className =
    profile?.class?.name ||
    profile?.classId?.name ||
    profile?.class_name ||
    profile?.className ||
    null;

  const classSection =
    profile?.class?.section ||
    profile?.classId?.section ||
    profile?.section ||
    profile?.classSection ||
    null;

  const schoolName =
    profile?.tenant?.name ||
    profile?.schoolId?.schoolName ||
    profile?.schoolId?.name ||
    profile?.schoolName ||
    null;

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
        {/* Header — name + class/section only (no email) */}
        <div className="profile-header">
          <IonAvatar className="profile-avatar">
            <span>{profile?.name?.charAt(0) || 'S'}</span>
          </IonAvatar>
          <h2 className="profile-name">{profile?.name || 'Student'}</h2>
          {(className || classSection) && (
            <IonText color="light" className="profile-class-badge">
              <IonIcon icon={schoolOutline} />
              {' '}
              {[className, classSection].filter(Boolean).join(' - ')}
            </IonText>
          )}
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
              {profile?.rollNumber && (
                <IonItem>
                  <IonIcon icon={personOutline} slot="start" />
                  <IonText>
                    <span className="label">Roll Number:</span>
                    <span className="value">{profile.rollNumber}</span>
                  </IonText>
                </IonItem>
              )}
              <IonItem>
                <IonIcon icon={bookOutline} slot="start" />
                <IonText>
                  <span className="label">Class:</span>
                  <span className="value">{className || 'Not Assigned'}</span>
                </IonText>
              </IonItem>
              <IonItem>
                <IonIcon icon={layersOutline} slot="start" />
                <IonText>
                  <span className="label">Section:</span>
                  <span className="value">{classSection || 'Not Assigned'}</span>
                </IonText>
              </IonItem>
              {schoolName && (
                <IonItem>
                  <IonIcon icon={businessOutline} slot="start" />
                  <IonText>
                    <span className="label">School:</span>
                    <span className="value">{schoolName}</span>
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