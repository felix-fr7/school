/**
 * Teacher Attendance Screen
 * Mark daily attendance for students in teacher's class
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { teacherAPI } from '../../services/api';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null;

interface Student {
  studentId: string;
  name: string;
  email: string;
  studentCode: string;
  status: AttendanceStatus;
  remarks?: string;
}

const TeacherAttendanceScreen: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0] as string;
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [summary, setSummary] = useState({ total: 0, marked: 0, unmarked: 0 });

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await teacherAPI.getClassAttendance(selectedDate);
      if (response.success && response.data) {
        const attendance = response.data.attendance.map(s => ({
          ...s,
          status: s.status as AttendanceStatus,
        }));
        setStudents(attendance);
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      Alert.alert('Error', 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const toggleStatus = (studentId: string) => {
    setStudents(prev =>
      prev.map(student => {
        if (student.studentId === studentId) {
          const statusCycle: AttendanceStatus[] = [null, 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
          const currentIndex = statusCycle.indexOf(student.status);
          const nextIndex = (currentIndex + 1) % statusCycle.length;
          const newStatus: AttendanceStatus = statusCycle[nextIndex] || null;
          return { ...student, status: newStatus };
        }
        return student;
      })
    );
  };

  const markAllPresent = () => {
    setStudents(prev =>
      prev.map(student => ({ ...student, status: 'PRESENT' as AttendanceStatus }))
    );
  };

  const handleSave = async () => {
    const unmarkedStudents = students.filter(s => s.status === null);
    if (unmarkedStudents.length > 0) {
      Alert.alert(
        'Unmarked Students',
        `${unmarkedStudents.length} students have not been marked. Mark them as absent?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark Absent',
            onPress: () => {
              setStudents(prev =>
                prev.map(s => s.status === null ? { ...s, status: 'ABSENT' as AttendanceStatus } : s)
              );
              setTimeout(() => saveAttendance(), 100);
            },
          },
        ]
      );
      return;
    }
    await saveAttendance();
  };

  const saveAttendance = async () => {
    try {
      setSaving(true);
      const attendanceData = students.map(student => ({
        studentId: student.studentId,
        status: student.status || 'ABSENT',
        remarks: student.remarks,
      }));

      const response = await teacherAPI.markAttendance(selectedDate, attendanceData);
      if (response.success && response.data) {
        Alert.alert('Success', `Attendance marked for ${response.data.marked} students`);
        fetchAttendance();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: Student['status']) => {
    switch (status) {
      case 'PRESENT': return '#4CAF50';
      case 'ABSENT': return '#f44336';
      case 'LATE': return '#FF9800';
      case 'EXCUSED': return '#2196F3';
      default: return '#e0e0e0';
    }
  };

  const getStatusLabel = (status: Student['status']) => {
    switch (status) {
      case 'PRESENT': return 'Present';
      case 'ABSENT': return 'Absent';
      case 'LATE': return 'Late';
      case 'EXCUSED': return 'Excused';
      default: return 'Tap to mark';
    }
  };

  const renderStudent = ({ item }: { item: Student }) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() => toggleStatus(item.studentId)}
      activeOpacity={0.7}
    >
      <View style={styles.studentAvatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentCode}>{item.studentCode}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
        <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7b1fa2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Date and Actions */}
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateLabel}>Date:</Text>
          <Text style={styles.dateValue}>{selectedDate}</Text>
        </View>
        <TouchableOpacity style={styles.markAllButton} onPress={markAllPresent}>
          <Text style={styles.markAllText}>✓ Mark All Present</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={[styles.summaryItem, styles.summaryMarked]}>
          <Text style={styles.summaryValue}>{summary.marked}</Text>
          <Text style={styles.summaryLabel}>Marked</Text>
        </View>
        <View style={[styles.summaryItem, styles.summaryUnmarked]}>
          <Text style={styles.summaryValue}>{summary.unmarked}</Text>
          <Text style={styles.summaryLabel}>Unmarked</Text>
        </View>
      </View>

      {/* Student List */}
      <FlatList
        data={students}
        renderItem={renderStudent}
        keyExtractor={(item) => item.studentId}
        contentContainerStyle={students.length === 0 ? { flex: 1 } : undefined}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No students found in your class</Text>
          </View>
        }
      />

      {/* Save Button */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          (saving || students.length === 0) && styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={saving || students.length === 0}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Attendance</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateContainer: { flexDirection: 'row', alignItems: 'center' },
  dateLabel: { fontSize: 14, color: '#666', marginRight: 8 },
  dateValue: { fontSize: 16, fontWeight: '600', color: '#333' },
  markAllButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  markAllText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  summaryItem: { alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: '#f5f5f5', flex: 1, marginHorizontal: 4 },
  summaryMarked: { backgroundColor: '#e8f5e9' },
  summaryUnmarked: { backgroundColor: '#fff3e0' },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  summaryLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 14,
    borderRadius: 12,
    elevation: 2,
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7b1fa2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 2 },
  studentCode: { fontSize: 12, color: '#666' },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center' },
  saveButton: {
    backgroundColor: '#7b1fa2',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default TeacherAttendanceScreen;