/**
 * Login Screen (Ionic React Version)
 * Supports Student login (Student ID/password), Staff login (email/password), 
 * and Class login (class code/password)
 * 
 * Multi-Tenant School Management System
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
  IonText,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { person, business, people } from 'ionicons/icons';
import { useAuth } from '../contexts/AuthContext';

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
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle className="ion-text-center">School App</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding ion-text-center">
        <div className="ion-padding-top">
          <h1 className="ion-no-margin">School App</h1>
          <p className="ion-text-color-medium">Sign in to continue</p>
        </div>

        {/* Login Mode Toggle */}
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

        {/* Error Message */}
        {error && (
          <div className="ion-margin-bottom ion-padding ion-background-color-danger ion-color-white ion-radius">
            <IonText color="light">
              <p className="ion-no-margin ion-text-wrap">{error}</p>
            </IonText>
          </div>
        )}

        {/* Student Login Form */}
        {loginMode === 'student' && (
          <IonCard className="ion-margin-auto">
            <IonCardContent>
              <h2 className="ion-no-margin ion-margin-bottom">Student Login</h2>
              
              <IonInput
                label="Student ID"
                labelPlacement="stacked"
                placeholder="Enter your Student ID (e.g., STU-0001)"
                value={studentId}
                onIonInput={(e) => setStudentId(e.detail.value || '')}
                autocomplete="username"
                disabled={isLoading}
                className="ion-margin-bottom"
              />
              <p className="ion-text-color-medium ion-text-small ion-margin-bottom">
                Your Student ID was provided by your teacher (format: STU-XXXX)
              </p>

              <IonInput
                label="Password"
                labelPlacement="stacked"
                placeholder="Enter your password"
                value={studentPassword}
                onIonInput={(e) => setStudentPassword(e.detail.value || '')}
                type="password"
                disabled={isLoading}
                className="ion-margin-bottom"
              />

              <IonButton
                expand="block"
                onClick={handleStudentLogin}
                disabled={isLoading}
              >
                {isLoading ? <IonSpinner name="crescent" /> : 'Sign In as Student'}
              </IonButton>

              <div className="ion-margin-top ion-padding ion-background-color-light ion-radius">
                <p className="ion-text-color-medium ion-text-small ion-no-margin">
                  Default password: <strong>Student@123</strong>
                </p>
              </div>
            </IonCardContent>
          </IonCard>
        )}

        {/* Staff Login Form */}
        {loginMode === 'staff' && (
          <IonCard className="ion-margin-auto">
            <IonCardContent>
              <h2 className="ion-no-margin ion-margin-bottom">Staff Login</h2>
              
              <IonInput
                label="Email"
                labelPlacement="stacked"
                placeholder="Enter your email"
                value={email}
                onIonInput={(e) => setEmail(e.detail.value || '')}
                type="email"
                autocomplete="email"
                disabled={isLoading}
                className="ion-margin-bottom"
              />

              <IonInput
                label="Password"
                labelPlacement="stacked"
                placeholder="Enter your password"
                value={staffPassword}
                onIonInput={(e) => setStaffPassword(e.detail.value || '')}
                type="password"
                disabled={isLoading}
                className="ion-margin-bottom"
              />

              <IonButton
                expand="block"
                onClick={handleStaffLogin}
                disabled={isLoading}
              >
                {isLoading ? <IonSpinner name="crescent" /> : 'Sign In'}
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {/* Class Login Form */}
        {loginMode === 'class' && (
          <IonCard className="ion-margin-auto">
            <IonCardContent>
              <h2 className="ion-no-margin ion-margin-bottom">Class Login</h2>
              
              <IonInput
                label="Class ID"
                labelPlacement="stacked"
                placeholder="Enter Class ID (e.g., CLS-1)"
                value={classCode}
                onIonInput={(e) => setClassCode(e.detail.value || '')}
                autocomplete="username"
                disabled={isLoading}
                className="ion-margin-bottom"
              />
              <p className="ion-text-color-medium ion-text-small ion-margin-bottom">
                {classCode.length > 0 
                  ? `Logging in as Class: ${classCode.toUpperCase()}` 
                  : 'Enter your class code (e.g., CLS-1, CLS-2)'}
              </p>

              <IonInput
                label="Password"
                labelPlacement="stacked"
                placeholder="Enter class password"
                value={classPassword}
                onIonInput={(e) => setClassPassword(e.detail.value || '')}
                type="password"
                disabled={isLoading}
                className="ion-margin-bottom"
              />

              <IonButton
                expand="block"
                onClick={handleClassLogin}
                disabled={isLoading}
              >
                {isLoading ? <IonSpinner name="crescent" /> : 'Sign In as Class'}
              </IonButton>

              <div className="ion-margin-top ion-padding ion-background-color-light ion-radius">
                <p className="ion-text-color-medium ion-text-small ion-no-margin">
                  Contact your administrator for class credentials
                </p>
              </div>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default LoginScreen;