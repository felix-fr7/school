/**
 * Super Admin Dashboard Screen (Ionic React Version)
 * Main dashboard for Super Admin to manage schools
 * Ultra-Luxury World-Class Gold Theme
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  IonToggle,
  IonList,
  IonItem,
  IonBadge,
  IonToast,
} from '@ionic/react';
import {
  schoolOutline,
  peopleOutline,
  speedometerOutline,
  addCircleOutline,
  listOutline,
  logOutOutline,
  settingsOutline,
  shieldCheckmarkOutline,
  timeOutline,
  pulseOutline,
  flashOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { tenantsAPI } from '../../services/api';
import { Tenant } from '../../types';
import './DashboardScreen.css';

// Telemetry data interface
interface TelemetryData {
  latency: number;
  status: 'Optimal' | 'Warning' | 'Degraded' | 'Critical' | 'Error';
  timestamp: string;
}

// System configuration interface
interface SystemConfig {
  rateLimiting: boolean;
  auditLogs: boolean;
  autoBackup: boolean;
}

// API Base URL for superadmin endpoints
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// System Configuration Toggle Component
interface ConfigToggleProps {
  icon: string;
  label: string;
  description: string;
  enabled: boolean;
  loading: boolean;
  onToggle: () => void;
}

const ConfigToggle: React.FC<ConfigToggleProps> = ({
  icon,
  label,
  description,
  enabled,
  loading,
  onToggle,
}) => (
  <IonItem lines="none" className="luxury-config-item">
    <div className="config-icon-wrapper">
      <IonIcon icon={icon as any} className="config-icon" />
    </div>
    <div className="config-text">
      <div className="config-label">{label}</div>
      <div className="config-description">{description}</div>
    </div>
    <IonToggle
      slot="end"
      checked={enabled}
      onIonChange={onToggle}
      disabled={loading}
      className="luxury-gold-toggle"
    />
  </IonItem>
);

const SuperAdminDashboardScreen: React.FC = () => {
  const history = useHistory();
  const { user, logout, token } = useAuth();
  
  // Dashboard data states
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalStudents: 0,
    totalAdmins: 0,
  });
  const [recentSchools, setRecentSchools] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Telemetry state
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    latency: 0,
    status: 'Optimal',
    timestamp: '',
  });
  const [telemetryLoading, setTelemetryLoading] = useState(true);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  
  // System configuration state
  const [config, setConfig] = useState<SystemConfig>({
    rateLimiting: true,
    auditLogs: true,
    autoBackup: false,
  });
  
  // Config loading states
  const [configLoading, setConfigLoading] = useState<Record<string, boolean>>({});
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('danger');
  
  // Refs
  const telemetryIntervalRef = useRef<number | null>(null);

  // Auth headers helper
  const getAuthHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }, [token]);

  // Fetch telemetry
  const fetchTelemetry = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/superadmin/db-latency`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setTelemetry({
          latency: data.data.latency,
          status: data.data.status,
          timestamp: data.data.timestamp,
        });
        setTelemetryError(null);
      } else {
        setTelemetryError('Failed to fetch telemetry data');
      }
    } catch (error) {
      console.error('Error fetching telemetry:', error);
      setTelemetryError('Connection error');
      setTelemetry({
        latency: 0,
        status: 'Error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setTelemetryLoading(false);
    }
  }, [getAuthHeaders]);

  // Fetch system config
  const fetchSystemConfig = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/superadmin/system-config`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setConfig(data.data.config);
      }
    } catch (error) {
      console.error('Error fetching system config:', error);
    }
  }, [getAuthHeaders]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
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
  }, []);

  // Handle config toggle
  const handleConfigToggle = useCallback(async (key: keyof SystemConfig) => {
    const previousValue = config[key];
    const newValue = !previousValue;
    
    setConfig(prev => ({
      ...prev,
      [key]: newValue,
    }));
    
    setConfigLoading(prev => ({
      ...prev,
      [key]: true,
    }));

    try {
      const toggleNameMap: Record<string, string> = {
        rateLimiting: 'rateLimiting',
        auditLogs: 'auditLogs',
        autoBackup: 'autoBackup',
      };

      const response = await fetch(`${API_BASE_URL}/superadmin/toggle-config`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          toggleName: toggleNameMap[key],
          value: newValue,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to update configuration');
      }

      setToastMessage(`${key} has been ${newValue ? 'enabled' : 'disabled'}`);
      setToastColor('success');
      setShowToast(true);
      
    } catch (error: any) {
      console.error('Error toggling config:', error);
      
      setConfig(prev => ({
        ...prev,
        [key]: previousValue,
      }));
      
      setToastMessage(`Failed to update ${key}: ${error.message}`);
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setConfigLoading(prev => ({
        ...prev,
        [key]: false,
      }));
    }
  }, [config, getAuthHeaders]);

  // Mount logic
  useEffect(() => {
    const initializeDashboard = async () => {
      await Promise.all([
        fetchDashboardData(),
        fetchTelemetry(),
        fetchSystemConfig(),
      ]);
    };

    initializeDashboard();
  }, [fetchDashboardData, fetchTelemetry, fetchSystemConfig]);

  // Polling interval
  useEffect(() => {
    telemetryIntervalRef.current = window.setInterval(() => {
      fetchTelemetry();
    }, 10000);

    return () => {
      if (telemetryIntervalRef.current) {
        window.clearInterval(telemetryIntervalRef.current);
      }
    };
  }, [fetchTelemetry]);

  const handleLogout = async () => {
    await logout();
    history.push('/login');
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'Optimal': return 'status-optimal';
      case 'Warning':
      case 'Degraded': return 'status-warning';
      case 'Critical':
      case 'Error': return 'status-critical';
      default: return 'status-unknown';
    }
  };

  if (loading || telemetryLoading) {
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
            <IonButton onClick={handleLogout} className="luxury-icon-btn logout-btn">
              <IonIcon icon={logOutOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>

          <IonTitle className="luxury-title">
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
                  <span className="metric-label">DB Latency</span>
                  <div className="icon-badge">
                    <IonIcon icon={speedometerOutline} />
                  </div>
                </div>
                <div className={`metric-value-gold ${getStatusClass(telemetry.status)}`}>
                  {telemetry.latency > 0 ? `${Math.round(telemetry.latency)}ms` : '--'}
                </div>
                <div className="metric-subtext">
                  Status: <span className="status-highlight">{telemetry.status}</span>
                </div>
                {telemetryError && <div className="metric-error">{telemetryError}</div>}
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