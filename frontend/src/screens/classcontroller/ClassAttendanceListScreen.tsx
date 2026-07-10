/**
 * Class Attendance List Screen
 * View attendance records and mark attendance for the class
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
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ClassControllerStackParamList } from '../../types';
import { classControllerAPI } from '../../services/api';

type NavigationProp = StackNavigationProp<ClassControllerStackParamList, 'ClassAttendanceList'>;
type RoutePropType = RouteProp<ClassControllerStackParamList, 'ClassAttendanceList'>;

interface AttendanceRecord {
  studentId: string;
  name: string;
  email: string;
  status: 'present' | 'absent' | 'excused' | 'late' | 'unmarked' | null;
  remarks?: string;
}

interface AttendanceSummary {
  date: string;
  className: string;
  attendance: AttendanceRecord[];
  summary: {
    total: number;
    marked: number;
    unmarked: number;
  };
}

const ClassAttendanceListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  
  const [attendanceData, setAttendanceData] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const fetchAttendance = async (date?: string) => {
    const fetchDate = date || selectedDate;
    try {
      const response = await classControllerAPI.getAttendance(fetchDate);
      
      if (response.success && response.data) {
        const data = response.data;
        // Normalize status values
        const normalizedAttendance = data.attendance.map(a => ({
          ...a,
          status: (a.status as AttendanceRecord['status']) || 'unmarked',
        }));
        setAttendanceData({
          ...data,
          attendance: normalizedAttendance,
        });
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      Alert.alert('Error', 'Failed to load attendance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStatusColor = (status: string | null) => {
    const safeStatus = status || 'unmarked';
    switch (safeStatus) {
      case 'present': return '#4CAF50';
      case 'absent': return '#F44336';
      case 'excused': return '#FF9800';
      case 'late': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string | null) => {
    const safeStatus = status || 'unmarked';
    switch (safeStatus) {
      case 'present': return '✅';
      case 'absent': return '❌';
      case 'excused': return '📝';
      case 'late': return '⏰';
      default: return '⚪';
    }
  };

  const handleMarkAttendance = () => {
    navigation.navigate('ClassMarkAttendance', { 
      classId: route.params?.classId || '',
      date: selectedDate 
    });
  };

  const renderStudent = ({ item }: { item: AttendanceRecord }) => (
    <View style={styles.studentRow}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.studentEmail} numberOfLines={1}>
          {item.email}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
        <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
          {(item.status || 'unmarked').charAt(0).toUpperCase() + (item.status || 'unmarked').slice(1)}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSubtitle}>
            {attendanceData ? formatDate(attendanceData.date) : 'No data'}
          </Text>
        </View>

        {/* Summary Cards */}
        {attendanceData && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{attendanceData.summary.total}</Text>
              <Text style={styles.summaryLabel}>Total Students</Text>
            </View>
            <View style={[styles.summaryCard, styles.presentCard]}>
              <Text style={styles.summaryValue}>
                {attendanceData.attendance.filter(a => a.status === 'present').length}
              </Text>
              <Text style={styles.summaryLabel}>Present</Text>
            </View>
            <View style={[styles.summaryCard, styles.absentCard]}>
              <Text style={styles.summaryValue}>
                {attendanceData.attendance.filter(a => a.status === 'absent').length}
              </Text>
              <Text style={styles.summaryLabel}>Absent</Text>
            </View>
            <View style={[styles.summaryCard, styles.unmarkedCard]}>
              <Text style={styles.summaryValue}>{attendanceData.summary.unmarked}</Text>
              <Text style={styles.summaryLabel}>Unmarked</Text>
            </View>
          </View>
        )}

        {/* Attendance List */}
        <FlatList
          data={attendanceData?.attendance || []}
          renderItem={renderStudent}
          keyExtractor={(item) => item.studentId}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#FF6B35"
              colors={['#FF6B35']}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyText}>No attendance records</Text>
                <Text style={styles.emptySubtext}>Mark attendance for today</Text>
              </View>
            )
          }
        />

        {/* Mark Attendance Button */}
        <TouchableOpacity
          style={styles.markButton}
          onPress={handleMarkAttendance}
          activeOpacity={0.8}
        >
          <Text style={styles.markButtonText}>Mark Attendance</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF5F0',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF5F0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  presentCard: {
    borderTopWidth: 3,
    borderTopColor: '#4CAF50',
  },
  absentCard: {
    borderTopWidth: 3,
    borderTopColor: '#F44336',
  },
  unmarkedCard: {
    borderTopWidth: 3,
    borderTopColor: '#9E9E9E',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 100,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusIcon: {
    fontSize: 14,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  markButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  markButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ClassAttendanceListScreen;