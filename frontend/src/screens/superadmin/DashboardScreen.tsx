/**
 * Super Admin Dashboard Screen
 * Main dashboard for Super Admin to manage schools
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SuperAdminStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { tenantsAPI } from '../../services/api';
import { Tenant } from '../../types';

type NavigationProp = StackNavigationProp<SuperAdminStackParamList, 'SuperAdminDashboard'>;

const SuperAdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalStudents: 0,
    totalAdmins: 0,
  });
  const [recentSchools, setRecentSchools] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a237e" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {user?.name}</Text>
        <Text style={styles.roleText}>Super Administrator</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalSchools}</Text>
          <Text style={styles.statLabel}>Schools</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalStudents}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalAdmins}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CreateSchool')}
        >
          <Text style={styles.actionIcon}>🏫</Text>
          <Text style={styles.actionText}>Add School</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('SchoolsList')}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>View All</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Schools */}
      <Text style={styles.sectionTitle}>Recent Schools</Text>
      {recentSchools.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No schools added yet</Text>
          <Text style={styles.emptySubtext}>Tap "Add School" to get started</Text>
        </View>
      ) : (
        recentSchools.map((school) => (
          <TouchableOpacity
            key={school.id}
            style={styles.schoolCard}
            onPress={() => navigation.navigate('SchoolDetail', { tenantId: school.id })}
          >
            <View style={styles.schoolInfo}>
              <Text style={styles.schoolName}>{school.name}</Text>
              <Text style={styles.schoolCode}>{school.code}</Text>
            </View>
            <Text style={styles.schoolStatus}>{school.isActive ? 'Active' : 'Inactive'}</Text>
          </TouchableOpacity>
        ))
      )}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1a237e',
    padding: 20,
    paddingTop: 30,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  roleText: {
    fontSize: 14,
    color: '#c5cae9',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    marginTop: -20,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  schoolCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  schoolCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  schoolStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4caf50',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    marginHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#f44336',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SuperAdminDashboardScreen;