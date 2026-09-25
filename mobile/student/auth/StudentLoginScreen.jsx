import React, { useState } from 'react';
import { IonPage, IonContent, IonButton, IonInput, IonSpinner, IonImg } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../../frontend/src/contexts/AuthContext';
import './StudentLoginScreen.css';
import logoImage from '../../../frontend/src/logo/Macvel.jpg';

const StudentLoginScreen = () => {
  const history = useHistory();
  const { login, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await login(username.trim(), password);
      const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
      const role = String(loggedInUser.role || '').replace(/[ -]/g, '_').toUpperCase();
      if (role !== 'STUDENT') {
        await logout();
        setError('This login is only for student accounts.');
        return;
      }
      history.replace('/student/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage className="luxury-login-page">
      <IonContent className="luxury-login-content" scrollY>
        <div className="bg-glow-top" /><div className="bg-glow-bottom" />
        <div className="luxury-login-wrapper">
          <div className="luxury-login-card">
            <div className="brand-header">
              <div className="brand-logo-image-wrapper"><IonImg src={logoImage} alt="Macvel Software Solutions Logo" className="brand-logo-image" /></div>
              <h1 className="brand-title">STUDENT PORTAL</h1>
              <p className="brand-subtitle">Login with your class roll number</p>
            </div>
            {error && <div className="luxury-error-box"><span className="error-icon">⚠️</span><p>{error}</p></div>}
            <form onSubmit={handleSubmit} className="luxury-form">
              <div className="input-field-group"><label className="field-label" htmlFor="student-username">Username / Roll Number</label><div className="input-box-wrapper"><IonInput id="student-username" value={username} onIonInput={(e) => setUsername(e.detail.value || '')} placeholder="Enter your roll number" disabled={isLoading} className="luxury-input" required /></div></div>
              <div className="input-field-group"><label className="field-label" htmlFor="student-password">Password</label><div className="input-box-wrapper"><IonInput id="student-password" type="password" value={password} onIonInput={(e) => setPassword(e.detail.value || '')} placeholder="Enter your password" disabled={isLoading} className="luxury-input" required /></div></div>
              <IonButton type="submit" expand="block" disabled={isLoading} className="luxury-gold-button">{isLoading ? <IonSpinner name="crescent" color="dark" /> : <span>LOGIN AS STUDENT</span>}</IonButton>
            </form>
          </div>
          <div className="portal-footer-note">Student Mobile Portal</div>
        </div>
      </IonContent>
    </IonPage>
  );
};
export default StudentLoginScreen;
