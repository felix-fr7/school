/**
 * Class Dashboard Screen
 * Displays detailed information about a specific class including metrics,
 * recent homework, upcoming exams, and announcements.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AdminStackParamList, Class, Homework, ExamSchedule, News } from '../../types';
import { adminAPI } from '../../services/api';

type RoutePropType = RouteProp<AdminStackParamList, 'ClassDetail'>;
type NavigationProp = StackNavigationProp<AdminStackParamList, 'ClassDetail'>;

interface ClassDashboardData {
  class: Class & { teacher?: { id: string; name: string; email: string; phone?: string } };
  metrics: { totalStudents: number; attendanceRate: number };
  recentHomework: Homework[];
  upcomingExams: ExamSchedule[];
  recentAnnouncements: News[];
}

const ClassDashboardScreen: React.FC = () => {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const { classId } = route.params;

  const [dashboardData, setDashboardData] = useState<ClassDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await adminAPI.getClassDashboard(classId);
      if (response.success && response.data) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Error fetching class dashboard:', error);
      Alert.alert('Error', 'Failed to load class dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [classId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.loadingText}>Loading class dashboard...</Text>
      </View>
    );
  }

  if (!dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load class data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { class: classData, metrics, recentHomework, upcomingExams, recentAnnouncements } = dashboardData;
  const classFullName = classData.section ? `${classData.name} - ${classData.section}` : classData.name;

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
          <Text style={styles.className}>{classFullName}</Text>
          {classData.teacher && (
            <View style={styles.teacherInfo}>
              <Text style={styles.teacherLabel}>Class Teacher</Text>
              <Text style={styles.teacherName}>{classData.teacher.name}</Text>
              {classData.teacher.email && (
                <Text style={styles.teacherEmail}>{classData.teacher.email}</Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Quick Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.totalStudents}</Text>
            <Text style={styles.metricLabel}>Total Students</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.attendanceRate}%</Text>
            <Text style={styles.metricLabel}>Attendance Rate</Text>
          </View>
        </View>
      </View>

      {/* Navigation Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('StudentsList', { classId })}
          >
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionText}>View Students</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ExamSchedulesList', { classId })}
          >
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionText}>Manage Schedule</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Homework */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Homework</Text>
          <TouchableOpacity onPress={() => navigation.navigate('HomeworkList', { classId })}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {recentHomework.length > 0 ? (
          recentHomework.map((homework) => (
            <View key={homework.id} style={styles.listItem}>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{homework.title}</Text>
                <Text style={styles.listItemSubtitle}>{homework.subject}</Text>
                {homework.dueDate && (
                  <Text style={styles.listItemMeta}>
                    Due: {new Date(homework.dueDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => navigation.navigate('HomeworkList', { classId })}
              >
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyText}>No homework assigned yet</Text>
          </View>
        )}
      </View>

      {/* Upcoming Exams */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Exams</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ExamSchedulesList', { classId })}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {upcomingExams.length > 0 ? (
          upcomingExams.map((exam) => (
            <View key={exam.id} style={styles.listItem}>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{exam.title}</Text>
                <Text style={styles.listItemSubtitle}>{exam.subject}</Text>
                <Text style={styles.listItemMeta}>
                  {new Date(exam.date).toLocaleDateString()} • {exam.time}
                </Text>
                {exam.roomNo && <Text style={styles.listItemMeta}>Room: {exam.roomNo}</Text>}
              </View>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => navigation.navigate('ExamSchedulesList', { classId })}
              >
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No upcoming exams</Text>
          </View>
        )}
      </View>

      {/* Recent Announcements */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Announcements</Text>
          <TouchableOpacity onPress={() => navigation.navigate('NewsList')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {recentAnnouncements.length > 0 ? (
          recentAnnouncements.slice(0, 3).map((news) => (
            <View key={news.id} style={styles.announcementItem}>
              <Text style={styles.announcementTitle}>{news.title}</Text>
              <Text style={styles.announcementSummary} numberOfLines={2}>
                {news.summary || news.content.substring(0, 100)}...
              </Text>
              <Text style={styles.announcementDate}>
                {news.publishDate
                  ? new Date(news.publishDate).toLocaleDateString()
                  : new Date(news.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📰</Text>
            <Text style={styles.emptyText}>No announcements yet</Text>
          </View>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: '#2e7d32',
    padding: 20,
    paddingTop: 24,
  },
  headerContent: {
    flex: 1,
  },
  className: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  teacherInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 8,
  },
  teacherLabel: {
    fontSize: 12,
    color: '#a5d6a7',
    marginBottom: 4,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  teacherEmail: {
    fontSize: 13,
    color: '#c8e6c9',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  listItemSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  listItemMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  viewButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  announcementItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  announcementSummary: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  announcementDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default ClassDashboardScreen;