/**
 * Register Screen (Ionic React Version)
 * User registration form with name, email and password
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
  IonCard,
  IonCardContent,
  IonIcon,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { arrowBack } from 'ionicons/icons';
import { useAuth } from '../contexts/AuthContext';
import './RegisterScreen.css';

const RegisterScreen = () => {
  const history = useHistory();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRegister = async () => {
    setError(null);
    
    // Basic validation
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButton slot="start" fill="clear" onClick={() => history.goBack()}>
            <IonIcon icon={arrowBack} slot="icon-only" />
          </IonButton>
          <IonTitle>Create Account</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="register-content">
        <div className="register-container">
          {/* Header */}
          <div className="header">
            <h1 className="header-title">Create Account</h1>
            <p className="header-subtitle">Sign up to get started</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-container">
              <IonText color="danger">
                <p>{error}</p>
              </IonText>
            </div>
          )}

          {/* Registration Form */}
          <IonCard className="form-card">
            <IonCardContent>
              <div className="input-container">
                <IonInput
                  label="Full Name"
                  labelPlacement="stacked"
                  placeholder="Enter your name"
                  value={name}
                  onIonInput={(e) => setName(e.detail.value || '')}
                  autocomplete="name"
                  disabled={isLoading}
                />
              </div>

              <div className="input-container">
                <IonInput
                  label="Email"
                  labelPlacement="stacked"
                  placeholder="Enter your email"
                  value={email}
                  onIonInput={(e) => setEmail(e.detail.value || '')}
                  type="email"
                  autocomplete="email"
                  disabled={isLoading}
                />
              </div>

              <div className="input-container">
                <IonInput
                  label="Password"
                  labelPlacement="stacked"
                  placeholder="Enter your password"
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value || '')}
                  type="password"
                  autocomplete="new-password"
                  disabled={isLoading}
                />
              </div>

              <div className="input-container">
                <IonInput
                  label="Confirm Password"
                  labelPlacement="stacked"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onIonInput={(e) => setConfirmPassword(e.detail.value || '')}
                  type="password"
                  autocomplete="new-password"
                  disabled={isLoading}
                />
              </div>

              <IonButton
                expand="block"
                onClick={handleRegister}
                disabled={isLoading}
                className="ion-margin-top"
              >
                {isLoading ? <IonSpinner name="crescent" /> : 'Sign Up'}
              </IonButton>

              <div className="login-container">
                <IonText color="medium">
                  <p className="login-text">Already have an account? </p>
                </IonText>
                <IonButton fill="clear" onClick={() => history.goBack()}>
                  <IonText color="primary">
                    <strong>Sign In</strong>
                  </IonText>
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RegisterScreen;