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
import AdminCirculars from './screens/admin/AdminCircularsScreen';
import AdminExams from './screens/admin/AdminExamsScreen';
import AdminSettings from './screens/admin/AdminSettingsScreen';
import CreateStudentScreen from './screens/admin/CreateStudentScreen';
import EditStudentScreen from './screens/admin/EditStudentScreen';
import CreateTeacherScreen from './screens/admin/CreateTeacherScreen';
import EditTeacherScreen from './screens/admin/EditTeacherScreen';
import CreateClassScreen from './screens/admin/CreateClassScreen';
import EditClassScreen from './screens/admin/EditClassScreen';
import CreateNewsScreen from './screens/admin/CreateNewsScreen';
import CreateCircularScreen from './screens/admin/CreateCircularScreen';

// Teacher Screens
import TeacherDashboard from './screens/teacher/TeacherDashboardScreen';
import TeacherClasses from './screens/teacher/TeacherClassesScreen';
import TeacherAttendance from './screens/teacher/TeacherAttendanceScreen';
import TeacherHomework from './screens/teacher/TeacherHomeworkScreen';
import TeacherStudents from './screens/teacher/TeacherStudentsScreen';

// Student Screens
import StudentDashboard from './screens/student/StudentDashboardScreen';
import StudentHomework from './screens/student/StudentHomeworkScreen';
import StudentExams from './screens/student/StudentExamsScreen';
import StudentTimetable from './screens/student/StudentTimetableScreen';
import StudentAttendance from './screens/student/StudentAttendanceScreen';
import StudentMarks from './screens/student/StudentMarksScreen';
import StudentLeave from './screens/student/StudentLeaveScreen';
import StudentProfile from './screens/student/StudentProfileScreen';

// Shared Screens
import NewsScreen from './screens/NewsScreen';
import CircularsScreen from './screens/CircularsScreen';
import GalleryScreen from './screens/GalleryScreen';
import VideosScreen from './screens/VideosScreen';
import MessagesScreen from './screens/MessagesScreen';
import CalendarScreen from './screens/CalendarScreen';
import ContactsScreen from './screens/ContactsScreen';
import SettingsScreen from './screens/SettingsScreen';

// Components
import AdminMenu from './components/AdminMenu';
import TeacherMenu from './components/TeacherMenu';
import StudentMenu from './components/StudentMenu';

setupIonicReact();

const AppRoutes = () => {
  const { user, isAuthenticated } = useAuth();

  const userRole = user?.role ? user.role.toUpperCase().trim() : '';
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  if (!isAuthenticated) {
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
            <Route exact path="/circulars" component={CircularsScreen} />
            <Route exact path="/gallery" component={GalleryScreen} />
            <Route exact path="/videos" component={VideosScreen} />
            <Route exact path="/messages" component={MessagesScreen} />
            <Route exact path="/calendar" component={CalendarScreen} />
            <Route exact path="/contacts" component={ContactsScreen} />
            <Route exact path="/settings" component={SettingsScreen} />

            {/* Admin Routes */}
            {isAdmin && (
              <>
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
                <Route exact path="/admin/classes/:id/edit" component={EditClassScreen} />
                <Route exact path="/admin/news" component={AdminNews} />
                <Route exact path="/admin/news/create" component={CreateNewsScreen} />
                <Route exact path="/admin/circulars" component={AdminCirculars} />
                <Route exact path="/admin/circulars/create" component={CreateCircularScreen} />
                <Route exact path="/admin/exams" component={AdminExams} />
                <Route exact path="/admin/settings" component={AdminSettings} />
              </>
            )}

            {/* Teacher Routes */}
            {userRole === 'TEACHER' && (
              <>
                <Route exact path="/teacher" component={TeacherDashboard} />
                <Route exact path="/teacher/classes" component={TeacherClasses} />
                <Route exact path="/teacher/attendance" component={TeacherAttendance} />
                <Route exact path="/teacher/homework" component={TeacherHomework} />
                <Route exact path="/teacher/students" component={TeacherStudents} />
              </>
            )}

            {/* Student Routes */}
            {userRole === 'STUDENT' && (
              <>
                <Route exact path="/student" component={StudentDashboard} />
                <Route exact path="/student/homework" component={StudentHomework} />
                <Route exact path="/student/exams" component={StudentExams} />
                <Route exact path="/student/timetable" component={StudentTimetable} />
                <Route exact path="/student/attendance" component={StudentAttendance} />
                <Route exact path="/student/marks" component={StudentMarks} />
                <Route exact path="/student/leave" component={StudentLeave} />
                <Route exact path="/student/profile" component={StudentProfile} />
              </>
            )}

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