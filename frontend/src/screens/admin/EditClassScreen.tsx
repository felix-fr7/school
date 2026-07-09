/**
 * Edit Class Screen
 * Allows admin to edit class details including name, section, assigned teacher,
 * and update class login password.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AdminStackParamList, User, Class } from '../../types';
import { adminAPI } from '../../services/api';

type RoutePropType = RouteProp<AdminStackParamList, 'ClassDetail'>;
type NavigationProp = StackNavigationProp<AdminStackParamList, 'ClassDetail'>;

const EditClassScreen: React.FC = () => {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const { classId } = route.params;

  // Class fields
  const [classData, setClassData] = useState<Class | null>(null);
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [teacherId, setTeacherId] = useState<string | undefined>(undefined);
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);

  // Class password management
  const [classPassword, setClassPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingTeachers, setFetchingTeachers] = useState(false);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchClassData();
    fetchAvailableTeachers();
  }, [classId]);

  const fetchClassData = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getClass(classId);
      if (response.success && response.data) {
        const data = response.data;
        setClassData(data);
        setClassName(data.name);
        setSection(data.section || '');
        if (data.teacherId) {
          setTeacherId(data.teacherId);
        }
      }
    } catch (error) {
      console.error('Error fetching class data:', error);
      Alert.alert('Error', 'Failed to load class data');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTeachers = async () => {
    try {
      setFetchingTeachers(true);
      const response = await adminAPI.getAvailableTeachers(classId, '', 1, 100);
      if (response.success && response.data) {
        setTeachers(response.data.teachers);
      }
    } catch (error) {
      console.error('Error fetching available teachers:', error);
    } finally {
      setFetchingTeachers(false);
    }
  };

  // Set selected teacher once teachers are loaded
  useEffect(() => {
    if (teacherId && teachers.length > 0) {
      const teacher = teachers.find(t => t.id === teacherId);
      if (teacher) {
        setSelectedTeacher(teacher);
      }
    }
  }, [teacherId, teachers]);

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTeacher = (teacher: User) => {
    setSelectedTeacher(teacher);
    setTeacherId(teacher.id);
    setShowTeacherPicker(false);
    setSearchQuery('');
  };

  const handleClearTeacher = () => {
    setSelectedTeacher(null);
    setTeacherId(undefined);
  };

  const handleUpdatePassword = async () => {
    if (!classPassword || classPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setUpdatingPassword(true);
      const response = await adminAPI.resetClassPassword(classId, classPassword);

      if (response.success) {
        Alert.alert('Success', 'Class password updated successfully!');
        setClassPassword('');
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to update password');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update password';
      Alert.alert('Error', errorMessage);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!className.trim()) {
      Alert.alert('Error', 'Please enter class name');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name: className.trim(),
        section: section.trim() || undefined,
      };

      // Only include teacherId if it was explicitly set
      if (teacherId !== undefined) {
        payload.teacherId = teacherId;
      }

      const response = await adminAPI.updateClass(classId, payload);

      if (response.success) {
        // Refresh class data to get latest
        fetchClassData();
        Alert.alert('Success', 'Class updated successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to update class');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update class';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading class data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        {/* Class ID Display */}
        <View style={styles.classIdCard}>
          <Text style={styles.classIdLabel}>Class Login ID</Text>
          <Text style={styles.classIdValue}>
            {classData?.classCode || 'Not yet generated'}
          </Text>
          <Text style={styles.classIdNote}>
            Share this ID with students/parents for class login
          </Text>
        </View>

        {/* Class Password Section */}
        <View style={styles.passwordCard}>
          <Text style={styles.passwordCardTitle}>Class Login Password</Text>
          <Text style={styles.passwordCardNote}>
            Set a password for students/parents to login to this class.
          </Text>

          <View style={styles.passwordInputRow}>
            <TextInput
              style={styles.passwordInputField}
              placeholder="Enter new password (min 6 characters)"
              value={classPassword}
              onChangeText={setClassPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[
                styles.updatePasswordButton,
                (!classPassword || classPassword.length < 6 || updatingPassword) &&
                  styles.updatePasswordButtonDisabled,
              ]}
              onPress={handleUpdatePassword}
              disabled={!classPassword || classPassword.length < 6 || updatingPassword}
            >
              {updatingPassword ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.updatePasswordButtonText}>Update</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.description}>
          Edit class details below. Changes will be saved to the database.
        </Text>

        <Text style={styles.label}>Class Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Class 10, Grade 5, MCA"
          value={className}
          onChangeText={setClassName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Section (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., A, B, C, -A, -B"
          value={section}
          onChangeText={setSection}
          autoCapitalize="characters"
          maxLength={10}
        />

        <Text style={styles.label}>Assigned Class Teacher (Optional)</Text>
        {fetchingTeachers ? (
          <View style={styles.teacherPickerButton}>
            <ActivityIndicator size="small" />
            <Text style={styles.teacherPickerText}>Loading available teachers...</Text>
          </View>
        ) : selectedTeacher ? (
          <View style={styles.selectedTeacherContainer}>
            <TouchableOpacity
              style={styles.teacherPickerButton}
              onPress={() => setShowTeacherPicker(true)}
            >
              <View style={styles.selectedTeacher}>
                <Text style={styles.selectedTeacherName}>{selectedTeacher.name}</Text>
                <Text style={styles.selectedTeacherEmail}>{selectedTeacher.email}</Text>
              </View>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearTeacherButton} onPress={handleClearTeacher}>
              <Text style={styles.clearTeacherText}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.teacherPickerButton}
            onPress={() => setShowTeacherPicker(true)}
          >
            <Text style={styles.teacherPickerText}>Select a teacher...</Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Teacher Selection Modal */}
      <Modal
        visible={showTeacherPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTeacherPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Class Teacher</Text>
              <TouchableOpacity onPress={() => setShowTeacherPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalNote}>
              Only teachers without a class assignment are shown.
            </Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Search teachers by name or email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {filteredTeachers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No available teachers found</Text>
              </View>
            ) : (
              <FlatList
                data={filteredTeachers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.teacherItem}
                    onPress={() => handleSelectTeacher(item)}
                  >
                    <View style={styles.teacherItemInfo}>
                      <Text style={styles.teacherItemName}>{item.name}</Text>
                      <Text style={styles.teacherItemEmail}>{item.email}</Text>
                      {item.class && (
                        <Text style={styles.teacherItemClass}>
                          Assigned: {item.class.name}{item.class.section ? ` - ${item.class.section}` : ''}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.selectIcon}>→</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  // Class ID Card
  classIdCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'solid',
  },
  classIdLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  classIdValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  classIdNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  // Password Card
  passwordCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  passwordCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  passwordCardNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    lineHeight: 16,
  },
  passwordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passwordInputField: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  updatePasswordButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  updatePasswordButtonDisabled: {
    opacity: 0.5,
  },
  updatePasswordButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  teacherPickerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teacherPickerText: {
    fontSize: 16,
    color: '#999',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#999',
  },
  selectedTeacherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedTeacher: {
    flex: 1,
  },
  selectedTeacherName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectedTeacherEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  changeText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  clearTeacherButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearTeacherText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#999',
    padding: 4,
  },
  modalNote: {
    fontSize: 12,
    color: '#666',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  teacherItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  teacherItemInfo: {
    flex: 1,
  },
  teacherItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  teacherItemEmail: {
    fontSize: 12,
    color: '#666',
  },
  teacherItemClass: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  selectIcon: {
    fontSize: 18,
    color: '#007AFF',
  },
});

export default EditClassScreen;