/**
 * Admin Dashboard Screen
 * Main dashboard for School Admin
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
import { AdminStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../services/api';

type NavigationProp = StackNavigationProp<AdminStackParamList, 'AdminDashboard'>;

const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalHomework: 0,
    totalNews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // Fetch data from various endpoints
      const [classesRes, studentsRes, homeworkRes, newsRes] = await Promise.all([
        adminAPI.getClasses(),
        adminAPI.getStudents(1, 1),
        adminAPI.getHomework(1, 1),
        adminAPI.getNews(1, 1),
      ]);

      setStats({
        totalStudents: studentsRes.success ? studentsRes.data?.pagination?.total || 0 : 0,
        totalClasses: classesRes.success ? classesRes.data?.length || 0 : 0,
        totalHomework: homeworkRes.success ? homeworkRes.data?.pagination?.total || 0 : 0,
        totalNews: newsRes.success ? newsRes.data?.pagination?.total || 0 : 0,
      });
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
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  const menuItems = [
    { id: 'ClassesList', title: 'Classes', icon: '📚', count: stats.totalClasses },
    { id: 'TeachersList', title: 'Teachers', icon: '👨‍🏫', count: 0 },
    { id: 'StudentsList', title: 'Students', icon: '👨‍🎓', count: stats.totalStudents },
    { id: 'HomeworkList', title: 'Homework', icon: '📝', count: stats.totalHomework },
    { id: 'MarksList', title: 'Marks', icon: '📊', count: 0 },
    { id: 'AdminNews', title: 'News', icon: '📰', count: stats.totalNews },
    { id: 'AdminCirculars', title: 'Circulars', icon: '📋', count: 0 },
    { id: 'AdminExams', title: 'Exams', icon: '📅', count: 0 },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {user?.name}</Text>
        <Text style={styles.roleText}>School Administrator</Text>
      </View>


      {/* Menu Grid */}
      <View style={styles.menuGrid}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.id as any)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuTitle}>{item.title}</Text>
            {item.count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
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
    backgroundColor: '#2e7d32',
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
    color: '#c8e6c9',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItem: {
    width: '47%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    position: 'relative',
  },
  menuIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2e7d32',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 4,
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

export default AdminDashboardScreen;