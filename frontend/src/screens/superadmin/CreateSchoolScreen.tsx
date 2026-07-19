/**
 * Create School Screen - Super Admin (Ionic React Version)
 * Form to create a new school and assign admin
 * Enhanced with robust validation and state management
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
  IonText,
} from '@ionic/react';
import { schoolOutline, checkmarkCircleOutline, alertCircleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { tenantsAPI } from '../../services/api';
import './CreateSchoolScreen.css';

// Form validation patterns
const VALIDATIONS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\+\(\)]{10,}$/,
  code: /^[A-Za-z0-9]{2,20}$/,
  name: /^.{3,200}$/,
  password: /^(?=.*\d).{6,}$/,
};

interface FormData {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

interface FormErrors {
  [key: string]: string;
}

const CreateSchoolScreen: React.FC = () => {
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSuccess, setAlertSuccess] = useState(false);

  /**
   * Generate a URL-safe, lowercase tenant ID from the school name
   * Removes special characters and converts to lowercase
   */
  const generateTenantId = (name: string): string => {
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
  const validateField = (name: string, value: string): string => {
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
    }
    return '';
  };

  /**
   * Validate entire form
   */
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    const fieldsToValidate = ['name', 'code', 'email', 'phone', 'adminName', 'adminEmail', 'adminPassword'];
    
    for (const field of fieldsToValidate) {
      const error = validateField(field, formData[field as keyof FormData]);
      if (error) {
        errors[field] = error;
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle input change with validation
   * Note: Ionic IonInput onIonInput provides value via e.detail.value
   * The name must be captured from the target element
   */
  const handleInputChange = (e: CustomEvent, name: string) => {
    const value = e.detail.value ?? '';
    const cleanedValue = name === 'code' ? value.toUpperCase() : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: cleanedValue,
    }));
    
    // Clear error for this field if it exists
    if (touched[name]) {
      const error = validateField(name, cleanedValue);
      setFormErrors(prev => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  /**
   * Mark field as touched
   */
  const handleBlur = (e: CustomEvent, name: string) => {
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
    
    const error = validateField(name, formData[name as keyof FormData]);
    setFormErrors(prev => ({
      ...prev,
      [name]: error,
    }));
  };

  /**
   * Handle form submission
   */
  const handleCreate = async () => {
    // Mark all fields as touched to show validation
    const allFields = ['name', 'code', 'email', 'phone', 'adminName', 'adminEmail', 'adminPassword'];
    const newTouched: Record<string, boolean> = {};
    allFields.forEach(field => newTouched[field] = true);
    setTouched(newTouched);

    // Validate form
    if (!validateForm()) {
      setAlertHeader('Validation Error');
      setAlertMessage('Please correct the errors in the form');
      setAlertSuccess(false);
      setShowAlert(true);
      return;
    }

    setLoading(true);
    try {
      // Prepare submission data
      const submissionData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        adminName: formData.adminName.trim(),
        adminEmail: formData.adminEmail.trim().toLowerCase(),
        adminPassword: formData.adminPassword,
      };

      const response = await tenantsAPI.createTenant(submissionData);
      
      if (response.success) {
        setAlertHeader('Success');
        setAlertMessage('School created successfully!');
        setAlertSuccess(true);
        setShowAlert(true);
        
        // Navigate back to dashboard after delay
        setTimeout(() => {
          history.push('/superadmin/dashboard');
        }, 2000);
      } else {
        setAlertHeader('Error');
        setAlertMessage(response.error?.message || 'Failed to create school');
        setAlertSuccess(false);
        setShowAlert(true);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to create school';
      setAlertHeader('Error');
      setAlertMessage(errorMessage);
      setAlertSuccess(false);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if a field has an error
   */
  const hasError = (name: string): boolean => {
    return touched[name] && !!formErrors[name];
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="premium-toolbar">
          <IonTitle>Create School</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="create-school-content" fullscreen>
        <div className="container">
          {/* Header */}
          <div className="header-section">
            <IonIcon icon={schoolOutline} className="header-icon" />
            <h1 className="header-title">Create New School</h1>
            <p className="header-subtitle">Set up a new school and assign an administrator</p>
          </div>

          {/* School Information */}
          <IonCard className="form-card">
            <IonCardHeader>
              <IonCardTitle>School Information</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {/* School Name */}
              <div className="input-group">
                <label className="input-label">School Name *</label>
                <IonInput
                  name="name"
                  value={formData.name}
                  onIonInput={(e) => handleInputChange(e, 'name')}
                  onIonBlur={(e) => handleBlur(e, 'name')}
                  placeholder="Enter school name"
                  className={hasError('name') ? 'input-error' : ''}
                />
                {hasError('name') && (
                  <div className="error-message">
                    <IonIcon icon={alertCircleOutline} className="error-icon" />
                    <span>{formErrors.name}</span>
                  </div>
                )}
              </div>

              {/* School Code */}
              <div className="input-group">
                <label className="input-label">School Code * (e.g., SCH001)</label>
                <IonInput
                  name="code"
                  value={formData.code}
                  onIonInput={(e) => handleInputChange(e, 'code')}
                  onIonBlur={(e) => handleBlur(e, 'code')}
                  placeholder="Enter unique school code"
                  className={hasError('code') ? 'input-error' : ''}
                />
                {hasError('code') && (
                  <div className="error-message">
                    <IonIcon icon={alertCircleOutline} className="error-icon" />
                    <span>{formErrors.code}</span>
                  </div>
                )}
                {!hasError('code') && formData.code && (
                  <div className="helper-text">
                    Generated ID: {generateTenantId(formData.code)}
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="input-group">
                <label className="input-label">Address</label>
                <IonInput
                  name="address"
                  value={formData.address}
                  onIonInput={(e) => handleInputChange(e, 'address')}
                  placeholder="Enter school address"
                />
              </div>

              {/* Phone */}
              <div className="input-group">
                <label className="input-label">Phone</label>
                <IonInput
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onIonInput={(e) => handleInputChange(e, 'phone')}
                  onIonBlur={(e) => handleBlur(e, 'phone')}
                  placeholder="Enter phone number"
                  className={hasError('phone') ? 'input-error' : ''}
                />
                {hasError('phone') && (
                  <div className="error-message">
                    <IonIcon icon={alertCircleOutline} className="error-icon" />
                    <span>{formErrors.phone}</span>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="input-group">
                <label className="input-label">Email</label>
                <IonInput
                  name="email"
                  type="email"
                  value={formData.email}
                  onIonInput={(e) => handleInputChange(e, 'email')}
                  onIonBlur={(e) => handleBlur(e, 'email')}
                  placeholder="Enter school email"
                  className={hasError('email') ? 'input-error' : ''}
                />
                {hasError('email') && (
                  <div className="error-message">
                    <IonIcon icon={alertCircleOutline} className="error-icon" />
                    <span>{formErrors.email}</span>
                  </div>
                )}
              </div>
            </IonCardContent>
          </IonCard>

          {/* Admin Credentials */}
          <IonCard className="form-card">
            <IonCardHeader>
              <IonCardTitle>Admin Credentials</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {/* Admin Name */}
              <div className="input-group">
                <label className="input-label">Admin Name *</label>
                <IonInput
                  name="adminName"
                  value={formData.adminName}
                  onIonInput={(e) => handleInputChange(e, 'adminName')}
                  onIonBlur={(e) => handleBlur(e, 'adminName')}
                  placeholder="Enter admin full name"
                  className={hasError('adminName') ? 'input-error' : ''}
                />
                {hasError('adminName') && (
                  <div className="error-message">
                    <IonIcon icon={alertCircleOutline} className="error-icon" />
                    <span>{formErrors.adminName}</span>
                  </div>
                )}
              </div>

              {/* Admin Email */}
              <div className="input-group">
                <label className="input-label">Admin Email *</label>
                <IonInput
                  name="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onIonInput={(e) => handleInputChange(e, 'adminEmail')}
                  onIonBlur={(e) => handleBlur(e, 'adminEmail')}
                  placeholder="Enter admin email"
                  className={hasError('adminEmail') ? 'input-error' : ''}
                />
                {hasError('adminEmail') && (
                  <div className="error-message">
                    <IonIcon icon={alertCircleOutline} className="error-icon" />
                    <span>{formErrors.adminEmail}</span>
                  </div>
                )}
              </div>

              {/* Admin Password */}
              <div className="input-group">
                <label className="input-label">Admin Password * (min 6 chars, 1 number)</label>
                <IonInput
                  name="adminPassword"
                  type="password"
                  value={formData.adminPassword}
                  onIonInput={(e) => handleInputChange(e, 'adminPassword')}
                  onIonBlur={(e) => handleBlur(e, 'adminPassword')}
                  placeholder="Enter admin password"
                  className={hasError('adminPassword') ? 'input-error' : ''}
                />
                {hasError('adminPassword') && (
                  <div className="error-message">
                    <IonIcon icon={alertCircleOutline} className="error-icon" />
                    <span>{formErrors.adminPassword}</span>
                  </div>
                )}
                {!hasError('adminPassword') && formData.adminPassword && VALIDATIONS.password.test(formData.adminPassword) && (
                  <div className="success-message">
                    <IonIcon icon={checkmarkCircleOutline} className="success-icon" />
                    <span>Password meets requirements</span>
                  </div>
                )}
              </div>
            </IonCardContent>
          </IonCard>

          {/* Submit Button */}
          <div className="button-container">
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

        {/* Alert */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={alertHeader}
          message={alertMessage}
          buttons={['OK']}
          cssClass={alertSuccess ? 'alert-success' : 'alert-error'}
        />
      </IonContent>
    </IonPage>
  );
};

export default CreateSchoolScreen;