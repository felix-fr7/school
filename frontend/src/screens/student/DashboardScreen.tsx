/**
 * Student Dashboard Screen
 * Grid-based dashboard for students with icons for different features
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
import { StudentStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI } from '../../services/api';

type NavigationProp = StackNavigationProp<StudentStackParamList, 'StudentDashboard'>;

const StudentDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalHomework: 0,
    totalMarks: 0,
    totalNews: 0,
    totalCirculars: 0,
    upcomingExams: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await studentAPI.getDashboard();
      if (response.success && response.data) {
        setStats(response.data.stats);
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
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  // Grid menu items - replicating the WhatsApp-style dashboard
  const menuItems = [
    { id: 'StudentHomeworkList', title: 'HOME WORK', icon: '📚', count: stats.totalHomework, color: '#FF6B6B' },
    { id: 'StudentMarksList', title: 'MARKS', icon: '📊', count: stats.totalMarks, color: '#4ECDC4' },
    { id: 'StudentNewsList', title: 'NEWS', icon: '📰', count: stats.totalNews, color: '#45B7D1' },
    { id: 'StudentCircularsList', title: 'CIRCULARS', icon: '📋', count: stats.totalCirculars, color: '#96CEB4' },
    { id: 'StudentExamSchedules', title: 'EXAM SCHEDULE', icon: '📅', count: stats.upcomingExams, color: '#FFEAA7' },
    { id: 'StudentProfile', title: 'PROFILE', icon: '👤', count: 0, color: '#DDA0DD' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Welcome, {user?.name}</Text>
          <Text style={styles.roleText}>Student</Text>
          {user?.class && (
            <Text style={styles.classText}>
              Class: {user.class.name}{user.class.section ? ` - ${user.class.section}` : ''}
            </Text>
          )}
        </View>
      </View>

      {/* School Info Card */}
      {user?.tenant && (
        <View style={styles.schoolCard}>
          <Text style={styles.schoolName}>{user.tenant.name}</Text>
          <Text style={styles.schoolCode}>School Code: {user.tenant.code}</Text>
        </View>
      )}

      {/* Grid Menu */}
      <View style={styles.menuGrid}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, { borderLeftColor: item.color }]}
            onPress={() => navigation.navigate(item.id as any)}
          >
            <View style={styles.menuIconContainer}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              {item.count > 0 && (
                <View style={[styles.badge, { backgroundColor: item.color }]}>
                  <Text style={styles.badgeText}>{item.count}</Text>
                </View>
              )}
            </View>
            <Text style={styles.menuTitle}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Activity Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickAccessRow}>
          <TouchableOpacity
            style={styles.quickAccessButton}
            onPress={() => navigation.navigate('StudentHomeworkList')}
          >
            <Text style={styles.quickAccessIcon}>📝</Text>
            <Text style={styles.quickAccessText}>View Homework</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAccessButton}
            onPress={() => navigation.navigate('StudentMarksList')}
          >
            <Text style={styles.quickAccessIcon}>📊</Text>
            <Text style={styles.quickAccessText}>Check Marks</Text>
          </TouchableOpacity>
        </View>
      </View>

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
    backgroundColor: '#1565c0',
    padding: 20,
    paddingTop: 30,
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  roleText: {
    fontSize: 14,
    color: '#bbdefb',
    marginTop: 4,
  },
  classText: {
    fontSize: 14,
    color: '#bbdefb',
    marginTop: 2,
  },
  schoolCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  schoolCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItem: {
    width: '30%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    borderLeftWidth: 4,
  },
  menuIconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  menuIcon: {
    fontSize: 32,
  },
  menuTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAccessButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickAccessIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickAccessText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
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

export default StudentDashboardScreen;