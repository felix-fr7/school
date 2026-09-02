/**
 * Schools List Screen - Super Admin (Ionic React Version)
 * Lists all schools/tenants with Edit and Delete functionality
 * Redesigned Layout & MongoDB Optimized
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonModal,
  IonInput,
  IonTextarea,
  IonAlert,
} from '@ionic/react';
import {
  schoolOutline,
  createOutline,
  trashOutline,
  closeOutline,
  businessOutline,
  mailOutline,
  callOutline,
  arrowBackOutline,
  eyeOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { tenantsAPI } from '../../services/api';
import './SchoolsListScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const SchoolsListScreen = () => {
  const history = useHistory();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertButtons, setAlertButtons] = useState(['OK']);

  const showAlertMessage = (header, message, buttons = ['OK']) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setAlertButtons(buttons);
    setShowAlert(true);
  };

  const fetchSchools = async () => {
    try {
      const response = await tenantsAPI.getAllTenants(1, 50);
      if (response.success && response.data) {
        // Map backend fields securely to standard format
        const mappedSchools = response.data.tenants.map((s) => ({
          ...s,
          id: s._id || s.id,
          name: s.schoolName || s.name,
          code: s.schoolCode || s.code,
          phone: s.contactPhone || s.phone,
          email: s.contactEmail || s.email,
        }));
        setSchools(mappedSchools);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const openEditModal = (school) => {
    setSelectedSchool(school);
    setEditForm({
      name: school.name || '',
      code: school.code || '',
      address: school.address || '',
      phone: school.phone || '',
      email: school.email || '',
    });
    setFormErrors({});
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setSelectedSchool(null);
    setEditForm({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!editForm.name.trim()) {
      errors.name = 'School name is required';
    } else if (editForm.name.trim().length > 200) {
      errors.name = 'School name must be less than 200 characters';
    }

    if (!editForm.code.trim()) {
      errors.code = 'School code is required';
    } else if (editForm.code.trim().length > 50) {
      errors.code = 'School code must be less than 50 characters';
    }

    if (editForm.email.trim() && !editForm.email.trim().includes('@')) {
      errors.email = 'Please provide a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdate = async () => {
    if (!validateForm() || !selectedSchool) {
      return;
    }

    setEditLoading(true);
    try {
      const updateData = {
        schoolName: editForm.name.trim(),
        schoolCode: editForm.code.trim(),
        address: editForm.address.trim() || undefined,
        contactPhone: editForm.phone.trim() || undefined,
        contactEmail: editForm.email.trim() || undefined,
      };

      const response = await tenantsAPI.updateTenant(selectedSchool.id, updateData);

      if (response.success) {
        setSchools((prevSchools) =>
          prevSchools.map((s) =>
            s.id === selectedSchool.id
              ? {
                  ...s,
                  name: editForm.name.trim(),
                  code: editForm.code.trim(),
                  address: editForm.address.trim(),
                  phone: editForm.phone.trim(),
                  email: editForm.email.trim(),
                }
              : s
          )
        );
        closeEditModal();
        showAlertMessage('Success', 'School updated successfully');
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.error?.message || 'Failed to update school';
      showAlertMessage('Error', errorMessage);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = (school) => {
    setAlertHeader('Delete School');
    setAlertMessage(
      `Are you sure you want to delete "${school.name}" and all its data? This action cannot be undone.`
    );
    setAlertButtons([
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Delete',
        role: 'destructive',
        handler: () => performDelete(school),
      },
    ]);
    setShowAlert(true);
  };

  const performDelete = async (school) => {
    try {
      const response = await tenantsAPI.deleteTenant(school.id);

      if (response.success) {
        setSchools((prevSchools) =>
          prevSchools.filter((s) => s.id !== school.id)
        );
        showAlertMessage(
          'Success',
          `School "${school.name}" and all associated data have been deleted.`
        );
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.error?.message || 'Failed to delete school';
      showAlertMessage('Error', errorMessage);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="premium-header">
          <IonToolbar>
            <IonTitle>Schools List</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="schools-list-content ion-padding" fullscreen>
          <div className="loading-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <IonSpinner name="crescent" />
            <p>Loading schools...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="premium-header">
        <IonToolbar>
          <IonButton
            fill="clear"
            onClick={() => history.push('/superadmin/dashboard')}
            slot="start"
            className="gold-back-btn"
          >
            <IonIcon icon={arrowBackOutline} slot="icon-only" />
          </IonButton>
          <IonTitle>Schools Directory</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="schools-list-content" fullscreen>
        <div className="container">
          {/* Top Hero Section */}
          <div className="header-section">
            <div className="header-icon-wrapper">
              <IonIcon icon={businessOutline} className="header-icon" />
            </div>
            <div className="header-text">
              <h1 className="header-title">Schools Directory</h1>
              <p className="header-subtitle">Manage all active schools and tenant organizations</p>
            </div>
          </div>

          {/* Schools Grid */}
          {schools.length === 0 ? (
            <div className="empty-container">
              <IonIcon icon={schoolOutline} className="empty-icon" />
              <p className="empty-text">No schools found</p>
              <p className="empty-subtext">
                Create your first school from the admin portal to get started
              </p>
            </div>
          ) : (
            <div className="schools-grid">
              {schools.map((school) => (
                <IonCard key={school.id} className="school-card">
                  <IonCardContent>
                    <div className="school-header">
                      <div className="school-avatar">
                        <IonIcon icon={businessOutline} />
                      </div>
                      <div className="school-title-area">
                        <h3 className="school-name">{school.name}</h3>
                        <span className="school-code-pill">{school.code}</span>
                      </div>
                    </div>

                    <div className="school-details">
                      {school.email && (
                        <div className="detail-row">
                          <IonIcon icon={mailOutline} />
                          <span>{school.email}</span>
                        </div>
                      )}
                      {school.phone && (
                        <div className="detail-row">
                          <IonIcon icon={callOutline} />
                          <span>{school.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="school-actions">
                      <button
                        className="action-btn btn-view"
                        onClick={() =>
                          history.push(`/superadmin/schools/${school.id}`)
                        }
                      >
                        <IonIcon icon={eyeOutline} />
                        <span>View</span>
                      </button>
                      <button
                        className="action-btn btn-edit"
                        onClick={() => openEditModal(school)}
                      >
                        <IonIcon icon={createOutline} />
                        <span>Edit</span>
                      </button>
                      <button
                        className="action-btn btn-delete"
                        onClick={() => handleDelete(school)}
                      >
                        <IonIcon icon={trashOutline} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        <IonModal
          isOpen={editModalVisible}
          onDidDismiss={closeEditModal}
          className="edit-modal"
        >
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit School</h2>
              <button className="modal-close" onClick={closeEditModal}>
                <IonIcon icon={closeOutline} />
              </button>
            </div>

            <div className="modal-body">
              {/* Name Field */}
              <div className="input-group">
                <label className="input-label">School Name *</label>
                <IonInput
                  value={editForm.name}
                  onIonInput={(e) => {
                    setEditForm({ ...editForm, name: e.detail.value || '' });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                  }}
                  placeholder="Enter school name"
                  className={formErrors.name ? 'input-error' : ''}
                />
                {formErrors.name && (
                  <span className="error-text">{formErrors.name}</span>
                )}
              </div>

              {/* Code Field */}
              <div className="input-group">
                <label className="input-label">School Code *</label>
                <IonInput
                  value={editForm.code}
                  onIonInput={(e) => {
                    setEditForm({
                      ...editForm,
                      code: (e.detail.value || '').toUpperCase(),
                    });
                    if (formErrors.code) setFormErrors({ ...formErrors, code: '' });
                  }}
                  placeholder="Enter school code"
                  className={formErrors.code ? 'input-error' : ''}
                />
                {formErrors.code && (
                  <span className="error-text">{formErrors.code}</span>
                )}
              </div>

              {/* Email Field */}
              <div className="input-group">
                <label className="input-label">Email</label>
                <IonInput
                  type="email"
                  value={editForm.email}
                  onIonInput={(e) => {
                    setEditForm({ ...editForm, email: e.detail.value || '' });
                    if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                  }}
                  placeholder="Enter school email"
                  className={formErrors.email ? 'input-error' : ''}
                />
                {formErrors.email && (
                  <span className="error-text">{formErrors.email}</span>
                )}
              </div>

              {/* Phone Field */}
              <div className="input-group">
                <label className="input-label">Phone</label>
                <IonInput
                  type="tel"
                  value={editForm.phone}
                  onIonInput={(e) =>
                    setEditForm({ ...editForm, phone: e.detail.value || '' })
                  }
                  placeholder="Enter phone number"
                />
              </div>

              {/* Address Field */}
              <div className="input-group">
                <label className="input-label">Address</label>
                <IonTextarea
                  value={editForm.address}
                  onIonInput={(e) =>
                    setEditForm({ ...editForm, address: e.detail.value || '' })
                  }
                  placeholder="Enter school address"
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={closeEditModal}
                disabled={editLoading}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-save"
                onClick={handleUpdate}
                disabled={editLoading}
              >
                {editLoading ? <IonSpinner name="crescent" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </IonModal>

        {/* Alert */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header={alertHeader}
          message={alertMessage}
          buttons={alertButtons}
        />
      </IonContent>
    </IonPage>
  );
};

export default SchoolsListScreen;