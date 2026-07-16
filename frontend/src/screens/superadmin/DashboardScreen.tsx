/**
 * Super Admin Dashboard Screen (Ionic React Version)
 * Main dashboard for Super Admin to manage schools
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import {
  schoolOutline,
  peopleOutline,
  personOutline,
  addCircleOutline,
  listOutline,
  logOutOutline,
  trendingUpOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { tenantsAPI } from '../../services/api';
import { Tenant } from '../../types';
import './DashboardScreen.css';

const SuperAdminDashboardScreen: React.FC = () => {
  const history = useHistory();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalStudents: 0,
    totalAdmins: 0,
  });
  const [recentSchools, setRecentSchools] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const response = await tenantsAPI.getAllTenants(1, 5);
      if (response.success && response.data) {
        setRecentSchools(response.data.tenants);
        setStats({
          totalSchools: response.data.pagination.total,
          totalStudents: response.data.tenants.reduce((sum, t) => sum + (t as any)._count?.users || 0, 0),
          totalAdmins: response.data.tenants.reduce((sum, t) => sum + (t as any)._count?.users || 0, 0),
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = async () => {
    await logout();
    history.push('/login');
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Super Admin Dashboard</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="super-admin-dashboard" fullscreen>
          <div className="loading-container">
            <IonSpinner name="crescent" />
            <p>Loading dashboard...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Super Admin Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="super-admin-dashboard" fullscreen>
        <div className="container">
          {/* Welcome Header */}
          <div className="welcome-header">
            <h1 className="welcome-text">Welcome, {user?.name}</h1>
            <p className="role-text">Super Administrator</p>
          </div>

          {/* Stats Cards */}
          <div className="stats-container">
            <IonCard className="stat-card">
              <IonIcon icon={schoolOutline} className="stat-icon" />
              <div className="stat-number">{stats.totalSchools}</div>
              <div className="stat-label">Schools</div>
            </IonCard>
            <IonCard className="stat-card">
              <IonIcon icon={peopleOutline} className="stat-icon" />
              <div className="stat-number">{stats.totalStudents}</div>
              <div className="stat-label">Students</div>
            </IonCard>
            <IonCard className="stat-card">
              <IonIcon icon={personOutline} className="stat-icon" />
              <div className="stat-number">{stats.totalAdmins}</div>
              <div className="stat-label">Admins</div>
            </IonCard>
          </div>

          {/* Quick Actions */}
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-container">
            <IonCard className="action-card" button onClick={() => history.push('/superadmin/schools/create')}>
              <IonIcon icon={addCircleOutline} className="action-icon" />
              <span className="action-text">Add School</span>
            </IonCard>
            <IonCard className="action-card" button onClick={() => history.push('/superadmin/schools')}>
              <IonIcon icon={listOutline} className="action-icon" />
              <span className="action-text">View All</span>
            </IonCard>
          </div>

          {/* Recent Schools */}
          <h2 className="section-title">Recent Schools</h2>
          {recentSchools.length === 0 ? (
            <div className="empty-container">
              <IonIcon icon={schoolOutline} className="empty-icon" />
              <p className="empty-text">No schools added yet</p>
              <p className="empty-subtext">Tap "Add School" to get started</p>
            </div>
          ) : (
            <div className="schools-list">
              {recentSchools.map((school) => (
                <IonCard
                  key={school.id}
                  className="school-card"
                  button
                  onClick={() => history.push(`/superadmin/schools/${school.id}`)}
                >
                  <IonCardContent>
                    <div className="school-info">
                      <h3 className="school-name">{school.name}</h3>
                      <p className="school-code">{school.code}</p>
                    </div>
                    <span className="school-status active">Active</span>
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          )}

          {/* Logout Button */}
          <IonButton
            expand="block"
            color="danger"
            className="logout-button"
            onClick={handleLogout}
          >
            <IonIcon icon={logOutOutline} slot="start" />
            Logout
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SuperAdminDashboardScreen;