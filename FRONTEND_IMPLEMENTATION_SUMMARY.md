# Frontend Implementation Summary

## Completed ✅

### 1. TypeScript Types (`frontend/src/types/index.ts`)
- Added `LessonAttachment` interface for file metadata
- Added `WeeklyLesson` interface for lesson data
- Added `WeekdayGridEntry` and `WeekdayGrid` interfaces
- Added `WeeklyLessonGridResponse` for API responses
- Added `CreateUpdateLessonInput` for form data
- Added `WEEKDAYS` constant array with weekday metadata
- Updated `TeacherStackParamList` with `WeeklyLessonGrid` screen
- Updated `StudentStackParamList` with `WeeklyLessonView` screen

### 2. API Service Layer (`frontend/src/services/api.ts`)
- Added `weeklyLessonsAPI` object with all methods:
  - `getTeacherWeeklyLessons()` - GET /api/teacher/weekly-lessons
  - `upsertWeeklyLesson(data)` - POST /api/teacher/weekly-lessons
  - `deleteWeeklyLesson(id)` - DELETE /api/teacher/weekly-lessons/:id
  - `uploadLessonAttachment(id, file)` - POST /api/teacher/weekly-lessons/:id/attachments
  - `deleteLessonAttachment(id, index)` - DELETE /api/teacher/weekly-lessons/:id/attachments/:index
  - `getStudentWeeklyLessons()` - GET /api/student/weekly-lessons
  - `getLessonsByWeekday(weekday)` - GET /api/student/weekly-lessons/:weekday

## Remaining Tasks

### 3. Teacher Component (`frontend/src/screens/teacher/WeeklyLessonGridScreen.tsx`)
Create a React Native screen with:
- Grid layout showing weekdays (Mon-Sat) as sections
- Each section displays lessons for that day
- Tap on lesson opens edit modal
- Edit modal with:
  - Classwork text input
  - Homework text input
  - Save button
  - File upload section using `expo-document-picker`
  - Attachment list with delete option
- Loading states and error handling
- Pull-to-refresh functionality

### 4. Student Component (`frontend/src/screens/student/WeeklyLessonViewScreen.tsx`)
Create a React Native screen with:
- Read-only grid layout similar to teacher view
- Tap on lesson opens detail modal
- Detail modal showing:
  - Classwork text (read-only)
  - Homework text (read-only)
  - Attachment list with clickable links
  - Use `expo-linking` or `Linking.openURL()` to open/download files
- Loading states and error handling
- Pull-to-refresh functionality

### 5. Navigation Registration
Update navigation files to register the new screens:
- Add `WeeklyLessonGrid` to `TeacherNavigator.tsx`
- Add `WeeklyLessonView` to `StudentNavigator.tsx`
- Add navigation buttons to respective dashboards

## Implementation Notes

### Design Pattern
Follow the existing patterns from `TeacherDashboardScreen.tsx`:
- Use `useNavigation` and `useRoute` hooks
- Use `useAuth` context for user data
- Use `weeklyLessonsAPI` for data fetching
- Implement loading states with `ActivityIndicator`
- Use `RefreshControl` for pull-to-refresh
- Use `Alert` for error messages and confirmations

### File Upload
For file uploads, use `expo-document-picker`:
```typescript
import * as DocumentPicker from 'expo-document-picker';

const result = await DocumentPicker.getDocumentAsync({
  type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  copyToCacheDirectory: true,
});

if (!result.canceled && result.assets.length > 0) {
  const file = result.assets[0];
  await weeklyLessonsAPI.uploadLessonAttachment(lessonId, {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  });
}
```

### File Opening (Student)
Use React Native's `Linking` module:
```typescript
import { Linking } from 'react-native';

const openAttachment = (url: string) => {
  Linking.openURL(url).catch(() => {
    Alert.alert('Error', 'Could not open file');
  });
};
```

### Styling
Follow the existing color scheme:
- Primary purple: `#7b1fa2` (teacher screens)
- Primary blue: `#2196F3` (student screens)
- Background: `#f5f5f5`
- Cards: `#fff` with elevation

## Next Steps

1. Create `WeeklyLessonGridScreen.tsx` for teachers
2. Create `WeeklyLessonViewScreen.tsx` for students
3. Register routes in navigation stacks
4. Add navigation buttons to dashboards
5. Test with real data

## Dependencies to Install

If not already installed:
```bash
npm install expo-document-picker
```

This will enable file picking functionality for teachers to upload attachments.