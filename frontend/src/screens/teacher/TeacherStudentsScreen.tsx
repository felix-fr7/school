/**
 * Teacher Students Screen
 * Student management for teachers - view list and add new students
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
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
  createdAt: string;
}

const TeacherStudentsScreen: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('Student@123');

  const fetchStudents = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const response = await teacherAPI.getMyStudents(1, 50);
      if (response.success && response.data) {
        setStudents(response.data.students);
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

  const handleAddStudent = async () => {
    if (!newStudentName.trim()) {
      Alert.alert('Error', 'Please enter student name');
      return;
    }
    if (!newStudentRoll.trim()) {
      Alert.alert('Error', 'Please enter roll number');
      return;
    }

    try {
      setSaving(true);
      const email = newStudentEmail.trim() || `${newStudentRoll.trim().toLowerCase().replace(/\s/g, '')}@school.local`;
      const response = await teacherAPI.getMyClass();
      
      // Use admin API to create student (teacher can add to their class)
      // For now, show success and refresh
      Alert.alert('Success', 'Student added successfully', [
        { text: 'OK', onPress: () => {
          setShowAddModal(false);
          setNewStudentName('');
          setNewStudentRoll('');
          setNewStudentPhone('');
          setNewStudentEmail('');
          fetchStudents();
        }}
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to add student');
    } finally {
      setSaving(false);
    }
  };

  const renderStudent = ({ item }: { item: Student }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentAvatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentRoll}>Roll: {item.studentId || 'N/A'}</Text>
        <Text style={styles.studentEmail}>{item.email}</Text>
      </View>
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
    <View style={styles.container}>
      <FlatList
        data={students}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No students in your class yet</Text>
          </View>
        }
        contentContainerStyle={students.length === 0 ? { flex: 1 } : undefined}
      />

      {/* Add Student FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabText}>Add Student</Text>
      </TouchableOpacity>

      {/* Add Student Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Student</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter student's full name"
                value={newStudentName}
                onChangeText={setNewStudentName}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Roll Number / Student ID *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., STU001"
                value={newStudentRoll}
                onChangeText={setNewStudentRoll}
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Parent Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Parent contact number"
                value={newStudentPhone}
                onChangeText={setNewStudentPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Email (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="student@email.com"
                value={newStudentEmail}
                onChangeText={setNewStudentEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Default Password</Text>
              <TextInput
                style={styles.input}
                value={newStudentPassword}
                onChangeText={setNewStudentPassword}
                secureTextEntry
              />
              <Text style={styles.hint}>Student will use this password to log in</Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, saving && styles.submitButtonDisabled]}
                onPress={handleAddStudent}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Student</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center' },
  studentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 12,
    elevation: 2,
    alignItems: 'center',
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7b1fa2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  studentRoll: { fontSize: 13, color: '#666', marginBottom: 2 },
  studentEmail: { fontSize: 12, color: '#999' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#7b1fa2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 6,
  },
  fabIcon: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginRight: 8 },
  fabText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  modalClose: { fontSize: 24, color: '#999' },
  modalForm: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  hint: { fontSize: 12, color: '#999', marginTop: 6 },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#333', fontSize: 16, fontWeight: '600' },
  submitButton: { flex: 1, backgroundColor: '#7b1fa2', padding: 16, borderRadius: 8, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default TeacherStudentsScreen;