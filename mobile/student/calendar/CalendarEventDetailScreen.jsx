/**
 * Student Calendar Event Detail Screen
 * Shows detailed view of a calendar event
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
import { studentAPI } from '../../src/services/api';
import './CalendarEventDetailScreen.css';
import HomeLogoutButtons from '../../src/components/HomeLogoutButtons';

const CalendarEventDetailScreen = () => {
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
      // Since we don't have a single event endpoint, we'll get events for the month
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const response = await studentAPI.getCalendarEvents({ month, year });
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

  const getEventTypeColor = (type) => {
    const colors = {
      Holiday: '#ef4444',
      Exam: '#f59e0b',
      Event: '#4F46E5',
      Meeting: '#06b6d4',
      Deadline: '#dc2626',
      Function: '#8b5cf6',
      Trip: '#10b981',
      Other: '#6b7280',
    };
    return colors[type] || '#4F46E5';
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
              <IonBackButton defaultHref="/student/calendar" />
            </IonButtons>
            <IonTitle>Event Not Found</IonTitle>
          <HomeLogoutButtons />
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <IonIcon icon={informationCircleOutline} style={{ fontSize: '64px', color: '#9ca3af' }} />
          <p style={{ marginTop: '16px' }}>Event not found or no longer available</p>
          <IonButton onClick={() => history.push('/student/calendar')}>
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
            <IonBackButton defaultHref="/student/calendar" />
          </IonButtons>
          <IonTitle>Event Details</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="event-detail-content">
        <div className="event-detail-container">
          {/* Event Header with Color */}
          <div 
            className="event-detail-header" 
            style={{ backgroundColor: event.color }}
          >
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
            {event.visibility && (
              <div className="detail-row">
                <div className="detail-icon">
                  <IonIcon icon={peopleOutline} />
                </div>
                <div className="detail-content">
                  <span className="detail-label">Visibility</span>
                  <span className="detail-value">
                    {event.visibility === 'school-wide' ? 'All Students' : 
                     event.visibility === 'class-specific' ? 'Specific Class' : 
                     event.className || 'Specific Grade'}
                  </span>
                </div>
              </div>
            )}
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

          {/* Back Button */}
          <div className="action-buttons">
            <IonButton 
              expand="block" 
              onClick={() => history.push('/student/calendar')}
              color="primary"
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

export default CalendarEventDetailScreen;
