/**
 * Class Create Homework Screen
 * Create new homework assignments for the class
 * Streamlined UI: Input Data -> Pick Date -> Click Publish
 * 
 * Features:
 * - Dynamic subject management (Add/Delete subjects)
 * - Native date picker
 * - Single Publish action
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ClassControllerStackParamList } from '../../types';
import { classControllerAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

type NavigationProp = StackNavigationProp<ClassControllerStackParamList, 'ClassCreateHomework'>;

const DEFAULT_SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'History',
  'Geography',
  'Computer Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Physical Education',
  'Art',
  'Music',
  'Other',
];

const ClassCreateHomeworkScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { currentClass } = useAuth();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(DEFAULT_SUBJECTS[0]);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Dynamic subject management state
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [newSubjectInput, setNewSubjectInput] = useState('');

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Homework title is required');
      return false;
    }
    
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Homework description is required');
      return false;
    }
    
    return true;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // Keep picker visible on iOS
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Add new subject to the list
  const handleAddSubject = () => {
    const trimmedSubject = newSubjectInput.trim();
    
    if (!trimmedSubject) {
      Alert.alert('Validation Error', 'Please enter a subject name');
      return;
    }
    
    if (subjects.includes(trimmedSubject)) {
      Alert.alert('Already Exists', `"${trimmedSubject}" is already in the list`);
      return;
    }
    
    setSubjects([...subjects, trimmedSubject]);
    setNewSubjectInput('');
    setSelectedSubject(trimmedSubject); // Auto-select the newly added subject
  };

  // Delete subject from the list
  const handleDeleteSubject = (subjectToDelete: string) => {
    // Prevent deleting the last subject
    if (subjects.length <= 1) {
      Alert.alert('Cannot Delete', 'At least one subject must remain');
      return;
    }
    
    const updatedSubjects = subjects.filter(s => s !== subjectToDelete);
    setSubjects(updatedSubjects);
    
    // If the deleted subject was selected, select the first available subject
    if (selectedSubject === subjectToDelete) {
      setSelectedSubject(updatedSubjects[0]);
    }
  };

  const handleCreateHomework = async () => {
    if (!validateForm()) {
      return;
    }
    
    if (!currentClass?.id) {
      Alert.alert('Error', 'No class selected');
      return;
    }
    
    setLoading(true);
    
    try {
      const homeworkData: {
        title: string;
        description: string;
        subject: string;
        classId: string;
        dueDate?: string;
      } = {
        title: title.trim(),
        description: description.trim(),
        subject: selectedSubject || 'Other',
        classId: currentClass.id,
      };
      
      if (dueDate) {
        homeworkData.dueDate = formatDate(dueDate);
      }
      
      const response = await classControllerAPI.createHomework(homeworkData);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Homework published successfully!',
          [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error creating homework:', error);
      const errorMessage = error?.response?.data?.error?.message || 'Failed to publish homework';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Homework</Text>
            <Text style={styles.headerSubtitle}>
              Assign homework to {currentClass?.name || 'your class'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter homework title"
                value={title}
                onChangeText={setTitle}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Subject Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subject</Text>
              <View style={styles.subjectPicker}>
                {subjects.map((subj) => (
                  <View key={subj} style={styles.subjectChipContainer}>
                    <TouchableOpacity
                      style={[
                        styles.subjectOption,
                        selectedSubject === subj && styles.subjectOptionActive,
                      ]}
                      onPress={() => setSelectedSubject(subj)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.subjectOptionText,
                          selectedSubject === subj && styles.subjectOptionTextActive,
                        ]}
                      >
                        {subj}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteSubjectButton}
                      onPress={() => handleDeleteSubject(subj)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deleteSubjectText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Add Subject Input */}
            <View style={styles.addSubjectRow}>
              <TextInput
                style={styles.addSubjectInput}
                placeholder="New subject name"
                value={newSubjectInput}
                onChangeText={setNewSubjectInput}
                autoCapitalize="words"
                autoCorrect={false}
                onSubmitEditing={handleAddSubject}
              />
              <TouchableOpacity
                style={styles.addSubjectButton}
                onPress={handleAddSubject}
                activeOpacity={0.7}
              >
                <Text style={styles.addSubjectButtonText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter homework description and instructions"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            {/* Due Date Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Due Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dateButtonIcon}>📅</Text>
                <Text style={styles.dateButtonText}>
                  {dueDate ? formatDate(dueDate) : 'Select due date (optional)'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dueDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>
          </View>

          {/* Publish Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleCreateHomework}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Publish Homework</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
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
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 120,
  },
  subjectPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  subjectOptionActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  subjectOptionText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  subjectOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deleteSubjectButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  deleteSubjectText: {
    fontSize: 12,
    color: '#E53935',
    fontWeight: '700',
    lineHeight: 14,
  },
  addSubjectRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  addSubjectInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  addSubjectButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSubjectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateButtonIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  dateButtonText: {
    fontSize: 15,
    color: '#666',
    flex: 1,
  },
  submitButton: {
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
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ClassCreateHomeworkScreen;