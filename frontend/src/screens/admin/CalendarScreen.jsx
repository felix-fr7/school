/**
 * Admin Calendar Screen
 * Manage school events, holidays, and important dates
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
  IonModal,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonSpinner,
  IonAlert,
  IonButtons,
  IonBackButton,
  IonToast,
} from '@ionic/react';
import {
  addCircleOutline,
  calendarOutline,
  trashOutline,
  createOutline,
  closeCircleOutline,
  informationCircleOutline,
  schoolOutline,
  timeOutline,
  locationOutline,
  checkmarkCircleOutline,
  warningOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import './CalendarScreen.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const AdminCalendarScreen = () => {
  const history = useHistory();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', color: 'success' });
  const [saving, setSaving] = useState(false);

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    eventType: 'Event',
    color: '#4F46E5',
    visibility: 'school-wide',
    classId: '',
    location: '',
    startTime: '',
    endTime: '',
    isPublished: true,
  });

  const eventColors = {
    Holiday: '#ef4444',
    Exam: '#f59e0b',
    Event: '#4F46E5',
    Meeting: '#06b6d4',
    Deadline: '#dc2626',
    Function: '#8b5cf6',
    Trip: '#10b981',
    Other: '#6b7280',
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const response = await adminAPI.getCalendarEvents({ month, year });
      if (response.success) {
        setEvents(response.data);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      showToast('Error fetching events', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, color = 'success') => {
    setToast({ show: true, message, color });
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

  const formatDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (date) => {
    if (date) {
      setSelectedDate(date);
      setEventForm({ 
        ...eventForm, 
        date: formatDate(date),
        isPublished: true 
      });
      setSelectedEvent(null);
      setShowEventModal(true);
    }
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      date: formatDate(new Date(event.date)),
      eventType: event.eventType,
      color: event.color,
      visibility: event.visibility,
      classId: event.classId || '',
      location: event.location || '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      isPublished: event.isPublished !== false,
    });
    setShowEventModal(true);
  };

  const handleDeleteEvent = (event) => {
    setSelectedEvent(event);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (!selectedEvent) return;
    try {
      const response = await adminAPI.deleteCalendarEvent(selectedEvent._id);
      if (response.success) {
        fetchEvents();
        showToast('Event deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      showToast('Error deleting event', 'danger');
    }
    setShowDeleteAlert(false);
    setSelectedEvent(null);
  };

  const handleSubmitEvent = async () => {
    if (!eventForm.title || !eventForm.date) {
      showToast('Title and date are required', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (selectedEvent) {
        const response = await adminAPI.updateCalendarEvent(selectedEvent._id, eventForm);
        if (response.success) {
          fetchEvents();
          showToast('Event updated successfully!');
        }
      } else {
        const response = await adminAPI.createCalendarEvent(eventForm);
        if (response.success) {
          fetchEvents();
          showToast('Event created and published successfully!');
        }
      }
      setShowEventModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving event:', error);
      showToast('Error saving event', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      date: selectedDate ? formatDate(selectedDate) : '',
      eventType: 'Event',
      color: '#4F46E5',
      visibility: 'school-wide',
      classId: '',
      location: '',
      startTime: '',
      endTime: '',
      isPublished: true,
    });
    setSelectedEvent(null);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getEventTypeName = (type) => {
    const names = {
      'Holiday': 'Holiday',
      'Exam': 'Exam',
      'Event': 'Event',
      'Meeting': 'Meeting',
      'Deadline': 'Deadline',
      'Function': 'Function',
      'Trip': 'Trip',
      'Other': 'Other'
    };
    return names[type] || type;
  };

  return (
    <IonPage>
      <IonHeader className="admin-header calendar-page-header">
        <IonToolbar className="admin-toolbar calendar-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" color="light" />
          </IonButtons>
          <IonTitle>School Calendar</IonTitle>
          <IonButtons slot="end">
            <IonButton 
              className="add-event-btn"
              onClick={() => { setSelectedDate(new Date()); setEventForm({...eventForm, date: formatDate(new Date()), isPublished: true}); setSelectedEvent(null); setShowEventModal(true); }}
            >
              <IonIcon icon={addCircleOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-calendar-content" fullscreen>
        <div className="calendar-container">
          {/* Calendar Header */}
          <div className="calendar-header glass-card">
            <IonButton className="nav-arrow" fill="clear" onClick={handlePrevMonth}>
              <IonIcon icon={calendarOutline} />
            </IonButton>
            <h2 className="month-title">
              <span className="month-name">{monthNames[currentDate.getMonth()]}</span>
              <span className="year-number">{currentDate.getFullYear()}</span>
            </h2>
            <IonButton className="nav-arrow" fill="clear" onClick={handleNextMonth}>
              <IonIcon icon={calendarOutline} />
            </IonButton>
            <IonButton className="today-btn" fill="outline" size="small" onClick={() => setCurrentDate(new Date())}>
              Today
            </IonButton>
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid glass-card">
            {/* Day Headers */}
            {dayNames.map(day => (
              <div key={day} className="calendar-day-header">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {loading ? (
              <div className="calendar-loading">
                <IonSpinner name="crescent" />
                <p>Loading calendar...</p>
              </div>
            ) : (
              getDaysInMonth(currentDate).map((date, index) => {
                const dayEvents = getEventsForDate(date);
                const isToday = date && date.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={index}
                    className={`calendar-day ${!date ? 'empty' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => handleDateClick(date)}
                  >
                    {date && (
                      <>
                        <span className="day-number">{date.getDate()}</span>
                        <div className="day-events">
                          {dayEvents.slice(0, 3).map(event => (
                            <div
                              key={event._id}
                              className="day-event-badge"
                              style={{ backgroundColor: event.color }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEvent(event);
                              }}
                              title={event.title}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="day-event-more">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Events List */}
          <div className="events-list-section glass-card">
            <div className="section-header">
              <h3>
                <IonIcon icon={calendarOutline} />
                Upcoming Events
              </h3>
              <span className="event-count">{events.length} event{events.length !== 1 ? 's' : ''} this month</span>
            </div>
            
            {events.length === 0 ? (
              <div className="empty-events">
                <div className="empty-icon">
                  <IonIcon icon={calendarOutline} />
                </div>
                <p>No events this month</p>
                <IonButton fill="outline" size="small" onClick={() => { setSelectedDate(new Date()); setEventForm({...eventForm, date: formatDate(new Date()), isPublished: true}); setSelectedEvent(null); setShowEventModal(true); }}>
                  <IonIcon icon={addCircleOutline} slot="start" />
                  Add Event
                </IonButton>
              </div>
            ) : (
              <div className="events-list">
                {events
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map((event) => (
                    <div key={event._id} className="event-card-item" onClick={() => history.push(`/admin/calendar/${event._id}`)}>
                      <div
                        className="event-color-dot"
                        style={{ backgroundColor: event.color }}
                      />
                      <div className="event-content">
                        <div className="event-title-row">
                          <h4>{event.title}</h4>
                          <IonBadge className={`status-badge ${event.isPublished ? 'published' : 'draft'}`}>
                            {event.isPublished ? (
                              <><IonIcon icon={checkmarkCircleOutline} /> Published</>
                            ) : (
                              <><IonIcon icon={warningOutline} /> Draft</>
                            )}
                          </IonBadge>
                        </div>
                        <div className="event-meta-row">
                          <span className="event-type" style={{ color: event.color }}>
                            {getEventTypeName(event.eventType)}
                          </span>
                          <span className="event-date">
                            <IonIcon icon={calendarOutline} />
                            {new Date(event.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          {event.startTime && (
                            <span className="event-time">
                              <IonIcon icon={timeOutline} />
                              {event.startTime}
                              {event.endTime && ` - ${event.endTime}`}
                            </span>
                          )}
                          {event.location && (
                            <span className="event-location">
                              <IonIcon icon={locationOutline} />
                              {event.location}
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="event-desc">{event.description}</p>
                        )}
                      </div>
                      <div className="event-card-actions">
                        <IonButton 
                          className="action-btn edit-btn" 
                          fill="clear" 
                          onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }}
                        >
                          <IonIcon icon={createOutline} />
                        </IonButton>
                        <IonButton 
                          className="action-btn delete-btn" 
                          fill="clear" 
                          onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event); }}
                        >
                          <IonIcon icon={trashOutline} />
                        </IonButton>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Event Modal */}
        <IonModal
          isOpen={showEventModal}
          onDidDismiss={() => { setShowEventModal(false); resetForm(); }}
          className="event-modal"
        >
          <div className="event-modal-content">
            <div className="modal-header">
              <div className="modal-title-section">
                <div className="modal-icon" style={{ backgroundColor: eventForm.color }}>
                  <IonIcon icon={calendarOutline} />
                </div>
                <h3>{selectedEvent ? 'Edit Event' : 'New Event'}</h3>
              </div>
              <IonButton className="close-btn" fill="clear" onClick={() => { setShowEventModal(false); resetForm(); }}>
                <IonIcon icon={closeCircleOutline} />
              </IonButton>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Event Title <span className="required">*</span></label>
                <IonInput
                  value={eventForm.title}
                  onIonInput={(e) => setEventForm({ ...eventForm, title: e.detail.value })}
                  placeholder="Enter event title"
                  className="custom-input"
                />
              </div>

              <div className="form-group">
                <label>Date <span className="required">*</span></label>
                <IonInput
                  type="date"
                  value={eventForm.date}
                  onIonInput={(e) => setEventForm({ ...eventForm, date: e.detail.value })}
                  className="custom-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <IonInput
                    type="time"
                    value={eventForm.startTime}
                    onIonInput={(e) => setEventForm({ ...eventForm, startTime: e.detail.value })}
                    className="custom-input"
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <IonInput
                    type="time"
                    value={eventForm.endTime}
                    onIonInput={(e) => setEventForm({ ...eventForm, endTime: e.detail.value })}
                    className="custom-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Event Type</label>
                  <IonSelect
                    value={eventForm.eventType}
                    onIonChange={(e) => setEventForm({
                      ...eventForm,
                      eventType: e.detail.value,
                      color: eventColors[e.detail.value]
                    })}
                    interface="popover"
                    className="custom-select"
                  >
                    {Object.keys(eventColors).map(type => (
                      <IonSelectOption key={type} value={type}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: eventColors[type]
                          }} />
                          {type}
                        </span>
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </div>
                <div className="form-group">
                  <label>Visibility</label>
                  <IonSelect
                    value={eventForm.visibility}
                    onIonChange={(e) => setEventForm({ ...eventForm, visibility: e.detail.value })}
                    interface="popover"
                    className="custom-select"
                  >
                    <IonSelectOption value="school-wide">School-wide</IonSelectOption>
                    <IonSelectOption value="class-specific">Class-specific</IonSelectOption>
                  </IonSelect>
                </div>
              </div>

              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {Object.entries(eventColors).map(([type, color]) => (
                    <div
                      key={type}
                      className={`color-option ${eventForm.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEventForm({ ...eventForm, color, eventType: type })}
                      title={type}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Location</label>
                <IonInput
                  value={eventForm.location}
                  onIonInput={(e) => setEventForm({ ...eventForm, location: e.detail.value })}
                  placeholder="e.g., Main Hall, Room 101"
                  className="custom-input"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <IonTextarea
                  value={eventForm.description}
                  onIonInput={(e) => setEventForm({ ...eventForm, description: e.detail.value })}
                  placeholder="Event details..."
                  rows={3}
                  className="custom-textarea"
                />
              </div>

              <div className="form-group publish-toggle">
                <label className="toggle-label">
                  <input 
                    type="checkbox" 
                    checked={eventForm.isPublished}
                    onChange={(e) => setEventForm({ ...eventForm, isPublished: e.target.checked })}
                  />
                  <span className="toggle-switch"></span>
                  <span className="toggle-text">
                    {eventForm.isPublished ? 'Published (Visible to everyone)' : 'Draft (Not visible)'}
                  </span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <IonButton className="cancel-btn" fill="outline" onClick={() => { setShowEventModal(false); resetForm(); }}>
                Cancel
              </IonButton>
              <IonButton 
                className="submit-btn" 
                color="primary" 
                onClick={handleSubmitEvent}
                disabled={saving}
              >
                {saving ? (
                  <><IonSpinner name="crescent" size="small" /> Saving...</>
                ) : (
                  <><IonIcon icon={checkmarkCircleOutline} slot="start" /> {selectedEvent ? 'Update' : 'Create'} Event</>
                )}
              </IonButton>
            </div>
          </div>
        </IonModal>

        {/* Delete Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={confirmDelete}
          header="Delete Event"
          subHeader="This action cannot be undone"
          message="Are you sure you want to delete this event?"
          buttons={[
            { text: 'Cancel', role: 'cancel', cssClass: 'alert-cancel' },
            { text: 'Delete', role: 'destructive', handler: confirmDelete, cssClass: 'alert-delete' }
          ]}
          cssClass="custom-alert"
        />

        {/* Toast Notification */}
        <IonToast
          isOpen={toast.show}
          onDidDismiss={() => setToast({ ...toast, show: false })}
          message={toast.message}
          duration={3000}
          color={toast.color}
          position="top"
          cssClass="custom-toast"
        />
      </IonContent>
    </IonPage>
  );
};

export default AdminCalendarScreen;