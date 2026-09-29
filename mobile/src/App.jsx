import React, { Suspense, useEffect, useState } from 'react';
import { IonApp, IonPage, IonContent, IonSpinner, IonText, IonRouterOutlet, IonAlert } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect, Switch, useHistory } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';

import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
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
const StudentAlbumsScreen = React.lazy(() => import('../student/albums/AlbumsScreen.jsx'));

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


/**
 * Android's hardware / gesture back button closes the app by default unless the
 * web view is told to handle it. Registering a `backButton` listener lets us
 * pop the React Router history instead, so the student returns to the previous
 * screen.
 *
 * On the two entry screens - the dashboard and the login page - there is no
 * meaningful page to go back to, so instead of closing the app silently we ask
 * the student what they want: stay on the screen, or exit the app.
 */
const CONFIRM_EXIT_PATHS = ['/student/dashboard', '/login', '/student/login'];

const BackButtonHandler = () => {
  const history = useHistory();
  const [showExitAlert, setShowExitAlert] = useState(false);

  useEffect(() => {
    // The listener resolves asynchronously, so hold it in a local and remove it on
    // cleanup - otherwise the handler leaks on every re-render / remount.
    let handler;

    const register = async () => {
      handler = await CapApp.addListener('backButton', () => {
        const path = window.location.pathname;
        const isEntryScreen = CONFIRM_EXIT_PATHS.includes(path);

        // Ask before leaving from the dashboard / login pages.
        if (isEntryScreen) {
          setShowExitAlert(true);
          return;
        }

        // Detail / list screens: go back one step in the app's own history.
        if (window.history.length > 1) {
          history.goBack();
        } else {
          CapApp.exitApp();
        }
      });
    };

    register();

    return () => {
      if (handler) handler.remove();
    };
  }, [history]);

  return (
    <>
      <IonAlert
        isOpen={showExitAlert}
        onDidDismiss={() => setShowExitAlert(false)}
        header="Exit App?"
        message="Are you sure you want to close the app?"
        buttons={[
          {
            text: 'Stay',
            role: 'cancel',
            handler: () => setShowExitAlert(false),
          },
          {
            text: 'Exit',
            role: 'destructive',
            handler: () => CapApp.exitApp(),
          },
        ]}
      />
    </>
  );
};

const MobileRoutes = () => {
  const { isAuthenticated, isLoading, isStudent } = useAuth();

  return (
    <Suspense fallback={<Loading />}>
      <AuthRedirect />
      <BackButtonHandler />
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
            <ProtectedRoute exact path="/albums" component={StudentAlbumsScreen} isAuthenticated={isAuthenticated} isLoading={isLoading} />
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
