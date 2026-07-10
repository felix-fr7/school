/**
 * Class Create Exam Schedule Screen
 * Create new exam schedules for the class
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

type NavigationProp = StackNavigationProp<ClassControllerStackParamList, 'ClassCreateExamSchedule'>;

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

const ClassCreateExamScheduleScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { currentClass } = useAuth();
  
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Exam title is required');
      return false;
    }
    
    if (!date.trim()) {
      Alert.alert('Validation Error', 'Exam date is required');
      return false;
    }
    
    if (!time.trim()) {
      Alert.alert('Validation Error', 'Exam time is required');
      return false;
    }
    
    return true;
  };

  const handleCreateExam = async () => {
    if (!validateForm()) {
      return;
    }
    
    if (!currentClass?.id) {
      Alert.alert('Error', 'No class selected');
      return;
    }
    
    setLoading(true);
    
    try {
      const examData: {
        title: string;
        subject: string;
        date: string;
        time: string;
        classId: string;
        duration?: number;
        roomNo?: string;
      } = {
        title: title.trim(),
        subject: subject || 'Other',
        date,
        time,
        classId: currentClass.id,
      };
      
      if (duration) {
        examData.duration = parseInt(duration);
      }
      
      if (roomNo) {
        examData.roomNo = roomNo.trim();
      }
      
      const response = await classControllerAPI.createExamSchedule(examData);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Exam schedule created successfully!',
          [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error creating exam schedule:', error);
      const errorMessage = error?.response?.data?.error?.message || 'Failed to create exam schedule';
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
            <Text style={styles.headerTitle}>Create Exam Schedule</Text>
            <Text style={styles.headerSubtitle}>
              Add a new exam for your class
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Exam Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Midterm Exam"
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

            {/* Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (e.g., 2026-07-15)"
                value={date}
                onChangeText={setDate}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numeric"
              />
              <Text style={styles.inputHint}>
                Format: YYYY-MM-DD
              </Text>
            </View>

            {/* Time */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM (e.g., 09:00)"
                value={time}
                onChangeText={setTime}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numeric"
              />
              <Text style={styles.inputHint}>
                Format: HH:MM (24-hour)
              </Text>
            </View>

            {/* Duration */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 90"
                value={duration}
                onChangeText={setDuration}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numeric"
              />
            </View>

            {/* Room Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Room Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 101"
                value={roomNo}
                onChangeText={setRoomNo}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleCreateExam}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Create Exam Schedule</Text>
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

export default ClassCreateExamScheduleScreen;