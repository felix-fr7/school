/**
 * App Entry Point
 * Main application component with React Router v5 navigation
 * Multi-Tenant School Management System
 */

import React, { Suspense } from 'react';
import { IonApp } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect, Switch, RouteProps } from 'react-router-dom';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { PostProvider } from './src/contexts/PostContext';
import ErrorBoundary from './src/components/ErrorBoundary';

// Auth Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// Legacy Screens (Posts)
import HomeScreen from './src/screens/HomeScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import EditPostScreen from './src/screens/EditPostScreen';

// Super Admin Screens (Lazy loaded)
const SuperAdminDashboardScreen = React.lazy(() => import('./src/screens/superadmin/DashboardScreen'));
const SchoolsListScreen = React.lazy(() => import('./src/screens/superadmin/SchoolsListScreen'));
const CreateSchoolScreen = React.lazy(() => import('./src/screens/superadmin/CreateSchoolScreen'));
const SchoolDetailScreen = React.lazy(() => import('./src/screens/superadmin/SchoolDetailScreen'));

// Admin Screens (Lazy loaded)
const AdminDashboardScreen = React.lazy(() => import('./src/screens/admin/DashboardScreen'));
const ClassesListScreen = React.lazy(() => import('./src/screens/admin/ClassesListScreen'));
const CreateClassScreen = React.lazy(() => import('./src/screens/admin/CreateClassScreen'));
const ClassDashboardScreen = React.lazy(() => import('./src/screens/admin/ClassDashboardScreen'));
const EditClassScreen = React.lazy(() => import('./src/screens/admin/EditClassScreen'));
const TeachersListScreen = React.lazy(() => import('./src/screens/admin/TeachersListScreen'));
const TeacherDetailScreen = React.lazy(() => import('./src/screens/admin/TeacherDetailScreen'));
const EditTeacherScreen = React.lazy(() => import('./src/screens/admin/EditTeacherScreen'));
const CreateTeacherScreen = React.lazy(() => import('./src/screens/admin/CreateTeacherScreen'));
const StudentsListScreen = React.lazy(() => import('./src/screens/admin/StudentsListScreen'));
const CreateStudentScreen = React.lazy(() => import('./src/screens/admin/CreateStudentScreen'));
const HomeworkListScreen = React.lazy(() => import('./src/screens/admin/HomeworkListScreen'));
const CreateHomeworkScreen = React.lazy(() => import('./src/screens/admin/CreateHomeworkScreen'));
const MarksListScreen = React.lazy(() => import('./src/screens/admin/MarksListScreen'));
const AddMarksScreen = React.lazy(() => import('./src/screens/admin/AddMarksScreen'));
const NewsListScreen = React.lazy(() => import('./src/screens/admin/NewsListScreen'));
const CreateNewsScreen = React.lazy(() => import('./src/screens/admin/CreateNewsScreen'));
const CircularsListScreen = React.lazy(() => import('./src/screens/admin/CircularsListScreen'));
const CreateCircularScreen = React.lazy(() => import('./src/screens/admin/CreateCircularScreen'));
const ExamSchedulesListScreen = React.lazy(() => import('./src/screens/admin/ExamSchedulesListScreen'));
const CreateExamScheduleScreen = React.lazy(() => import('./src/screens/admin/CreateExamScheduleScreen'));
const AdminNewsScreen = React.lazy(() => import('./src/screens/admin/AdminNewsScreen'));
const AdminCircularsScreen = React.lazy(() => import('./src/screens/admin/AdminCircularsScreen'));
const AdminExamsScreen = React.lazy(() => import('./src/screens/admin/AdminExamsScreen'));
const PlaceholderScreen = React.lazy(() => import('./src/screens/admin/PlaceholderScreen'));

// Teacher Screens (Lazy loaded)
const TeacherDashboardScreen = React.lazy(() => import('./src/screens/teacher/TeacherDashboardScreen'));
const TeacherStudentsScreen = React.lazy(() => import('./src/screens/teacher/TeacherStudentsScreen'));
const TeacherHomeworkScreen = React.lazy(() => import('./src/screens/teacher/TeacherHomeworkScreen'));
const TeacherMarksScreen = React.lazy(() => import('./src/screens/teacher/TeacherMarksScreen'));
const TeacherNewsScreen = React.lazy(() => import('./src/screens/teacher/TeacherNewsScreen'));
const TeacherCircularsScreen = React.lazy(() => import('./src/screens/teacher/TeacherCircularsScreen'));
const WeeklyLessonGridScreen = React.lazy(() => import('./src/screens/teacher/WeeklyLessonGridScreen'));
const TeacherAttendanceScreen = React.lazy(() => import('./src/screens/teacher/TeacherAttendanceScreen'));
const WeeklyTimetableScreen = React.lazy(() => import('./src/screens/teacher/WeeklyTimetableScreen'));

// Student Screens (Lazy loaded)
const StudentDashboardScreen = React.lazy(() => import('./src/screens/student/DashboardScreen'));
const StudentHomeworkListScreen = React.lazy(() => import('./src/screens/student/HomeworkListScreen'));
const StudentHomeworkDetailScreen = React.lazy(() => import('./src/screens/student/HomeworkDetailScreen'));
const StudentMarksListScreen = React.lazy(() => import('./src/screens/student/MarksListScreen'));
const StudentNewsListScreen = React.lazy(() => import('./src/screens/student/NewsListScreen'));
const StudentNewsDetailScreen = React.lazy(() => import('./src/screens/student/NewsDetailScreen'));
const StudentCircularsListScreen = React.lazy(() => import('./src/screens/student/CircularsListScreen'));
const StudentExamSchedulesScreen = React.lazy(() => import('./src/screens/student/ExamSchedulesScreen'));
const StudentProfileScreen = React.lazy(() => import('./src/screens/student/ProfileScreen'));
const WeeklyLessonViewScreen = React.lazy(() => import('./src/screens/student/WeeklyLessonViewScreen'));
const StudentExamDetailScreen = React.lazy(() => import('./src/screens/student/StudentExamDetailScreen'));

// Class Controller Screens (Lazy loaded)
const ClassControllerDashboardScreen = React.lazy(() => import('./src/screens/classcontroller/ClassControllerDashboardScreen'));
const ClassStudentsListScreen = React.lazy(() => import('./src/screens/classcontroller/ClassStudentsListScreen'));
const ClassAddStudentScreen = React.lazy(() => import('./src/screens/classcontroller/ClassAddStudentScreen'));
const ClassEditStudentScreen = React.lazy(() => import('./src/screens/classcontroller/ClassEditStudentScreen'));
const ClassHomeworkListScreen = React.lazy(() => import('./src/screens/classcontroller/ClassHomeworkListScreen'));
const ClassHomeworkDetailScreen = React.lazy(() => import('./src/screens/classcontroller/ClassHomeworkDetailScreen'));
const ClassCreateHomeworkScreen = React.lazy(() => import('./src/screens/classcontroller/ClassCreateHomeworkScreen'));
const ClassAttendanceListScreen = React.lazy(() => import('./src/screens/classcontroller/ClassAttendanceListScreen'));
const ClassMarkAttendanceScreen = React.lazy(() => import('./src/screens/classcontroller/ClassMarkAttendanceScreen'));
const ClassNewsListScreen = React.lazy(() => import('./src/screens/classcontroller/ClassNewsListScreen'));
const ClassNewsDetailScreen = React.lazy(() => import('./src/screens/classcontroller/ClassNewsDetailScreen'));
const ClassCircularsListScreen = React.lazy(() => import('./src/screens/classcontroller/ClassCircularsListScreen'));
const ClassCreateCircularScreen = React.lazy(() => import('./src/screens/classcontroller/ClassCreateCircularScreen'));
const ClassExamSchedulesListScreen = React.lazy(() => import('./src/screens/classcontroller/ClassExamSchedulesListScreen'));
const ClassCreateExamScheduleScreen = React.lazy(() => import('./src/screens/classcontroller/ClassCreateExamScheduleScreen'));
const ClassProfileScreen = React.lazy(() => import('./src/screens/classcontroller/ClassProfileScreen'));
const ClassExamDetailScreen = React.lazy(() => import('./src/screens/classcontroller/ClassExamDetailScreen'));

// Protected Route component
interface ProtectedRouteProps extends RouteProps {
  component: React.ComponentType<any>;
  isAuthenticated: boolean;
  isClass: boolean;
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  component: Component, 
  isAuthenticated, 
  isClass,
  redirectPath = '/login',
  ...rest 
}) => {
  return (
    <Route
      {...rest}
      render={(props) => {
        // Allow access if user is authenticated OR if class is logged in
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
  <div className="loading-container">
    <div>Loading...</div>
  </div>
);

// Main App Component
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <IonApp>
        <IonReactRouter>
          <AuthProvider>
            <PostProvider>
              <AppRoutes />
            </PostProvider>
          </AuthProvider>
        </IonReactRouter>
      </IonApp>
    </ErrorBoundary>
  );
};

// Internal component to access auth context
const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading, isSuperAdmin, isAdmin, isStudent, isTeacher, isClass } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="loading-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    }>
      <Switch>
        {/* Auth Routes */}
        <Route exact path="/login" component={LoginScreen} />
        <Route exact path="/register" component={RegisterScreen} />

        {/* Legacy Post Routes */}
        <Route exact path="/posts" component={HomeScreen} />
        <Route exact path="/posts/:postId" component={PostDetailScreen} />
        <Route exact path="/posts/create" component={CreatePostScreen} />
        <Route exact path="/posts/:postId/edit" component={EditPostScreen} />

      {/* Super Admin Routes */}
      {isSuperAdmin && (
        <>
          <ProtectedRoute exact path="/superadmin/dashboard" component={SuperAdminDashboardScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/superadmin/schools" component={SchoolsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/superadmin/schools/create" component={CreateSchoolScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/superadmin/schools/:tenantId" component={SchoolDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
        </>
      )}

      {/* Admin Routes */}
      {isAdmin && (
        <>
          <ProtectedRoute exact path="/admin/dashboard" component={AdminDashboardScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/classes" component={ClassesListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/classes/create" component={CreateClassScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/classes/:classId" component={ClassDashboardScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/classes/:classId/edit" component={EditClassScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/teachers" component={TeachersListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/teachers/:teacherId" component={TeacherDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/teachers/:teacherId/edit" component={EditTeacherScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/teachers/create" component={CreateTeacherScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/students" component={StudentsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/students/create" component={CreateStudentScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/homework" component={HomeworkListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/homework/create" component={CreateHomeworkScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/marks" component={MarksListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/marks/add" component={AddMarksScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/news" component={NewsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/news/create" component={CreateNewsScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/circulars" component={CircularsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/circulars/create" component={CreateCircularScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/exams" component={ExamSchedulesListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/exams/create" component={CreateExamScheduleScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/admin-news" component={AdminNewsScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/admin-circulars" component={AdminCircularsScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/admin/admin-exams" component={AdminExamsScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
        </>
      )}

      {/* Teacher Routes */}
      {isTeacher && (
        <>
          <ProtectedRoute exact path="/teacher/dashboard" component={TeacherDashboardScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/teacher/students" component={TeacherStudentsScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/teacher/homework" component={TeacherHomeworkScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/teacher/marks" component={TeacherMarksScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/teacher/news" component={TeacherNewsScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/teacher/circulars" component={TeacherCircularsScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/teacher/weekly-lessons" component={WeeklyLessonGridScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/teacher/attendance" component={TeacherAttendanceScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/teacher/timetable" component={WeeklyTimetableScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
        </>
      )}

      {/* Student Routes */}
      {isStudent && (
        <>
          <ProtectedRoute exact path="/student/dashboard" component={StudentDashboardScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/student/homework" component={StudentHomeworkListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/student/homework/:homeworkId" component={StudentHomeworkDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/student/marks" component={StudentMarksListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/student/news" component={StudentNewsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/student/news/:newsId" component={StudentNewsDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/student/circulars" component={StudentCircularsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/student/exams" component={StudentExamSchedulesScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/student/exams/:examId" component={StudentExamDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/student/profile" component={StudentProfileScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/student/weekly-lessons" component={WeeklyLessonViewScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
        </>
      )}

      {/* Class Controller Routes */}
      {isClass && (
        <>
          <ProtectedRoute exact path="/class-controller/dashboard" component={ClassControllerDashboardScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/students" component={ClassStudentsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/students/add" component={ClassAddStudentScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/students/:studentId/edit" component={ClassEditStudentScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/homework" component={ClassHomeworkListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/homework/:homeworkId" component={ClassHomeworkDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/homework/create" component={ClassCreateHomeworkScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/attendance" component={ClassAttendanceListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/attendance/mark" component={ClassMarkAttendanceScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/news" component={ClassNewsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/news/:newsId" component={ClassNewsDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/circulars" component={ClassCircularsListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/circulars/create" component={ClassCreateCircularScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/exams" component={ClassExamSchedulesListScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/exams/create" component={ClassCreateExamScheduleScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/exams/:examId" component={ClassExamDetailScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
          <ProtectedRoute exact path="/class-controller/profile" component={ClassProfileScreen} isAuthenticated={isAuthenticated} isClass={isClass} />
        </>
      )}

        {/* Default redirect */}
        <Route exact path="/">
          <Redirect to={isAuthenticated || isClass ? "/dashboard" : "/login"} />
        </Route>

        {/* Fallback redirect */}
        <Redirect to="/login" />
      </Switch>
    </Suspense>
  );
};

export default App;