/**
 * School Detail Screen - Super Admin (Ionic React Version)
 * Shows details of a specific school/tenant
 * Refined Layout & Structure - MongoDB Optimized
 * 
 * Updated with Admin Edit and Password Reset functionality
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonBackButton,
  IonButtons,
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonSpinner,
  IonBadge,
  IonModal,
  IonInput,
  IonButton,
  IonAlert,
} from '@ionic/react';
import {
  businessOutline,
  mailOutline,
  callOutline,
  locationOutline,
  peopleOutline,
  personOutline,
  bookOutline,
  documentTextOutline,
  createOutline,
  keyOutline,
  closeOutline,
  checkmarkOutline,
  warningOutline,
  cloudUploadOutline,
  trashOutline,
} from 'ionicons/icons';
import { useParams, Redirect } from 'react-router-dom';
import { tenantsAPI, resolveMediaUrl } from '../../services/api';
import './SchoolDetailScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const SchoolDetailScreen = () => {
  const { tenantId } = useParams();

  // MongoDB ObjectId Guard (24 hex characters)
  const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
  if (tenantId && !mongoIdRegex.test(tenantId)) {
    if (tenantId === 'create' || tenantId === 'new') {
      return <Redirect to="/superadmin/schools/create" />;
    }
    return <Redirect to="/superadmin/schools" />;
  }

  const [school, setSchool] = useState(null);
  const [stats, setStats] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Admin Modal State
  const [editAdminModalVisible, setEditAdminModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [editAdminForm, setEditAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [editAdminLoading, setEditAdminLoading] = useState(false);
  const [editAdminError, setEditAdminError] = useState('');

  // Password Reset Modal State
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
  const [selectedAdminForReset, setSelectedAdminForReset] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');

  // Delete Admin State
  const [showDeleteAdminAlert, setShowDeleteAdminAlert] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState(null);
  const [deletingAdmin, setDeletingAdmin] = useState(false);

  // Alert State
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSuccess, setAlertSuccess] = useState(false);

  // School Logo State
  const [logoUpdating, setLogoUpdating] = useState(false);
  const [logoDeleting, setLogoDeleting] = useState(false);

  useEffect(() => {
    const fetchSchoolDetails = async () => {
      try {
        const [schoolRes, statsRes, adminsRes] = await Promise.all([
          tenantsAPI.getTenant(tenantId),
          tenantsAPI.getTenantStats(tenantId),
          tenantsAPI.getSchoolAdmins(tenantId),
        ]);

        if (schoolRes.success && schoolRes.data) {
          // Map MongoDB fields to component expectations safely
          const rawSchool = schoolRes.data;
          setSchool({
            ...rawSchool,
            id: rawSchool._id || rawSchool.id,
            name: rawSchool.schoolName || rawSchool.name,
            code: rawSchool.schoolCode || rawSchool.code,
            phone: rawSchool.contactPhone || rawSchool.phone,
            email: rawSchool.contactEmail || rawSchool.email,
            logoUrl: rawSchool.schoolLogoUrl || rawSchool.logoUrl || null,
          });
        }
        
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data.stats);
        }

        if (adminsRes.success && adminsRes.data) {
          setAdmins(adminsRes.data.admins || []);
        }
      } catch (error) {
        console.error('Error fetching school details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchSchoolDetails();
    }
  }, [tenantId]);

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="detail-header">
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/superadmin/schools" className="gold-back-btn" />
            </IonButtons>
            <IonTitle>School Details</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="school-detail-content ion-padding" fullscreen>
          <div className="loading-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <IonSpinner name="crescent" />
            <p>Loading school details...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!school) {
    return (
      <IonPage>
        <IonHeader className="detail-header">
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/superadmin/schools" className="gold-back-btn" />
            </IonButtons>
            <IonTitle>School Details</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="school-detail-content ion-padding" fullscreen>
          <div className="empty-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <IonIcon icon={businessOutline} className="empty-icon" style={{ fontSize: '48px' }} />
            <p className="empty-text">School not found</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // ==========================================
  // School Logo Management (upload / replace / delete)
  // ==========================================
  const handleLogoChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      handleLogoUpload(file);
    }
    event.target.value = '';
  };

  const handleLogoUpload = async (file) => {
    if (!file || !tenantId) return;

    if (!file.type.startsWith('image/')) {
      setAlertHeader('Invalid File');
      setAlertMessage('Please choose an image file (JPG, PNG, etc.) for the school logo.');
      setAlertSuccess(false);
      setShowAlert(true);
      return;
    }

    setLogoUpdating(true);
    try {
      const response = await tenantsAPI.uploadTenantLogo(tenantId, file);
      if (response.success) {
        setSchool((prev) => ({ ...prev, logoUrl: response.data?.schoolLogoUrl || null }));
        setAlertHeader('Success');
        setAlertMessage('School logo updated successfully.');
        setAlertSuccess(true);
        setShowAlert(true);
      }
    } catch (error) {
      setAlertHeader('Error');
      setAlertMessage(error?.response?.data?.error?.message || 'Failed to upload school logo. Please try again.');
      setAlertSuccess(false);
      setShowAlert(true);
    } finally {
      setLogoUpdating(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!tenantId) return;

    setLogoDeleting(true);
    try {
      const response = await tenantsAPI.deleteTenantLogo(tenantId);
      if (response.success) {
        setSchool((prev) => ({ ...prev, logoUrl: null }));
        setAlertHeader('Success');
        setAlertMessage('School logo removed successfully.');
        setAlertSuccess(true);
        setShowAlert(true);
      }
    } catch (error) {
      setAlertHeader('Error');
      setAlertMessage(error?.response?.data?.error?.message || 'Failed to delete school logo. Please try again.');
      setAlertSuccess(false);
      setShowAlert(true);
    } finally {
      setLogoDeleting(false);
    }
  };

  // Open Edit Admin Modal
  const openEditAdminModal = (admin) => {
    setSelectedAdmin(admin);
    setEditAdminForm({
      name: admin.name || '',
      email: admin.email || '',
      phone: admin.phone || '',
    });
    setEditAdminError('');
    setEditAdminModalVisible(true);
  };

  // Close Edit Admin Modal
  const closeEditAdminModal = () => {
    setEditAdminModalVisible(false);
    setSelectedAdmin(null);
    setEditAdminForm({ name: '', email: '', phone: '' });
    setEditAdminError('');
  };

  // Handle Admin Update
  const handleUpdateAdmin = async () => {
    if (!selectedAdmin || !tenantId) return;

    // Basic validation
    if (!editAdminForm.name.trim()) {
      setEditAdminError('Name is required');
      return;
    }
    if (!editAdminForm.email.trim() || !editAdminForm.email.includes('@')) {
      setEditAdminError('Valid email is required');
      return;
    }

    setEditAdminLoading(true);
    setEditAdminError('');

    try {
      const updateData = {
        name: editAdminForm.name.trim(),
        email: editAdminForm.email.trim().toLowerCase(),
        phone: editAdminForm.phone.trim() || undefined,
      };

      const response = await tenantsAPI.updateSchoolAdmin(tenantId, selectedAdmin._id || selectedAdmin.id, updateData);

      if (response.success) {
        // Update local admins list
        setAdmins(prevAdmins => prevAdmins.map(admin => 
          (admin._id === selectedAdmin._id || admin.id === selectedAdmin.id)
            ? { ...admin, ...response.data }
            : admin
        ));
        closeEditAdminModal();
        setAlertHeader('Success');
        setAlertMessage('Admin updated successfully');
        setAlertSuccess(true);
        setShowAlert(true);
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.error?.message || 'Failed to update admin';
      setEditAdminError(errorMessage);
    } finally {
      setEditAdminLoading(false);
    }
  };

  // Open Password Reset Modal
  const openResetPasswordModal = (admin) => {
    setSelectedAdminForReset(admin);
    setNewPassword('');
    setConfirmPassword('');
    setResetPasswordError('');
    setResetPasswordModalVisible(true);
  };

  // ==========================================
  // Delete Admin (permanent removal from database)
  // ==========================================
  const openDeleteAdminAlert = (admin) => {
    setAdminToDelete(admin);
    setShowDeleteAdminAlert(true);
  };

  const closeDeleteAdminAlert = () => {
    setShowDeleteAdminAlert(false);
    setAdminToDelete(null);
  };

  const handleDeleteAdmin = async () => {
    if (!adminToDelete || !tenantId) return;

    const adminId = adminToDelete._id || adminToDelete.id;
    if (!adminId) {
      closeDeleteAdminAlert();
      return;
    }

    setDeletingAdmin(true);
    try {
      const response = await tenantsAPI.deleteSchoolAdmin(tenantId, adminId);

      if (response.success) {
        // Remove the admin from the local list immediately
        setAdmins((prevAdmins) => prevAdmins.filter(
          (a) => (a._id || a.id) !== adminId
        ));

        // Re-fetch the admins list and stats from the server so the UI
        // reflects the actual database state (admin must be gone).
        try {
          const [adminsRes, statsRes] = await Promise.all([
            tenantsAPI.getSchoolAdmins(tenantId),
            tenantsAPI.getTenantStats(tenantId),
          ]);
          if (adminsRes.success && adminsRes.data) {
            setAdmins(adminsRes.data.admins || []);
          }
          if (statsRes.success && statsRes.data) {
            setStats(statsRes.data.stats);
          }
        } catch (refreshError) {
          console.error('Error refreshing admins after delete:', refreshError);
        }

        const adminCount = response.data?.adminCollectionDeleted ?? 0;
        const userCount = response.data?.userCollectionDeleted ?? 0;
        const contentCounts = response.data?.contentDeleted || {};
        const contentSummary = Object.entries(contentCounts)
          .filter(([key, value]) => key !== 'referencesCleaned' && value > 0)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        setAlertHeader('Success');
        setAlertMessage(
          `${adminToDelete.name || 'Admin'} has been permanently deleted from the database` +
          ` (Admin records removed: ${adminCount}, User records removed: ${userCount}).` +
          (contentSummary ? ` Created content deleted -> ${contentSummary}.` : '')
        );
        setAlertSuccess(true);
        setShowAlert(true);
      }
    } catch (error) {
      setAlertHeader('Error');
      setAlertMessage(error?.response?.data?.error?.message || 'Failed to delete admin. Please try again.');
      setAlertSuccess(false);
      setShowAlert(true);
    } finally {
      setDeletingAdmin(false);
      closeDeleteAdminAlert();
    }
  };


  // Close Password Reset Modal
  const closeResetPasswordModal = () => {
    setResetPasswordModalVisible(false);
    setSelectedAdminForReset(null);
    setNewPassword('');
    setConfirmPassword('');
    setResetPasswordError('');
  };

  // Handle Password Reset
  const handleResetPassword = async () => {
    if (!selectedAdminForReset || !tenantId) return;

    // Validation
    if (newPassword.length < 6) {
      setResetPasswordError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetPasswordError('Passwords do not match');
      return;
    }

    setResetPasswordLoading(true);
    setResetPasswordError('');

    try {
      const response = await tenantsAPI.resetSchoolAdminPassword(
        tenantId,
        selectedAdminForReset._id || selectedAdminForReset.id,
        newPassword
      );

      if (response.success) {
        closeResetPasswordModal();
        setAlertHeader('Success');
        setAlertMessage('Password reset successfully. The admin should use the new password to log in.');
        setAlertSuccess(true);
        setShowAlert(true);
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.error?.message || 'Failed to reset password';
      setResetPasswordError(errorMessage);
    } finally {
      setResetPasswordLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className="detail-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/superadmin/schools" className="gold-back-btn" />
          </IonButtons>
          <IonTitle>{school.name}</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="school-detail-content" fullscreen>
        <div className="detail-container">
          {/* Header Card */}
          <IonCard className="header-card">
            <IonCardContent>
              <div className="header-content">
                {school.logoUrl ? (
                  <div className="header-logo-wrapper">
                    <img
                      src={resolveMediaUrl(school.logoUrl)}
                      alt={`${school.name} logo`}
                      className="header-logo-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="header-icon-wrapper header-logo-fallback" style={{ display: 'none' }}>
                      <IonIcon icon={businessOutline} className="header-icon" />
                    </div>
                  </div>
                ) : (
                  <div className="header-icon-wrapper">
                    <IonIcon icon={businessOutline} className="header-icon" />
                  </div>
                )}
                <div className="header-info">
                  <h1 className="school-name">{school.name}</h1>
                  <span className="school-code-badge">{school.code}</span>
                </div>
              </div>

              {/* School Logo Management */}
              <div className="logo-management-row">
                <input
                  type="file"
                  id="school-logo-upload-input"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleLogoChange}
                />
                <IonButton
                  fill="outline"
                  size="small"
                  className="logo-action-btn"
                  disabled={logoUpdating}
                  onClick={() => document.getElementById('school-logo-upload-input')?.click()}
                >
                  <IonIcon icon={cloudUploadOutline} slot="start" />
                  {logoUpdating ? 'Uploading…' : school.logoUrl ? 'Edit Logo' : 'Upload Logo'}
                </IonButton>
                {school.logoUrl && (
                  <IonButton
                    fill="outline"
                    size="small"
                    color="danger"
                    className="logo-action-btn"
                    disabled={logoDeleting}
                    onClick={handleLogoDelete}
                  >
                    <IonIcon icon={trashOutline} slot="start" />
                    {logoDeleting ? 'Removing…' : 'Delete Logo'}
                  </IonButton>
                )}
              </div>
            </IonCardContent>
          </IonCard>

          {/* Contact Information */}
          {(school.address || school.phone || school.email) && (
            <IonCard className="info-card">
              <IonCardHeader>
                <IonCardTitle>Contact Information</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div className="contact-list">
                  {school.address && (
                    <div className="contact-row">
                      <IonIcon icon={locationOutline} className="contact-icon" />
                      <span className="contact-text">{school.address}</span>
                    </div>
                  )}
                  {school.phone && (
                    <div className="contact-row">
                      <IonIcon icon={callOutline} className="contact-icon" />
                      <span className="contact-text">{school.phone}</span>
                    </div>
                  )}
                  {school.email && (
                    <div className="contact-row">
                      <IonIcon icon={mailOutline} className="contact-icon" />
                      <span className="contact-text">{school.email}</span>
                    </div>
                  )}
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/* Statistics */}
          {stats && (
            <IonCard className="stats-card">
              <IonCardHeader>
                <IonCardTitle>Statistics</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div className="stats-grid">
                  <div className="stat-item">
                    <IonIcon icon={peopleOutline} className="stat-icon" />
                    <div className="stat-number">{stats.totalStudents}</div>
                    <div className="stat-label">Students</div>
                  </div>
                  <div className="stat-item">
                    <IonIcon icon={personOutline} className="stat-icon" />
                    <div className="stat-number">{stats.totalAdmins}</div>
                    <div className="stat-label">Admins</div>
                  </div>
                  <div className="stat-item">
                    <IonIcon icon={bookOutline} className="stat-icon" />
                    <div className="stat-number">{stats.totalClasses}</div>
                    <div className="stat-label">Classes</div>
                  </div>
                  <div className="stat-item">
                    <IonIcon icon={documentTextOutline} className="stat-icon" />
                    <div className="stat-number">{stats.totalHomeworks}</div>
                    <div className="stat-label">Homework</div>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/* Admins */}
          <IonCard className="admins-card">
            <IonCardHeader>
              <IonCardTitle>Administrators</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {admins.length > 0 ? (
                <div className="admins-list">
                  {admins.map((admin) => (
                    <div key={admin._id || admin.id} className="admin-row">
                      <div className="admin-avatar">
                        {admin.name ? admin.name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div className="admin-info">
                        <h3 className="admin-name">{admin.name}</h3>
                        <p className="admin-email">{admin.email}</p>
                        {admin.phone && <p className="admin-phone">{admin.phone}</p>}
                      </div>
                      <div className="admin-actions">
                        <button
                          className="action-btn btn-edit-admin"
                          onClick={() => openEditAdminModal(admin)}
                          title="Edit Admin"
                        >
                          <IonIcon icon={createOutline} />
                        </button>
                        <button
                          className="action-btn btn-reset-password"
                          onClick={() => openResetPasswordModal(admin)}
                          title="Reset Password"
                        >
                          <IonIcon icon={keyOutline} />
                        </button>
                        <button
                          className="action-btn btn-delete-admin"
                          onClick={() => openDeleteAdminAlert(admin)}
                          title="Delete Admin"
                          disabled={deletingAdmin}
                        >
                          <IonIcon icon={trashOutline} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-admins">
                  <p>No admins assigned to this school</p>
                </div>
              )}
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>

      {/* Edit Admin Modal */}
      <IonModal
        isOpen={editAdminModalVisible}
        onDidDismiss={closeEditAdminModal}
        className="admin-edit-modal"
      >
        <div className="modal-content admin-modal-content">
          <div className="modal-header">
            <h2>
              <IonIcon icon={createOutline} style={{ marginRight: '8px' }} />
              Edit Admin
            </h2>
            <button className="modal-close" onClick={closeEditAdminModal}>
              <IonIcon icon={closeOutline} />
            </button>
          </div>

          <div className="modal-body">
            {editAdminError && (
              <div className="error-banner">
                <IonIcon icon={warningOutline} />
                <span>{editAdminError}</span>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Name *</label>
              <IonInput
                value={editAdminForm.name}
                onIonInput={(e) => {
                  setEditAdminForm({ ...editAdminForm, name: e.detail.value || '' });
                  if (editAdminError) setEditAdminError('');
                }}
                placeholder="Enter admin name"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Email *</label>
              <IonInput
                type="email"
                value={editAdminForm.email}
                onIonInput={(e) => {
                  setEditAdminForm({ ...editAdminForm, email: e.detail.value || '' });
                  if (editAdminError) setEditAdminError('');
                }}
                placeholder="Enter admin email"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Phone</label>
              <IonInput
                type="tel"
                value={editAdminForm.phone}
                onIonInput={(e) => setEditAdminForm({ ...editAdminForm, phone: e.detail.value || '' })}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              className="modal-btn modal-btn-cancel"
              onClick={closeEditAdminModal}
              disabled={editAdminLoading}
            >
              Cancel
            </button>
            <button
              className="modal-btn modal-btn-save"
              onClick={handleUpdateAdmin}
              disabled={editAdminLoading}
            >
              {editAdminLoading ? <IonSpinner name="crescent" /> : (
                <>
                  <IonIcon icon={checkmarkOutline} style={{ marginRight: '4px' }} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </IonModal>

      {/* Password Reset Modal */}
      <IonModal
        isOpen={resetPasswordModalVisible}
        onDidDismiss={closeResetPasswordModal}
        className="password-reset-modal"
      >
        <div className="modal-content admin-modal-content">
          <div className="modal-header">
            <h2>
              <IonIcon icon={keyOutline} style={{ marginRight: '8px' }} />
              Reset Password
            </h2>
            <button className="modal-close" onClick={closeResetPasswordModal}>
              <IonIcon icon={closeOutline} />
            </button>
          </div>

          <div className="modal-body">
            {selectedAdminForReset && (
              <div className="admin-info-banner">
                <IonIcon icon={personOutline} />
                <span>Resetting password for: <strong>{selectedAdminForReset.name}</strong> ({selectedAdminForReset.email})</span>
              </div>
            )}

            {resetPasswordError && (
              <div className="error-banner">
                <IonIcon icon={warningOutline} />
                <span>{resetPasswordError}</span>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">New Password *</label>
              <IonInput
                type="password"
                value={newPassword}
                onIonInput={(e) => {
                  setNewPassword(e.detail.value || '');
                  if (resetPasswordError) setResetPasswordError('');
                }}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Confirm Password *</label>
              <IonInput
                type="password"
                value={confirmPassword}
                onIonInput={(e) => {
                  setConfirmPassword(e.detail.value || '');
                  if (resetPasswordError) setResetPasswordError('');
                }}
                placeholder="Confirm new password"
              />
            </div>

            {newPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
              <div className="success-banner">
                <IonIcon icon={checkmarkOutline} />
                <span>Password meets requirements</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              className="modal-btn modal-btn-cancel"
              onClick={closeResetPasswordModal}
              disabled={resetPasswordLoading}
            >
              Cancel
            </button>
            <button
              className="modal-btn modal-btn-save modal-btn-warning"
              onClick={handleResetPassword}
              disabled={resetPasswordLoading}
            >
              {resetPasswordLoading ? <IonSpinner name="crescent" /> : (
                <>
                  <IonIcon icon={keyOutline} style={{ marginRight: '4px' }} />
                  Reset Password
                </>
              )}
            </button>
          </div>
        </div>
      </IonModal>

      {/* Delete Admin Confirmation Alert */}
      <IonAlert
        isOpen={showDeleteAdminAlert}
        onDidDismiss={closeDeleteAdminAlert}
        header="Delete Admin"
        message={
          adminToDelete
            ? `Are you sure you want to permanently delete "${adminToDelete.name}" (${adminToDelete.email})? This will remove the admin account from the database, together with every class, student, album, news, report card and other content created by this admin (and everything published through those classes/students). Content created by other admins will not be affected. This action cannot be undone.`
            : ''
        }
        buttons={[
          {
            text: 'Cancel',
            role: 'cancel',
            handler: closeDeleteAdminAlert,
          },
          {
            text: deletingAdmin ? 'Deleting…' : 'Delete',
            role: 'destructive',
            handler: handleDeleteAdmin,
          },
        ]}
      />

      {/* Alert */}
      <IonAlert
        isOpen={showAlert}
        onDidDismiss={() => setShowAlert(false)}
        header={alertHeader}
        message={alertMessage}
        buttons={['OK']}
      />
    </IonPage>
  );
};

export default SchoolDetailScreen;