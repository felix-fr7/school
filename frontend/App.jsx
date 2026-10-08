/**
 * App Entry Point
 * Main application component with React Router v5 navigation
 * Multi-Tenant School Management System
 */

import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Redirect, Switch, useHistory } from 'react-router-dom';

import { AuthProvider, useAuth } from './src/contexts/AuthContext.jsx';
import ErrorBoundary from './src/components/ErrorBoundary.jsx';

// Auth Screens
import LoginScreen from './src/screens/LoginScreen.jsx';
import StudentMobileNotice from './src/screens/StudentMobileNotice.jsx';
import RegisterScreen from './src/screens/RegisterScreen.jsx';

// Super Admin Screens (Lazy loaded)
const SuperAdminDashboardScreen = React.lazy(() => import('./src/screens/superadmin/DashboardScreen.jsx'));
const SchoolsListScreen = React.lazy(() => import('./src/screens/superadmin/SchoolsListScreen.jsx'));
const CreateSchoolScreen = React.lazy(() => import('./src/screens/superadmin/CreateSchoolScreen.jsx'));
const SchoolDetailScreen = React.lazy(() => import('./src/screens/superadmin/SchoolDetailScreen.jsx'));
const PortalBrandingScreen = React.lazy(() => import('./src/screens/superadmin/PortalBrandingScreen.jsx'));

// Admin Screens (Lazy loaded)
const AdminDashboardScreen = React.lazy(() => import('./src/screens/admin/DashboardScreen.jsx'));
const ClassesListScreen = React.lazy(() => import('./src/screens/admin/ClassesListScreen.jsx'));
const CreateClassScreen = React.lazy(() => import('./src/screens/admin/CreateClassScreen.jsx'));
const ResetClassCodeCounterScreen = React.lazy(() => import('./src/screens/admin/ResetClassCodeCounterScreen.jsx'));
const ClassDashboardScreen = React.lazy(() => import('./src/screens/admin/ClassDashboardScreen.jsx'));
const EditClassScreen = React.lazy(() => import('./src/screens/admin/EditClassScreen.jsx'));
const TeachersListScreen = React.lazy(() => import('./src/screens/admin/TeachersListScreen.jsx'));
const TeacherDetailScreen = React.lazy(() => import('./src/screens/admin/TeacherDetailScreen.jsx'));
const EditTeacherScreen = React.lazy(() => import('./src/screens/admin/EditTeacherScreen.jsx'));
const CreateTeacherScreen = React.lazy(() => import('./src/screens/admin/CreateTeacherScreen.jsx'));
const StudentsListScreen = React.lazy(() => import('./src/screens/admin/StudentsListScreen.jsx'));
const CreateStudentScreen = React.lazy(() => import('./src/screens/admin/CreateStudentScreen.jsx'));
const EditStudentScreen = React.lazy(() => import('./src/screens/admin/EditStudentScreen.jsx'));
const NewsListScreen = React.lazy(() => import('./src/screens/admin/NewsListScreen.jsx'));
const CircularsListScreen = React.lazy(() => import('./src/screens/admin/CircularsListScreen.jsx'));
const CreateCircularScreen = React.lazy(() => import('./src/screens/admin/CreateCircularScreen.jsx'));
const ExamSchedulesListScreen = React.lazy(() => import('./src/screens/admin/ExamSchedulesListScreen.jsx'));
const CreateExamScheduleScreen = React.lazy(() => import('./src/screens/admin/CreateExamScheduleScreen.jsx'));
const AdminNewsScreen = React.lazy(() => import('./src/screens/admin/AdminNewsScreen.jsx'));
const AdminCircularsScreen = React.lazy(() => import('./src/screens/admin/AdminCircularsScreen.jsx'));
  const AdminExamsScreen = React.lazy(() => import('./src/screens/admin/AdminExamsScreen.jsx'));
  const AdminReportCardsScreen = React.lazy(() => import('./src/screens/admin/ReportCardsScreen.jsx'));
  const AdminCalendarScreen = React.lazy(() => import('./src/screens/admin/CalendarScreen.jsx'));
  const AdminCalendarEventDetailScreen = React.lazy(() => import('./src/screens/admin/CalendarEventDetailScreen.jsx'));
  const PlaceholderScreen = React.lazy(() => import('./src/screens/admin/PlaceholderScreen.jsx'));
  const AdminAlbumsScreen = React.lazy(() => import('./src/screens/admin/AdminAlbumsScreen.jsx'));
  const CreateAlbumScreen = React.lazy(() => import('./src/screens/admin/CreateAlbumScreen.jsx'));
  const EditAlbumScreen = React.lazy(() => import('./src/screens/admin/EditAlbumScreen.jsx'));
  const AdminVideosScreen = React.lazy(() => import('./src/screens/admin/AdminVideosScreen.jsx'));
const AdminTimetableScreen = React.lazy(() => import('./src/screens/admin/AdminTimetableScreen.jsx'));

// Shared Album viewer (used by class-controller and students)
const AlbumsScreen = React.lazy(() => import('./src/screens/AlbumsScreen.jsx'));

// Student Screens (Mobile Notice on Web)
const StudentMobileNoticeScreen = React.lazy(() => import('./src/screens/StudentMobileNotice.jsx'));
const StudentDashboardScreen = StudentMobileNoticeScreen;
const StudentHomeworkListScreen = StudentMobileNoticeScreen;
const StudentHomeworkDetailScreen = StudentMobileNoticeScreen;
const StudentMarksListScreen = StudentMobileNoticeScreen;
const StudentNewsListScreen = StudentMobileNoticeScreen;
const StudentNewsDetailScreen = StudentMobileNoticeScreen;
const StudentCircularsListScreen = StudentMobileNoticeScreen;
const StudentCircularDetailScreen = StudentMobileNoticeScreen;
const StudentReportCardsScreen = StudentMobileNoticeScreen;
const StudentExamSchedulesScreen = StudentMobileNoticeScreen;
const StudentProfileScreen = StudentMobileNoticeScreen;
const WeeklyLessonViewScreen = StudentMobileNoticeScreen;
const StudentTimetableScreen = StudentMobileNoticeScreen;
const StudentExamDetailScreen = StudentMobileNoticeScreen;
const StudentCalendarScreen = StudentMobileNoticeScreen;
const StudentCalendarEventDetailScreen = StudentMobileNoticeScreen;


// Class Controller Screens (Lazy loaded)
const ClassControllerDashboardScreen = React.lazy(() => import('./src/screens/classcontroller/ClassControllerDashboardScreen'));
const ClassStudentsListScreen = React.lazy(() => import('./src/screens/classcontroller/ClassStudentsListScreen'));
const ClassAddStudentScreen = React.lazy(() => import('./src/screens/classcontroller/ClassAddStudentScreen'));
const ClassEditStudentScreen = React.lazy(() => import('./src/screens/classcontroller/ClassEditStudentScreen'));
const ClassHomeworkListScreen = React.lazy(() => import('./src/screens/classcontroller/ClassHomeworkListScreen'));
const ClassHomeworkDetailScreen = React.lazy(() => import('./src/screens/classcontroller/ClassHomeworkDetailScreen'));
const ClassHomeworkEditScreen = React.lazy(() => import('./src/screens/classcontroller/ClassHomeworkEditScreen'));
const ClassCreateHomeworkScreen = React.lazy(() => import('./src/screens/classcontroller/ClassCreateHomeworkScreen'));
const ClassNewsListScreen = React.lazy(() => import('./src/screens/classcontroller/ClassNewsListScreen'));
const ClassNewsDetailScreen = React.lazy(() => import('./src/screens/classcontroller/ClassNewsDetailScreen'));
const ClassCircularsListScreen = React.lazy(() => import('./src/screens/classcontroller/ClassCircularsListScreen'));
const ClassCircularDetailScreen = React.lazy(() => import('./src/screens/classcontroller/ClassCircularDetailScreen'));
const ClassCreateCircularScreen = React.lazy(() => import('./src/screens/classcontroller/ClassCreateCircularScreen'));
const ClassExamSchedulesListScreen = React.lazy(() => import('./src/screens/classcontroller/ClassExamSchedulesListScreen'));
const ClassCreateExamScheduleScreen = React.lazy(() => import('./src/screens/classcontroller/ClassCreateExamScheduleScreen'));
const ClassProfileScreen = React.lazy(() => import('./src/screens/classcontroller/ClassProfileScreen'));
const ClassExamDetailScreen = React.lazy(() => import('./src/screens/classcontroller/ClassExamDetailScreen'));
const ClassControllerCalendarScreen = React.lazy(() => import('./src/screens/classcontroller/ClassControllerCalendarScreen'));
const ClassControllerCalendarEventDetailScreen = React.lazy(() => import('./src/screens/classcontroller/CalendarEventDetailScreen'));
const ClassTimetableScreen = React.lazy(() => import('./src/screens/classcontroller/ClassTimetableScreen.jsx'));

const ProtectedRoute = ({
  component: Component,
  isAuthenticated,
  isClass,
  isLoading,
  redirectPath = '/login',
  ...rest
}) => {
  return (
    <Route
      {...rest}
      render={(props) => {
        if (isLoading) {
          return (
            <div className="web-page ion-padding" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
              <div className="web-spinner" />
              <p style={{ marginTop: '12px', color: '#64748b' }}>Loading...</p>
            </div>
          );
        }
        if (!isAuthenticated && !isClass) {
          return <Redirect to={redirectPath} />;
        }
        return <Component {...props} />;
      }}
    />
  );
};

// Loading component for lazy-loaded routes
const RouteLoadingFallback = () => (
  <div className="web-page">
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#f8fafc',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Loading...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

// Auth Redirect component
const AuthRedirect = () => {
  const { isAuthenticated, isSuperAdmin, isAdmin, isStudent, isTeacher, isClass, isLoading } = useAuth();
  const history = useHistory();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const currentPath = window.location.pathname;

    if (isAuthenticated || isClass) {
      if (currentPath === '/login' || currentPath === '/register') {
        if (isSuperAdmin) {
          history.push('/superadmin/dashboard');
        } else if (isAdmin) {
          history.push('/admin/dashboard');
        } else if (isTeacher) {
          history.push('/teacher/dashboard');
        } else if (isStudent) {
          history.push('/student/dashboard');
        } else if (isClass) {
          history.push('/class-controller/dashboard');
        }
      }
    } else {
      if (currentPath !== '/login' && currentPath !== '/register') {
        history.push('/login');
      }
    }
  }, [isAuthenticated, isClass, isSuperAdmin, isAdmin, isStudent, isTeacher, isLoading, history]);

  return <></>;
};

// Internal component to access auth context and render routes
const AppContent = () => {
  const { isAuthenticated, isLoading, isSuperAdmin, isAdmin, isStudent, isTeacher, isClass } = useAuth();

  if (isLoading) {
    return <RouteLoadingFallback />;
  }

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <AuthRedirect />

      <Switch>
        {/* Auth Routes */}
        <Route exact path="/login" component={LoginScreen} />
        <Route exact path="/student/login" component={StudentMobileNotice} />
        <Route exact path="/register" component={RegisterScreen} />

        {/* Root path redirect */}
        <Route exact path="/">
          <Redirect to="/login" />
        </Route>

        {/* Super Admin Routes */}
        {isSuperAdmin && (
          <>
            <ProtectedRoute exact path="/superadmin/dashboard" component={SuperAdminDashboardScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/superadmin/schools" component={SchoolsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/superadmin/schools/create" component={CreateSchoolScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/superadmin/schools/:tenantId" component={SchoolDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/superadmin/branding" component={PortalBrandingScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
          </>
        )}

        {/* Admin Routes */}
        {isAdmin && (
          <>
            <ProtectedRoute exact path="/admin/dashboard" component={AdminDashboardScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/classes" component={ClassesListScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/classes/create" component={CreateClassScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/classes/reset-counter" component={ResetClassCodeCounterScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/classes/:classId" component={ClassDashboardScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/classes/:classId/edit" component={EditClassScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/teachers" component={TeachersListScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/teachers/create" component={CreateTeacherScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/teachers/:teacherId" component={TeacherDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/teachers/:teacherId/edit" component={EditTeacherScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/students" component={StudentsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/students/create" component={CreateStudentScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/students/edit/:studentId" component={EditStudentScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/students/:studentId/edit" component={EditStudentScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/news" component={AdminNewsScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/circulars" component={AdminCircularsScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/circulars/create" component={CreateCircularScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/exams" component={AdminExamsScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/exams/create" component={CreateExamScheduleScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/report-cards" component={AdminReportCardsScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/admin-news" component={AdminNewsScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/admin-circulars" component={AdminCircularsScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/admin-exams" component={AdminExamsScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/calendar" component={AdminCalendarScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/calendar/:eventId" component={AdminCalendarEventDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/albums" component={AdminAlbumsScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/albums/create" component={CreateAlbumScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/albums/:albumId/edit" component={EditAlbumScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/videos" component={AdminVideosScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/admin/timetable" component={AdminTimetableScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
          </>
        )}

        {/* Student Routes */}
        {isStudent && (
          <>
            <ProtectedRoute exact path="/student/dashboard" component={StudentDashboardScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/homework" component={StudentHomeworkListScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/homework/:homeworkId" component={StudentHomeworkDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/marks" component={StudentMarksListScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/news" component={StudentNewsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/news/:newsId" component={StudentNewsDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/circulars" component={StudentCircularsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/circulars/:id" component={StudentCircularDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/report-cards" component={StudentReportCardsScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/exams" component={StudentExamSchedulesScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/exams/:examId" component={StudentExamDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/profile" component={StudentProfileScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/weekly-lessons" component={WeeklyLessonViewScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/timetable" component={StudentTimetableScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/calendar" component={StudentCalendarScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/calendar/:eventId" component={StudentCalendarEventDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
          </>
        )}

        {/* Class Controller Routes */}
        {isClass && (
          <>
            <ProtectedRoute exact path="/class-controller/dashboard" component={ClassControllerDashboardScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/profile" component={ClassProfileScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/students" component={ClassStudentsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/students/add" component={ClassAddStudentScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/students/:studentId/edit" component={ClassEditStudentScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/homework" component={ClassHomeworkListScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/homework/create" component={ClassCreateHomeworkScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/homework/edit/:id" component={ClassHomeworkEditScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/homework/:id" component={ClassHomeworkDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/news" component={ClassNewsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/news/:newsId" component={ClassNewsDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/circulars" component={ClassCircularsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/circulars/create" component={ClassCreateCircularScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/circulars/:id" component={ClassCircularDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/exams" component={ClassExamSchedulesListScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/exams/create" component={ClassCreateExamScheduleScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/exams/:examId" component={ClassExamDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/calendar" component={ClassControllerCalendarScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/calendar/:eventId" component={ClassControllerCalendarEventDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />

            <ProtectedRoute exact path="/class-controller/report-cards" component={AdminReportCardsScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/timetable" component={ClassTimetableScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
            <ProtectedRoute exact path="/class-controller/albums" component={AlbumsScreen} isAuthenticated={isAuthenticated} isClass={isClass} isLoading={isLoading} />
          </>
        )}

        {/* Fallback redirect */}
        <Redirect to="/login" />
      </Switch>
    </Suspense>
  );
};

// Main App Component
const App = () => {
  return (
    <ErrorBoundary>
      <div className="web-app-root">
        <AuthProvider>
          <AppWithAuth />
        </AuthProvider>
      </div>
    </ErrorBoundary>
  );
};

// Component that checks auth loading state before rendering router
const AppWithAuth = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoadingFallback />;
  }

  return (
    <BrowserRouter>
      <div className="web-router-outlet">
        <AppContent />
      </div>
    </BrowserRouter>
  );
};

export default App;
