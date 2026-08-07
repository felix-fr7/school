/**
 * Ultra-Luxury World-Class Login Screen
 * Tailored for Enterprise School Management System
 */

import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonInput,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginScreen.css';

const LoginScreen = () => {
  const history = useHistory();
  const { login: authLogin, classLogin: authClassLogin } = useAuth();
  const [loginMode, setLoginMode] = useState('student'); // 'student' | 'cls' | 'admin'
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const endpoint = `${apiUrl}/auth/login`;
      let payload = {};

      if (loginMode === 'student') {
        if (!studentId.trim() || !password.trim()) {
          setError('Please enter Student ID and Password');
          setIsLoading(false);
          return;
        }
        payload = { usernameOrEmailOrId: studentId.trim(), password };
      } else if (loginMode === 'cls') {
        if (!email.trim() || !password.trim()) {
          setError('Please enter Class ID / Code and Password');
          setIsLoading(false);
          return;
        }
        payload = { usernameOrEmailOrId: email.trim().toUpperCase(), password };
      } else {
        // Admin / Super Admin login using Email
        if (!email.trim() || !password.trim()) {
          setError('Please enter Email Address and Password');
          setIsLoading(false);
          return;
        }
        payload = { usernameOrEmailOrId: email.trim(), password };
      }

      // Use AuthContext login method to properly update auth state
      if (loginMode === 'cls') {
        // Class login uses a different endpoint
        await authClassLogin(payload.usernameOrEmailOrId, payload.password);
      } else {
        await authLogin(payload.usernameOrEmailOrId, payload.password);
      }

      // AuthContext will update state and AuthRedirect will handle navigation
      // But we can also redirect explicitly to the correct dashboard route
      // The user state is now updated in AuthContext, so we can check the role
      console.log("Login Success! Auth state updated via AuthContext.");
      
      // Redirect to appropriate dashboard - these routes exist in App.tsx
      // The AuthRedirect component will also handle this, but we do it explicitly
      // to ensure immediate navigation after successful login
      setTimeout(() => {
        // Small delay to ensure AuthContext state has propagated
        if (loginMode === 'admin') {
          // Check user role from localStorage since AuthContext state update may not be immediate
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const role = user.role ? user.role.toUpperCase().trim().replace(/\s+/g, '_') : '';
          // Handle both 'SUPER_ADMIN' and 'Super Admin' formats
          if (role === 'SUPER_ADMIN' || role === 'SUPER_ADMIN') {
            window.location.href = '/superadmin/dashboard';
          } else {
            // School Admin or any other admin role
            window.location.href = '/admin/dashboard';
          }
      } else if (loginMode === 'student') {
        window.location.href = '/student/dashboard';
      } else if (loginMode === 'cls') {
        window.location.href = '/class-controller/dashboard';
      }
      }, 100);
    } catch (err) {
      let message = 'Login failed. Please verify your credentials.';
      if (err?.response?.data?.error?.message) {
        message = err.response.data.error.message;
      } else if (err?.response?.data?.message) {
        message = err.response.data.message;
      } else if (err?.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <IonPage className="luxury-login-page">
      <IonContent className="luxury-login-content" scrollY={true}>
        {/* Background Decorative Elements */}
        <div className="bg-glow-top"></div>
        <div className="bg-glow-bottom"></div>
        
        {/* School Crest / Background Logo Watermark */}
        <div className="bg-logo-watermark">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 20L20 60V120C20 160 100 180 100 180C100 180 180 160 180 120V60L100 20Z" stroke="#D4AF37" strokeWidth="2" strokeOpacity="0.15" fill="none"/>
            <path d="M100 40L40 70V115C40 145 100 160 100 160C100 160 160 145 160 115V70L100 40Z" stroke="#D4AF37" strokeWidth="1.5" strokeOpacity="0.1" fill="none"/>
            <circle cx="100" cy="100" r="30" stroke="#D4AF37" strokeWidth="1" strokeOpacity="0.12"/>
          </svg>
        </div>

        <div className="luxury-login-wrapper">
          <div className="luxury-login-card">
            
            {/* Header Section */}
            <div className="brand-header">
              <div className="brand-logo-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="brand-title">EXCELLENCE ACADEMY</h1>
              <p className="brand-subtitle">Enterprise School Management Portal</p>
            </div>

            {/* Role Switcher Tabs */}
            <IonSegment
              value={loginMode}
              onIonChange={(e) => {
                setError(null);
                setLoginMode(e.detail.value);
              }}
              className="luxury-segment"
            >
              <IonSegmentButton value="student">
                <IonLabel>Student</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="cls">
                <IonLabel>CLS</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="admin">
                <IonLabel>Admin</IonLabel>
              </IonSegmentButton>
            </IonSegment>

            {/* Error Notification */}
            {error && (
              <div className="luxury-error-box">
                <span className="error-icon">⚠️</span>
                <p>{error}</p>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="luxury-form">
              {loginMode === 'student' ? (
                <div className="input-field-group">
                  <label className="field-label">Student ID</label>
                  <div className="input-box-wrapper">
                    <IonInput
                      placeholder="e.g. STU-0001"
                      value={studentId}
                      onIonInput={(e) => setStudentId(e.detail.value || '')}
                      disabled={isLoading}
                      className="luxury-input"
                    />
                  </div>
                </div>
              ) : (
                <div className="input-field-group">
                  <label className="field-label">
                    {loginMode === 'cls' ? 'Class ID / Code' : 'Email Address'}
                  </label>
                  <div className="input-box-wrapper">
                    <IonInput
                      type={loginMode === 'cls' ? 'text' : 'email'}
                      placeholder={loginMode === 'cls' ? 'e.g. CLS-001' : 'macvel@school.com'}
                      value={email}
                      onIonInput={(e) => setEmail(e.detail.value || '')}
                      disabled={isLoading}
                      className="luxury-input"
                    />
                  </div>
                </div>
              )}

              <div className="input-field-group">
                <label className="field-label">Password</label>
                <div className="input-box-wrapper">
                  <IonInput
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onIonInput={(e) => setPassword(e.detail.value || '')}
                    disabled={isLoading}
                    className="luxury-input"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <IonButton
                type="submit"
                expand="block"
                disabled={isLoading}
                className="luxury-gold-button"
              >
                {isLoading ? (
                  <IonSpinner name="crescent" color="dark" />
                ) : (
                  <span>Access Portal</span>
                )}
              </IonButton>
            </form>

          </div>
          
          <div className="portal-footer-note">
            Protected by Enterprise Multi-Tenant Encryption &bull; v2.4
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default LoginScreen;