/**
 * MACVEL School Management Mobile App
 * Smart. Secure. Connected.
 */

import React from 'react';
import { IonApp, IonRouterOutlet, IonSplitPane, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './theme.css';

// Screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

// Admin Screens
import AdminDashboard from './screens/admin/AdminDashboardScreen';
import AdminStudents from './screens/admin/AdminStudentsScreen';
import AdminTeachers from './screens/admin/AdminTeachersScreen';
import AdminClasses from './screens/admin/AdminClassesScreen';
import AdminNews from './screens/admin/AdminNewsScreen';
import AdminHomework from './screens/admin/AdminHomeworkScreen';
import AdminCirculars from './screens/admin/AdminCircularsScreen';
import AdminCalendar from './screens/admin/CalendarScreen';
import AdminExams from './screens/admin/AdminExamsScreen';
import AdminSettings from './screens/admin/AdminSettingsScreen';
import AdminReportCards from './screens/admin/ReportCardsScreen';
import ReportCardViewScreen from './screens/admin/ReportCardViewScreen';
import StudentReportCardSearchScreen from './screens/admin/StudentReportCardSearchScreen';
import CreateStudentScreen from './screens/admin/CreateStudentScreen';
import EditStudentScreen from './screens/admin/EditStudentScreen';
import CreateTeacherScreen from './screens/admin/CreateTeacherScreen';
import EditTeacherScreen from './screens/admin/EditTeacherScreen';
import CreateClassScreen from './screens/admin/CreateClassScreen';
import EditClassScreen from './screens/admin/EditClassScreen';
import CreateCircularScreen from './screens/admin/CreateCircularScreen';
import ClassDetailScreen from './screens/admin/ClassDetailScreen';
import AdminAlbumsScreen from './screens/admin/AdminAlbumsScreen';
import CreateAlbumScreen from './screens/admin/CreateAlbumScreen';
import EditAlbumScreen from './screens/admin/EditAlbumScreen';

// Teacher Screens
import TeacherDashboard from './screens/teacher/TeacherDashboardScreen';
import TeacherClasses from './screens/teacher/TeacherClassesScreen';
import TeacherAttendance from './screens/teacher/TeacherAttendanceScreen';
import TeacherHomework from './screens/teacher/TeacherHomeworkScreen';
import TeacherStudents from './screens/teacher/TeacherStudentsScreen';

// Student Screens
import StudentDashboard from './screens/student/StudentDashboardScreen';
import StudentHomework from './screens/student/StudentHomeworkScreen';
import StudentExams from './screens/student/ExamSchedulesScreen';
import StudentExamDetail from './screens/student/StudentExamDetailScreen';
import StudentTimetable from './screens/student/StudentTimetableScreen';
import StudentAttendance from './screens/student/StudentAttendanceScreen';
import StudentMarks from './screens/student/StudentMarksScreen';
import StudentLeave from './screens/student/StudentLeaveScreen';
import StudentProfile from './screens/student/StudentProfileScreen';
import ReportCardsScreen from './screens/student/ReportCardsScreen';

// Shared Screens
import NewsScreen from './screens/NewsScreen';
import CircularsScreen from './screens/CircularsScreen';
import GalleryScreen from './screens/GalleryScreen';
import VideosScreen from './screens/VideosScreen';
import AlbumsScreen from './screens/AlbumsScreen';
import MessagesScreen from './screens/MessagesScreen';
import CalendarScreen from './screens/CalendarScreen';
import ContactsScreen from './screens/ContactsScreen';
import SettingsScreen from './screens/SettingsScreen';

// Student Screens
import StudentNewsListScreen from './screens/student/NewsListScreen';

// Components
import AdminMenu from './components/AdminMenu';
import TeacherMenu from './components/TeacherMenu';
import StudentMenu from './components/StudentMenu';

setupIonicReact();

const AppRoutes = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  console.log('=================================================');
  console.log('[AppRoutes] RENDERING - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
  console.log('[AppRoutes] User:', user);
  console.log('=================================================');

  // Debugging user and role
  const userRole = user?.role ? user.role.toUpperCase().trim() : '';
  
  // Broader check to catch any variant of admin role
  const isAdmin = userRole.includes('ADMIN') || userRole.includes('SUPER') || userRole === 'PRINCIPAL' || userRole === 'MANAGEMENT';

  // Show loading state while auth is initializing
  if (isLoading) {
    console.log('[AppRoutes] Loading - showing test div');
    return (
      <div style={{ 
        background: '#FFD700', 
        color: 'black', 
        padding: '40px', 
        fontSize: '24px', 
        fontWeight: 'bold',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        LOADING - Auth is initializing...
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('[AppRoutes] Not authenticated, redirecting to login');
    return (
      <IonApp>
        <IonReactRouter>
          <IonRouterOutlet>
            <Route exact path="/login" component={LoginScreen} />
            <Route exact path="/register" component={RegisterScreen} />
            <Redirect from="/" to="/login" />
          </IonRouterOutlet>
        </IonReactRouter>
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonReactRouter>
        <IonSplitPane contentId="main-content">
          {/* Side Menu based on role */}
          {isAdmin && <AdminMenu />}
          {userRole === 'TEACHER' && <TeacherMenu />}
          {userRole === 'STUDENT' && <StudentMenu />}

          <IonRouterOutlet id="main-content">
            {/* Common Routes */}
            <Route exact path="/news" component={NewsScreen} />
            <Route exact path="/student/news" component={StudentNewsListScreen} />
            <Route exact path="/student/news/:id" component={NewsScreen} />
            <Route exact path="/circulars" component={CircularsScreen} />
            <Route exact path="/gallery" component={GalleryScreen} />
            <Route exact path="/videos" component={VideosScreen} />
            <Route exact path="/albums" component={AlbumsScreen} />
            <Route exact path="/messages" component={MessagesScreen} />
            <Route exact path="/calendar" component={CalendarScreen} />
            <Route exact path="/contacts" component={ContactsScreen} />
            <Route exact path="/settings" component={SettingsScreen} />

            {/* Admin Routes - Force enabled if user has any admin token/role */}
            <Route exact path="/admin" component={AdminDashboard} />
            <Route exact path="/admin-dashboard" component={AdminDashboard} />
            <Route exact path="/super-admin-dashboard" component={AdminDashboard} />
            <Route exact path="/admin/students" component={AdminStudents} />
            <Route exact path="/admin/students/create" component={CreateStudentScreen} />
            <Route exact path="/admin/students/:id/edit" component={EditStudentScreen} />
            <Route exact path="/admin/teachers" component={AdminTeachers} />
            <Route exact path="/admin/teachers/create" component={CreateTeacherScreen} />
            <Route exact path="/admin/teachers/:id/edit" component={EditTeacherScreen} />
            <Route exact path="/admin/classes" component={AdminClasses} />
            <Route exact path="/admin/classes/create" component={CreateClassScreen} />
            <Route exact path="/admin/classes/:id" component={ClassDetailScreen} />
            <Route exact path="/admin/classes/:id/edit" component={EditClassScreen} />
            <Route exact path="/admin/news" component={AdminNews} />
            <Route exact path="/admin/homework" component={AdminHomework} />
            <Route exact path="/admin/circulars" component={AdminCirculars} />
            <Route exact path="/admin/circulars/create" component={CreateCircularScreen} />
            <Route exact path="/admin/calendar" component={AdminCalendar} />
            <Route exact path="/admin/exams" component={AdminExams} />
            <Route exact path="/admin/report-cards" component={AdminReportCards} />
            <Route exact path="/admin/report-cards/search" component={StudentReportCardSearchScreen} />
            <Route exact path="/admin/report-cards/:id" component={ReportCardViewScreen} />
            <Route exact path="/admin/albums" component={AdminAlbumsScreen} />
            <Route exact path="/admin/albums/create" component={CreateAlbumScreen} />
            <Route exact path="/admin/albums/:albumId/edit" component={EditAlbumScreen} />
            <Route exact path="/admin/settings" component={AdminSettings} />

            {/* Teacher Routes */}
            <Route exact path="/teacher" component={TeacherDashboard} />
            <Route exact path="/teacher/classes" component={TeacherClasses} />
            <Route exact path="/teacher/attendance" component={TeacherAttendance} />
            <Route exact path="/teacher/homework" component={TeacherHomework} />
            <Route exact path="/teacher/students" component={TeacherStudents} />

            {/* Student Routes */}
            <Route exact path="/student" component={StudentDashboard} />
            <Route exact path="/student/homework" component={StudentHomework} />
            <Route exact path="/student/exams" component={StudentExams} />
            <Route exact path="/student/exams/:examId" component={StudentExamDetail} />
            <Route exact path="/student/timetable" component={StudentTimetable} />
            <Route exact path="/student/attendance" component={StudentAttendance} />
            <Route exact path="/student/marks" component={StudentMarks} />
            <Route exact path="/student/leave" component={StudentLeave} />
            <Route exact path="/student/profile" component={StudentProfile} />
            <Route exact path="/student/report-cards" component={ReportCardsScreen} />

            {/* Fallback Redirection */}
            <Redirect 
              from="/" 
              to={
                isAdmin 
                  ? '/admin' 
                  : userRole === 'TEACHER' 
                    ? '/teacher' 
                    : '/student'
              } 
            />
          </IonRouterOutlet>
        </IonSplitPane>
      </IonReactRouter>
    </IonApp>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;