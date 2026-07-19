/**
 * School Detail Screen - Super Admin (Ionic React Version)
 * Shows details of a specific school/tenant
 * Luxury Corporate Light Hub - Ultra-premium modern design
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonBackButton,
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonSpinner,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
} from '@ionic/react';
import {
  businessOutline,
  mailOutline,
  callOutline,
  locationOutline,
  peopleOutline,
  personOutline,
  bookOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { useParams, Redirect } from 'react-router-dom';
import { tenantsAPI } from '../../services/api';
import './SchoolDetailScreen.css';

interface SchoolStats {
  totalStudents: number;
  totalAdmins: number;
  totalClasses: number;
  totalHomeworks: number;
}

interface SchoolUser {
  id: string;
  name: string;
  email: string;
}

const SchoolDetailScreen: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  
  // UUID guard - redirect non-UUID paths (like 'create') to the correct route
  // This prevents "School not found" when React Router accidentally matches /:tenantId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (tenantId && !uuidRegex.test(tenantId)) {
    // If it's a known static path like 'create' or 'new', redirect to that route
    if (tenantId === 'create' || tenantId === 'new') {
      return <Redirect to="/superadmin/schools/create" />;
    }
    // For any other non-UUID, redirect to schools list
    return <Redirect to="/superadmin/schools" />;
  }
  
  const [school, setSchool] = useState<any>(null);
  const [stats, setStats] = useState<SchoolStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchoolDetails = async () => {
      try {
        const [schoolRes, statsRes] = await Promise.all([
          tenantsAPI.getTenant(tenantId),
          tenantsAPI.getTenantStats(tenantId),
        ]);

        if (schoolRes.success && schoolRes.data) {
          setSchool(schoolRes.data);
        }
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data.stats);
        }
      } catch (error) {
        console.error('Error fetching school details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolDetails();
  }, [tenantId]);

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="detail-header">
          <IonToolbar>
            <IonBackButton defaultHref="/superadmin/schools" />
            <IonTitle>School Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="school-detail-content ion-padding" fullscreen>
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading school details...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!school) {
    return (
      <IonPage>
        <IonHeader className="detail-header">
          <IonToolbar>
            <IonBackButton defaultHref="/superadmin/schools" />
            <IonTitle>School Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="school-detail-content ion-padding" fullscreen>
          <div className="empty-container">
            <IonIcon icon={businessOutline} className="empty-icon" />
            <p className="empty-text">School not found</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="detail-header">
        <IonToolbar>
          <IonBackButton defaultHref="/superadmin/schools" />
          <IonTitle>{school.name}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="school-detail-content ion-padding" fullscreen>
        <div className="detail-container">
          {/* Header Card */}
          <IonCard className="header-card">
            <IonCardContent>
              <div className="header-content">
                <IonIcon icon={businessOutline} className="header-icon" />
                <div className="header-info">
                  <h1 className="school-name">{school.name}</h1>
                  <p className="school-code">{school.code}</p>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Contact Information */}
          {(school.address || school.phone || school.email) && (
            <IonCard className="info-card">
              <IonCardHeader>
                <IonCardTitle>Contact Information</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList lines="none">
                  {school.address && (
                    <IonItem>
                      <IonIcon icon={locationOutline} slot="start" color="primary" />
                      <IonLabel>{school.address}</IonLabel>
                    </IonItem>
                  )}
                  {school.phone && (
                    <IonItem>
                      <IonIcon icon={callOutline} slot="start" color="primary" />
                      <IonLabel>{school.phone}</IonLabel>
                    </IonItem>
                  )}
                  {school.email && (
                    <IonItem>
                      <IonIcon icon={mailOutline} slot="start" color="primary" />
                      <IonLabel>{school.email}</IonLabel>
                    </IonItem>
                  )}
                </IonList>
              </IonCardContent>
            </IonCard>
          )}

          {/* Statistics */}
          {stats && (
            <IonCard className="stats-card">
              <IonCardHeader>
                <IonCardTitle>Statistics</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div className="stats-grid">
                  <div className="stat-item">
                    <IonIcon icon={peopleOutline} className="stat-icon" />
                    <div className="stat-number">{stats.totalStudents}</div>
                    <div className="stat-label">Students</div>
                  </div>
                  <div className="stat-item">
                    <IonIcon icon={personOutline} className="stat-icon" />
                    <div className="stat-number">{stats.totalAdmins}</div>
                    <div className="stat-label">Admins</div>
                  </div>
                  <div className="stat-item">
                    <IonIcon icon={bookOutline} className="stat-icon" />
                    <div className="stat-number">{stats.totalClasses}</div>
                    <div className="stat-label">Classes</div>
                  </div>
                  <div className="stat-item">
                    <IonIcon icon={documentTextOutline} className="stat-icon" />
                    <div className="stat-number">{stats.totalHomeworks}</div>
                    <div className="stat-label">Homework</div>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/* Admins */}
          <IonCard className="admins-card">
            <IonCardHeader>
              <IonCardTitle>Administrators</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
          {school.users && school.users.length > 0 ? (
                <IonList lines="none">
                  {school.users.map((admin: SchoolUser) => (
                    <IonItem key={admin.id} className="admin-item">
                      <div className="admin-avatar">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <IonLabel>
                        <h3 className="admin-name">{admin.name}</h3>
                        <p className="admin-email">{admin.email}</p>
                      </IonLabel>
                      <IonBadge slot="end" className="admin-badge">Admin</IonBadge>
                    </IonItem>
                  ))}
                </IonList>
              ) : (
                <div className="empty-admins">
                  <p>No admins assigned to this school</p>
                </div>
              )}
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SchoolDetailScreen;