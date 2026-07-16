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
import { useHistory } from 'react-router-dom';
import { person, business, people } from 'ionicons/icons';
import { useAuth } from '../contexts/AuthContext';
import './LoginScreen.css';

const LoginScreen: React.FC = () => {
  const history = useHistory();
  const { login, classLogin, isAuthenticated, isAdmin, isStudent, isTeacher, isClass } = useAuth();
  
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
      console.log('[StudentLogin] Attempting login with studentId:', studentId.trim());
      await login(studentId.trim(), studentPassword);
      console.log('[StudentLogin] Login successful, redirecting...');
      // Navigation will be handled by AuthContext state change
    } catch (err: any) {
      console.log('[StudentLogin] Login error:', err);
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
      console.log('[StaffLogin] Login successful, redirecting...');
      // Navigation will be handled by AuthContext state change
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
      console.log('[ClassLogin] Login successful, redirecting...');
      // Navigation will be handled by AuthContext state change
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (err: any) => {
    console.log("Raw login error caught:", err);

    let rawMessage: any = "Login failed. Please try again.";

    if (err?.response?.data?.error?.message) {
      rawMessage = err.response.data.error.message;
    } else if (err?.response?.data?.message) {
      rawMessage = err.response.data.message;
    } else if (err?.message) {
      rawMessage = err.message;
    } else if (err?.response?.data) {
      rawMessage = err.response.data;
    } else if (err) {
      rawMessage = err;
    }

    let cleanStringMessage = "";

    if (typeof rawMessage === 'string') {
      cleanStringMessage = rawMessage;
    } else if (typeof rawMessage === 'object' && rawMessage !== null) {
      try {
        cleanStringMessage = JSON.stringify(rawMessage);
      } catch (e) {
        cleanStringMessage = "Error parsing server dynamic response object.";
      }
    } else {
      cleanStringMessage = String(rawMessage);
    }

    if (typeof cleanStringMessage !== 'string' || cleanStringMessage.includes('[object')) {
      cleanStringMessage = "Authentication failed. Server returned an invalid payload structure.";
    }

    setError(cleanStringMessage);
  };

  const getSegmentIcon = (mode: 'student' | 'staff' | 'class') => {
    switch (mode) {
      case 'student': return person;
      case 'staff': return business;
      case 'class': return people;
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>School App</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="login-content">
        <div className="login-container">
          {/* Header */}
          <div className="header">
            <h1 className="header-title">School App</h1>
            <p className="header-subtitle">Sign in to continue</p>
          </div>

          {/* Login Mode Toggle */}
          <IonSegment
            value={loginMode}
            onIonChange={(e) => setLoginMode(e.detail.value as 'student' | 'staff' | 'class')}
            className="segment-container"
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
            <div className="error-container">
              <IonText color="danger">
                <p>{error}</p>
              </IonText>
            </div>
          )}

          {/* Student Login Form */}
          {loginMode === 'student' && (
            <IonCard className="form-card">
              <IonCardContent>
                <h2 className="form-title">Student Login</h2>
                
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
                <p className="input-hint">
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
                  className="ion-margin-top"
                >
                  {isLoading ? <IonSpinner name="crescent" /> : 'Sign In as Student'}
                </IonButton>

                <div className="password-hint-container">
                  <p className="password-hint-text">
                    Default password: <strong className="password-hint-value">Student@123</strong>
                  </p>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/* Staff Login Form */}
          {loginMode === 'staff' && (
            <IonCard className="form-card">
              <IonCardContent>
                <h2 className="form-title">Staff Login</h2>
                
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
                  className="ion-margin-top"
                >
                  {isLoading ? <IonSpinner name="crescent" /> : 'Sign In'}
                </IonButton>
              </IonCardContent>
            </IonCard>
          )}

          {/* Class Login Form */}
          {loginMode === 'class' && (
            <IonCard className="form-card">
              <IonCardContent>
                <h2 className="form-title">Class Login</h2>
                
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
                <p className="input-hint">
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
                  className="ion-margin-top"
                >
                  {isLoading ? <IonSpinner name="crescent" /> : 'Sign In as Class'}
                </IonButton>

                <div className="password-hint-container">
                  <p className="password-hint-text">
                    Contact your administrator for class credentials
                  </p>
                </div>
              </IonCardContent>
            </IonCard>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default LoginScreen;