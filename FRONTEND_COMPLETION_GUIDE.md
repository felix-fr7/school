# Frontend Completion Guide - Weekly Timetable System

## ✅ Completed Components

### 1. Teacher Screen (`frontend/src/screens/teacher/WeeklyLessonGridScreen.tsx`)
**Status**: Complete and functional

**Features**:
- Weekly grid layout showing Monday-Saturday
- Each day displays lessons with subject, homework preview, and attachment badges
- Tap on lesson opens modal with view/edit modes
- Edit mode: Classwork and Homework text inputs
- File upload using expo-document-picker
- Attachment management (view, delete)
- Pull-to-refresh functionality
- Loading states and error handling

**Styling**: Purple theme (#7b1fa2) matching teacher dashboard

---

## 📝 Remaining Components

### 2. Student Screen (`frontend/src/screens/student/WeeklyLessonViewScreen.tsx`)

Create this file with the following structure:

```typescript
/**
 * Weekly Lesson View Screen (Student)
 * Read-only view of weekly timetable with classwork, homework, and attachments
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
import { WEEKDAYS, WeeklyLesson, WeekdayGrid, LessonAttachment } from '../../types';

const WeeklyLessonViewScreen: React.FC = () => {
  const [grid, setGrid] = useState<WeekdayGrid | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<WeeklyLesson | null>(null);

  const fetchWeeklyLessons = async () => {
    try {
      const response = await weeklyLessonsAPI.getStudentWeeklyLessons();
      if (response.success && response.data) {
        setGrid(response.data.grid);
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
                <Text style={styles.emptyDayText}>No homework assigned</Text>
              </View>
            )}
          </View>
        </View>
      ))}

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
                {selectedLesson && WEEKDAYS.find(d => d.id === selectedLesson.weekday)?.name}
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
```

**Styling**: Blue theme (#2196F3) matching student screens

---

### 3. Navigation Registration

#### A. Update Teacher Navigator (`frontend/src/navigation/TeacherNavigator.tsx`)

Add this import at the top:
```typescript
import WeeklyLessonGridScreen from '../screens/teacher/WeeklyLessonGridScreen';
```

Add this screen to the stack:
```typescript
<Stack.Screen 
  name="WeeklyLessonGrid" 
  component={WeeklyLessonGridScreen}
  options={{ title: 'Weekly Timetable' }}
/>
```

#### B. Update Student Navigator (`frontend/src/navigation/StudentNavigator.tsx`)

Add this import at the top:
```typescript
import WeeklyLessonViewScreen from '../screens/student/WeeklyLessonViewScreen';
```

Add this screen to the stack:
```typescript
<Stack.Screen 
  name="WeeklyLessonView" 
  component={WeeklyLessonViewScreen}
  options={{ title: 'Homework' }}
/>
```

#### C. Add Navigation Buttons to Dashboards

**Teacher Dashboard** (`frontend/src/screens/teacher/TeacherDashboardScreen.tsx`):
Add a new action button in the `actionButtons` array:
```typescript
{ id: 'WeeklyLessonGrid', label: 'TIMETABLE', icon: '📅', count: 0, color: '#7b1fa2' },
```

**Student Dashboard** (if exists):
Add a navigation button to access the weekly lesson view.

---

## 🎯 Testing Checklist

After completing the implementation:

1. **Teacher Flow**:
   - [ ] Can view weekly grid
   - [ ] Can tap on lesson to view details
   - [ ] Can edit classwork and homework text
   - [ ] Can upload PDF/Image/DOC files
   - [ ] Can delete attachments
   - [ ] Can pull-to-refresh

2. **Student Flow**:
   - [ ] Can view weekly grid (read-only)
   - [ ] Can tap on lesson to view details
   - [ ] Can see classwork and homework text
   - [ ] Can click attachments to download/view
   - [ ] Can pull-to-refresh

3. **Security**:
   - [ ] Teachers only see their assigned class
   - [ ] Students only see their own class
   - [ ] File uploads respect tenant/class boundaries

---

## 📦 Dependencies

All required dependencies are already installed:
- `expo-document-picker` - For file selection
- `@react-navigation/native` - Already in project
- `@react-navigation/stack` - Already in project

---

## 🚀 Final Steps

1. Create `WeeklyLessonViewScreen.tsx` using the code above
2. Update navigation files to register both screens
3. Add navigation buttons to dashboards
4. Test with real teacher and student accounts
5. Verify file upload and download functionality

The backend is fully functional and ready to support all these operations!