/**
 * Student Exam Schedules Screen
 * View upcoming exam schedules
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { contentAPI } from '../../services/api';

interface ExamScheduleItem {
  id: string;
  subject: string;
  date: string;
  startTime?: string;
  endTime?: string;
  roomNumber?: string;
  createdAt: string;
  class?: { name: string; section?: string };
}

const StudentExamSchedulesScreen: React.FC = () => {
  const [examSchedules, setExamSchedules] = useState<ExamScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExamSchedules = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const response = await contentAPI.getExamSchedules(1, 20);
      if (response.success && response.data) {
        setExamSchedules(response.data.examSchedules);
      }
    } catch (error) {
      console.error('Error fetching exam schedules:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExamSchedules();
  }, []);

  const onRefresh = () => fetchExamSchedules(true);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderExamSchedule = ({ item }: { item: ExamScheduleItem }) => (
    <View style={styles.examCard}>
      <View style={styles.examHeader}>
        <Text style={styles.examSubject}>{item.subject}</Text>
        <Text style={styles.examDate}>{formatDate(item.date)}</Text>
      </View>
      {item.startTime && item.endTime && (
        <Text style={styles.examTime}>
          {item.startTime} - {item.endTime}
        </Text>
      )}
      {item.roomNumber && (
        <Text style={styles.examRoom}>Room: {item.roomNumber}</Text>
      )}
      {item.class && (
        <Text style={styles.examClass}>
          {item.class.name}{item.class.section ? ` - ${item.class.section}` : ''}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7b1fa2" />
      </View>
    );
  }

  return (
    <FlatList
      data={examSchedules}
      renderItem={renderExamSchedule}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyText}>No upcoming exam schedules</Text>
        </View>
      }
      contentContainerStyle={examSchedules.length === 0 ? { flex: 1 } : undefined}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center' },
  examCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#7b1fa2',
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  examSubject: { fontSize: 16, fontWeight: '700', color: '#333' },
  examDate: { fontSize: 14, color: '#7b1fa2', fontWeight: '600' },
  examTime: { fontSize: 14, color: '#666', marginTop: 4 },
  examRoom: { fontSize: 14, color: '#666', marginTop: 4 },
  examClass: { fontSize: 12, color: '#999', marginTop: 4, fontStyle: 'italic' },
});

export default StudentExamSchedulesScreen;
