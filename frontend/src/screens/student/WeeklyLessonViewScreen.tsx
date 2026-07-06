/**
 * Weekly Lesson View Screen (Student)
 * Read-only view of date-based timetable with classwork, homework, and attachments
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
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { weeklyLessonsAPI } from '../../services/api';
import { WeeklyLesson, LessonAttachment } from '../../types';

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

const WeeklyLessonViewScreen: React.FC = () => {
  const [lessons, setLessons] = useState<WeeklyLesson[]>([]);
  const [groupedLessons, setGroupedLessons] = useState<{ [date: string]: WeeklyLesson[] }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<WeeklyLesson | null>(null);

  const fetchWeeklyLessons = async () => {
    try {
      const response = await weeklyLessonsAPI.getStudentWeeklyLessons();
      if (response.success && response.data) {
        const lessonsList: WeeklyLesson[] = response.data.lessons || [];
        setLessons(lessonsList);
        
        // Group lessons by date
        const grouped: { [date: string]: WeeklyLesson[] } = {};
        lessonsList.forEach(lesson => {
          const date = lesson.lessonDate;
          if (!date) return;
          if (!grouped[date]) {
            grouped[date] = [];
          }
          grouped[date].push(lesson);
        });
        
        // Sort dates descending
        const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
        const sortedGrouped: { [date: string]: WeeklyLesson[] } = {};
        sortedDates.forEach(date => {
          const lessonsForDate = grouped[date];
          if (lessonsForDate) {
            sortedGrouped[date] = lessonsForDate.sort((a, b) => a.subject.localeCompare(b.subject));
          }
        });
        
        setGroupedLessons(sortedGrouped);
      }
    } catch (error: any) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to load homework');
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

  const handleLessonPress = (lesson: WeeklyLesson) => {
    setSelectedLesson(lesson);
  };

  const handleOpenAttachment = (attachment: LessonAttachment) => {
    Linking.openURL(attachment.url).catch(() => {
      Alert.alert('Error', 'Could not open file');
    });
  };

  const renderLessonCard = (lesson: WeeklyLesson) => (
    <TouchableOpacity
      key={lesson.id}
      style={styles.lessonCard}
      onPress={() => handleLessonPress(lesson)}
    >
      <View style={styles.lessonHeader}>
        <Text style={styles.lessonSubject}>{lesson.subject}</Text>
        {lesson.attachments.length > 0 && (
          <View style={styles.attachmentBadge}>
            <Text style={styles.attachmentBadgeText}>📎 {lesson.attachments.length}</Text>
          </View>
        )}
      </View>
      {lesson.homeworkText ? (
        <Text style={styles.lessonPreview} numberOfLines={2}>
          📝 {lesson.homeworkText}
        </Text>
      ) : lesson.classworkText ? (
        <Text style={styles.lessonPreview} numberOfLines={2}>
          📖 {lesson.classworkText}
        </Text>
      ) : (
        <Text style={styles.lessonEmpty}>No assignment</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading homework...</Text>
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
        <Text style={styles.headerTitle}>Homework & Classwork</Text>
        <Text style={styles.headerSubtitle}>
          Tap on any subject to view details and download files
        </Text>
      </View>

      {/* Date Sections */}
      {Object.entries(groupedLessons).map(([date, dateLessons]) => (
        <View key={date} style={styles.daySection}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>{formatDisplayDate(date)}</Text>
          </View>
          
          <View style={styles.lessonsContainer}>
            {dateLessons.length > 0 ? (
              dateLessons.map(renderLessonCard)
            ) : (
              <View style={styles.emptyDay}>
                <Text style={styles.emptyDayText}>No homework assigned</Text>
              </View>
            )}
          </View>
        </View>
      ))}

      {Object.keys(groupedLessons).length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>No homework assigned yet</Text>
        </View>
      )}

      {/* Lesson Detail Modal */}
      <Modal
        visible={!!selectedLesson}
        animationType="slide"
        onRequestClose={() => setSelectedLesson(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>{selectedLesson?.subject}</Text>
              <Text style={styles.modalSubtitle}>
                {selectedLesson ? formatDisplayDate(selectedLesson.lessonDate) : ''}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedLesson(null)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Classwork Section */}
            {selectedLesson?.classworkText && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📖 Classwork</Text>
                <Text style={styles.sectionContent}>{selectedLesson.classworkText}</Text>
              </View>
            )}

            {/* Homework Section */}
            {selectedLesson?.homeworkText && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📝 Homework</Text>
                <Text style={styles.sectionContent}>{selectedLesson.homeworkText}</Text>
              </View>
            )}

            {/* Attachments Section */}
            {selectedLesson && selectedLesson.attachments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📎 Attachments</Text>
                {selectedLesson.attachments.map((attachment, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.attachmentItem}
                    onPress={() => handleOpenAttachment(attachment)}
                  >
                    <View style={styles.attachmentInfo}>
                      <Text style={styles.attachmentName}>{attachment.name}</Text>
                      <Text style={styles.attachmentMeta}>
                        {(attachment.size / 1024).toFixed(1)} KB • Tap to download
                      </Text>
                    </View>
                    <Text style={styles.downloadIcon}>⬇️</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  header: { backgroundColor: '#2196F3', padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 30 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#bbdefb', marginTop: 4 },
  daySection: { marginTop: 16, paddingHorizontal: 16 },
  dayHeader: { backgroundColor: '#2196F3', paddingHorizontal: 16, paddingVertical: 10, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  dayTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  lessonsContainer: { backgroundColor: '#fff', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  lessonCard: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  lessonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  lessonSubject: { fontSize: 16, fontWeight: '600', color: '#333' },
  attachmentBadge: { backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  attachmentBadgeText: { fontSize: 11, color: '#1976d2' },
  lessonPreview: { fontSize: 13, color: '#666', marginTop: 4 },
  lessonEmpty: { fontSize: 13, color: '#999', fontStyle: 'italic' },
  emptyDay: { padding: 24, alignItems: 'center' },
  emptyDayText: { color: '#999', fontSize: 14 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#333' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2196F3', padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 30 },
  modalHeaderContent: { flex: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  modalSubtitle: { fontSize: 14, color: '#bbdefb', marginTop: 2 },
  modalCloseButton: { padding: 8 },
  modalCloseText: { fontSize: 24, color: '#fff' },
  modalContent: { flex: 1, padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#2196F3', marginBottom: 8 },
  sectionContent: { fontSize: 15, color: '#333', lineHeight: 22 },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 8 },
  attachmentInfo: { flex: 1 },
  attachmentName: { fontSize: 14, color: '#333', fontWeight: '500' },
  attachmentMeta: { fontSize: 12, color: '#999', marginTop: 2 },
  downloadIcon: { fontSize: 20 },
});

export default WeeklyLessonViewScreen;