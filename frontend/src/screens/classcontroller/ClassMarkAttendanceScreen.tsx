/**
 * Class Mark Attendance Screen
 * Mark attendance for all students in the class for a specific date
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
  SafeAreaView,
  Switch,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ClassControllerStackParamList } from '../../types';
import { classControllerAPI } from '../../services/api';

type NavigationProp = StackNavigationProp<ClassControllerStackParamList, 'ClassMarkAttendance'>;
type RoutePropType = RouteProp<ClassControllerStackParamList, 'ClassMarkAttendance'>;

interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string | undefined;
}

interface AttendanceEntry {
  student: Student;
  isPresent: boolean;
}

const ClassMarkAttendanceScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  
  const [students, setStudents] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const dateParam = route.params?.date ?? today;
    setDate(dateParam);
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await classControllerAPI.getStudents(1, 100);
      
      if (response.success && response.data) {
        const studentsData = response.data.students || [];
        const attendanceEntries = studentsData.map(student => ({
          student: {
            ...student,
            studentId: student.studentId || '',
          },
          isPresent: true,
        }));
        setStudents(attendanceEntries);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (index: number) => {
    setStudents(prev => prev.map((entry, i) => 
      i === index ? { ...entry, isPresent: !entry.isPresent } : entry
    ));
  };

  const handleMarkAll = (present: boolean) => {
    setStudents(prev => prev.map(entry => ({ ...entry, isPresent: present })));
  };

  const handleSave = async () => {
    if (students.length === 0) {
      Alert.alert('Error', 'No students to mark attendance for');
      return;
    }

    setSaving(true);
    
    try {
      const attendanceData = students.map(entry => ({
        studentId: entry.student.id,
        status: entry.isPresent ? 'present' : 'absent',
      }));

      const response = await classControllerAPI.markAttendance(date, attendanceData);
      
      if (response.success && response.data) {
        Alert.alert(
          'Success',
          `Attendance marked for ${response.data.marked} students on ${formatDate(date)}`,
          [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      const errorMessage = error?.response?.data?.error?.message || 'Failed to mark attendance';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const renderStudent = ({ item, index }: { item: AttendanceEntry; index: number }) => (
    <View style={styles.studentRow}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName} numberOfLines={1}>
          {item.student.name}
        </Text>
        <Text style={styles.studentId} numberOfLines={1}>
          {item.student.studentId}
        </Text>
      </View>
      <View style={styles.toggleContainer}>
        <Text style={[styles.toggleLabel, item.isPresent && styles.toggleLabelPresent]}>
          {item.isPresent ? 'Present' : 'Absent'}
        </Text>
        <Switch
          value={item.isPresent}
          onValueChange={() => toggleAttendance(index)}
          trackColor={{ false: '#F44336', true: '#4CAF50' }}
          thumbColor="#FFFFFF"
          style={styles.switch}
        />
      </View>
    </View>
  );

  const presentCount = students.filter(s => s.isPresent).length;
  const absentCount = students.filter(s => !s.isPresent).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading students...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mark Attendance</Text>
          <Text style={styles.headerSubtitle}>
            {formatDate(date)}
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => handleMarkAll(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.quickActionIcon}>✅</Text>
            <Text style={styles.quickActionText}>Mark All Present</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => handleMarkAll(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.quickActionIcon}>❌</Text>
            <Text style={styles.quickActionText}>Mark All Absent</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBadge, styles.presentBadge]}>
            <Text style={styles.summaryValue}>{presentCount}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={[styles.summaryBadge, styles.absentBadge]}>
            <Text style={styles.summaryValue}>{absentCount}</Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
          <View style={[styles.summaryBadge, styles.totalBadge]}>
            <Text style={styles.summaryValue}>{students.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>

        {/* Students List */}
        <FlatList
          data={students}
          renderItem={renderStudent}
          keyExtractor={(item) => item.student.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              Save Attendance ({students.length} students)
            </Text>
          )}
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
    textTransform: 'capitalize',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIcon: {
    fontSize: 16,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  summaryBadge: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 3,
  },
  presentBadge: {
    borderTopColor: '#4CAF50',
  },
  absentBadge: {
    borderTopColor: '#F44336',
  },
  totalBadge: {
    borderTopColor: '#FF6B35',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
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
  studentId: {
    fontSize: 12,
    color: '#666',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F44336',
    width: 50,
    textAlign: 'right',
  },
  toggleLabelPresent: {
    color: '#4CAF50',
  },
  switch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  saveButton: {
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ClassMarkAttendanceScreen;