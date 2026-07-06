/**
 * Weekly Timetable Screen (Teacher) - Date-Based Diary Workflow
 * Teachers can dynamically add subjects, select dates, toggle between Classwork/Homework,
 * and manage lessons with a clean form interface.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TeacherStackParamList, WeeklyLesson } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { weeklyLessonsAPI } from '../../services/api';

type NavigationProp = StackNavigationProp<TeacherStackParamList, 'WeeklyTimetable'>;

// Helper to format date as "DD Month YYYY" (e.g., "06 July 2026")
const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;
  
  const options: Intl.DateTimeFormatOptions = { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  };
  return date.toLocaleDateString('en-GB', options);
};

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WeeklyTimetableScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  // Form state
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [activeContentType, setActiveContentType] = useState<'classwork' | 'homework'>('classwork');
  const [contentText, setContentText] = useState('');
  
  // Data state
  const [lessons, setLessons] = useState<WeeklyLesson[]>([]);
  const [uniqueSubjects, setUniqueSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Modal state
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingLesson, setEditingLesson] = useState<WeeklyLesson | null>(null);
  const [tempDate, setTempDate] = useState<string>(getTodayDate());

  // Ref for scrolling
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Fetch data
  const fetchWeeklyLessons = async () => {
    try {
      const response = await weeklyLessonsAPI.getTeacherWeeklyLessons();
      if (response.success && response.data) {
        const allLessons: WeeklyLesson[] = response.data.lessons || [];
        setLessons(allLessons);
        
        // Extract unique subjects
        const subjects = Array.from(new Set(allLessons.map(l => l.subject)));
        setUniqueSubjects(subjects);
        
        // Set default subject if available
        if (subjects.length > 0 && !selectedSubject) {
          setSelectedSubject(subjects[0] || '');
        }
      }
    } catch (error: any) {
      console.error('Error fetching lessons:', error);
      Alert.alert('Error', error?.response?.data?.error?.message || 'Failed to load lessons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeeklyLessons();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWeeklyLessons();
  };

  // Handle adding new subject
  const handleAddSubject = () => {
    if (!newSubjectName.trim()) {
      Alert.alert('Error', 'Please enter a subject name');
      return;
    }

    if (uniqueSubjects.includes(newSubjectName.trim())) {
      Alert.alert('Error', 'Subject already exists');
      setNewSubjectName('');
      setShowAddSubjectModal(false);
      return;
    }

    const trimmedSubject = newSubjectName.trim();
    setUniqueSubjects([...uniqueSubjects, trimmedSubject]);
    setSelectedSubject(trimmedSubject);
    setNewSubjectName('');
    setShowAddSubjectModal(false);
  };

  // Handle saving lesson (Create/Update)
  const handleSaveLesson = async () => {
    // Validation
    if (!selectedSubject) {
      Alert.alert('Error', 'Please select a subject');
      return;
    }

    if (!contentText.trim()) {
      Alert.alert('Error', 'Please enter content');
      return;
    }

    setSaving(true);
    try {
      // Prepare data with lessonDate instead of weekday
      const lessonData = {
        lessonDate: selectedDate,
        subject: selectedSubject,
        classworkText: activeContentType === 'classwork' ? contentText : (editingLesson?.classworkText || ''),
        homeworkText: activeContentType === 'homework' ? contentText : (editingLesson?.homeworkText || ''),
      };

      const response = await weeklyLessonsAPI.upsertWeeklyLesson(lessonData);
      
      if (response.success) {
        Alert.alert('Success', 'Lesson saved successfully');
        // Reset form
        setContentText('');
        setEditingLesson(null);
        // Refresh data
        fetchWeeklyLessons();
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error?.message || 'Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  // Handle editing a lesson
  const handleEditLesson = (lesson: WeeklyLesson) => {
    setEditingLesson(lesson);
    setSelectedSubject(lesson.subject);
    setSelectedDate(lesson.lessonDate);
    
    // Determine which content to edit (prefer homework if both exist)
    if (lesson.homeworkText) {
      setActiveContentType('homework');
      setContentText(lesson.homeworkText);
    } else if (lesson.classworkText) {
      setActiveContentType('classwork');
      setContentText(lesson.classworkText);
    } else {
      setActiveContentType('classwork');
      setContentText('');
    }

    // Scroll to top
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Handle deleting a lesson
  const handleDeleteLesson = (lessonId: string) => {
    Alert.alert(
      'Delete Lesson',
      'Are you sure you want to delete this lesson? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await weeklyLessonsAPI.deleteWeeklyLesson(lessonId);
              if (response.success) {
                Alert.alert('Success', 'Lesson deleted');
                fetchWeeklyLessons();
              }
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error?.message || 'Failed to delete lesson');
            }
          },
        },
      ]
    );
  };

  // Clear form
  const handleClearForm = () => {
    setSelectedSubject(uniqueSubjects.length > 0 ? (uniqueSubjects[0] || '') : '');
    setSelectedDate(getTodayDate());
    setActiveContentType('classwork');
    setContentText('');
    setEditingLesson(null);
  };

  // Open date picker
  const handleOpenDatePicker = () => {
    setTempDate(selectedDate);
    setShowDatePickerModal(true);
  };

  // Confirm date selection
  const handleConfirmDate = () => {
    setSelectedDate(tempDate);
    setShowDatePickerModal(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7b1fa2" />
        <Text style={styles.loadingText}>Loading timetable...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Date Diary</Text>
        <Text style={styles.headerSubtitle}>
          Create and manage classwork & homework by date
        </Text>
      </View>

      {/* Form Section */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>📝 Create/Edit Lesson</Text>

        {/* Subject Dropdown */}
        <View style={styles.formRow}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.label}>Subject</Text>
            <View style={styles.dropdownWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {uniqueSubjects.map((subject, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.subjectChip,
                      selectedSubject === subject && styles.subjectChipActive,
                    ]}
                    onPress={() => setSelectedSubject(subject)}
                  >
                    <Text
                      style={[
                        styles.subjectChipText,
                        selectedSubject === subject && styles.subjectChipTextActive,
                      ]}
                    >
                      {subject}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.addSubjectButton}
            onPress={() => setShowAddSubjectModal(true)}
          >
            <Text style={styles.addSubjectButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={handleOpenDatePicker}
          >
            <Text style={styles.dateInputIcon}>📅</Text>
            <Text style={styles.dateInputText}>
              {formatDisplayDate(selectedDate)}
            </Text>
            <Text style={styles.dateInputArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Content Type Toggles */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Content Type</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                activeContentType === 'classwork' && styles.toggleButtonActive,
              ]}
              onPress={() => setActiveContentType('classwork')}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  activeContentType === 'classwork' && styles.toggleButtonTextActive,
                ]}
              >
                📖 Classwork
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                activeContentType === 'homework' && styles.toggleButtonActive,
              ]}
              onPress={() => setActiveContentType('homework')}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  activeContentType === 'homework' && styles.toggleButtonTextActive,
                ]}
              >
                📝 Homework
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Text Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {activeContentType === 'classwork' ? '📖 Classwork Content' : '📝 Homework Content'}
          </Text>
          <TextInput
            style={styles.contentInput}
            value={contentText}
            onChangeText={setContentText}
            placeholder={`Enter ${activeContentType} assignment...`}
            placeholderTextColor="#999"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.sendButton]}
            onPress={handleSaveLesson}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Sending...' : '🚀 Send'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClearForm}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {editingLesson && (
          <View style={styles.editingBadge}>
            <Text style={styles.editingBadgeText}>
              ✏️ Editing: {editingLesson.subject} - {formatDisplayDate(editingLesson.lessonDate)}
            </Text>
          </View>
        )}
      </View>

      {/* Existing Lessons List */}
      <View style={styles.lessonsSection}>
        <Text style={styles.sectionTitle}>📋 Existing Lessons ({lessons.length})</Text>
        
        {lessons.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No lessons created yet</Text>
            <Text style={styles.emptyHint}>Use the form above to create your first lesson</Text>
          </View>
        ) : (
          lessons
            .sort((a, b) => {
              // Sort by date (newest first), then subject
              if (a.lessonDate !== b.lessonDate) {
                return b.lessonDate.localeCompare(a.lessonDate);
              }
              return a.subject.localeCompare(b.subject);
            })
            .map((lesson) => (
              <View key={lesson.id} style={styles.lessonCard}>
                <View style={styles.lessonCardHeader}>
                  <View style={styles.lessonInfo}>
                    <Text style={styles.lessonSubject}>{lesson.subject}</Text>
                    <Text style={styles.lessonDate}>
                      {formatDisplayDate(lesson.lessonDate)}
                    </Text>
                  </View>
                  <View style={styles.lessonActions}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleEditLesson(lesson)}
                    >
                      <Text style={styles.iconButtonText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDeleteLesson(lesson.id)}
                    >
                      <Text style={styles.iconButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {lesson.classworkText ? (
                  <View style={styles.lessonContent}>
                    <Text style={styles.contentLabel}>📖 Classwork:</Text>
                    <Text style={styles.contentText} numberOfLines={2}>
                      {lesson.classworkText}
                    </Text>
                  </View>
                ) : null}
                
                {lesson.homeworkText ? (
                  <View style={styles.lessonContent}>
                    <Text style={styles.contentLabel}>📝 Homework:</Text>
                    <Text style={styles.contentText} numberOfLines={2}>
                      {lesson.homeworkText}
                    </Text>
                  </View>
                ) : null}
                
                {!lesson.classworkText && !lesson.homeworkText && (
                  <Text style={styles.noContentText}>No content added yet</Text>
                )}
                
                {lesson.attachments && lesson.attachments.length > 0 && (
                  <View style={styles.attachmentBadge}>
                    <Text style={styles.attachmentBadgeText}>
                      📎 {lesson.attachments.length} attachment(s)
                    </Text>
                  </View>
                )}
              </View>
            ))
        )}
      </View>

      {/* Add Subject Modal */}
      <Modal
        visible={showAddSubjectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddSubjectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Subject</Text>
            <TextInput
              style={styles.modalInput}
              value={newSubjectName}
              onChangeText={setNewSubjectName}
              placeholder="e.g., Tamil, English, Mathematics"
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setNewSubjectName('');
                  setShowAddSubjectModal(false);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalAddButton]}
                onPress={handleAddSubject}
              >
                <Text style={styles.modalButtonText}>Add Subject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePickerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                style={styles.webDateInput}
              />
            ) : (
              <View style={styles.datePickerContainer}>
                <Text style={styles.datePickerHint}>
                  Enter date in YYYY-MM-DD format
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={tempDate}
                  onChangeText={setTempDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                />
                <Text style={styles.datePickerExample}>
                  Example: {getTodayDate()}
                </Text>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowDatePickerModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalAddButton]}
                onPress={handleConfirmDate}
              >
                <Text style={styles.modalButtonText}>Select</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    backgroundColor: '#7b1fa2',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e1bee7',
    marginTop: 4,
  },
  formSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  dropdownContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dropdownWrapper: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    minHeight: 44,
    backgroundColor: '#fafafa',
  },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  subjectChipActive: {
    backgroundColor: '#7b1fa2',
  },
  subjectChipText: {
    fontSize: 13,
    color: '#666',
  },
  subjectChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  addSubjectButton: {
    backgroundColor: '#7b1fa2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  addSubjectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
    minHeight: 48,
  },
  dateInputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  dateInputText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  dateInputArrow: {
    fontSize: 20,
    color: '#999',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  toggleButtonActive: {
    borderColor: '#7b1fa2',
    backgroundColor: '#f3e5f5',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#7b1fa2',
    fontWeight: '600',
  },
  contentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    backgroundColor: '#fafafa',
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: '#4CAF50',
  },
  clearButton: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editingBadge: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  editingBadgeText: {
    fontSize: 13,
    color: '#e65100',
    fontWeight: '500',
  },
  lessonsSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  lessonCard: {
    padding: 16,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  lessonCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  lessonDate: {
    fontSize: 13,
    color: '#7b1fa2',
    marginTop: 2,
  },
  lessonActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  iconButtonText: {
    fontSize: 18,
  },
  lessonContent: {
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#e1bee7',
  },
  contentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7b1fa2',
    marginBottom: 4,
  },
  contentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  noContentText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  attachmentBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
  },
  attachmentBadgeText: {
    fontSize: 11,
    color: '#1976d2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f0f0f0',
  },
  modalAddButton: {
    backgroundColor: '#7b1fa2',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  datePickerHint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  datePickerExample: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  webDateInput: {
    width: '100%',
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
  },
});

export default WeeklyTimetableScreen;