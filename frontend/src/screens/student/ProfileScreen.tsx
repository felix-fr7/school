import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI } from '../../services/api';
import { User } from '../../types';

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
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#1565c0" /></View>;
  }

  const profile = user || currentUser;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.avatar}>{profile?.name?.charAt(0) || 'S'}</Text>
        <Text style={styles.name}>{profile?.name}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Student Information</Text>
        {profile?.studentId && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Student ID:</Text>
            <Text style={styles.value}>{profile.studentId}</Text>
          </View>
        )}
        {profile?.class && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Class:</Text>
            <Text style={styles.value}>
              {profile.class.name}{profile.class.section ? ` - ${profile.class.section}` : ''}
            </Text>
          </View>
        )}
        {profile?.tenant && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>School:</Text>
            <Text style={styles.value}>{profile.tenant.name}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1565c0', padding: 32, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', color: '#1565c0', fontSize: 36, fontWeight: 'bold', textAlign: 'center', textAlignVertical: 'center' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 16 },
  email: { fontSize: 14, color: '#bbdefb', marginTop: 4 },
  section: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 16 },
  infoRow: { flexDirection: 'row', marginBottom: 12 },
  label: { fontSize: 14, color: '#666', width: 100 },
  value: { fontSize: 14, color: '#333', flex: 1 },
});

export default StudentProfileScreen;