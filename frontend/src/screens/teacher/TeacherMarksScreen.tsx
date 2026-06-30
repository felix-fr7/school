/**
 * Teacher Marks Screen
 * Batch marks entry matrix for teachers to enter marks for all students
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { teacherAPI } from '../../services/api';

interface Student {
  id: string;
  name: string;
  email: string;
  studentId?: string;
}

interface MarkEntry {
  studentId: string;
  marks: string;
}

const EXAM_TYPES = ['Mid-Term', 'Quarterly', 'Annual', 'Unit Test', 'Half-Yearly'];
const SUBJECTS = ['Mathematics', 'Science', 'English', 'History', 'Geography', 'Hindi', 'Computer'];

const TeacherMarksScreen: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExam, setSelectedExam] = useState(EXAM_TYPES[0]);
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [totalMarks, setTotalMarks] = useState('100');
  const [markEntries, setMarkEntries] = useState<MarkEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState<'exam' | 'subject' | null>(null);

  const fetchStudents = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const response = await teacherAPI.getMyStudents(1, 50);
      if (response.success && response.data) {
        setStudents(response.data.students);
        setMarkEntries(response.data.students.map(s => ({ studentId: s.id, marks: '' })));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const onRefresh = () => fetchStudents(true);

  const updateMark = (studentId: string, marks: string) => {
    // Only allow numeric input
    if (marks && !/^\d*$/.test(marks)) return;
    setMarkEntries(prev =>
      prev.map(entry => entry.studentId === studentId ? { ...entry, marks } : entry)
    );
  };

  const validateForm = () => {
    if (!totalMarks || parseInt(totalMarks) <= 0) {
      Alert.alert('Error', 'Please enter valid total marks');
      return false;
    }
    const emptyMarks = markEntries.filter(e => !e.marks);
    if (emptyMarks.length > 0) {
      Alert.alert('Error', 'Please enter marks for all students');
      return false;
    }
    const invalidMarks = markEntries.filter(e => parseInt(e.marks) > parseInt(totalMarks) || parseInt(e.marks) < 0);
    if (invalidMarks.length > 0) {
      Alert.alert('Error', `Marks cannot exceed total marks (${totalMarks}) or be negative`);
      return false;
    }
    return true;
  };

  const handleSubmitMarks = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const marksData = markEntries.map(entry => ({
        studentId: entry.studentId,
        subject: selectedSubject || 'Mathematics',
        marksObtained: parseInt(entry.marks),
        totalMarks: parseInt(totalMarks),
        examType: selectedExam || 'Mid-Term',
      }));

      const response = await teacherAPI.createMarks(marksData);

      if (response.success && response.data) {
        Alert.alert('Success', `${response.data.length} marks submitted successfully!`, [
          {
            text: 'OK',
            onPress: () => {
              setMarkEntries(students.map(s => ({ studentId: s.id, marks: '' })));
            },
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to submit marks');
    } finally {
      setSaving(false);
    }
  };

  const renderStudent = ({ item, index }: { item: Student; index: number }) => {
    const entry = markEntries.find(e => e.studentId === item.id);
    return (
      <View style={styles.studentRow}>
        <View style={styles.studentIndex}>
          <Text style={styles.indexText}>{index + 1}</Text>
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentRoll}>{item.studentId || 'N/A'}</Text>
        </View>
        <View style={styles.markInputContainer}>
          <TextInput
            style={styles.markInput}
            placeholder="0"
            value={entry?.marks || ''}
            onChangeText={(text) => updateMark(item.id, text)}
            keyboardType="numeric"
            maxLength={3}
          />
          <Text style={styles.markMax}>/{totalMarks}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7b1fa2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filters Section */}
      <View style={styles.filtersCard}>
        <Text style={styles.filtersTitle}>Marks Entry</Text>

        <View style={styles.filtersRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Exam Type</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowDropdown(showDropdown === 'exam' ? null : 'exam')}
            >
              <Text style={styles.dropdownValue}>{selectedExam}</Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
            {showDropdown === 'exam' && (
              <View style={styles.dropdownMenu}>
                {EXAM_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={styles.dropdownItem}
                    onPress={() => { setSelectedExam(type); setShowDropdown(null); }}
                  >
                    <Text style={styles.dropdownItemText}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Subject</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowDropdown(showDropdown === 'subject' ? null : 'subject')}
            >
              <Text style={styles.dropdownValue}>{selectedSubject}</Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
            {showDropdown === 'subject' && (
              <View style={styles.dropdownMenu}>
                {SUBJECTS.map(subj => (
                  <TouchableOpacity
                    key={subj}
                    style={styles.dropdownItem}
                    onPress={() => { setSelectedSubject(subj); setShowDropdown(null); }}
                  >
                    <Text style={styles.dropdownItemText}>{subj}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.totalMarksRow}>
          <Text style={styles.filterLabel}>Total Marks</Text>
          <TextInput
            style={styles.totalMarksInput}
            value={totalMarks}
            onChangeText={setTotalMarks}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>
      </View>

      {/* Students Matrix */}
      <View style={styles.matrixHeader}>
        <Text style={styles.matrixTitle}>Students ({students.length})</Text>
        <Text style={styles.matrixSubtitle}>{selectedSubject} - {selectedExam}</Text>
      </View>

      <FlatList
        data={students}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No students in your class</Text>
          </View>
        }
        contentContainerStyle={students.length === 0 ? { flex: 1 } : undefined}
      />

      {/* Submit Button */}
      {students.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmitMarks}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Batch Marks</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filtersCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  filtersTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 16 },
  filtersRow: { flexDirection: 'row', gap: 12 },
  filterItem: { flex: 1, position: 'relative' },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6 },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
  },
  dropdownValue: { fontSize: 14, color: '#333' },
  dropdownIcon: { fontSize: 10, color: '#666' },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    zIndex: 1000,
  },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dropdownItemText: { fontSize: 14, color: '#333' },
  totalMarksRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, justifyContent: 'flex-end' },
  totalMarksInput: {
    width: 80,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    textAlign: 'center',
    marginLeft: 8,
  },
  matrixHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  matrixTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  matrixSubtitle: { fontSize: 12, color: '#7b1fa2', fontWeight: '500' },
  studentRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 8,
    elevation: 1,
    alignItems: 'center',
  },
  studentIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#7b1fa2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  indexText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '500', color: '#333' },
  studentRoll: { fontSize: 12, color: '#999', marginTop: 2 },
  markInputContainer: { flexDirection: 'row', alignItems: 'center' },
  markInput: {
    width: 60,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  markMax: { fontSize: 14, color: '#999', marginLeft: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center' },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: '#7b1fa2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default TeacherMarksScreen;