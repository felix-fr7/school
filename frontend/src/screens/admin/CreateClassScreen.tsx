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
import { adminAPI } from '../../services/api';
import { User } from '../../types';

const CreateClassScreen: React.FC = () => {
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [password, setPassword] = useState('');
  const [teacherId, setTeacherId] = useState<string | undefined>(undefined);
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTeachers, setFetchingTeachers] = useState(false);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatedClassCode, setGeneratedClassCode] = useState<string | null>(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setFetchingTeachers(true);
      const response = await adminAPI.getTeachers(1, 100);
      if (response.success && response.data) {
        setTeachers(response.data.teachers);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setFetchingTeachers(false);
    }
  };

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

  const handleSubmit = async () => {
    // Validation
    if (!className.trim()) {
      Alert.alert('Error', 'Please enter class name');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password for class login');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        name: className.trim(),
        section: section.trim() || undefined,
        password: password,
      };

      if (teacherId) {
        payload.assignedTeacherId = teacherId;
      }

      const response = await adminAPI.createClass(payload);

      if (response.success && response.data) {
        const classCode = response.data.classCode || 'N/A';
        setGeneratedClassCode(classCode);
        Alert.alert(
          'Success',
          `Class created successfully!\n\nClass ID: ${classCode}\n\nShare this ID with students/parents for login.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setClassName('');
                setSection('');
                setPassword('');
                setTeacherId(undefined);
                setSelectedTeacher(null);
                setGeneratedClassCode(null);
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to create class');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <Text style={styles.description}>
          Create a new class for your school. Optionally assign an existing teacher as the class teacher.
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

        <Text style={styles.label}>Class Login Password *</Text>
        <TextInput
          style={styles.input}
          placeholder="Set a password for class login (min 6 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <Text style={styles.hintText}>
          This password will be used by students/parents to login to this class.
        </Text>

        <Text style={styles.label}>Assigned Class Teacher (Optional)</Text>
        {fetchingTeachers ? (
          <View style={styles.teacherPickerButton}>
            <ActivityIndicator size="small" />
            <Text style={styles.teacherPickerText}>Loading teachers...</Text>
          </View>
        ) : selectedTeacher ? (
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
        ) : (
          <TouchableOpacity
            style={styles.teacherPickerButton}
            onPress={() => setShowTeacherPicker(true)}
          >
            <Text style={styles.teacherPickerText}>Select a teacher...</Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Class</Text>
          )}
        </TouchableOpacity>
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

            <TextInput
              style={styles.searchInput}
              placeholder="Search teachers by name or email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {filteredTeachers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No teachers found</Text>
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
  hintText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
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
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
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
  selectIcon: {
    fontSize: 18,
    color: '#007AFF',
  },
});

export default CreateClassScreen;