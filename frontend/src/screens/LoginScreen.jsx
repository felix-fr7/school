import React, { useState } from 'react';
import { IonPage, IonContent, IonButton, IonInput, IonSpinner } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../../../mobile/student/auth/StudentLoginScreen.css';
import logoImage from '../logo/Macvel.jpg';

const LoginScreen = () => {
  const history = useHistory();
  const { login, classLogin, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) { setError('Please enter your username and password'); return; }
    setError(null); setIsLoading(true);
    const identifier = username.trim();
    try {
      try {
        await classLogin(identifier.toUpperCase(), password);
        history.replace('/class-controller/dashboard');
        return;
      } catch {
        await login(identifier, password);
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const role = String(user.role || '').toUpperCase().replace(/[ -]/g, '_');
        if (role === 'STUDENT') {
          await logout();
          throw new Error('Student login is available only on the student mobile portal.');
        }
        if (role.includes('SUPER')) history.replace('/superadmin/dashboard');
        else history.replace('/admin/dashboard');
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Invalid username or password');
    } finally { setIsLoading(false); }
  };

  return <IonPage className="luxury-login-page"><IonContent className="luxury-login-content" scrollY><div className="bg-glow-top" /><div className="bg-glow-bottom" /><div className="luxury-login-wrapper"><div className="luxury-login-card"><div className="brand-header"><div className="brand-logo-image-wrapper"><img src={logoImage} alt="Macvel Software Solutions Logo" className="brand-logo-image" /></div><h1 className="brand-title">STAFF PORTAL</h1><p className="brand-subtitle">Class, Admin and Super Admin login</p></div>{error && <div className="luxury-error-box"><span className="error-icon">⚠️</span><p>{error}</p></div>}<form onSubmit={handleSubmit} className="luxury-form"><div className="input-field-group"><label className="field-label" htmlFor="staff-username">Username</label><div className="input-box-wrapper"><IonInput id="staff-username" value={username} onIonInput={(e) => setUsername(e.detail.value || '')} placeholder="Class code or email" disabled={isLoading} className="luxury-input" required /></div></div><div className="input-field-group"><label className="field-label" htmlFor="staff-password">Password</label><div className="input-box-wrapper"><IonInput id="staff-password" type="password" value={password} onIonInput={(e) => setPassword(e.detail.value || '')} placeholder="Enter your password" disabled={isLoading} className="luxury-input" required /></div></div><IonButton type="submit" expand="block" disabled={isLoading} className="luxury-gold-button">{isLoading ? <IonSpinner name="crescent" color="dark" /> : <span>ACCESS PORTAL</span>}</IonButton></form></div><div className="portal-footer-note">Staff Web Portal</div></div></IonContent></IonPage>;
};
export default LoginScreen;
