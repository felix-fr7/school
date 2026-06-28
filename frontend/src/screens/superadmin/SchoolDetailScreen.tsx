/**
 * School Detail Screen - Super Admin
 * Shows details of a specific school
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { SuperAdminStackParamList } from '../../types';
import { tenantsAPI } from '../../services/api';

type RoutePropType = RouteProp<SuperAdminStackParamList, 'SchoolDetail'>;

const SchoolDetailScreen: React.FC = () => {
  const route = useRoute<RoutePropType>();
  const { tenantId } = route.params;
  const [school, setSchool] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a237e" />
      </View>
    );
  }

  if (!school) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>School not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.schoolName}>{school.name}</Text>
        <Text style={styles.schoolCode}>{school.code}</Text>
      </View>

      {school.address || school.phone || school.email ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          {school.address && <Text style={styles.infoText}>📍 {school.address}</Text>}
          {school.phone && <Text style={styles.infoText}>📞 {school.phone}</Text>}
          {school.email && <Text style={styles.infoText}>📧 {school.email}</Text>}
        </View>
      ) : null}

      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalStudents}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalAdmins}</Text>
              <Text style={styles.statLabel}>Admins</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalClasses}</Text>
              <Text style={styles.statLabel}>Classes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalHomeworks}</Text>
              <Text style={styles.statLabel}>Homework</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admins</Text>
        {school.users && school.users.length > 0 ? (
          school.users.map((admin: any) => (
            <View key={admin.id} style={styles.adminCard}>
              <Text style={styles.adminName}>{admin.name}</Text>
              <Text style={styles.adminEmail}>{admin.email}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No admins assigned</Text>
        )}
      </View>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#1a237e',
    padding: 20,
    alignItems: 'center',
  },
  schoolName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  schoolCode: {
    fontSize: 14,
    color: '#c5cae9',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 12,
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
  adminCard: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  adminName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  adminEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default SchoolDetailScreen;