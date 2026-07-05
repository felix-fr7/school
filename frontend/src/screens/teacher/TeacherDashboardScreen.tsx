/**
 * Teacher Dashboard Screen
 * Main dashboard for teachers showing their assigned class and quick actions
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TeacherStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { teacherAPI } from '../../services/api';

type NavigationProp = StackNavigationProp<TeacherStackParamList, 'TeacherDashboard'>;

interface ClassData {
  id: string;
  name: string;
  section?: string;
  students: any[];
  homeworks: any[];
  examSchedules: any[];
  _count: { students: number; homeworks: number; examSchedules: number };
}

const TeacherDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClassData = async () => {
    try {
      const response = await teacherAPI.getMyClass();
      if (response.success && response.data) {
        // Check if the teacher actually has a class assigned
        // The backend returns id: null when no class is assigned
        if (response.data.id !== null && response.data.id !== 'No Class Assigned') {
          setClassData(response.data);
        } else {
          // No class assigned - keep classData as null to show the "No Class" screen
          setClassData(null);
        }
      }
    } catch (error: any) {
      console.error('Error fetching class data:', error);
      // If it's a 404 or other error, keep classData as null
      setClassData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClassData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClassData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7b1fa2" />
        <Text style={styles.loadingText}>Loading your class...</Text>
      </View>
    );
  }

  if (!classData) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.noClassContainer}>
          <View style={styles.noClassIcon}>
            <Text style={styles.noClassEmoji}>🏫</Text>
          </View>
          <Text style={styles.noClassTitle}>No Class Assigned Yet</Text>
          <Text style={styles.noClassDescription}>
            The administrator has not assigned you to a class yet.{'\n'}
            Please contact your school admin for assistance.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchClassData}>
            <Text style={styles.refreshButtonText}>Refresh Status</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const classFullName = classData.section ? `${classData.name} - ${classData.section}` : classData.name;

  const actionButtons = [
    { id: 'TeacherStudents', label: 'STUDENTS', icon: '👥', count: classData._count.students, color: '#4CAF50' },
    { id: 'TeacherHomework', label: 'HOMEWORK', icon: '📚', count: classData._count.homeworks, color: '#2196F3' },
    { id: 'TeacherMarks', label: 'MARKS', icon: '📊', count: 0, color: '#FF9800' },
    { id: 'TeacherCirculars', label: 'CIRCULARS', icon: '📋', count: 0, color: '#9C27B0' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Class Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Welcome, {user?.name}</Text>
          <Text style={styles.roleText}>Class Teacher</Text>
        </View>
        <View style={styles.classCard}>
          <Text style={styles.classLabel}>Your Assigned Class</Text>
          <Text style={styles.className}>{classFullName}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{classData._count.students}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{classData._count.homeworks}</Text>
              <Text style={styles.statLabel}>Homework</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{classData._count.examSchedules}</Text>
              <Text style={styles.statLabel}>Exams</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {actionButtons.map((button) => (
            <TouchableOpacity
              key={button.id}
              style={[styles.actionButton, { borderLeftColor: button.color }]}
              onPress={() => navigation.navigate(button.id as any, { title: button.label })}
            >
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>{button.icon}</Text>
                {button.count > 0 && (
                  <View style={[styles.badge, { backgroundColor: button.color }]}>
                    <Text style={styles.badgeText}>{button.count}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.actionTitle}>{button.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Homework */}
      {classData.homeworks.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Homework</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TeacherHomework', { title: 'HOMEWORK' })}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {classData.homeworks.slice(0, 3).map((hw) => (
            <View key={hw.id} style={styles.listItem}>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{hw.title}</Text>
                <Text style={styles.listItemSubtitle}>{hw.subject}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  noClassContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, minHeight: 400 },
  noClassIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f3e5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  noClassEmoji: { fontSize: 48 },
  noClassTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8, textAlign: 'center' },
  noClassDescription: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  refreshButton: { backgroundColor: '#7b1fa2', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  refreshButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerCard: { backgroundColor: '#7b1fa2', padding: 20, paddingTop: 30 },
  headerContent: { marginBottom: 16 },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  roleText: { fontSize: 14, color: '#e1bee7', marginTop: 4 },
  classCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 16 },
  classLabel: { fontSize: 12, color: '#e1bee7', marginBottom: 4 },
  className: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 11, color: '#e1bee7', marginTop: 2 },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 12, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  seeAllText: { fontSize: 14, color: '#7b1fa2', fontWeight: '500' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionButton: { width: '47%', backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0', borderLeftWidth: 4 },
  actionIconContainer: { position: 'relative', marginBottom: 8 },
  actionIcon: { fontSize: 32 },
  actionTitle: { fontSize: 12, fontWeight: '600', color: '#333', textAlign: 'center' },
  badge: { position: 'absolute', top: -8, right: -8, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600', paddingHorizontal: 4 },
  listItem: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  listItemContent: { flex: 1 },
  listItemTitle: { fontSize: 14, fontWeight: '500', color: '#333' },
  listItemSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  logoutButton: { backgroundColor: '#f44336', margin: 16, padding: 16, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default TeacherDashboardScreen;