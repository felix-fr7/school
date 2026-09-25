import React, { Suspense, useEffect } from 'react';
import { IonApp, IonPage, IonContent, IonSpinner, IonText, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect, Switch, useHistory } from 'react-router-dom';

import { AuthProvider, useAuth } from '../../frontend/src/contexts/AuthContext.jsx';
import ErrorBoundary from '../../frontend/src/components/ErrorBoundary.jsx';
import StudentLoginScreen from '../student/auth/StudentLoginScreen.jsx';

const StudentDashboardScreen = React.lazy(() => import('../student/dashboard/DashboardScreen.jsx'));
const StudentHomeworkListScreen = React.lazy(() => import('../student/homework/HomeworkListScreen.jsx'));
const StudentHomeworkDetailScreen = React.lazy(() => import('../student/homework/HomeworkDetailScreen.jsx'));
const StudentMarksListScreen = React.lazy(() => import('../student/marks/MarksListScreen.jsx'));
const StudentNewsListScreen = React.lazy(() => import('../student/news/NewsListScreen.jsx'));
const StudentNewsDetailScreen = React.lazy(() => import('../student/news/NewsDetailScreen.jsx'));
const StudentCircularsListScreen = React.lazy(() => import('../student/circulars/CircularsListScreen.jsx'));
const StudentCircularDetailScreen = React.lazy(() => import('../student/circulars/CircularDetailScreen.jsx'));
const StudentReportCardsScreen = React.lazy(() => import('../student/report-cards/ReportCardsScreen.jsx'));
const StudentExamSchedulesScreen = React.lazy(() => import('../student/exams/ExamSchedulesScreen.jsx'));
const StudentExamDetailScreen = React.lazy(() => import('../student/exams/StudentExamDetailScreen.jsx'));
const StudentProfileScreen = React.lazy(() => import('../student/profile/ProfileScreen.jsx'));
const StudentTimetableScreen = React.lazy(() => import('../student/timetable/StudentTimetableScreen.jsx'));
const StudentWeeklyLessonsScreen = React.lazy(() => import('../student/weekly-lessons/WeeklyLessonViewScreen.jsx'));
const StudentCalendarScreen = React.lazy(() => import('../student/calendar/CalendarScreen.jsx'));
const StudentCalendarEventDetailScreen = React.lazy(() => import('../student/calendar/CalendarEventDetailScreen.jsx'));

const Loading = () => (
  <IonPage>
    <IonContent className="ion-padding ion-text-center ion-justify-content-center">
      <IonSpinner name="crescent" />
      <IonText color="medium"><p>Loading...</p></IonText>
    </IonContent>
  </IonPage>
);

const ProtectedRoute = ({ component: Component, isAuthenticated, isLoading, ...rest }) => (
  <Route {...rest} render={(props) => {
    if (isLoading) return <Loading />;
    return isAuthenticated ? <Component {...props} /> : <Redirect to="/login" />;
  }} />
);

const AuthRedirect = () => {
  const { isAuthenticated, isStudent, isLoading } = useAuth();
  const history = useHistory();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && isStudent && window.location.pathname === '/login') {
      history.replace('/student/dashboard');
    }
    if (!isAuthenticated && window.location.pathname !== '/login') {
      history.replace('/login');
    }
  }, [isAuthenticated, isStudent, isLoading, history]);

  return null;
};


const MobileRoutes = () => {
  const { isAuthenticated, isLoading, isStudent } = useAuth();

  return (
    <Suspense fallback={<Loading />}>
      <AuthRedirect />
      <Switch>
        <Route exact path="/login" component={StudentLoginScreen} />
        <Route exact path="/student/login" component={StudentLoginScreen} />
        <Route exact path="/">
          <Redirect to={isAuthenticated && isStudent ? '/student/dashboard' : '/login'} />
        </Route>

        {isStudent && (
          <>
            <ProtectedRoute exact path="/student/dashboard" component={StudentDashboardScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/homework" component={StudentHomeworkListScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/homework/:homeworkId" component={StudentHomeworkDetailScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/marks" component={StudentMarksListScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/news" component={StudentNewsListScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/news/:newsId" component={StudentNewsDetailScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/circulars" component={StudentCircularsListScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/circulars/:id" component={StudentCircularDetailScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/report-cards" component={StudentReportCardsScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/exams" component={StudentExamSchedulesScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/exams/:examId" component={StudentExamDetailScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/profile" component={StudentProfileScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/timetable" component={StudentTimetableScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/weekly-lessons" component={StudentWeeklyLessonsScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/calendar" component={StudentCalendarScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
            <ProtectedRoute exact path="/student/calendar/:eventId" component={StudentCalendarEventDetailScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
          </>
        )}

        <Redirect to="/login" />
      </Switch>
    </Suspense>
  );
};

const App = () => (
  <ErrorBoundary>
    <IonApp>
      <AuthProvider>
        <IonReactRouter>
          <IonRouterOutlet>
            <MobileRoutes />
          </IonRouterOutlet>
        </IonReactRouter>
      </AuthProvider>
    </IonApp>
  </ErrorBoundary>
);

export default App;
