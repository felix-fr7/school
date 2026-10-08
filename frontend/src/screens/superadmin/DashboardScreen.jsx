/**
 * Super Admin Dashboard Screen (Ionic React Version - Cleaned)
 * Main dashboard for Super Admin to manage schools
 * Ultra-Luxury World-Class Gold Theme
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonCard,
  IonCardContent,
  IonIcon,
  IonSpinner,
  IonBadge,
  IonToast,
} from '@components/ui';
import {
  schoolOutline,
  peopleOutline,
  addCircleOutline,
  listOutline,
  logOutOutline,
  flashOutline,
  chevronForwardOutline,
  colorPaletteOutline,
} from '@components/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { tenantsAPI } from '../../services/api';
import './DashboardScreen.css';

const SuperAdminDashboardScreen = () => {
  const history = useHistory();
  const { user, logout } = useAuth();
  
  // Dashboard data states
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalStudents: 0,
    totalAdmins: 0,
  });
  const [recentSchools, setRecentSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('danger');

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await tenantsAPI.getAllTenants(1, 5);
      if (response.success && response.data) {
        setRecentSchools(response.data.tenants);
        setStats({
          totalSchools: response.data.pagination.total,
          totalStudents: response.data.tenants.reduce((sum, t) => sum + (t._count?.users || 0), 0),
          totalAdmins: response.data.tenants.reduce((sum, t) => sum + (t._count?.users || 0), 0),
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setToastMessage('Failed to load dashboard metrics');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mount logic
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLogout = async () => {
    await logout();
    history.push('/login');
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="super-admin-dashboard" fullscreen>
          <div className="luxury-loading-container">
            <IonSpinner name="crescent" className="gold-spinner" />
            <p className="loading-text">Initializing Ultra-Luxury Hub...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="luxury-header">
        <IonToolbar className="luxury-toolbar">
          <IonButtons slot="start">
            <IonButton onClick={handleLogout} className="luxury-icon-btn logout-btn app-nav-signout">
              <IonIcon icon={logOutOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>

          <IonTitle>
            SUPER ADMIN <span className="gold-text">HUB</span>
          </IonTitle>

          <IonButtons slot="end">
            <div className="user-badge-gold">
              <IonIcon icon={peopleOutline} className="user-icon" />
              <span>{user?.name || 'Super Admin'}</span>
            </div>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="super-admin-dashboard" fullscreen>
        <div className="dashboard-container">

          {/* Metric Cards Grid */}
          <div className="metrics-row">
            <IonCard className="luxury-metric-card">
              <IonCardContent>
                <div className="metric-header">
                  <span className="metric-label">Active Tenants</span>
                  <div className="icon-badge">
                    <IonIcon icon={schoolOutline} />
                  </div>
                </div>
                <div className="metric-value-gold">{stats.totalSchools}</div>
                <div className="metric-subtext">Managed Organizations</div>
              </IonCardContent>
            </IonCard>

            <IonCard className="luxury-metric-card">
              <IonCardContent>
                <div className="metric-header">
                  <span className="metric-label">Total End Users</span>
                  <div className="icon-badge">
                    <IonIcon icon={peopleOutline} />
                  </div>
                </div>
                <div className="metric-value-gold">{stats.totalStudents}</div>
                <div className="metric-subtext">Registered Across System</div>
              </IonCardContent>
            </IonCard>
          </div>

          {/* Quick Actions Panel */}
          <div className="section-panel">
            <h2 className="section-title-gold">
              <IonIcon icon={flashOutline} /> Quick Actions
            </h2>
            <div className="actions-grid">
              <IonCard 
                className="luxury-action-card" 
                button 
                onClick={() => history.push('/superadmin/schools/create')}
              >
                <IonCardContent>
                  <IonIcon icon={addCircleOutline} className="action-icon-gold" />
                  <span className="action-text">Add New School</span>
                </IonCardContent>
              </IonCard>

              <IonCard 
                className="luxury-action-card" 
                button 
                onClick={() => history.push('/superadmin/schools')}
              >
                <IonCardContent>
                  <IonIcon icon={listOutline} className="action-icon-gold" />
                  <span className="action-text">View All Schools</span>
                </IonCardContent>
              </IonCard>

              <IonCard
                className="luxury-action-card"
                button
                onClick={() => history.push('/superadmin/branding')}
              >
                <IonCardContent>
                  <IonIcon icon={colorPaletteOutline} className="action-icon-gold" />
                  <span className="action-text">Login Page Branding</span>
                </IonCardContent>
              </IonCard>
            </div>
          </div>

          {/* Tenant Management Section */}
          <div className="section-panel">
            <h2 className="section-title-gold">
              <IonIcon icon={schoolOutline} /> Recent Tenants
            </h2>
            {recentSchools.length === 0 ? (
              <div className="luxury-empty-state">
                <IonIcon icon={schoolOutline} className="empty-icon-gold" />
                <p className="empty-text">No schools added yet</p>
                <p className="empty-subtext">Click "Add New School" to get started</p>
              </div>
            ) : (
              <div className="tenant-list">
                {recentSchools.map((school) => (
                  <IonCard
                    key={school.id}
                    className="luxury-tenant-card"
                    button
                    onClick={() => history.push(`/superadmin/schools/${school.id}`)}
                  >
                    <IonCardContent>
                      <div className="tenant-info">
                        <h3 className="tenant-name">{school.name}</h3>
                        <p className="tenant-code">CODE: <span>{school.code}</span></p>
                      </div>
                      <div className="tenant-right">
                        <IonBadge className="luxury-status-badge">ACTIVE</IonBadge>
                        <IonIcon icon={chevronForwardOutline} className="arrow-icon" />
                      </div>
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notification Toast */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          color={toastColor}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default SuperAdminDashboardScreen;