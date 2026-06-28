/**
 * Schools List Screen - Super Admin
 * Lists all schools/tenants
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SuperAdminStackParamList, Tenant } from '../../types';
import { tenantsAPI } from '../../services/api';

type NavigationProp = StackNavigationProp<SuperAdminStackParamList, 'SchoolsList'>;

const SchoolsListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [schools, setSchools] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSchools = async () => {
    try {
      const response = await tenantsAPI.getAllTenants(1, 50);
      if (response.success && response.data) {
        setSchools(response.data.tenants);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchools();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a237e" />
      </View>
    );
  }

  const renderSchool = ({ item }: { item: Tenant }) => (
    <TouchableOpacity
      style={styles.schoolCard}
      onPress={() => navigation.navigate('SchoolDetail', { tenantId: item.id })}
    >
      <View style={styles.schoolInfo}>
        <Text style={styles.schoolName}>{item.name}</Text>
        <Text style={styles.schoolCode}>Code: {item.code}</Text>
        {item.email && <Text style={styles.schoolEmail}>{item.email}</Text>}
      </View>
      <View style={[
        styles.statusBadge,
        { backgroundColor: item.isActive ? '#4caf50' : '#f44336' }
      ]}>
        <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {schools.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No schools found</Text>
          <Text style={styles.emptySubtext}>Create your first school to get started</Text>
        </View>
      ) : (
        <FlatList
          data={schools}
          renderItem={renderSchool}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
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
  listContent: {
    padding: 16,
  },
  schoolCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
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
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  schoolEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
});

export default SchoolsListScreen;