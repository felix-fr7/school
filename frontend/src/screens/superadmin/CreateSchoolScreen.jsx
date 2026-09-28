/**
 * Create School Screen - Super Admin (Ionic React Version)
 * Form to create a new school and assign admin
 * Enhanced with Ionic Storage support, validation, and state management
 */

import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonInput,
  IonButton,
  IonSpinner,
  IonAlert,
  IonIcon,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import { schoolOutline, checkmarkCircleOutline, alertCircleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { tenantsAPI } from '../../services/api';
import './CreateSchoolScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

// Form validation patterns
const VALIDATIONS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\+\(\)]{10,}$/,
  code: /^[A-Za-z0-9]{2,20}$/,
  name: /^.{3,200}$/,
  password: /^(?=.*\d).{6,}$/,
};

const CreateSchoolScreen = () => {
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSuccess, setAlertSuccess] = useState(false);

  /**
   * Generate a URL-safe, lowercase tenant ID from the school name
   */
  const generateTenantId = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
  };

  /**
   * Validate a single field
   */
  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'School name is required';
        if (value.trim().length < 3) return 'School name must be at least 3 characters';
        if (value.trim().length > 200) return 'School name must be less than 200 characters';
        break;
      case 'code':
        if (!value.trim()) return 'School code is required';
        if (!VALIDATIONS.code.test(value.trim())) return 'Code must be 2-20 alphanumeric characters';
        break;
      case 'email':
        if (value && !VALIDATIONS.email.test(value)) return 'Please provide a valid email address';
        break;
      case 'phone':
        if (value && !VALIDATIONS.phone.test(value)) return 'Please provide a valid phone number';
        break;
      case 'adminName':
        if (!value.trim()) return 'Admin name is required';
        if (value.trim().length < 2) return 'Admin name must be at least 2 characters';
        if (value.trim().length > 100) return 'Admin name must be less than 100 characters';
        break;
      case 'adminEmail':
        if (!value.trim()) return 'Admin email is required';
        if (!VALIDATIONS.email.test(value.trim())) return 'Please provide a valid admin email address';
        break;
      case 'adminPassword':
        if (!value) return 'Admin password is required';
        if (!VALIDATIONS.password.test(value)) return 'Password must be at least 6 characters with 1 number';
        break;
      default:
        break;
    }
    return '';
  };

  /**
   * Validate entire form
   */
  const validateForm = () => {
    const errors = {};
    const fieldsToValidate = ['name', 'code', 'email', 'phone', 'adminName', 'adminEmail', 'adminPassword'];
    
    for (const field of fieldsToValidate) {
      const error = validateField(field, formData[field]);
      if (error) {
        errors[field] = error;
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle input change safely across IonInput events
   */
  const handleInputChange = (value, name) => {
    const val = value ?? '';
    const cleanedValue = name === 'code' ? val.toUpperCase() : val;
    
    setFormData((prev) => ({
      ...prev,
      [name]: cleanedValue,
    }));
    
    if (touched[name]) {
      const error = validateField(name, cleanedValue);
      setFormErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  /**
   * Mark field as touched
   */
  const handleBlur = (name) => {
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
    
    const error = validateField(name, formData[name]);
    setFormErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  /**
   * Handle school logo file selection
   */
  const handleLogoChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAlertHeader('Invalid File');
      setAlertMessage('Please choose an image file (JPG, PNG, etc.) for the school logo.');
      setAlertSuccess(false);
      setShowAlert(true);
      event.target.value = '';
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  /**
   * Handle form submission & Tenant creation
   */
  const handleCreate = async () => {
    const allFields = ['name', 'code', 'email', 'phone', 'adminName', 'adminEmail', 'adminPassword'];
    const newTouched = {};
    allFields.forEach((field) => (newTouched[field] = true));
    setTouched(newTouched);

    if (!validateForm()) {
      setAlertHeader('Validation Error');
      setAlertMessage('Please correct the errors in the form');
      setAlertSuccess(false);
      setShowAlert(true);
      return;
    }

    setLoading(true);
    try {
      const submissionData = {
        schoolName: formData.name.trim(),
        schoolCode: formData.code.trim().toUpperCase(),
        tenantId: generateTenantId(formData.name),
        address: formData.address.trim() || undefined,
        contactPhone: formData.phone.trim() || undefined,
        contactEmail: formData.email.trim() || undefined,
        adminName: formData.adminName.trim(),
        adminEmail: formData.adminEmail.trim().toLowerCase(),
        adminPassword: formData.adminPassword,
      };

      const response = await tenantsAPI.createTenant(submissionData, logoFile);
      
      if (response && (response.success || response.status === 201 || response.status === 200)) {
        setAlertHeader('Success');
        setAlertMessage('School and School Admin created successfully!');
        setAlertSuccess(true);
        setShowAlert(true);
        
        setTimeout(() => {
          history.push('/superadmin/dashboard');
        }, 2000);
      } else {
        setAlertHeader('Error');
        setAlertMessage(response?.error?.message || response?.message || 'Failed to create school');
        setAlertSuccess(false);
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Create school error:', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to create school';
      setAlertHeader('Error');
      setAlertMessage(errorMessage);
      setAlertSuccess(false);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const hasError = (name) => {
    return !!(touched[name] && formErrors[name]);
  };

  return (
    <IonPage>
      <IonHeader className="create-school-header">
        <IonToolbar className="premium-toolbar">
          <IonButtons slot="start">
            <IonBackButton 
              defaultHref="/superadmin/dashboard" 
              text="Dashboard" 
              className="gold-back-btn" 
            />
          </IonButtons>
          <IonTitle>Create School</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="create-school-content" fullscreen scrollY={true}>
        <div className="container" style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
          <div className="header-section" style={{ textAlign: 'center', marginBottom: '20px' }}>
            <IonIcon icon={schoolOutline} style={{ fontSize: '48px', color: '#3880ff' }} />
            <h1 className="header-title">Create New School</h1>
            <p className="header-subtitle" style={{ color: '#666' }}>Set up a new school and assign an administrator</p>
          </div>

          {/* School Information */}
          <IonCard className="form-card" style={{ marginBottom: '20px' }}>
            <IonCardHeader>
              <IonCardTitle>School Information</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label className="input-label" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>School Name *</label>
                <IonInput
                  value={formData.name}
                  onIonInput={(e) => handleInputChange(e.detail.value, 'name')}
                  onIonBlur={() => handleBlur('name')}
                  placeholder="Enter school name"
                  className={hasError('name') ? 'input-error' : ''}
                />
                {hasError('name') && (
                  <div className="error-message" style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                    <IonIcon icon={alertCircleOutline} /> <span>{formErrors.name}</span>
                  </div>
                )}
              </div>

              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label className="input-label" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>School Code * (e.g., SCH001)</label>
                <IonInput
                  value={formData.code}
                  onIonInput={(e) => handleInputChange(e.detail.value, 'code')}
                  onIonBlur={() => handleBlur('code')}
                  placeholder="Enter unique school code"
                  className={hasError('code') ? 'input-error' : ''}
                />
                {hasError('code') && (
                  <div className="error-message" style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                    <IonIcon icon={alertCircleOutline} /> <span>{formErrors.code}</span>
                  </div>
                )}
                {!hasError('code') && formData.code && (
                  <div className="helper-text" style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                    Generated Tenant ID: {generateTenantId(formData.code)}
                  </div>
                )}
              </div>

              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label className="input-label" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Address</label>
                <IonInput
                  value={formData.address}
                  onIonInput={(e) => handleInputChange(e.detail.value, 'address')}
                  placeholder="Enter school address"
                />
              </div>

              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label className="input-label" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Phone</label>
                <IonInput
                  type="tel"
                  value={formData.phone}
                  onIonInput={(e) => handleInputChange(e.detail.value, 'phone')}
                  onIonBlur={() => handleBlur('phone')}
                  placeholder="Enter phone number"
                  className={hasError('phone') ? 'input-error' : ''}
                />
                {hasError('phone') && (
                  <div className="error-message" style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                    <IonIcon icon={alertCircleOutline} /> <span>{formErrors.phone}</span>
                  </div>
                )}
              </div>

              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label className="input-label" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Email</label>
                <IonInput
                  type="email"
                  value={formData.email}
                  onIonInput={(e) => handleInputChange(e.detail.value, 'email')}
                  onIonBlur={() => handleBlur('email')}
                  placeholder="Enter school email"
                  className={hasError('email') ? 'input-error' : ''}
                />
                {hasError('email') && (
                  <div className="error-message" style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                    <IonIcon icon={alertCircleOutline} /> <span>{formErrors.email}</span>
                  </div>
                )}
              </div>
              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label className="input-label" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>School Logo</label>
                <div className="logo-upload-container">
                  <div className="logo-preview">
                    {logoPreview ? (
                      <img src={logoPreview} alt="School Logo Preview" className="logo-preview-img" />
                    ) : (
                      <div className="logo-preview-placeholder">
                        <IonIcon icon={schoolOutline} />
                        <span>No logo selected</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    id="school-logo-input"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleLogoChange}
                  />
                  <div className="logo-upload-actions">
                    <IonButton
                      fill="outline"
                      size="small"
                      onClick={() => document.getElementById('school-logo-input')?.click()}
                    >
                      <IonIcon icon={checkmarkCircleOutline} style={{ marginRight: '6px' }} />
                      {logoFile ? 'Change Logo' : 'Upload Logo'}
                    </IonButton>
                    {logoFile && (
                      <span className="logo-file-name">{logoFile.name}</span>
                    )}
                  </div>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Admin Credentials */}
          <IonCard className="form-card" style={{ marginBottom: '20px' }}>
            <IonCardHeader>
              <IonCardTitle>Admin Credentials</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label className="input-label" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Admin Name *</label>
                <IonInput
                  value={formData.adminName}
                  onIonInput={(e) => handleInputChange(e.detail.value, 'adminName')}
                  onIonBlur={() => handleBlur('adminName')}
                  placeholder="Enter admin full name"
                  className={hasError('adminName') ? 'input-error' : ''}
                />
                {hasError('adminName') && (
                  <div className="error-message" style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                    <IonIcon icon={alertCircleOutline} /> <span>{formErrors.adminName}</span>
                  </div>
                )}
              </div>

              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label className="input-label" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Admin Email *</label>
                <IonInput
                  type="email"
                  value={formData.adminEmail}
                  onIonInput={(e) => handleInputChange(e.detail.value, 'adminEmail')}
                  onIonBlur={() => handleBlur('adminEmail')}
                  placeholder="Enter admin email"
                  className={hasError('adminEmail') ? 'input-error' : ''}
                />
                {hasError('adminEmail') && (
                  <div className="error-message" style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                    <IonIcon icon={alertCircleOutline} /> <span>{formErrors.adminEmail}</span>
                  </div>
                )}
              </div>

              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label className="input-label" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Admin Password * (min 6 chars, 1 number)</label>
                <IonInput
                  type="password"
                  value={formData.adminPassword}
                  onIonInput={(e) => handleInputChange(e.detail.value, 'adminPassword')}
                  onIonBlur={() => handleBlur('adminPassword')}
                  placeholder="Enter admin password"
                  className={hasError('adminPassword') ? 'input-error' : ''}
                />
                {hasError('adminPassword') && (
                  <div className="error-message" style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                    <IonIcon icon={alertCircleOutline} /> <span>{formErrors.adminPassword}</span>
                  </div>
                )}
                {!hasError('adminPassword') && formData.adminPassword && VALIDATIONS.password.test(formData.adminPassword) && (
                  <div className="success-message" style={{ color: 'green', fontSize: '12px', marginTop: '4px' }}>
                    <IonIcon icon={checkmarkCircleOutline} /> <span>Password meets requirements</span>
                  </div>
                )}
              </div>
            </IonCardContent>
          </IonCard>

          <div className="button-container" style={{ marginBottom: '30px' }}>
            <IonButton
              expand="block"
              className="submit-button"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? <IonSpinner name="crescent" /> : 'Create School'}
            </IonButton>
          </div>
        </div>

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={alertHeader}
          message={alertMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default CreateSchoolScreen;