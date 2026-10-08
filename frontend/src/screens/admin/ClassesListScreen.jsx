/**
 * Admin Classes List Screen (Ionic React Version)
 * Manage school classes
 */

import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonCard,
  IonCardContent,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
  IonToast,
} from '@components/ui';
import { useHistory } from 'react-router-dom';
import { addCircleOutline, refreshOutline, createOutline, trashOutline, schoolOutline, eyeOutline, sendOutline } from '@components/icons';
import { adminAPI } from '../../services/api';
import './ClassesListScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const ClassesListScreen = () => {
  const history = useHistory();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [showSendReportCardAlert, setShowSendReportCardAlert] = useState(false);
  const [classToSendReportCard, setClassToSendReportCard] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', color: 'success' });

  const fetchClasses = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const response = await adminAPI.getClasses();
      if (response.success && response.data) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const onRefresh = async (event) => {
    await fetchClasses(true);
    event.detail.complete();
  };

  const handleDeleteClick = (classId, className) => {
    setClassToDelete({ id: classId, name: className });
    setShowDeleteAlert(true);
  };

const handleDeleteConfirm = async () => {
    if (!classToDelete) return;
    try {
      const response = await adminAPI.deleteClass(classToDelete.id);
      if (response.success) {
        fetchClasses();
      }
    } catch (error) {
      console.error('Error deleting class:', error);
    }
    setShowDeleteAlert(false);
    setClassToDelete(null);
  };

  const handleSendReportCard = async () => {
    if (!classToSendReportCard) return;
    try {
      const response = await adminAPI.publishAllReportCardsForClass(classToSendReportCard.id);
      if (response.success) {
        setToast({ 
          show: true, 
          message: `Sent ${response.data?.publishedCount || 0} report card(s) to ${classToSendReportCard.name}`, 
          color: 'success' 
        });
      } else {
        setToast({ show: true, message: response.message || 'No pending report cards found', color: 'warning' });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to send report cards';
      setToast({ show: true, message: errorMsg, color: 'danger' });
    }
    setShowSendReportCardAlert(false);
    setClassToSendReportCard(null);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading && classes.length === 0) {
    return (
      <IonPage>
        <IonContent className="classes-list-content">
          <div className="loading-state-modern">
            <IonSpinner name="crescent" color="primary" />
            <p className="loading-text">Loading classes...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      {/* Dynamic Nav Header */}
      <IonHeader className="classes-list-header ion-no-border">
        <IonToolbar className="custom-nav-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" className="custom-nav-back-btn" />
          </IonButtons>
          <IonTitle className="custom-nav-title">Classes & Sections</IonTitle>
          <IonButton
            fill="clear"
            className="add-header-btn"
            onClick={() => history.push('/admin/classes/reset-counter')}
          >
            <IonIcon icon={refreshOutline} slot="start" /> Reset Counter
          </IonButton>
          <IonButton
            slot="end"
            fill="clear"
            className="add-header-btn"
            onClick={() => history.push('/admin/classes/create')}
          >
            <IonIcon icon={addCircleOutline} slot="start" /> Add Class
          </IonButton>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="classes-list-content">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        <div className="classes-container-wrapper">
          {/* Header Stats / Banner Section */}
          <div className="classes-summary-card">
            <div>
              <h2>🏫 Manage Classes</h2>
              <p>Configure classes, sections, and structural details</p>
            </div>
            <div className="summary-badge">{classes.length} Total Classes</div>
          </div>

          {classes.length === 0 ? (
            <div className="empty-container-modern">
              <IonIcon icon={schoolOutline} className="empty-icon-modern" />
              <h3 className="empty-title-modern">No classes found</h3>
              <p className="empty-text-modern">Add your first class to get started</p>
            </div>
          ) : (
            <IonList className="class-list-modern">
              {classes.map((item) => {
                const classFullName = item.section ? `${item.name} - ${item.section}` : item.name;
                return (
                  <IonItem key={item.id} className="class-item-modern" lines="none">
                    <IonCard className="class-card-modern">
                      <IonCardContent className="class-card-content-modern">
                        <div className="class-card-left">
                          <div className="class-icon-modern">
                            <IonIcon icon={schoolOutline} />
                          </div>
                          <div className="class-info-modern">
                            <h3 className="class-name-modern">{classFullName}</h3>
                            <p className="class-date-modern">Created: {formatDate(item.createdAt)}</p>
                            <div className="class-stats-modern">
                              <span className="class-stat-badge">Active Class</span>
                            </div>
                          </div>
                        </div>

<div className="class-actions-modern">
                          <button
                            type="button"
                            className="action-btn-small send-btn"
                            title="Send Report Card"
                            onClick={(e) => {
                              e.stopPropagation();
                              setClassToSendReportCard({ id: item.id, name: classFullName });
                              setShowSendReportCardAlert(true);
                            }}
                          >
                            <IonIcon icon={sendOutline} />
                          </button>
                          <button
                            type="button"
                            className="action-btn-small view-btn"
                            title="View Class Details"
                            onClick={(e) => {
                              e.stopPropagation();
                              history.push(`/admin/classes/${item.id}`);
                            }}
                          >
                            <IonIcon icon={eyeOutline} />
                          </button>
                          <button
                            type="button"
                            className="action-btn-small"
                            title="Edit Class"
                            onClick={(e) => {
                              e.stopPropagation();
                              history.push(`/admin/classes/${item.id}/edit`);
                            }}
                          >
                            <IonIcon icon={createOutline} />
                          </button>
                          <button
                            type="button"
                            className="action-btn-small delete-btn"
                            title="Delete Class"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(item.id, classFullName);
                            }}
                          >
                            <IonIcon icon={trashOutline} />
                          </button>
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonItem>
                );
              })}
            </IonList>
          )}
        </div>

<IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Class"
          message={`Are you sure you want to delete "${classToDelete?.name}"? This action cannot be undone.`}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: handleDeleteConfirm,
            },
          ]}
        />

        {/* Send Report Card Alert */}
        <IonAlert
          isOpen={showSendReportCardAlert}
          onDidDismiss={() => {
            setShowSendReportCardAlert(false);
            setClassToSendReportCard(null);
          }}
          header="Send Report Card"
          message={`Are you sure you want to send all pending report cards to students in "${classToSendReportCard?.name}"?`}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { text: 'Send', handler: handleSendReportCard },
          ]}
        />

        {/* Toast Notifications */}
        <IonToast
          isOpen={toast.show}
          onDidDismiss={() => setToast({ ...toast, show: false })}
          message={toast.message}
          duration={3000}
          color={toast.color}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default ClassesListScreen;