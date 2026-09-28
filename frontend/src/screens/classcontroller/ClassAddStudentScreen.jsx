/**
 * Class Add Student Screen (Ionic React Version)
 * Add a new student to the class with roll number
 * Requires: name, roll number, and password
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
  IonSpinner,
  IonText,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonCard,
  IonCardContent,
  IonModal,
  IonAlert,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
} from '@ionic/react';
import {
  eyeOutline,
  eyeOffOutline,
  informationCircleOutline,
  warningOutline,
  checkmarkCircleOutline,
  copyOutline,
  personAddOutline,
  keyOutline,
  personOutline,
  calendarOutline,
  cloudUploadOutline,
  documentTextOutline,
  downloadOutline,
  linkOutline,
  closeCircleOutline,
  refreshOutline,
  callOutline,
  mailOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { classControllerAPI } from '../../services/api';
import './ClassAddStudentScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const ClassAddStudentScreen = () => {
  const history = useHistory();

  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [admittedDate, setAdmittedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nextStudentId, setNextStudentId] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdStudent, setCreatedStudent] = useState(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState('');

  // Bulk upload state
  const [activeMode, setActiveMode] = useState('single');
  const [bulkFile, setBulkFile] = useState(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const bulkFileInputRef = React.useRef(null);

  useEffect(() => {
    fetchNextStudentId();
  }, []);

  const fetchNextStudentId = async () => {
    try {
      const response = await classControllerAPI.getNextStudentId();
      if (response.success && response.data) {
        setNextStudentId(response.data.nextStudentId);
      }
    } catch (error) {
      console.error('Error fetching next student ID:', error);
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      setValidationErrorMessage('Student name is required');
      setShowValidationError(true);
      return false;
    }

    if (!rollNumber.trim()) {
      setValidationErrorMessage('Roll number is required');
      setShowValidationError(true);
      return false;
    }

    if (phone.trim() && !/^[\d\s\-()+]{6,20}$/.test(phone.trim())) {
      setValidationErrorMessage('Enter a valid mobile number (digits only, 6-20 characters)');
      setShowValidationError(true);
      return false;
    }

    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setValidationErrorMessage('Enter a valid email address');
      setShowValidationError(true);
      return false;
    }

    if (!password.trim()) {
      setValidationErrorMessage('Password is required');
      setShowValidationError(true);
      return false;
    }

    if (password.length < 6) {
      setValidationErrorMessage('Password must be at least 6 characters long');
      setShowValidationError(true);
      return false;
    }

    return true;
  };

  const handleCreateStudent = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await classControllerAPI.createStudent({
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        password: password.trim(),
        admittedDate: admittedDate || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });

      if (response.success && response.data) {
        setCreatedStudent(response.data);
        setShowSuccessModal(true);
        setName('');
        setRollNumber('');
        setPassword('');
        setPhone('');
        setEmail('');
        setAdmittedDate(new Date().toISOString().split('T')[0]);
        fetchNextStudentId();
      }
    } catch (error) {
      console.error('Error creating student:', error);
      const errorMessage = error?.response?.data?.error?.message || 'Failed to create student';
      setValidationErrorMessage(errorMessage);
      setShowValidationError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setCreatedStudent(null);
    history.goBack();
  };

  const handleCopyPassword = () => {
    if (createdStudent?.password) {
      navigator.clipboard.writeText(createdStudent.password).catch(() => {
        setValidationErrorMessage(`Password: ${createdStudent.password}\n\nPlease save this password securely!`);
        setShowValidationError(true);
      });
    }
  };

  // ---------- Bulk upload handlers ----------

  const handleBulkFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setBulkFile(file);
      setBulkResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await classControllerAPI.downloadBulkTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'student-bulk-import-template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
      setValidationErrorMessage('Failed to download the template');
      setShowValidationError(true);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkFile && !sheetUrl.trim()) {
      setValidationErrorMessage('Choose an Excel/CSV file or paste a Google Sheets link first.');
      setShowValidationError(true);
      return;
    }

    setBulkLoading(true);
    setBulkResult(null);

    try {
      // No defaultPassword is sent - the backend applies its own default
      // password (Student@123) for rows without a password column.
      const response = await classControllerAPI.bulkImportStudents({
        file: bulkFile,
        sheetUrl: bulkFile ? undefined : sheetUrl.trim(),
      });

      setBulkResult(response);
      setBulkFile(null);
      setSheetUrl('');
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
      fetchNextStudentId();
    } catch (error) {
      console.error('Error during bulk import:', error);
      const payload = error?.response?.data;
      setBulkResult({
        success: false,
        data: { createdCount: 0, failedCount: payload?.errors?.length || 0 },
        errors: payload?.errors,
        message: payload?.error?.message || 'Bulk import failed',
      });
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="light-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/students" color="dark" />
          </IonButtons>
          <IonTitle>
            <div className="brand-header">
              <IonIcon icon={personAddOutline} className="brand-icon" />
              <span>Add New Student</span>
            </div>
          </IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="add-student-content" fullscreen>
        <div className="form-container">
          {/* Header Card */}
          <div className="light-hero-card flex-hero">
            <div className="hero-main">
              <h1 className="class-title">Enroll Student</h1>
              <p className="teacher-greeting">
                Create login credentials for a new student in your workspace.
              </p>
            </div>
          </div>

          {/* Mode Switcher: single entry vs bulk upload */}
          <IonSegment
            value={activeMode}
            onIonChange={(e) => setActiveMode(e.detail.value)}
            className="mode-segment"
          >
            <IonSegmentButton value="single">
              <IonIcon icon={personAddOutline} slot="start" />
              Single Student
            </IonSegmentButton>
            <IonSegmentButton value="bulk">
              <IonIcon icon={cloudUploadOutline} slot="start" />
              Bulk Upload
            </IonSegmentButton>
          </IonSegment>

          {/* Next Student ID Preview */}
          {activeMode === 'single' && nextStudentId && (
            <IonCard className="preview-card">
              <IonCardContent>
                <span className="preview-label">NEXT GENERATED INTERNAL ID</span>
                <h2 className="preview-value">{nextStudentId}</h2>
                <span className="preview-note">An internal ID will be assigned. Students login with their roll number.</span>
              </IonCardContent>
            </IonCard>
          )}

          {/* Form */}
          {activeMode === 'single' && (
          <div className="form-card">
            {/* Student Name */}
            <div className="input-group">
              <label className="input-label">
                <IonIcon icon={personOutline} className="label-icon" />
                Student Name *
              </label>
              <div className="custom-input-box">
                <IonInput
                  value={name}
                  onIonInput={(e) => setName(e.detail.value || '')}
                  placeholder="Enter student's full name"
                  autoComplete="name"
                  autoCorrect="off"
                />
              </div>
            </div>

            {/* Roll Number */}
            <div className="input-group">
              <label className="input-label">
                <IonIcon icon={personOutline} className="label-icon" />
                Roll Number *
              </label>
              <div className="custom-input-box">
                <IonInput
                  value={rollNumber}
                  onIonInput={(e) => setRollNumber(e.detail.value || '')}
                  placeholder="Enter student's roll number (e.g., 001, A-01)"
                  autoComplete="off"
                  autoCorrect="off"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div className="input-group">
              <label className="input-label">
                <IonIcon icon={callOutline} className="label-icon" />
                Mobile Number
                <span className="optional-tag">Optional</span>
              </label>
              <div className="custom-input-box">
                <IonInput
                  type="tel"
                  inputmode="numeric"
                  value={phone}
                  onIonInput={(e) => setPhone(e.detail.value || '')}
                  placeholder="Enter 10-digit mobile number"
                  autoComplete="tel"
                  autoCorrect="off"
                />
              </div>
              <span className="field-hint">Parent or student contact number.</span>
            </div>

            {/* Email */}
            <div className="input-group">
              <label className="input-label">
                <IonIcon icon={mailOutline} className="label-icon" />
                Email Address
                <span className="optional-tag">Optional</span>
              </label>
              <div className="custom-input-box">
                <IonInput
                  type="email"
                  inputmode="email"
                  value={email}
                  onIonInput={(e) => setEmail(e.detail.value || '')}
                  placeholder="student@example.com"
                  autoComplete="email"
                  autoCorrect="off"
                  autoCapitalize="none"
                />
              </div>
              <span className="field-hint">
                Leave blank and one will be generated automatically.
              </span>
            </div>

            {/* Admitted Date */}
            <div className="input-group">
              <label className="input-label">
                <IonIcon icon={calendarOutline} className="label-icon" />
                Admitted Date
              </label>
              <div className="custom-input-box">
                <IonInput
                  type="date"
                  value={admittedDate}
                  onIonInput={(e) => setAdmittedDate(e.detail.value || '')}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Password */}
            <div className="input-group">
              <label className="input-label">
                <IonIcon icon={keyOutline} className="label-icon" />
                Set Password *
              </label>
              <div className="custom-input-box password-box">
                <IonInput
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value || '')}
                  placeholder="Minimum 6 characters"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoCorrect="off"
                />
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  <IonIcon
                    icon={showPassword ? eyeOffOutline : eyeOutline}
                    slot="icon-only"
                  />
                </IonButton>
              </div>
            </div>

            {/* Info Box */}
            <div className="info-box">
              <IonIcon icon={informationCircleOutline} className="info-icon" />
              <p>
                The student will use their <strong className="id-highlight">Roll Number</strong> along with this password to access the app.
              </p>
            </div>

            {/* Submit Button */}
            <IonButton
              expand="block"
              className="submit-button"
              onClick={handleCreateStudent}
              disabled={loading}
            >
              {loading ? <IonSpinner name="crescent" /> : 'Confirm & Create Student'}
            </IonButton>
          </div>
          )}

          {/* Bulk Upload */}
          {activeMode === 'bulk' && (
            <div className="form-card">
              <div className="info-box">
                <IonIcon icon={informationCircleOutline} className="info-icon" />
                <p>
                  Every valid row becomes a student in <strong className="id-highlight">this class</strong>.
                  The sheet's first row must be a header with at least{' '}
                  <strong>Name</strong> and <strong>Roll Number</strong>. Students log in with their
                  roll number and the default password <strong>Student@123</strong>.
                </p>
              </div>

              {/* Excel / CSV file */}
              <div className="input-group">
                <label className="input-label">
                  <IonIcon icon={documentTextOutline} className="label-icon" />
                  Excel / CSV File
                </label>
                <div
                  className="upload-dropzone"
                  onClick={() => bulkFileInputRef.current?.click()}
                >
                  <IonIcon icon={cloudUploadOutline} className="upload-icon" />
                  <p>{bulkFile ? bulkFile.name : 'Tap to choose a file'}</p>
                  <span>.xlsx, .xls or .csv (max 5 MB)</span>
                </div>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleBulkFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Google Sheets link */}
              <div className="input-group">
                <label className="input-label">
                  <IonIcon icon={linkOutline} className="label-icon" />
                  Google Sheets Link
                </label>
                <div className="custom-input-box">
                  <IonInput
                    value={sheetUrl}
                    onIonInput={(e) => setSheetUrl(e.detail.value || '')}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    autoComplete="off"
                    autoCorrect="off"
                  />
                </div>
                <span className="field-hint">
                  Used when no file is selected. Share the sheet as &quot;Anyone with the link - Viewer&quot;.
                </span>
              </div>

              {/* Default password is applied automatically (Student@123) for
                  rows without a password column in the sheet. */}

              <IonButton
                expand="block"
                fill="outline"
                className="template-button"
                onClick={handleDownloadTemplate}
              >
                <IonIcon icon={downloadOutline} slot="start" />
                Download Excel Template
              </IonButton>

              <IonButton
                expand="block"
                className="submit-button"
                onClick={handleBulkImport}
                disabled={bulkLoading || (!bulkFile && !sheetUrl.trim())}
              >
                {bulkLoading ? <IonSpinner name="crescent" /> : 'Import Students'}
              </IonButton>

              {/* Result summary */}
              {bulkResult && (
                <div className={`bulk-result ${bulkResult.success ? 'is-success' : 'is-error'}`}>
                  <div className="bulk-result-head">
                    <IonIcon
                      icon={bulkResult.success ? checkmarkCircleOutline : closeCircleOutline}
                      className="bulk-result-icon"
                    />
                    <span>{bulkResult.message}</span>
                  </div>

                  <div className="bulk-stats">
                    <span className="stat success">Added: {bulkResult.data?.createdCount ?? 0}</span>
                    <span className="stat failed">Skipped: {bulkResult.data?.failedCount ?? 0}</span>
                    <span className="stat total">Rows read: {bulkResult.data?.totalRows ?? 0}</span>
                  </div>

                  {bulkResult.errors?.length > 0 && (
                    <ul className="bulk-error-list">
                      {bulkResult.errors.map((err, index) => (
                        <li key={index}>
                          Row {err.row}: {err.reason}
                        </li>
                      ))}
                    </ul>
                  )}

                  {bulkResult.success && (
                    <IonButton
                      expand="block"
                      fill="clear"
                      size="small"
                      onClick={() => history.push('/class-controller/students')}
                    >
                      <IonIcon icon={refreshOutline} slot="start" />
                      View Students List
                    </IonButton>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Success Modal */}
        <IonModal
          isOpen={showSuccessModal}
          onDidDismiss={handleCloseSuccessModal}
          className="success-modal"
        >
          <div className="modal-container">
            <div className="success-icon-container">
              <IonIcon icon={checkmarkCircleOutline} className="success-icon" />
            </div>

            <h2 className="modal-title">Student Created!</h2>

            {createdStudent && (
              <div className="modal-details">
                <div className="student-id-highlight">
                  <small className="student-id-label">Roll Number (Login ID)</small>
                  <h3 className="student-id-value">{createdStudent.rollNumber}</h3>
                </div>

                {createdStudent.studentId && (
                  <div className="detail-row">
                    <span className="detail-label">Student ID (Internal)</span>
                    <span className="detail-value">{createdStudent.studentId}</span>
                  </div>
                )}

                <div className="detail-row">
                  <span className="detail-label">Full Name</span>
                  <span className="detail-value">{createdStudent.name}</span>
                </div>

                {createdStudent.phone && (
                  <div className="detail-row">
                    <span className="detail-label">Mobile Number</span>
                    <span className="detail-value">{createdStudent.phone}</span>
                  </div>
                )}

                {createdStudent.emailProvided && createdStudent.email && (
                  <div className="detail-row">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{createdStudent.email}</span>
                  </div>
                )}

                <div className="detail-row">
                  <span className="detail-label">Admitted Date</span>
                  <span className="detail-value">
                    {createdStudent.admittedDate
                      ? new Date(createdStudent.admittedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>

                <div className="detail-row password-row">
                  <span className="detail-label">Login Password</span>
                  <div className="modal-password-container">
                    <span className="password-value">{createdStudent.password}</span>
                    <IonButton
                      fill="solid"
                      size="small"
                      onClick={handleCopyPassword}
                      className="copy-button"
                    >
                      <IonIcon icon={copyOutline} slot="start" />
                      Copy
                    </IonButton>
                  </div>
                </div>
              </div>
            )}

            <div className="modal-warning">
              <IonIcon icon={warningOutline} className="warning-icon" />
              <p>Please note down these credentials. The password will not be displayed again!</p>
            </div>

            {/* Action Buttons */}
            <div className="modal-actions">
              <IonButton
                fill="outline"
                color="medium"
                className="modal-btn"
                onClick={() => {
                  setShowSuccessModal(false);
                  setName('');
                  setRollNumber('');
                  setPassword('');
                  setPhone('');
                  setEmail('');
                  setAdmittedDate(new Date().toISOString().split('T')[0]);
                  setCreatedStudent(null);
                  fetchNextStudentId();
                }}
              >
                Add Another
              </IonButton>

              <IonButton
                color="primary"
                className="modal-btn"
                onClick={handleCloseSuccessModal}
              >
                Done
              </IonButton>
            </div>
          </div>
        </IonModal>

        {/* Validation Error Alert */}
        <IonAlert
          isOpen={showValidationError}
          onDidDismiss={() => setShowValidationError(false)}
          header="Notice"
          message={validationErrorMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassAddStudentScreen;
