/**
 * Class Create Homework Screen
 * Create new homework assignments for the class
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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ClassControllerStackParamList } from '../../types';
import { classControllerAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

type NavigationProp = StackNavigationProp<ClassControllerStackParamList, 'ClassCreateHomework'>;

const SUBJECTS = [
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
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [dueDate, setDueDate] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(false);

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
        subject: subject || 'Other',
        classId: currentClass.id,
      };
      
      if (dueDate) {
        homeworkData.dueDate = dueDate;
      }
      
      const response = await classControllerAPI.createHomework(homeworkData);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Homework created successfully!',
          [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error creating homework:', error);
      const errorMessage = error?.response?.data?.error?.message || 'Failed to create homework';
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
              Assign homework to your class
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
              <Text style={styles.inputLabel}>Subject *</Text>
              <View style={styles.subjectPicker}>
                {SUBJECTS.map((subj) => (
                  <TouchableOpacity
                    key={subj}
                    style={[
                      styles.subjectOption,
                      subject === subj && styles.subjectOptionActive,
                    ]}
                    onPress={() => setSubject(subj)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.subjectOptionText,
                        subject === subj && styles.subjectOptionTextActive,
                      ]}
                    >
                      {subj}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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

            {/* Due Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Due Date (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (e.g., 2026-07-15)"
                value={dueDate}
                onChangeText={setDueDate}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.inputHint}>
                Leave empty for no due date
              </Text>
            </View>

            {/* Publish Toggle */}
            <View style={styles.toggleGroup}>
              <Text style={styles.toggleLabel}>Publish Immediately</Text>
              <TouchableOpacity
                style={[
                  styles.toggleSwitch,
                  isPublished && styles.toggleSwitchActive,
                ]}
                onPress={() => setIsPublished(!isPublished)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    isPublished && styles.toggleThumbActive,
                  ]}
                />
              </TouchableOpacity>
              <Text style={styles.toggleHint}>
                {isPublished ? 'Visible to students' : 'Saved as draft'}
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleCreateHomework}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isPublished ? 'Publish Homework' : 'Save as Draft'}
              </Text>
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
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  subjectPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  toggleLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#FF6B35',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  toggleHint: {
    fontSize: 12,
    color: '#999',
    marginLeft: 12,
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