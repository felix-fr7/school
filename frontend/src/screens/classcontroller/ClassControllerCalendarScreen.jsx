/**
 * Class Controller Calendar Screen
 * View school events, holidays, and important dates
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
  IonText,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import {
  calendarOutline,
  timeOutline,
  locationOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { classControllerAPI } from '../../services/api';
import './ClassControllerCalendarScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const ClassControllerCalendarScreen = () => {
  const history = useHistory();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const response = await classControllerAPI.getCalendarEvents({ month, year });
      if (response.success) {
        setEvents(response.data);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

const handleDayClick = (dayEvents) => {
    if (dayEvents.length === 0) return;
    if (dayEvents.length === 1) {
      history.push(`/class-controller/calendar/${dayEvents[0]._id}`);
    } else {
      setSelectedDate(dayEvents[0] ? new Date(dayEvents[0].date) : null);
    }
  };

  const handleEventClick = (eventId) => {
    history.push(`/class-controller/calendar/${eventId}`);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  return (
    <IonPage>
      <IonHeader className="modern-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/dashboard" />
          </IonButtons>
          <IonTitle>Calendar</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="class-controller-calendar-content">
        <div className="calendar-container">
          {/* Calendar Header */}
          <div className="calendar-header">
            <IonButton fill="clear" onClick={handlePrevMonth}>
              <IonIcon icon={calendarOutline} style={{ transform: 'rotate(180deg)' }} />
            </IonButton>
            <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <IonButton fill="clear" onClick={handleNextMonth}>
              <IonIcon icon={calendarOutline} />
            </IonButton>
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid">
            {dayNames.map(day => (
              <div key={day} className="calendar-day-header">
                {day}
              </div>
            ))}

            {loading ? (
              <div className="calendar-loading">
                <IonSpinner name="crescent" />
              </div>
            ) : (
              getDaysInMonth(currentDate).map((date, index) => {
                const dayEvents = getEventsForDate(date);
                const isToday = date && date.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={index}
                    className={`calendar-day ${!date ? 'empty' : ''} ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
                    onClick={() => handleDayClick(dayEvents)}
                  >
                    {date && (
                      <>
                        <span className="day-number">{date.getDate()}</span>
                        {dayEvents.length > 0 && (
                          <div className="day-event-indicator" />
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Events List */}
          <div className="events-section">
            <h3>Upcoming Events</h3>
            {events.length === 0 ? (
              <div className="empty-events">
                <IonIcon icon={calendarOutline} />
                <p>No events this month</p>
              </div>
            ) : (
              events
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map(event => (
                  <div 
                    key={event._id} 
                    className="event-item"
                    onClick={() => handleEventClick(event._id)}
                  >
                    <div
                      className="event-color-dot"
                      style={{ backgroundColor: event.color }}
                    />
                    <div className="event-content">
                      <div className="event-header">
                        <h4>{event.title}</h4>
                        <IonBadge
                          style={{ backgroundColor: event.color, color: 'white' }}
                        >
                          {event.eventType}
                        </IonBadge>
                      </div>
                      <div className="event-details">
                        <span>
                          <IonIcon icon={calendarOutline} />
                          {new Date(event.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        {event.startTime && (
                          <span>
                            <IonIcon icon={timeOutline} />
                            {event.startTime}
                            {event.endTime && ` - ${event.endTime}`}
                          </span>
                        )}
                        {event.location && (
                          <span>
                            <IonIcon icon={locationOutline} />
                            {event.location}
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="event-description">{event.description}</p>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ClassControllerCalendarScreen;