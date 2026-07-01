/**
 * Teacher Students Screen
 * Student management for teachers - view list, add manually, edit student details, and bulk upload
 * Teachers can only update basic info (name, email, studentId) for students in their class
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
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { teacherAPI, utilsAPI } from '../../services/api';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showUploadResultModal, setShowUploadResultModal] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    totalProcessed: number;
    successfullyCreated: number;
    duplicates: number;
  } | null>(null);

  // Manual student creation state
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');

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

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditEmail(student.email);
    setEditStudentId(student.studentId || '');
    setShowEditModal(true);
  };

  const validateEditForm = () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Please enter student name');
      return false;
    }
    if (!editStudentId.trim()) {
      Alert.alert('Error', 'Please enter student ID');
      return false;
    }
    return true;
  };

  const handleUpdateStudent = async () => {
    if (!validateEditForm() || !editingStudent) return;

    try {
      setSaving(true);
      const response = await teacherAPI.updateStudent(editingStudent.id, {
        name: editName.trim(),
        email: editEmail.trim() || undefined,
        studentId: editStudentId.trim(),
      });

      if (response.success) {
        Alert.alert('Success', 'Student updated successfully', [
          {
            text: 'OK',
            onPress: () => {
              setShowEditModal(false);
              setEditingStudent(null);
              fetchStudents();
            },
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to update student');
    } finally {
      setSaving(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingStudent(null);
    setEditName('');
    setEditEmail('');
    setEditStudentId('');
  };

  // Manual student creation handlers
  const openAddStudentModal = () => {
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentId('');
    setNewStudentPhone('');
    setNewStudentPassword('');
    setShowAddStudentModal(true);
  };

  const closeAddStudentModal = () => {
    setShowAddStudentModal(false);
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentId('');
    setNewStudentPhone('');
    setNewStudentPassword('');
  };

  const validateNewStudentForm = () => {
    if (!newStudentName.trim()) {
      Alert.alert('Error', 'Please enter student name');
      return false;
    }
    if (!newStudentEmail.trim()) {
      Alert.alert('Error', 'Please enter student email');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStudentEmail.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!newStudentId.trim()) {
      Alert.alert('Error', 'Please enter student ID (roll number)');
      return false;
    }
    if (newStudentPassword && newStudentPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleCreateStudentManual = async () => {
    if (!validateNewStudentForm()) return;

    try {
      setSaving(true);
      const response = await teacherAPI.createStudentManual({
        name: newStudentName.trim(),
        email: newStudentEmail.trim().toLowerCase(),
        studentId: newStudentId.trim(),
        phone: newStudentPhone.trim() || undefined,
        password: newStudentPassword.trim() || undefined,
      });

      if (response.success) {
        Alert.alert('Success', 'Student created successfully', [
          {
            text: 'OK',
            onPress: () => {
              closeAddStudentModal();
              fetchStudents();
            },
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error?.message || 'Failed to create student'
      );
    } finally {
      setSaving(false);
    }
  };

  // Bulk upload handlers
  const handleBulkUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      if (!file) return;

      setUploading(true);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'text/csv',
      } as any);

      const response = await teacherAPI.bulkUploadStudents(
        formData as unknown as File
      );

      if (response.success && response.data) {
        setUploadResult({
          totalProcessed: response.data.totalProcessed,
          successfullyCreated: response.data.successfullyCreated,
          duplicates: response.data.duplicates,
        });
        setShowUploadResultModal(true);
        fetchStudents();
      }
    } catch (error: any) {
      Alert.alert(
        'Upload Failed',
        error.response?.data?.error?.message || 'Failed to upload file'
      );
    } finally {
      setUploading(false);
    }
  };

  // Download CSV template handler
  const handleDownloadSampleCSV = async () => {
    try {
      // Open the CSV download URL directly
      // The browser/device will handle the download
      const csvUrl = utilsAPI.getSampleCSVUrl();
      Linking.openURL(csvUrl);
    } catch (error) {
      console.error('Error opening CSV download:', error);
      Alert.alert('Error', 'Failed to download CSV template');
    }
  };

  const renderStudent = ({ item }: { item: Student }) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() => handleEditStudent(item)}
      activeOpacity={0.7}
    >
      <View style={styles.studentAvatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentRoll}>ID: {item.studentId || 'N/A'}</Text>
        <Text style={styles.studentEmail}>{item.email}</Text>
      </View>
      <View style={styles.editIcon}>
        <Text style={styles.editIconText}>✏️</Text>
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
      {/* Bulk Upload Button */}
      <TouchableOpacity style={styles.bulkUploadButton} onPress={handleBulkUpload}>
        <Text style={styles.bulkUploadIcon}>📂</Text>
        <Text style={styles.bulkUploadText}>Bulk Upload (CSV)</Text>
      </TouchableOpacity>

      {/* Download Sample CSV Button */}
      <TouchableOpacity style={styles.downloadTemplateButton} onPress={handleDownloadSampleCSV}>
        <Text style={styles.downloadTemplateIcon}>📄</Text>
        <Text style={styles.downloadTemplateText}>Download Sample CSV Template</Text>
      </TouchableOpacity>

      {/* Add Student Manually Button */}
      <TouchableOpacity style={styles.addManualButton} onPress={openAddStudentModal}>
        <Text style={styles.addManualIcon}>➕</Text>
        <Text style={styles.addManualText}>Add Student Manually</Text>
      </TouchableOpacity>

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
            <Text style={styles.emptySubtext}>Use the buttons above to add students</Text>
          </View>
        }
        contentContainerStyle={students.length === 0 ? { flex: 1 } : undefined}
      />

      {/* Info Text */}
      {students.length > 0 && (
        <View style={styles.infoBar}>
          <Text style={styles.infoText}>Tap on a student to edit their details</Text>
        </View>
      )}

      {/* Upload Progress Overlay */}
      {uploading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadProgressCard}>
            <ActivityIndicator size="large" color="#7b1fa2" />
            <Text style={styles.uploadProgressText}>
              Parsing data & uploading...
            </Text>
          </View>
        </View>
      )}

      {/* Upload Result Modal */}
      <Modal
        visible={showUploadResultModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUploadResultModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultIcon}>✅</Text>
              <Text style={styles.resultTitle}>Upload Complete</Text>
            </View>

            {uploadResult && (
              <View style={styles.resultStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{uploadResult.totalProcessed}</Text>
                  <Text style={styles.statLabel}>Total Parsed</Text>
                </View>
                <View style={[styles.statItem, styles.statSuccess]}>
                  <Text style={styles.statValue}>{uploadResult.successfullyCreated}</Text>
                  <Text style={styles.statLabel}>Created</Text>
                </View>
                <View style={[styles.statItem, styles.statWarning]}>
                  <Text style={styles.statValue}>{uploadResult.duplicates}</Text>
                  <Text style={styles.statLabel}>Skipped</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowUploadResultModal(false);
                setUploadResult(null);
              }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Student</Text>
              <TouchableOpacity onPress={closeEditModal}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter student's full name"
                value={editName}
                onChangeText={(text) => setEditName(text)}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Student ID *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., STU001"
                value={editStudentId}
                onChangeText={(text) => setEditStudentId(text)}
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Email (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="student@email.com"
                value={editEmail}
                onChangeText={(text) => setEditEmail(text)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={styles.hint}>Leave email field empty to keep current email</Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeEditModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, saving && styles.submitButtonDisabled]}
                onPress={handleUpdateStudent}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Update Student</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Student Manually Modal */}
      <Modal
        visible={showAddStudentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeAddStudentModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Student Manually</Text>
              <TouchableOpacity onPress={closeAddStudentModal}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter student's full name"
                value={newStudentName}
                onChangeText={(text) => setNewStudentName(text)}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="student@email.com"
                value={newStudentEmail}
                onChangeText={(text) => setNewStudentEmail(text)}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Student ID (Roll Number) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., STU001"
                value={newStudentId}
                onChangeText={(text) => setNewStudentId(text)}
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Phone Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Parent's phone number"
                value={newStudentPhone}
                onChangeText={(text) => setNewStudentPhone(text)}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Password (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Leave empty for default: Student@123"
                value={newStudentPassword}
                onChangeText={(text) => setNewStudentPassword(text)}
                secureTextEntry
              />
              <Text style={styles.hint}>Default password will be used if left empty</Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeAddStudentModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, saving && styles.submitButtonDisabled]}
                onPress={handleCreateStudentManual}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Student</Text>
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
  bulkUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7b1fa2',
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  bulkUploadIcon: { fontSize: 20 },
  bulkUploadText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  downloadTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#7b1fa2',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  downloadTemplateIcon: { fontSize: 20 },
  downloadTemplateText: { color: '#7b1fa2', fontSize: 15, fontWeight: '600' },
  addManualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  addManualIcon: { fontSize: 20 },
  addManualText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadProgressCard: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  uploadProgressText: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 350,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  resultIcon: { fontSize: 32, marginRight: 12 },
  resultTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: { alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: '#f5f5f5', flex: 1, marginHorizontal: 4 },
  statSuccess: { backgroundColor: '#e8f5e9' },
  statWarning: { backgroundColor: '#fff3e0' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  closeButton: {
    backgroundColor: '#7b1fa2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#bbb', textAlign: 'center', marginTop: 4 },
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
  editIcon: { padding: 8 },
  editIconText: { fontSize: 18 },
  infoBar: {
    backgroundColor: '#f3e5f5',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  infoText: { fontSize: 12, color: '#7b1fa2', textAlign: 'center' },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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