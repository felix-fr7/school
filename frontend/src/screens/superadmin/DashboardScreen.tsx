/**
 * Super Admin Dashboard Screen (Ionic React Version)
 * Main dashboard for Super Admin to manage schools
 * Luxury Corporate Light Hub - Ultra-premium modern design
 * White, Corporate Blue, and Royal Gold color palette
 * High-end premium animations, 60fps optimized
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
  IonGrid,
  IonRow,
  IonCol,
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
  refreshOutline,
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

// API Base URL for superadmin endpoints (using Vite env vars)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// System Configuration Toggle Component with loading state
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
  <IonItem lines="none" className="config-toggle-item">
    <IonIcon icon={icon as any} slot="start" className="config-icon" />
    <div className="config-text">
      <div className="config-label">{label}</div>
      <div className="config-description">{description}</div>
    </div>
    <IonToggle
      slot="end"
      checked={enabled}
      onIonChange={onToggle}
      disabled={loading}
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
  
  // Config loading states for optimistic UI
  const [configLoading, setConfigLoading] = useState<Record<string, boolean>>({});
  
  // Toast state for error messages
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('danger');
  
  // Refs for cleanup
  const telemetryIntervalRef = useRef<number | null>(null);

  // Helper function to get auth headers
  const getAuthHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }, [token]);

  // Fetch telemetry data from backend
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

  // Fetch system configuration from backend
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

  // Fetch dashboard data (tenants)
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

  // Handle config toggle with optimistic UI updates
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

  // Initial data fetch on mount
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

  // Set up telemetry polling interval
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

  // Get status color for telemetry display
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Optimal':
        return 'success';
      case 'Warning':
        return 'warning';
      case 'Degraded':
        return 'warning';
      case 'Critical':
        return 'danger';
      case 'Error':
        return 'danger';
      default:
        return 'medium';
    }
  };

  if (loading || telemetryLoading) {
    return (
      <IonPage>
        <IonHeader className="premium-header">
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
      <IonHeader className="premium-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={handleLogout} className="logout-btn-header">
              <IonIcon icon={logOutOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Super Admin Dashboard</IonTitle>
          <IonButtons slot="end">
            <IonButton className="user-badge">
              <IonIcon icon={peopleOutline} slot="start" />
              {user?.name}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="super-admin-dashboard" fullscreen>
        <div className="dashboard-container">
          {/* Metric Cards Row */}
          <div className="metrics-row">
            <IonCard className="metric-card">
              <IonCardContent>
                <IonIcon icon={schoolOutline} className="metric-icon" />
                <div className="metric-value">{stats.totalSchools}</div>
                <div className="metric-label">Active Tenants</div>
              </IonCardContent>
            </IonCard>
            <IonCard className="metric-card">
              <IonCardContent>
                {telemetryLoading ? (
                  <IonSpinner name="crescent" className="metric-spinner" />
                ) : (
                  <IonIcon icon={speedometerOutline} className="metric-icon" />
                )}
                <div className={`metric-value status-${getStatusColor(telemetry.status)}`}>
                  {telemetry.latency > 0 ? `${Math.round(telemetry.latency)}ms` : '--'}
                </div>
                <div className="metric-label">DB Pool Latency</div>
                {telemetryError && <div className="metric-error">{telemetryError}</div>}
              </IonCardContent>
            </IonCard>
            <IonCard className="metric-card">
              <IonCardContent>
                <IonIcon icon={peopleOutline} className="metric-icon" />
                <div className="metric-value">{stats.totalStudents}</div>
                <div className="metric-label">Total End Users</div>
              </IonCardContent>
            </IonCard>
          </div>

          {/* Quick Actions Section */}
          <div className="section-panel">
            <h2 className="section-title">Quick Actions</h2>
            <div className="actions-grid">
              <IonCard 
                className="action-card" 
                button 
                onClick={() => history.push('/superadmin/schools/create')}
              >
                <IonCardContent>
                  <IonIcon icon={addCircleOutline} className="action-icon" />
                  <span className="action-text">Add School</span>
                </IonCardContent>
              </IonCard>
              <IonCard 
                className="action-card" 
                button 
                onClick={() => history.push('/superadmin/schools')}
              >
                <IonCardContent>
                  <IonIcon icon={listOutline} className="action-icon" />
                  <span className="action-text">View All Schools</span>
                </IonCardContent>
              </IonCard>
            </div>
          </div>

          {/* Tenant Management Section */}
          <div className="section-panel">
            <h2 className="section-title">Tenant Management</h2>
            {recentSchools.length === 0 ? (
              <div className="empty-state">
                <IonIcon icon={schoolOutline} className="empty-icon" />
                <p className="empty-text">No schools added yet</p>
                <p className="empty-subtext">Tap "Add School" to get started</p>
              </div>
            ) : (
              <div className="tenant-list">
                {recentSchools.map((school) => (
                  <IonCard
                    key={school.id}
                    className="tenant-card"
                    button
                    onClick={() => history.push(`/superadmin/schools/${school.id}`)}
                  >
                    <IonCardContent>
                      <div className="tenant-info">
                        <h3 className="tenant-name">{school.name}</h3>
                        <p className="tenant-code">{school.code}</p>
                      </div>
                      <IonBadge className="status-badge active">ACTIVE</IonBadge>
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>
            )}
          </div>

          {/* System Configuration Section */}
          <div className="section-panel">
            <IonCard className="config-panel">
              <IonCardContent>
                <div className="panel-header">
                  <IonIcon icon={settingsOutline} className="panel-icon" />
                  <h3 className="panel-title">System Configuration</h3>
                </div>
                <IonList lines="none" className="config-list">
                  <ConfigToggle
                    icon={speedometerOutline}
                    label="Rate Limiting"
                    description="Control API request rates"
                    enabled={config.rateLimiting}
                    loading={!!configLoading.rateLimiting}
                    onToggle={() => handleConfigToggle('rateLimiting')}
                  />
                  <ConfigToggle
                    icon={shieldCheckmarkOutline}
                    label="Audit Logs"
                    description="Track all system changes"
                    enabled={config.auditLogs}
                    loading={!!configLoading.auditLogs}
                    onToggle={() => handleConfigToggle('auditLogs')}
                  />
                  <ConfigToggle
                    icon={timeOutline}
                    label="Auto Backup"
                    description="Scheduled database backups"
                    enabled={config.autoBackup}
                    loading={!!configLoading.autoBackup}
                    onToggle={() => handleConfigToggle('autoBackup')}
                  />
                </IonList>
              </IonCardContent>
            </IonCard>
          </div>

          {/* System Health Section */}
          <div className="section-panel">
            <IonCard className="health-panel">
              <IonCardContent>
                <div className="panel-header">
                  <h3 className="panel-title">System Health</h3>
                  <span className={`health-indicator ${telemetry.status === 'Optimal' ? 'online' : telemetry.status === 'Error' ? 'offline' : 'warning'}`}></span>
                </div>
                <div className="health-metrics">
                  <div className="health-metric">
                    <span className="health-label">API Response</span>
                    <span className={`health-value ${getStatusColor(telemetry.status)}`}>
                      {telemetry.latency > 0 ? `${Math.round(telemetry.latency)}ms` : '--'}
                    </span>
                  </div>
                  <div className="health-metric">
                    <span className="health-label">Uptime</span>
                    <span className="health-value">99.9%</span>
                  </div>
                  <div className="health-metric">
                    <span className="health-label">Active Sessions</span>
                    <span className="health-value">{stats.totalAdmins}</span>
                  </div>
                </div>
                {telemetry.timestamp && (
                  <div className="health-footer">
                    Last updated: {new Date(telemetry.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </IonCardContent>
            </IonCard>
          </div>
        </div>

        {/* Toast for notifications */}
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