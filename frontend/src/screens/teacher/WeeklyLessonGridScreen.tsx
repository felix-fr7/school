/**
 * Weekly Lesson Grid Screen (Teacher)
 * Displays a weekly timetable grid for managing classwork and homework
 * Teachers can add/edit lessons and upload attachments
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TeacherStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { weeklyLessonsAPI } from '../../services/api';
import { WEEKDAYS, WeeklyLesson, WeekdayGrid, LessonAttachment } from '../../types';
import * as DocumentPicker from 'expo-document-picker';

type NavigationProp = StackNavigationProp<TeacherStackParamList, 'WeeklyLessonGrid'>;

const WeeklyLessonGridScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  
  // State
  const [grid, setGrid] = useState<WeekdayGrid | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<WeeklyLesson | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [classworkText, setClassworkText] = useState('');
  const [homeworkText, setHomeworkText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // Fetch weekly lessons
  const fetchWeeklyLessons = async () => {
    console.log('[WeeklyLessonGrid] Fetching weekly lessons...');
    try {
      const response = await weeklyLessonsAPI.getTeacherWeeklyLessons();
      console.log('[WeeklyLessonGrid] API Response:', JSON.stringify(response.data, null, 2));
      if (response.success && response.data) {
        setGrid(response.data.grid);
        console.log('[WeeklyLessonGrid] Grid set successfully');
      } else {
        console.warn('[WeeklyLessonGrid] API returned success=false or no data');
      }
    } catch (error: any) {
      console.error('[WeeklyLessonGrid] Error fetching weekly lessons:', error);
      console.error('[WeeklyLessonGrid] Error details:', JSON.stringify(error?.response?.data, null, 2));
      Alert.alert('Error', error?.response?.data?.error?.message || 'Failed to load weekly lessons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('[WeeklyLessonGrid] Component mounted, fetching data...');
    fetchWeeklyLessons();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWeeklyLessons();
  };

  // Handle lesson press - open modal
  const handleLessonPress = (lesson: WeeklyLesson) => {
    setSelectedLesson(lesson);
    setClassworkText(lesson.classworkText || '');
    setHomeworkText(lesson.homeworkText || '');
    setIsEditing(false);
  };

  // Handle save lesson (create/update)
  const handleSaveLesson = async () => {
    if (!selectedLesson) return;

    try {
      const response = await weeklyLessonsAPI.upsertWeeklyLesson({
        weekday: selectedLesson.weekday as 1 | 2 | 3 | 4 | 5 | 6,
        subject: selectedLesson.subject,
        classworkText,
        homeworkText,
      });

      if (response.success) {
        Alert.alert('Success', 'Lesson saved successfully');
        setIsEditing(false);
        setSelectedLesson(null);
        fetchWeeklyLessons();
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error?.message || 'Failed to save lesson');
    }
  };

  // Handle file upload
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0 && selectedLesson) {
        const file = result.assets[0];
        setUploading(true);

        try {
          const response = await weeklyLessonsAPI.uploadLessonAttachment(selectedLesson.id, {
            uri: file.uri,
            name: file.name || 'document',
            type: file.mimeType || 'application/octet-stream',
          });

          if (response.success) {
            Alert.alert('Success', 'Attachment uploaded successfully');
            fetchWeeklyLessons();
          }
        } catch (error: any) {
          Alert.alert('Error', error?.response?.data?.error?.message || 'Failed to upload attachment');
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  // Handle delete attachment
  const handleDeleteAttachment = (index: number) => {
    Alert.alert(
      'Delete Attachment',
      'Are you sure you want to delete this attachment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!selectedLesson) return;
            try {
              const response = await weeklyLessonsAPI.deleteLessonAttachment(
                selectedLesson.id,
                index
              );
              if (response.success) {
                Alert.alert('Success', 'Attachment deleted');
                fetchWeeklyLessons();
              }
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error?.message || 'Failed to delete attachment');
            }
          },
        },
      ]
    );
  };

  // Handle open attachment
  const handleOpenAttachment = (attachment: LessonAttachment) => {
    Linking.openURL(attachment.url).catch(() => {
      Alert.alert('Error', 'Could not open file');
    });
  };

  // Get weekday name
  const getWeekdayName = (dayId: number) => {
    return WEEKDAYS.find(d => d.id === dayId)?.name || '';
  };

  // Render lesson card
  const renderLessonCard = (lesson: WeeklyLesson) => (
    <TouchableOpacity
      key={lesson.id}
      style={styles.lessonCard}
      onPress={() => handleLessonPress(lesson)}
    >
      <View style={styles.lessonHeader}>
        <Text style={styles.lessonSubject}>{lesson.subject}</Text>
        {lesson.attachments && lesson.attachments.length > 0 && (
          <View style={styles.attachmentBadge}>
            <Text style={styles.attachmentBadgeText}>📎 {lesson.attachments.length}</Text>
          </View>
        )}
      </View>
      
      {lesson.homeworkText ? (
        <Text style={styles.lessonPreview} numberOfLines={1}>
          📝 {lesson.homeworkText}
        </Text>
      ) : lesson.classworkText ? (
        <Text style={styles.lessonPreview} numberOfLines={1}>
          📖 {lesson.classworkText}
        </Text>
      ) : (
        <Text style={styles.lessonEmpty}>No content</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    console.log('[WeeklyLessonGrid] Rendering loading state');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7b1fa2" />
        <Text style={styles.loadingText}>Loading timetable...</Text>
      </View>
    );
  }

  // Handle case where grid is null (API returned no data)
  if (!grid) {
    console.log('[WeeklyLessonGrid] Rendering no-data state');
    return (
      <View style={styles.noClassContainer}>
        <View style={styles.noClassIcon}>
          <Text style={styles.noClassEmoji}>📅</Text>
        </View>
        <Text style={styles.noClassTitle}>Weekly Timetable</Text>
        <Text style={styles.noClassDescription}>
          No lessons found for your class.{'\n'}
          Tap the refresh button to try again.
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchWeeklyLessons}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Weekly Timetable</Text>
        <Text style={styles.headerSubtitle}>
          Tap on any subject to add/edit classwork and homework
        </Text>
      </View>

      {/* Weekday Sections */}
      {WEEKDAYS.map((day) => (
        <View key={day.id} style={styles.daySection}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>{day.name}</Text>
          </View>
          
          <View style={styles.lessonsContainer}>
            {grid && grid[day.id] && grid[day.id].lessons.length > 0 ? (
              grid[day.id].lessons.map(renderLessonCard)
            ) : (
              <View style={styles.emptyDay}>
                <Text style={styles.emptyDayText}>No lessons scheduled</Text>
                <Text style={styles.emptyDayHint}>Tap + to add a lesson</Text>
              </View>
            )}
          </View>
        </View>
      ))}

      {/* Lesson Modal */}
      <Modal
        visible={!!selectedLesson}
        animationType="slide"
        onRequestClose={() => {
          setSelectedLesson(null);
          setIsEditing(false);
        }}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>
                {selectedLesson?.subject}
              </Text>
              <Text style={styles.modalSubtitle}>
                {selectedLesson && getWeekdayName(selectedLesson.weekday)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSelectedLesson(null);
                setIsEditing(false);
              }}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent}>
            {isEditing ? (
              // Edit Mode
              <View style={styles.editForm}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>📖 Classwork</Text>
                  <TextInput
                    style={styles.textArea}
                    value={classworkText}
                    onChangeText={setClassworkText}
                    placeholder="What students will do in class..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>📝 Homework</Text>
                  <TextInput
                    style={styles.textArea}
                    value={homeworkText}
                    onChangeText={setHomeworkText}
                    placeholder="Homework assignment..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={handleSaveLesson}
                    disabled={uploading}
                  >
                    <Text style={styles.buttonText}>
                      {uploading ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setIsEditing(false)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // View Mode
              <View style={styles.viewMode}>
                {/* Classwork Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📖 Classwork</Text>
                  <Text style={styles.sectionContent}>
                    {selectedLesson?.classworkText || 'No classwork assigned'}
                  </Text>
                </View>

                {/* Homework Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📝 Homework</Text>
                  <Text style={styles.sectionContent}>
                    {selectedLesson?.homeworkText || 'No homework assigned'}
                  </Text>
                </View>

                {/* Attachments Section */}
                {selectedLesson && selectedLesson.attachments.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📎 Attachments</Text>
                    {selectedLesson.attachments.map((attachment, index) => (
                      <View key={index} style={styles.attachmentItem}>
                        <TouchableOpacity
                          style={styles.attachmentRow}
                          onPress={() => handleOpenAttachment(attachment)}
                        >
                          <View style={styles.attachmentInfo}>
                            <Text style={styles.attachmentName} numberOfLines={1}>
                              {attachment.name}
                            </Text>
                            <Text style={styles.attachmentMeta}>
                              {(attachment.size / 1024).toFixed(1)} KB • {attachment.type.split('/')[1]?.toUpperCase() || 'File'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteAttachment(index)}
                          style={styles.deleteAttachmentButton}
                        >
                          <Text style={styles.deleteAttachmentIcon}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Modal Footer */}
          {!isEditing && (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.editButton]}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.buttonText}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.uploadButton]}
                onPress={handlePickDocument}
                disabled={uploading}
              >
                <Text style={styles.buttonText}>
                  {uploading ? '⏳ Uploading...' : '📎 Add File'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
  noClassContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  noClassIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  noClassEmoji: {
    fontSize: 48,
  },
  noClassTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  noClassDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#7b1fa2',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  daySection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  dayHeader: {
    backgroundColor: '#7b1fa2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  lessonsContainer: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lessonCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lessonSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  attachmentBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  attachmentBadgeText: {
    fontSize: 11,
    color: '#1976d2',
  },
  lessonPreview: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  lessonEmpty: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyDay: {
    padding: 24,
    alignItems: 'center',
  },
  emptyDayText: {
    color: '#999',
    fontSize: 14,
  },
  emptyDayHint: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#7b1fa2',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 30,
  },
  modalHeaderContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#e1bee7',
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  // Edit form
  editForm: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  uploadButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // View mode
  viewMode: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7b1fa2',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  attachmentMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  deleteAttachmentButton: {
    padding: 8,
  },
  deleteAttachmentIcon: {
    fontSize: 18,
  },
  // Modal footer
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: Platform.OS === 'android' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});

export default WeeklyLessonGridScreen;