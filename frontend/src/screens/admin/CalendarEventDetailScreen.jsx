/**
 * Admin Calendar Event Detail Screen
 * Shows detailed view of a calendar event for admin
 */

import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonBadge,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import {
  calendarOutline,
  timeOutline,
  locationOutline,
  informationCircleOutline,
  arrowBackOutline,
  peopleOutline,
  createOutline,
  trashOutline,
  checkmarkCircleOutline,
  warningOutline,
} from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import './CalendarEventDetailScreen.css';

const AdminCalendarEventDetailScreen = () => {
  const { eventId } = useParams();
  const history = useHistory();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      // Fetch all events and find the specific one
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const response = await adminAPI.getCalendarEvents({ month, year });
      if (response.success) {
        const foundEvent = response.data?.find(e => e._id === eventId);
        if (foundEvent) {
          setEvent(foundEvent);
        }
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes || '00'} ${ampm}`;
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center">
          <IonSpinner name="crescent" />
          <p>Loading event details...</p>
        </IonContent>
      </IonPage>
    );
  }

  if (!event) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/calendar" />
            </IonButtons>
            <IonTitle>Event Not Found</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <IonIcon icon={informationCircleOutline} style={{ fontSize: '64px', color: '#9ca3af' }} />
          <p style={{ marginTop: '16px' }}>Event not found or no longer available</p>
          <IonButton onClick={() => history.push('/admin/calendar')}>
            Back to Calendar
          </IonButton>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="admin-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/calendar" color="light" />
          </IonButtons>
          <IonTitle>Event Details</IonTitle>
          <IonButtons slot="end">
            <IonButton 
              className="edit-btn"
              fill="clear" 
              onClick={() => history.push(`/admin/calendar/edit/${event._id}`)}
            >
              <IonIcon icon={createOutline} slot="icon-only" />
            </IonButton>
            <IonButton 
              className="delete-btn"
              fill="clear" 
              onClick={async () => {
                if (window.confirm('Are you sure you want to delete this event?')) {
                  try {
                    await adminAPI.deleteCalendarEvent(event._id);
                    history.push('/admin/calendar');
                  } catch (error) {
                    console.error('Error deleting event:', error);
                    alert('Failed to delete event');
                  }
                }
              }}
            >
              <IonIcon icon={trashOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="event-detail-content">
        <div className="event-detail-container">
          {/* Event Header with Color */}
          <div 
            className="event-detail-header" 
            style={{ backgroundColor: event.color }}
          >
            <div className="event-status-badge">
              <IonBadge 
                style={{ 
                  backgroundColor: event.isPublished ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', 
                  color: 'white' 
                }}
              >
                <IonIcon icon={event.isPublished ? checkmarkCircleOutline : warningOutline} slot="start" />
                {event.isPublished ? 'Published' : 'Draft'}
              </IonBadge>
            </div>
            <div className="event-type-badge">
              <IonBadge style={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white' }}>
                {event.eventType}
              </IonBadge>
            </div>
            <h1 className="event-title">{event.title}</h1>
          </div>

          {/* Event Details Card */}
          <div className="event-detail-card">
            {/* Date */}
            <div className="detail-row">
              <div className="detail-icon">
                <IonIcon icon={calendarOutline} />
              </div>
              <div className="detail-content">
                <span className="detail-label">Date</span>
                <span className="detail-value">{formatDate(event.date)}</span>
              </div>
            </div>

            {/* Time */}
            {(event.startTime || event.endTime) && (
              <div className="detail-row">
                <div className="detail-icon">
                  <IonIcon icon={timeOutline} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Time</span>
                  <span className="detail-value">
                    {formatTime(event.startTime)}
                    {event.endTime && ` - ${formatTime(event.endTime)}`}
                  </span>
                </div>
              </div>
            )}

            {/* Location */}
            {event.location && (
              <div className="detail-row">
                <div className="detail-icon">
                  <IonIcon icon={locationOutline} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">{event.location}</span>
                </div>
              </div>
            )}

            {/* Visibility */}
            <div className="detail-row">
              <div className="detail-icon">
                <IonIcon icon={peopleOutline} />
              </div>
              <div className="detail-content">
                <span className="detail-label">Visibility</span>
                <span className="detail-value">
                  {event.visibility === 'school-wide' ? 'All Students & Staff' : 
                   event.visibility === 'class-specific' ? 
                     `Specific Class${event.classId ? ` (${event.classId.name || ''})` : ''}` : 
                     `Specific Grade${event.className ? ` - ${event.className}` : ''}`}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="description-card">
              <h3>About this event</h3>
              <p>{event.description}</p>
            </div>
          )}

          {/* Recurring Info */}
          {event.isRecurring && event.recurringPattern && (
            <div className="recurring-info">
              <IonIcon icon={informationCircleOutline} />
              <span>This is a {event.recurringPattern} recurring event</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <IonButton 
              expand="block" 
              onClick={() => history.push(`/admin/calendar/edit/${event._id}`)}
              color="primary"
            >
              <IonIcon icon={createOutline} slot="start" />
              Edit Event
            </IonButton>
            <IonButton 
              expand="block"
              color="danger"
              fill="outline"
              onClick={async () => {
                if (window.confirm('Are you sure you want to delete this event?')) {
                  try {
                    await adminAPI.deleteCalendarEvent(event._id);
                    history.push('/admin/calendar');
                  } catch (error) {
                    console.error('Error deleting event:', error);
                    alert('Failed to delete event');
                  }
                }
              }}
            >
              <IonIcon icon={trashOutline} slot="start" />
              Delete Event
            </IonButton>
            <IonButton 
              expand="block"
              color="medium"
              fill="outline"
              onClick={() => history.push('/admin/calendar')}
            >
              <IonIcon icon={arrowBackOutline} slot="start" />
              Back to Calendar
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminCalendarEventDetailScreen;