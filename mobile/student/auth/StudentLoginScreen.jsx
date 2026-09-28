import React, { useState, useEffect } from 'react';
import { IonPage, IonContent, IonButton, IonInput, IonSpinner } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../src/contexts/AuthContext';
import './StudentLoginScreen.css';
import { fetchPortalBranding, resolveMediaUrl } from '../../src/services/api';

// Fallback text - only used if the branding API is unreachable
// NOTE: there is NO built-in default logo anymore. The mobile login page shows
// a logo ONLY if the Super Admin uploaded one (mobile logo, else the staff logo).
const DEFAULT_HEADING = 'STUDENT PORTAL';
const DEFAULT_SUB_HEADING = 'Login with your class roll number';

const StudentLoginScreen = () => {
  const history = useHistory();
  const { login, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Login page branding (Super Admin edit pannathu, DB la irukura logo + heading + sub heading)
  // Fallback chain: mobile override -> staff value -> built-in default
  const [branding, setBranding] = useState({
    logoUrl: null,
    showLogo: true,
    heading: DEFAULT_HEADING,
    subHeading: DEFAULT_SUB_HEADING,
  });
  const [brandingFailed, setBrandingFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchBranding = async () => {
      try {
        const res = await fetchPortalBranding();
        const data = res?.data || {};
        if (cancelled) return;
        setBrandingFailed(false);
        setBranding({
          logoUrl: data.mobileLogoUrl || data.logoUrl || null,
          showLogo: data.showMobileLogo !== false,
          heading: data.mobileHeading || data.heading || DEFAULT_HEADING,
          subHeading: data.mobileSubHeading || data.subHeading || DEFAULT_SUB_HEADING,
        });
      } catch (e) {
        if (cancelled) return;
        // API fail ana default logo + text aathu use pannu - vera logic mathala
        setBrandingFailed(true);
        console.warn(
          '[Student Login] Failed to load portal branding, using defaults:',
          e?.response?.status || e?.message
        );
      }
    };

    fetchBranding();

    return () => { cancelled = true; };
  }, []);

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
              {branding.showLogo && branding.logoUrl && <div className="brand-logo-image-wrapper"><img
                src={resolveMediaUrl(branding.logoUrl)}
                alt="Portal Logo"
                className="brand-logo-image"
              /></div>}
              {branding.heading && <h1 className="brand-title">{branding.heading}</h1>}
              {branding.subHeading && <p className="brand-subtitle">{branding.subHeading}</p>}
              {brandingFailed && (
                <p className="branding-warning">
                  Could not load the portal branding - showing defaults. Please check your connection.
                </p>
              )}
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
