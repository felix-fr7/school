/**
 * App Entry Point
 * Main application component with navigation setup
 * Multi-Tenant School Management System
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { PostProvider } from './src/contexts/PostContext';

// Auth Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// Super Admin Screens
import SuperAdminDashboardScreen from './src/screens/superadmin/DashboardScreen';
import SchoolsListScreen from './src/screens/superadmin/SchoolsListScreen';
import CreateSchoolScreen from './src/screens/superadmin/CreateSchoolScreen';
import SchoolDetailScreen from './src/screens/superadmin/SchoolDetailScreen';

// Admin Screens
import AdminDashboardScreen from './src/screens/admin/DashboardScreen';
import PlaceholderScreen from './src/screens/admin/PlaceholderScreen';
import ClassesListScreen from './src/screens/admin/ClassesListScreen';
import CreateClassScreen from './src/screens/admin/CreateClassScreen';
import ClassDashboardScreen from './src/screens/admin/ClassDashboardScreen';
import EditClassScreen from './src/screens/admin/EditClassScreen';
import TeachersListScreen from './src/screens/admin/TeachersListScreen';
import TeacherDetailScreen from './src/screens/admin/TeacherDetailScreen';
import EditTeacherScreen from './src/screens/admin/EditTeacherScreen';
import CreateTeacherScreen from './src/screens/admin/CreateTeacherScreen';
import StudentsListScreen from './src/screens/admin/StudentsListScreen';
import CreateStudentScreen from './src/screens/admin/CreateStudentScreen';
import HomeworkListScreen from './src/screens/admin/HomeworkListScreen';
import CreateHomeworkScreen from './src/screens/admin/CreateHomeworkScreen';
import MarksListScreen from './src/screens/admin/MarksListScreen';
import AddMarksScreen from './src/screens/admin/AddMarksScreen';
import NewsListScreen from './src/screens/admin/NewsListScreen';
import CreateNewsScreen from './src/screens/admin/CreateNewsScreen';
import CircularsListScreen from './src/screens/admin/CircularsListScreen';
import CreateCircularScreen from './src/screens/admin/CreateCircularScreen';
import ExamSchedulesListScreen from './src/screens/admin/ExamSchedulesListScreen';
import CreateExamScheduleScreen from './src/screens/admin/CreateExamScheduleScreen';
// New Admin Content Screens with Visibility Control
import AdminNewsScreen from './src/screens/admin/AdminNewsScreen';
import AdminCircularsScreen from './src/screens/admin/AdminCircularsScreen';
import AdminExamsScreen from './src/screens/admin/AdminExamsScreen';

// Teacher Screens
import TeacherDashboardScreen from './src/screens/teacher/TeacherDashboardScreen';
import TeacherStudentsScreen from './src/screens/teacher/TeacherStudentsScreen';
import TeacherHomeworkScreen from './src/screens/teacher/TeacherHomeworkScreen';
import TeacherMarksScreen from './src/screens/teacher/TeacherMarksScreen';
import TeacherNewsScreen from './src/screens/teacher/TeacherNewsScreen';
import TeacherCircularsScreen from './src/screens/teacher/TeacherCircularsScreen';
import WeeklyLessonGridScreen from './src/screens/teacher/WeeklyLessonGridScreen';

// Student Screens
import StudentDashboardScreen from './src/screens/student/DashboardScreen';
import StudentHomeworkListScreen from './src/screens/student/HomeworkListScreen';
import StudentHomeworkDetailScreen from './src/screens/student/HomeworkDetailScreen';
import StudentMarksListScreen from './src/screens/student/MarksListScreen';
import StudentNewsListScreen from './src/screens/student/NewsListScreen';
import StudentNewsDetailScreen from './src/screens/student/NewsDetailScreen';
import StudentCircularsListScreen from './src/screens/student/CircularsListScreen';
import StudentExamSchedulesScreen from './src/screens/student/ExamSchedulesScreen';
import StudentProfileScreen from './src/screens/student/ProfileScreen';
import WeeklyLessonViewScreen from './src/screens/student/WeeklyLessonViewScreen';

// Class Controller Screens
import ClassControllerDashboardScreen from './src/screens/classcontroller/ClassControllerDashboardScreen';
import ClassStudentsListScreen from './src/screens/classcontroller/ClassStudentsListScreen';
import ClassAddStudentScreen from './src/screens/classcontroller/ClassAddStudentScreen';
import ClassEditStudentScreen from './src/screens/classcontroller/ClassEditStudentScreen';
import ClassHomeworkListScreen from './src/screens/classcontroller/ClassHomeworkListScreen';
import ClassHomeworkDetailScreen from './src/screens/classcontroller/ClassHomeworkDetailScreen';
import ClassCreateHomeworkScreen from './src/screens/classcontroller/ClassCreateHomeworkScreen';
import ClassAttendanceListScreen from './src/screens/classcontroller/ClassAttendanceListScreen';
import ClassMarkAttendanceScreen from './src/screens/classcontroller/ClassMarkAttendanceScreen';
import ClassNewsListScreen from './src/screens/classcontroller/ClassNewsListScreen';
import ClassNewsDetailScreen from './src/screens/classcontroller/ClassNewsDetailScreen';
import ClassCircularsListScreen from './src/screens/classcontroller/ClassCircularsListScreen';
import ClassCreateCircularScreen from './src/screens/classcontroller/ClassCreateCircularScreen';
import ClassExamSchedulesListScreen from './src/screens/classcontroller/ClassExamSchedulesListScreen';
import ClassCreateExamScheduleScreen from './src/screens/classcontroller/ClassCreateExamScheduleScreen';
import ClassProfileScreen from './src/screens/classcontroller/ClassProfileScreen';

// Legacy Screens (Posts)
import HomeScreen from './src/screens/HomeScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import EditPostScreen from './src/screens/EditPostScreen';

// Types
import { RootStackParamList, SuperAdminStackParamList, AdminStackParamList, StudentStackParamList, TeacherStackParamList, ClassControllerStackParamList, MainStackParamList, AuthStackParamList } from './src/types';

const SuperAdminStack = createStackNavigator<SuperAdminStackParamList>();
const AdminStack = createStackNavigator<AdminStackParamList>();
const StudentStack = createStackNavigator<StudentStackParamList>();
const TeacherStack = createStackNavigator<TeacherStackParamList>();
const ClassControllerStack = createStackNavigator<ClassControllerStackParamList>();
const MainStack = createStackNavigator<MainStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

// ============================================
// Super Admin Navigator
// ============================================
const SuperAdminNavigator = () => (
  <SuperAdminStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#1a237e' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <SuperAdminStack.Screen
      name="SuperAdminDashboard"
      component={SuperAdminDashboardScreen}
      options={{ title: 'Super Admin Dashboard' }}
    />
    <SuperAdminStack.Screen
      name="SchoolsList"
      component={SchoolsListScreen}
      options={{ title: 'Schools' }}
    />
    <SuperAdminStack.Screen
      name="CreateSchool"
      component={CreateSchoolScreen}
      options={{ title: 'Create New School' }}
    />
    <SuperAdminStack.Screen
      name="SchoolDetail"
      component={SchoolDetailScreen}
      options={{ title: 'School Details' }}
    />
  </SuperAdminStack.Navigator>
);

// ============================================
// Admin (School) Navigator
// ============================================
const AdminNavigator = () => (
  <AdminStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#2e7d32' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <AdminStack.Screen
      name="AdminDashboard"
      component={AdminDashboardScreen}
      options={{ title: 'School Admin Dashboard' }}
    />
    <AdminStack.Screen
      name="ClassesList"
      component={ClassesListScreen}
      options={{ title: 'Classes' }}
    />
    <AdminStack.Screen
      name="CreateClass"
      component={CreateClassScreen}
      options={{ title: 'Create Class' }}
    />
    <AdminStack.Screen
      name="ClassDetail"
      component={ClassDashboardScreen}
      options={{ title: 'Class Dashboard' }}
    />
    <AdminStack.Screen
      name="EditClass"
      component={EditClassScreen}
      options={{ title: 'Edit Class' }}
    />
    <AdminStack.Screen
      name="TeachersList"
      component={TeachersListScreen}
      options={{ title: 'Teachers' }}
    />
    <AdminStack.Screen
      name="TeacherDetail"
      component={TeacherDetailScreen}
      options={{ title: 'Teacher Details' }}
    />
    <AdminStack.Screen
      name="EditTeacher"
      component={EditTeacherScreen}
      options={{ title: 'Edit Teacher' }}
    />
    <AdminStack.Screen
      name="CreateTeacher"
      component={CreateTeacherScreen}
      options={{ title: 'Create Teacher' }}
    />
    <AdminStack.Screen
      name="StudentsList"
      component={StudentsListScreen}
      options={{ title: 'Students' }}
    />
    <AdminStack.Screen
      name="CreateStudent"
      component={CreateStudentScreen}
      options={{ title: 'Add Student' }}
    />
    <AdminStack.Screen
      name="HomeworkList"
      component={HomeworkListScreen}
      options={{ title: 'Homework' }}
    />
    <AdminStack.Screen
      name="CreateHomework"
      component={CreateHomeworkScreen}
      options={{ title: 'Add Homework' }}
    />
    <AdminStack.Screen
      name="MarksList"
      component={MarksListScreen}
      options={{ title: 'Marks' }}
    />
    <AdminStack.Screen
      name="AddMarks"
      component={AddMarksScreen}
      options={{ title: 'Add Marks' }}
    />
    <AdminStack.Screen
      name="NewsList"
      component={NewsListScreen}
      options={{ title: 'News' }}
    />
    <AdminStack.Screen
      name="CreateNews"
      component={CreateNewsScreen}
      options={{ title: 'Post News' }}
    />
    <AdminStack.Screen
      name="CircularsList"
      component={CircularsListScreen}
      options={{ title: 'Circulars' }}
    />
    <AdminStack.Screen
      name="CreateCircular"
      component={CreateCircularScreen}
      options={{ title: 'Create Circular' }}
    />
    <AdminStack.Screen
      name="ExamSchedulesList"
      component={ExamSchedulesListScreen}
      options={{ title: 'Exam Schedules' }}
    />
    <AdminStack.Screen
      name="CreateExamSchedule"
      component={CreateExamScheduleScreen}
      options={{ title: 'Add Exam Schedule' }}
    />
    {/* New Admin Content Screens with Visibility Control */}
    <AdminStack.Screen
      name="AdminNews"
      component={AdminNewsScreen}
      options={{ title: 'News Manager' }}
    />
    <AdminStack.Screen
      name="AdminCirculars"
      component={AdminCircularsScreen}
      options={{ title: 'Circulars Manager' }}
    />
    <AdminStack.Screen
      name="AdminExams"
      component={AdminExamsScreen}
      options={{ title: 'Exam Timetables' }}
    />
  </AdminStack.Navigator>
);

// ============================================
// Student Navigator
// ============================================
const StudentNavigator = () => (
  <StudentStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#1565c0' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <StudentStack.Screen
      name="StudentDashboard"
      component={StudentDashboardScreen}
      options={{ title: 'Student Dashboard' }}
    />
    <StudentStack.Screen
      name="StudentHomeworkList"
      component={StudentHomeworkListScreen}
      options={{ title: 'Homework' }}
    />
    <StudentStack.Screen
      name="StudentHomeworkDetail"
      component={StudentHomeworkDetailScreen}
      options={{ title: 'Homework Details' }}
    />
    <StudentStack.Screen
      name="StudentMarksList"
      component={StudentMarksListScreen}
      options={{ title: 'My Marks' }}
    />
    <StudentStack.Screen
      name="StudentNewsList"
      component={StudentNewsListScreen}
      options={{ title: 'School News' }}
    />
    <StudentStack.Screen
      name="StudentNewsDetail"
      component={StudentNewsDetailScreen}
      options={{ title: 'News Details' }}
    />
    <StudentStack.Screen
      name="StudentCircularsList"
      component={StudentCircularsListScreen}
      options={{ title: 'Circulars' }}
    />
    <StudentStack.Screen
      name="StudentExamSchedules"
      component={StudentExamSchedulesScreen}
      options={{ title: 'Exam Schedule' }}
    />
    <StudentStack.Screen
      name="StudentProfile"
      component={StudentProfileScreen}
      options={{ title: 'My Profile' }}
    />
    <StudentStack.Screen
      name="WeeklyLessonView"
      component={WeeklyLessonViewScreen}
      options={{ title: 'Homework & Classwork' }}
    />
  </StudentStack.Navigator>
);

// ============================================
// Teacher Navigator
// ============================================
const TeacherNavigator = () => (
  <TeacherStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#7b1fa2' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <TeacherStack.Screen
      name="TeacherDashboard"
      component={TeacherDashboardScreen}
      options={{ title: 'Teacher Dashboard' }}
    />
    <TeacherStack.Screen
      name="TeacherStudents"
      component={TeacherStudentsScreen}
      options={{ title: 'My Students' }}
    />
    <TeacherStack.Screen
      name="TeacherHomework"
      component={TeacherHomeworkScreen}
      options={{ title: 'Homework' }}
    />
    <TeacherStack.Screen
      name="TeacherMarks"
      component={TeacherMarksScreen}
      options={{ title: 'Marks' }}
    />
    <TeacherStack.Screen
      name="TeacherNews"
      component={TeacherNewsScreen}
      options={{ title: 'News' }}
    />
    <TeacherStack.Screen
      name="TeacherCirculars"
      component={TeacherCircularsScreen}
      options={{ title: 'Circulars' }}
    />
    <TeacherStack.Screen
      name="WeeklyLessonGrid"
      component={WeeklyLessonGridScreen}
      options={{ title: 'Weekly Timetable' }}
    />
  </TeacherStack.Navigator>
);

// ============================================
// Class Controller Navigator (For Class ID login - CLS-X)
// ============================================
const ClassControllerNavigator = () => (
  <ClassControllerStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#FF6B35' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <ClassControllerStack.Screen
      name="ClassControllerDashboard"
      component={ClassControllerDashboardScreen}
      options={{ title: 'Class Controller' }}
    />
    <ClassControllerStack.Screen
      name="ClassStudentsList"
      component={ClassStudentsListScreen}
      options={{ title: 'Students' }}
    />
    <ClassControllerStack.Screen
      name="ClassAddStudent"
      component={ClassAddStudentScreen}
      options={{ title: 'Add Student' }}
    />
    <ClassControllerStack.Screen
      name="ClassEditStudent"
      component={ClassEditStudentScreen}
      options={{ title: 'Edit Student' }}
    />
    <ClassControllerStack.Screen
      name="ClassHomeworkList"
      component={ClassHomeworkListScreen}
      options={{ title: 'Homework' }}
    />
    <ClassControllerStack.Screen
      name="ClassHomeworkDetail"
      component={ClassHomeworkDetailScreen}
      options={{ title: 'Homework Details' }}
    />
    <ClassControllerStack.Screen
      name="ClassCreateHomework"
      component={ClassCreateHomeworkScreen}
      options={{ title: 'Create Homework' }}
    />
    <ClassControllerStack.Screen
      name="ClassAttendanceList"
      component={ClassAttendanceListScreen}
      options={{ title: 'Attendance' }}
    />
    <ClassControllerStack.Screen
      name="ClassMarkAttendance"
      component={ClassMarkAttendanceScreen}
      options={{ title: 'Mark Attendance' }}
    />
    <ClassControllerStack.Screen
      name="ClassNewsList"
      component={ClassNewsListScreen}
      options={{ title: 'School News' }}
    />
    <ClassControllerStack.Screen
      name="ClassNewsDetail"
      component={ClassNewsDetailScreen}
      options={{ title: 'News Details' }}
    />
    <ClassControllerStack.Screen
      name="ClassCircularsList"
      component={ClassCircularsListScreen}
      options={{ title: 'Circulars' }}
    />
    <ClassControllerStack.Screen
      name="ClassCreateCircular"
      component={ClassCreateCircularScreen}
      options={{ title: 'Create Circular' }}
    />
    <ClassControllerStack.Screen
      name="ClassExamSchedulesList"
      component={ClassExamSchedulesListScreen}
      options={{ title: 'Exam Schedules' }}
    />
    <ClassControllerStack.Screen
      name="ClassCreateExamSchedule"
      component={ClassCreateExamScheduleScreen}
      options={{ title: 'Create Exam Schedule' }}
    />
    <ClassControllerStack.Screen
      name="ClassProfile"
      component={ClassProfileScreen}
      options={{ title: 'Class Profile' }}
    />
  </ClassControllerStack.Navigator>
);

// ============================================
// Legacy Main Navigator (for backward compatibility)
// ============================================
const LegacyMainNavigator = () => (
  <MainStack.Navigator>
    <MainStack.Screen
      name="Home"
      component={HomeScreen}
      options={{ title: 'Posts', headerShown: false }}
    />
    <MainStack.Screen
      name="PostDetail"
      component={PostDetailScreen}
      options={{ title: 'Post Details' }}
    />
    <MainStack.Screen
      name="CreatePost"
      component={CreatePostScreen}
      options={{ title: 'Create Post' }}
    />
    <MainStack.Screen
      name="EditPost"
      component={EditPostScreen}
      options={{ title: 'Edit Post' }}
    />
  </MainStack.Navigator>
);

// ============================================
// Auth Navigator
// ============================================
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

// ============================================
// Root Navigator
// ============================================
const RootNavigator = () => {
  const { isAuthenticated, isLoading, isSuperAdmin, isAdmin, isStudent, isTeacher, isClass } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated && !isClass ? (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      ) : isClass ? (
        // Class-based login (CLS-X) - route to Class Controller Dashboard (Management Mode)
        <RootStack.Screen name="ClassController" component={ClassControllerNavigator} />
      ) : isSuperAdmin ? (
        <RootStack.Screen name="SuperAdmin" component={SuperAdminNavigator} />
      ) : isAdmin ? (
        <RootStack.Screen name="Admin" component={AdminNavigator} />
      ) : isStudent ? (
        // Student ID login (STU-XXX) - route to Student Dashboard (Viewer Mode)
        <RootStack.Screen name="Student" component={StudentNavigator} />
      ) : isTeacher ? (
        <RootStack.Screen name="Teacher" component={TeacherNavigator} />
      ) : (
        <RootStack.Screen name="Main" component={LegacyMainNavigator} />
      )}
    </RootStack.Navigator>
  );
};

// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <PostProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </PostProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default App;