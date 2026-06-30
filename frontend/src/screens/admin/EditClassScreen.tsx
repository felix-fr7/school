/**
 * Edit Class Screen
 * Allows admin to edit class details including name, section, assigned teacher,
 * and teacher credentials (email/password).
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
import { AdminStackParamList, User } from '../../types';
import { adminAPI } from '../../services/api';

type RoutePropType = RouteProp<AdminStackParamList, 'ClassDetail'>;
type NavigationProp = StackNavigationProp<AdminStackParamList, 'ClassDetail'>;

const EditClassScreen: React.FC = () => {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const { classId } = route.params;

  // Class fields
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [teacherId, setTeacherId] = useState<string | undefined>(undefined);
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);

  // Teacher credentials fields
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
        const classData = response.data;
        setClassName(classData.name);
        setSection(classData.section || '');
        if (classData.teacherId) {
          setTeacherId(classData.teacherId);
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
        setTeacherEmail(teacher.email || '');
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
    setTeacherEmail(teacher.email || '');
    setShowTeacherPicker(false);
    setSearchQuery('');
  };

  const handleClearTeacher = () => {
    setSelectedTeacher(null);
    setTeacherId(undefined);
    setTeacherEmail('');
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

        {/* Teacher Credentials Section */}
        {selectedTeacher && (
          <View style={styles.credentialsSection}>
            <Text style={styles.credentialsTitle}>Teacher Login Credentials</Text>
            <Text style={styles.credentialsNote}>
              These credentials are used by the teacher to log in and access this class.
            </Text>

            <Text style={styles.label}>Email (User ID)</Text>
            <TextInput
              style={styles.input}
              placeholder="teacher@school.com"
              value={teacherEmail}
              onChangeText={setTeacherEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={false}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                value={teacherPassword}
                onChangeText={setTeacherPassword}
                secureTextEntry={!showPassword}
                editable={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁' : '👁‍🗨'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.passwordHint}>
              Password is hidden for security. Contact the teacher directly if password reset is needed.
            </Text>
          </View>
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
  // Credentials section
  credentialsSection: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  credentialsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  credentialsNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    lineHeight: 16,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
    paddingRight: 16,
  },
  eyeIcon: {
    fontSize: 18,
  },
  passwordHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
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