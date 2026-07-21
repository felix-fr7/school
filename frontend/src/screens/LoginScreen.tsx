/**
 * Login Screen (Ionic React Version)
 * Supports Student login (Student ID/password), Staff login (email/password), 
 * and Class login (class code/password)
 * 
 * Multi-Tenant School Management System
 * Superadmin Theme - Luxury Corporate Light (White, Corporate Blue, Royal Gold)
 */

import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonInput,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
} from '@ionic/react';
import { person, business, people } from 'ionicons/icons';
import { useAuth } from '../contexts/AuthContext';
import './LoginScreen.css';

const LoginScreen: React.FC = () => {
  const { login, classLogin } = useAuth();
  
  const [loginMode, setLoginMode] = useState<'student' | 'staff' | 'class'>('student');
  
  // Student login state (Student ID + Password)
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  
  // Staff login state (Email + Password)
  const [email, setEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  
  // Class login state
  const [classCode, setClassCode] = useState('');
  const [classPassword, setClassPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStudentLogin = async () => {
    if (!studentId.trim() || !studentPassword.trim()) {
      setError('Please enter Student ID and Password');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await login(studentId.trim(), studentPassword);
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffLogin = async () => {
    if (!email.trim() || !staffPassword.trim()) {
      setError('Please enter Email and Password');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await login(email.trim(), staffPassword);
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassLogin = async () => {
    if (!classCode.trim() || !classPassword.trim()) {
      setError('Please enter Class ID and Password');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await classLogin(classCode.trim().toUpperCase(), classPassword);
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (err: any) => {
    let message = 'Login failed. Please try again.';
    
    if (err?.response?.data?.error?.message) {
      message = err.response.data.error.message;
    } else if (err?.response?.data?.message) {
      message = err.response.data.message;
    } else if (err?.message) {
      message = err.message;
    }
    
    setError(message);
  };

  return (
    <IonPage className="login-page">
      <IonHeader className="login-header">
        <IonToolbar>
          <IonTitle className="ion-text-center">School App</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding ion-text-center login-page">
        <div className="ion-padding-top login-title-area">
          <h1 className="ion-no-margin">School App</h1>
          <p>Sign in to continue</p>
        </div>

        {/* Login Mode Toggle - Aligned with card width */}
        <IonGrid>
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" size-md="5">
              <IonSegment
                value={loginMode}
                onIonChange={(e) => setLoginMode(e.detail.value as 'student' | 'staff' | 'class')}
                className="ion-margin-vertical"
              >
                <IonSegmentButton value="student">
                  <IonIcon icon={person} />
                  <IonLabel>Student</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="staff">
                  <IonIcon icon={business} />
                  <IonLabel>Staff</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="class">
                  <IonIcon icon={people} />
                  <IonLabel>Class</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </IonCol>
          </IonRow>
        </IonGrid>

        {/* Error Message */}
        {error && (
          <div className="login-error ion-margin-bottom">
            <p className="ion-no-margin">{error}</p>
          </div>
        )}

        {/* Student Login Form */}
        {loginMode === 'student' && (
          <IonGrid>
            <IonRow className="ion-justify-content-center">
              <IonCol size="12" size-md="5">
                <IonCard className="login-card">
                  <div className="login-watermark"></div>
                  <IonCardContent>
                    <h2 className="ion-no-margin ion-margin-bottom ion-text-start">Student Login</h2>
                    
                    <IonItem fill="outline" mode="md" className="ion-margin-bottom">
                      <IonInput
                        placeholder="Student ID (e.g. STU-0001)"
                        value={studentId}
                        onIonInput={(e) => setStudentId(e.detail.value || '')}
                        autocomplete="off"
                        aria-autocomplete="none"
                        disabled={isLoading}
                      />
                    </IonItem>
                    <p className="login-helper-text ion-margin-bottom">
                      Your Student ID was provided by your teacher (format: STU-XXXX)
                    </p>

                    <IonItem fill="outline" mode="md" className="ion-margin-bottom">
                      <IonInput
                        placeholder="Password"
                        value={studentPassword}
                        onIonInput={(e) => setStudentPassword(e.detail.value || '')}
                        type="password"
                        autocomplete="off"
                        aria-autocomplete="none"
                        disabled={isLoading}
                      />
                    </IonItem>

                    <IonButton
                      expand="block"
                      onClick={handleStudentLogin}
                      disabled={isLoading}
                    >
                      {isLoading ? <IonSpinner name="crescent" /> : 'Sign In as Student'}
                    </IonButton>

                    <div className="login-info-box ion-margin-top">
                      <p className="ion-no-margin">
                        Default password: <strong>Student@123</strong>
                      </p>
                    </div>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>
        )}

        {/* Staff Login Form */}
        {loginMode === 'staff' && (
          <IonGrid>
            <IonRow className="ion-justify-content-center">
              <IonCol size="12" size-md="5">
                <IonCard className="login-card">
                  <div className="login-watermark"></div>
                  <IonCardContent>
                    <h2 className="ion-no-margin ion-margin-bottom ion-text-start">Staff Login</h2>
                    
                    <IonItem fill="outline" mode="md" className="ion-margin-bottom">
                      <IonInput
                        placeholder="Email"
                        value={email}
                        onIonInput={(e) => setEmail(e.detail.value || '')}
                        type="email"
                        autocomplete="off"
                        aria-autocomplete="none"
                        disabled={isLoading}
                      />
                    </IonItem>

                    <IonItem fill="outline" mode="md" className="ion-margin-bottom">
                      <IonInput
                        placeholder="Password"
                        value={staffPassword}
                        onIonInput={(e) => setStaffPassword(e.detail.value || '')}
                        type="password"
                        autocomplete="off"
                        aria-autocomplete="none"
                        disabled={isLoading}
                      />
                    </IonItem>

                    <IonButton
                      expand="block"
                      onClick={handleStaffLogin}
                      disabled={isLoading}
                    >
                      {isLoading ? <IonSpinner name="crescent" /> : 'Sign In'}
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>
        )}

        {/* Class Login Form */}
        {loginMode === 'class' && (
          <IonGrid>
            <IonRow className="ion-justify-content-center">
              <IonCol size="12" size-md="5">
                <IonCard className="login-card">
                  <div className="login-watermark"></div>
                  <IonCardContent>
                    <h2 className="ion-no-margin ion-margin-bottom ion-text-start">Class Login</h2>
                    
                    <IonItem fill="outline" mode="md" className="ion-margin-bottom">
                      <IonInput
                        placeholder="Class ID (e.g. CLS-1)"
                        value={classCode}
                        onIonInput={(e) => setClassCode(e.detail.value || '')}
                        autocomplete="off"
                        aria-autocomplete="none"
                        disabled={isLoading}
                      />
                    </IonItem>
                    <p className="login-helper-text ion-margin-bottom">
                      {classCode.length > 0 
                        ? `Logging in as Class: ${classCode.toUpperCase()}` 
                        : 'Enter your class code (e.g., CLS-1, CLS-2)'}
                    </p>

                    <IonItem fill="outline" mode="md" className="ion-margin-bottom">
                      <IonInput
                        placeholder="Password"
                        value={classPassword}
                        onIonInput={(e) => setClassPassword(e.detail.value || '')}
                        type="password"
                        autocomplete="off"
                        aria-autocomplete="none"
                        disabled={isLoading}
                      />
                    </IonItem>

                    <IonButton
                      expand="block"
                      onClick={handleClassLogin}
                      disabled={isLoading}
                    >
                      {isLoading ? <IonSpinner name="crescent" /> : 'Sign In as Class'}
                    </IonButton>

                    <div className="login-info-box ion-margin-top">
                      <p className="ion-no-margin">
                        Contact your administrator for class credentials
                      </p>
                    </div>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>
        )}
      </IonContent>
    </IonPage>
  );
};

export default LoginScreen;