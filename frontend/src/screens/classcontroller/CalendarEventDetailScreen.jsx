/**
 * Class Controller Calendar Event Detail Screen
 * Shows detailed view of a calendar event for class controller
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
} from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { classControllerAPI } from '../../services/api';
import './CalendarEventDetailScreen.css';

const ClassControllerCalendarEventDetailScreen = () => {
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
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const response = await classControllerAPI.getCalendarEvents({ month, year });
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
              <IonBackButton defaultHref="/class-controller/calendar" />
            </IonButtons>
            <IonTitle>Event Not Found</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <IonIcon icon={informationCircleOutline} style={{ fontSize: '64px', color: '#9ca3af' }} />
          <p style={{ marginTop: '16px' }}>Event not found or no longer available</p>
          <IonButton onClick={() => history.push('/class-controller/calendar')}>
            Back to Calendar
          </IonButton>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="modern-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/calendar" />
          </IonButtons>
          <IonTitle>Event Details</IonTitle>
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
              color="primary"
              onClick={() => history.push('/class-controller/calendar')}
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

export default ClassControllerCalendarEventDetailScreen;