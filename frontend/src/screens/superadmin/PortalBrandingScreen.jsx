/**
 * Portal Branding Screen - Super Admin
 * Edit the STAFF LOGIN PAGE branding: logo, heading and sub heading.
 *
 * Everything edited here is saved to MongoDB (PortalBranding collection) and is
 * immediately reflected on the public login page.
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonCard,
  IonCardContent,
  IonIcon,
  IonSpinner,
  IonInput,
  IonTextarea,
  IonButton,
  IonItem,
  IonLabel,
  IonToggle,
  IonAlert,
} from '@ionic/react';
import {
  cloudUploadOutline,
  trashOutline,
  saveOutline,
  refreshOutline,
  imageOutline,
  textOutline,
  checkmarkCircleOutline,
  phonePortraitOutline,
} from 'ionicons/icons';
import { portalBrandingAPI, resolveMediaUrl } from '../../services/api';
import defaultLogo from '../../logo/Macvel.jpg';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';
import './PortalBrandingScreen.css';

const PortalBrandingScreen = () => {
  const [branding, setBranding] = useState(null);
  const [form, setForm] = useState({ heading: '', subHeading: '', showLogo: true });
  const [mobileForm, setMobileForm] = useState({
    mobileHeading: '',
    mobileSubHeading: '',
    showMobileLogo: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [mobileSaving, setMobileSaving] = useState(false);
  const [mobileLogoBusy, setMobileLogoBusy] = useState(false);

  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSuccess, setAlertSuccess] = useState(true);

  // Populate the form from whatever the API returns
  const applyBranding = (data) => {
    const next = {
      logoUrl: data?.logoUrl || null,
      showLogo: data?.showLogo !== false,
      heading: data?.heading || '',
      subHeading: data?.subHeading || '',
      mobileLogoUrl: data?.mobileLogoUrl || null,
      showMobileLogo: data?.showMobileLogo !== false,
      mobileHeading: data?.mobileHeading || '',
      mobileSubHeading: data?.mobileSubHeading || '',
    };
    setBranding(next);
    setForm({ heading: next.heading, subHeading: next.subHeading, showLogo: next.showLogo });
    setMobileForm({
      mobileHeading: next.mobileHeading,
      mobileSubHeading: next.mobileSubHeading,
      showMobileLogo: next.showMobileLogo,
    });
  };

  const openAlert = (header, message, success = true) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setAlertSuccess(success);
    setShowAlert(true);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchBranding = async () => {
      try {
        const res = await portalBrandingAPI.getBranding();
        if (!cancelled) applyBranding(res?.data || {});
      } catch (error) {
        console.error('Error loading portal branding:', error);
        if (!cancelled) {
          openAlert(
            'Error',
            error?.response?.data?.error?.message || 'Failed to load login page branding.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBranding();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================
  // Logo: upload / replace / delete
  // ==========================================
  const handleLogoChange = (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      openAlert('Invalid File', 'Please choose an image file (JPG, PNG, WEBP, etc.).', false);
      return;
    }

    uploadLogo(file);
  };

  const uploadLogo = async (file) => {
    setLogoBusy(true);
    try {
      const response = await portalBrandingAPI.uploadLogo(file);
      applyBranding(response.data || {});
      openAlert('Success', response.message || 'Login page logo updated successfully.');
    } catch (error) {
      openAlert(
        'Upload Failed',
        error?.response?.data?.error?.message || 'Failed to upload the logo. Please try again.',
        false
      );
    } finally {
      setLogoBusy(false);
    }
  };

  const deleteLogo = async () => {
    setLogoBusy(true);
    try {
      const response = await portalBrandingAPI.deleteLogo();
      applyBranding(response.data || {});
      openAlert('Deleted', response.message || 'Login page logo deleted successfully.');
    } catch (error) {
      openAlert(
        'Delete Failed',
        error?.response?.data?.error?.message || 'Failed to delete the logo. Please try again.',
        false
      );
    } finally {
      setLogoBusy(false);
    }
  };

  // ==========================================
  // Heading / Sub heading / Logo visibility
  // ==========================================
  const saveChanges = async () => {
    setSaving(true);
    try {
      const response = await portalBrandingAPI.updateBranding({
        heading: form.heading,
        subHeading: form.subHeading,
        showLogo: form.showLogo,
      });
      applyBranding(response.data || {});
      openAlert('Saved', response.message || 'Login page branding saved successfully.');
    } catch (error) {
      openAlert(
        'Save Failed',
        error?.response?.data?.error?.message || 'Failed to save the branding. Please try again.',
        false
      );
    } finally {
      setSaving(false);
    }
  };

  const resetBranding = async () => {
    setSaving(true);
    try {
      const response = await portalBrandingAPI.resetBranding();
      applyBranding(response.data || {});
      openAlert('Restored', response.message || 'Default branding restored.');
    } catch (error) {
      openAlert(
        'Reset Failed',
        error?.response?.data?.error?.message || 'Failed to reset the branding.',
        false
      );
    } finally {
      setSaving(false);
    }
  };

  const previewLogo = branding?.logoUrl ? resolveMediaUrl(branding.logoUrl) : defaultLogo;

  // Mobile preview mirrors the real fallback chain the mobile login page uses:
  //   mobile override  ->  staff value  ->  built-in default
  const mobilePreviewLogo = branding?.mobileLogoUrl
    ? resolveMediaUrl(branding.mobileLogoUrl)
    : previewLogo;
  const mobilePreviewHeading = mobileForm.mobileHeading || form.heading || 'STUDENT PORTAL';
  const mobilePreviewSubHeading =
    mobileForm.mobileSubHeading || form.subHeading || 'Login with your class roll number';

  // ==========================================
  // Mobile (student) login page branding
  // ==========================================
  const handleMobileLogoChange = (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      openAlert('Invalid File', 'Please choose an image file (JPG, PNG, WEBP, etc.).', false);
      return;
    }

    uploadMobileLogo(file);
  };

  const uploadMobileLogo = async (file) => {
    setMobileLogoBusy(true);
    try {
      const response = await portalBrandingAPI.uploadMobileLogo(file);
      applyBranding(response.data || {});
      openAlert('Success', response.message || 'Mobile login page logo updated.');
    } catch (error) {
      openAlert(
        'Upload Failed',
        error?.response?.data?.error?.message || 'Failed to upload the mobile logo.',
        false
      );
    } finally {
      setMobileLogoBusy(false);
    }
  };

  const deleteMobileLogo = async () => {
    setMobileLogoBusy(true);
    try {
      const response = await portalBrandingAPI.deleteMobileLogo();
      applyBranding(response.data || {});
      openAlert('Deleted', response.message || 'Mobile login page logo deleted.');
    } catch (error) {
      openAlert(
        'Delete Failed',
        error?.response?.data?.error?.message || 'Failed to delete the mobile logo.',
        false
      );
    } finally {
      setMobileLogoBusy(false);
    }
  };

  const saveMobileBranding = async () => {
    setMobileSaving(true);
    try {
      const response = await portalBrandingAPI.updateBranding({
        mobileHeading: mobileForm.mobileHeading,
        mobileSubHeading: mobileForm.mobileSubHeading,
        showMobileLogo: mobileForm.showMobileLogo,
      });
      applyBranding(response.data || {});
      openAlert('Saved', response.message || 'Mobile login page branding saved.');
    } catch (error) {
      openAlert(
        'Save Failed',
        error?.response?.data?.error?.message || 'Failed to save the mobile branding.',
        false
      );
    } finally {
      setMobileSaving(false);
    }
  };

  const deleteMobileBranding = async () => {
    setMobileSaving(true);
    try {
      const response = await portalBrandingAPI.deleteMobileBranding();
      applyBranding(response.data || {});
      openAlert('Deleted', response.message || 'Mobile branding deleted.');
    } catch (error) {
      openAlert(
        'Delete Failed',
        error?.response?.data?.error?.message || 'Failed to delete the mobile branding.',
        false
      );
    } finally {
      setMobileSaving(false);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="branding-header">
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/superadmin/dashboard" className="gold-back-btn" />
            </IonButtons>
            <IonTitle>Login Page Branding</IonTitle>
            <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="branding-content" fullscreen>
          <div className="branding-loading">
            <IonSpinner name="crescent" className="gold-spinner" />
            <p>Loading branding settings...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="branding-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/superadmin/dashboard" className="gold-back-btn" />
          </IonButtons>
          <IonTitle>Login Page Branding</IonTitle>
          <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="branding-content" fullscreen>
        <div className="branding-container">
          {/* Live preview of the login card header */}
          <IonCard className="branding-preview-card">
            <IonCardContent>
              <h2 className="branding-section-title">
                <IonIcon icon={imageOutline} /> Live Preview
              </h2>
              <div className="preview-brand-header">
                {form.showLogo && (
                  <div className="preview-logo-wrapper">
                    <img src={previewLogo} alt="Preview logo" className="preview-logo" />
                  </div>
                )}
                <h1 className="preview-heading">{form.heading || '—'}</h1>
                <p className="preview-subheading">{form.subHeading || '—'}</p>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Logo management */}
          <IonCard className="branding-card">
            <IonCardContent>
              <h2 className="branding-section-title">
                <IonIcon icon={imageOutline} /> Logo
              </h2>

              <div className="logo-row">
                <div className="logo-preview-box">
                  <img src={previewLogo} alt="Current login logo" className="logo-preview-img" />
                </div>
                <div className="logo-actions">
                  <input
                    type="file"
                    id="portal-logo-input"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleLogoChange}
                  />
                  <IonButton
                    expand="block"
                    className="gold-btn"
                    disabled={logoBusy}
                    onClick={() => document.getElementById('portal-logo-input')?.click()}
                  >
                    <IonIcon icon={cloudUploadOutline} slot="start" />
                    {logoBusy ? 'Uploading...' : branding?.logoUrl ? 'Edit Logo' : 'Upload Logo'}
                  </IonButton>
                  <IonButton
                    expand="block"
                    fill="outline"
                    color="danger"
                    className="danger-outline-btn"
                    disabled={logoBusy || !branding?.logoUrl}
                    onClick={deleteLogo}
                  >
                    <IonIcon icon={trashOutline} slot="start" />
                    Delete Logo
                  </IonButton>
                </div>
              </div>

              <p className="branding-hint">
                {branding?.logoUrl
                  ? 'A custom logo is saved in the database and is used on the login page.'
                  : 'No custom logo uploaded yet - the built-in default logo is shown.'}
              </p>
            </IonCardContent>
          </IonCard>

          {/* Heading / Sub heading */}
          <IonCard className="branding-card">
            <IonCardContent>
              <h2 className="branding-section-title">
                <IonIcon icon={textOutline} /> Heading &amp; Sub Heading
              </h2>

              <IonItem className="branding-field" lines="none">
                <IonLabel position="stacked">Heading</IonLabel>
                <IonInput
                  value={form.heading}
                  maxlength={120}
                  placeholder="STAFF PORTAL"
                  onIonInput={(e) =>
                    setForm((prev) => ({ ...prev, heading: e.detail.value || '' }))
                  }
                />
              </IonItem>

              <IonItem className="branding-field" lines="none">
                <IonLabel position="stacked">Sub Heading</IonLabel>
                <IonTextarea
                  autoGrow
                  value={form.subHeading}
                  maxlength={200}
                  placeholder="Class, Admin and Super Admin login"
                  onIonInput={(e) =>
                    setForm((prev) => ({ ...prev, subHeading: e.detail.value || '' }))
                  }
                />
              </IonItem>

              <p className="branding-hint">
                Leave a field empty to hide that text on the login page.
              </p>
            </IonCardContent>
          </IonCard>

          {/* ==========================================
              MOBILE (STUDENT) LOGIN PAGE BRANDING
              Empty fields fall back to the staff values above.
             ========================================== */}
          <IonCard className="branding-card branding-card-mobile">
            <IonCardContent>
              <h2 className="branding-section-title">
                <IonIcon icon={phonePortraitOutline} /> Mobile Login Page (Student)
              </h2>

              {/* Live mobile preview */}
              <div className="preview-brand-header mobile-preview">
                {mobileForm.showMobileLogo && (
                  <div className="preview-logo-wrapper">
                    <img src={mobilePreviewLogo} alt="Mobile preview logo" className="preview-logo" />
                  </div>
                )}
                <h1 className="preview-heading">{mobilePreviewHeading}</h1>
                <p className="preview-subheading">{mobilePreviewSubHeading}</p>
              </div>

              {/* Mobile logo management */}
              <div className="logo-row" style={{ marginTop: '16px' }}>
                <div className="logo-preview-box">
                  <img src={mobilePreviewLogo} alt="Current mobile logo" className="logo-preview-img" />
                </div>
                <div className="logo-actions">
                  <input
                    type="file"
                    id="mobile-logo-input"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleMobileLogoChange}
                  />
                  <IonButton
                    expand="block"
                    className="gold-btn"
                    disabled={mobileLogoBusy}
                    onClick={() => document.getElementById('mobile-logo-input')?.click()}
                  >
                    <IonIcon icon={cloudUploadOutline} slot="start" />
                    {mobileLogoBusy
                      ? 'Uploading...'
                      : branding?.mobileLogoUrl
                        ? 'Edit Mobile Logo'
                        : 'Upload Mobile Logo'}
                  </IonButton>
                  <IonButton
                    expand="block"
                    fill="outline"
                    color="danger"
                    className="danger-outline-btn"
                    disabled={mobileLogoBusy || !branding?.mobileLogoUrl}
                    onClick={deleteMobileLogo}
                  >
                    <IonIcon icon={trashOutline} slot="start" />
                    Delete Mobile Logo
                  </IonButton>
                </div>
              </div>

              <p className="branding-hint">
                {branding?.mobileLogoUrl
                  ? 'The mobile page uses its own logo.'
                  : 'No separate mobile logo - the mobile page uses the staff logo above.'}
              </p>

              <IonItem className="branding-field" lines="none" style={{ marginTop: '12px' }}>
                <IonLabel position="stacked">Mobile Heading</IonLabel>
                <IonInput
                  value={mobileForm.mobileHeading}
                  maxlength={120}
                  placeholder={form.heading || 'STAFF PORTAL'}
                  onIonInput={(e) =>
                    setMobileForm((prev) => ({ ...prev, mobileHeading: e.detail.value || '' }))
                  }
                />
              </IonItem>

              <IonItem className="branding-field" lines="none">
                <IonLabel position="stacked">Mobile Sub Heading</IonLabel>
                <IonTextarea
                  autoGrow
                  value={mobileForm.mobileSubHeading}
                  maxlength={200}
                  placeholder={form.subHeading || 'Login with your class roll number'}
                  onIonInput={(e) =>
                    setMobileForm((prev) => ({ ...prev, mobileSubHeading: e.detail.value || '' }))
                  }
                />
              </IonItem>

              <IonItem className="branding-field" lines="none">
                <IonLabel>
                  <h3 className="toggle-label">Show logo on mobile login page</h3>
                  <p className="branding-hint">Turn off to hide the logo on mobile only.</p>
                </IonLabel>
                <IonToggle
                  checked={mobileForm.showMobileLogo}
                  className="luxury-gold-toggle"
                  onIonChange={(e) =>
                    setMobileForm((prev) => ({ ...prev, showMobileLogo: e.detail.checked }))
                  }
                />
              </IonItem>

              <p className="branding-hint">
                Leave these fields empty to make the mobile page use the staff branding.
              </p>

              <div className="save-actions">
                <IonButton
                  expand="block"
                  className="gold-btn"
                  disabled={mobileSaving || mobileLogoBusy}
                  onClick={saveMobileBranding}
                >
                  <IonIcon icon={saveOutline} slot="start" />
                  {mobileSaving ? 'Saving...' : 'Save Mobile Branding'}
                </IonButton>
                <IonButton
                  expand="block"
                  fill="outline"
                  color="danger"
                  className="danger-outline-btn"
                  disabled={mobileSaving || mobileLogoBusy}
                  onClick={deleteMobileBranding}
                >
                  <IonIcon icon={trashOutline} slot="start" />
                  Delete All Mobile Branding
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Visibility toggle + save actions */}
          <IonCard className="branding-card">
            <IonCardContent>
              <h2 className="branding-section-title">
                <IonIcon icon={checkmarkCircleOutline} /> Visibility &amp; Save
              </h2>

              <IonItem className="branding-field" lines="none">
                <IonLabel>
                  <h3 className="toggle-label">Show logo on login page</h3>
                  <p className="branding-hint">Turn off to hide the logo completely.</p>
                </IonLabel>
                <IonToggle
                  checked={form.showLogo}
                  className="luxury-gold-toggle"
                  onIonChange={(e) =>
                    setForm((prev) => ({ ...prev, showLogo: e.detail.checked }))
                  }
                />
              </IonItem>

              <div className="save-actions">
                <IonButton
                  expand="block"
                  className="gold-btn"
                  disabled={saving || logoBusy}
                  onClick={saveChanges}
                >
                  <IonIcon icon={saveOutline} slot="start" />
                  {saving ? 'Saving...' : 'Save Branding'}
                </IonButton>
                <IonButton
                  expand="block"
                  fill="outline"
                  className="outline-btn"
                  disabled={saving || logoBusy}
                  onClick={resetBranding}
                >
                  <IonIcon icon={refreshOutline} slot="start" />
                  Restore Defaults
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>

        </div>

        <IonAlert
          isOpen={showAlert}
          header={alertHeader}
          message={alertMessage}
          buttons={['OK']}
          onDidDismiss={() => setShowAlert(false)}
          cssClass={alertSuccess ? 'branding-alert-success' : 'branding-alert-error'}
        />
      </IonContent>
    </IonPage>
  );
};

export default PortalBrandingScreen;
