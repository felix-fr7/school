/**
 * Schools List Screen - Super Admin (Ionic React Version)
 * Lists all schools/tenants with Edit and Delete functionality
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
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/react';
import {
  schoolOutline,
  createOutline,
  trashOutline,
  closeOutline,
  businessOutline,
  mailOutline,
  callOutline,
  locationOutline,
  arrowBackOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { tenantsAPI } from '../../services/api';
import { Tenant } from '../../types';
import './SchoolsListScreen.css';

const SchoolsListScreen: React.FC = () => {
  const history = useHistory();
  const [schools, setSchools] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertButtons, setAlertButtons] = useState<any[]>(['OK']);

  const showAlertMessage = (header: string, message: string, buttons = ['OK']) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setAlertButtons(buttons);
    setShowAlert(true);
  };

  const fetchSchools = async () => {
    try {
      const response = await tenantsAPI.getAllTenants(1, 50);
      if (response.success && response.data) {
        setSchools(response.data.tenants);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchools();
  };

  // Open edit modal with pre-filled data
  const openEditModal = (school: Tenant) => {
    setSelectedSchool(school);
    setEditForm({
      name: school.name,
      code: school.code,
      address: school.address || '',
      phone: school.phone || '',
      email: school.email || '',
    });
    setFormErrors({});
    setEditModalVisible(true);
  };

  // Close edit modal
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

  // Validate edit form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

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

  // Handle update submission
  const handleUpdate = async () => {
    if (!validateForm() || !selectedSchool) {
      return;
    }

    setEditLoading(true);
    try {
      const updateData = {
        name: editForm.name.trim(),
        code: editForm.code.trim(),
        address: editForm.address.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        email: editForm.email.trim() || undefined,
      };

      const response = await tenantsAPI.updateTenant(selectedSchool.id, updateData);

      if (response.success) {
        setSchools(prevSchools =>
          prevSchools.map(s =>
            s.id === selectedSchool.id ? { ...s, ...updateData } : s
          )
        );
        closeEditModal();
        showAlertMessage('Success', 'School updated successfully');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || 'Failed to update school';
      showAlertMessage('Error', errorMessage);
    } finally {
      setEditLoading(false);
    }
  };

  // Handle delete with confirmation
  const handleDelete = (school: Tenant) => {
    setAlertHeader('Delete School');
    setAlertMessage(`Are you sure you want to delete "${school.name}" and all its data? This action cannot be undone.`);
    setAlertButtons([
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Delete',
        role: 'destructive',
        handler: () => performDelete(school)
      }
    ]);
    setShowAlert(true);
  };

  // Perform the actual delete operation
  const performDelete = async (school: Tenant) => {
    try {
      const response = await tenantsAPI.deleteTenant(school.id);

      if (response.success) {
        setSchools(prevSchools => prevSchools.filter(s => s.id !== school.id));
        showAlertMessage('Success', `School "${school.name}" and all associated data have been deleted.`);
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || 'Failed to delete school';
      showAlertMessage('Error', errorMessage);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="premium-header">
          <IonToolbar>
            <IonTitle>Schools List</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="schools-list-content" fullscreen>
          <div className="loading-container">
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
          <IonButton fill="clear" onClick={() => history.push('/superadmin/dashboard')} slot="start">
            <IonIcon icon={arrowBackOutline} slot="icon-only" />
          </IonButton>
          <IonTitle>Schools Directory</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="schools-list-content" fullscreen>
        <div className="container">
          {/* Header */}
          <div className="header-section">
            <IonIcon icon={businessOutline} className="header-icon" />
            <h1 className="header-title">Schools Directory</h1>
            <p className="header-subtitle">Manage all schools and tenants</p>
          </div>

          {/* Schools List */}
          {schools.length === 0 ? (
            <div className="empty-container">
              <IonIcon icon={schoolOutline} className="empty-icon" />
              <p className="empty-text">No schools found</p>
              <p className="empty-subtext">Create your first school to get started</p>
            </div>
          ) : (
            <div className="schools-grid">
              {schools.map((school) => (
                <IonCard key={school.id} className="school-card">
                  <IonCardContent>
                    <div className="school-header">
                      <IonIcon icon={businessOutline} className="school-icon" />
                      <h3 className="school-name">{school.name}</h3>
                    </div>
                    <div className="school-details">
                      <p className="school-code">
                        <IonIcon icon={schoolOutline} /> Code: {school.code}
                      </p>
                      {school.email && (
                        <p className="school-email">
                          <IonIcon icon={mailOutline} /> {school.email}
                        </p>
                      )}
                      {school.phone && (
                        <p className="school-phone">
                          <IonIcon icon={callOutline} /> {school.phone}
                        </p>
                      )}
                    </div>
                    <div className="school-actions">
                      <IonButton
                        fill="outline"
                        size="small"
                        onClick={() => history.push(`/superadmin/schools/${school.id}`)}
                      >
                        View Details
                      </IonButton>
                      <IonButton
                        fill="outline"
                        size="small"
                        color="primary"
                        onClick={() => openEditModal(school)}
                      >
                        <IonIcon icon={createOutline} slot="icon-only" />
                      </IonButton>
                      <IonButton
                        fill="outline"
                        size="small"
                        color="danger"
                        onClick={() => handleDelete(school)}
                      >
                        <IonIcon icon={trashOutline} slot="icon-only" />
                      </IonButton>
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
                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
              </div>

              {/* Code Field */}
              <div className="input-group">
                <label className="input-label">School Code *</label>
                <IonInput
                  value={editForm.code}
                  onIonInput={(e) => {
                    setEditForm({ ...editForm, code: (e.detail.value || '').toUpperCase() });
                    if (formErrors.code) setFormErrors({ ...formErrors, code: '' });
                  }}
                  placeholder="Enter school code"
                  className={formErrors.code ? 'input-error' : ''}
                />
                {formErrors.code && <span className="error-text">{formErrors.code}</span>}
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
                {formErrors.email && <span className="error-text">{formErrors.email}</span>}
              </div>

              {/* Phone Field */}
              <div className="input-group">
                <label className="input-label">Phone</label>
                <IonInput
                  type="tel"
                  value={editForm.phone}
                  onIonInput={(e) => setEditForm({ ...editForm, phone: e.detail.value || '' })}
                  placeholder="Enter phone number"
                />
              </div>

              {/* Address Field */}
              <div className="input-group">
                <label className="input-label">Address</label>
                <IonTextarea
                  value={editForm.address}
                  onIonInput={(e) => setEditForm({ ...editForm, address: e.detail.value || '' })}
                  placeholder="Enter school address"
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <IonButton
                fill="outline"
                onClick={closeEditModal}
                disabled={editLoading}
              >
                Cancel
              </IonButton>
              <IonButton
                color="primary"
                onClick={handleUpdate}
                disabled={editLoading}
              >
                {editLoading ? <IonSpinner name="crescent" /> : 'Save Changes'}
              </IonButton>
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