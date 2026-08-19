import React, { useState, useEffect, useRef } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonInput,
  IonTextarea,
  IonButton,
  IonSpinner,
  IonAlert,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonChip,
  IonLabel,
} from '@ionic/react';
import {
  bookOutline,
  createOutline,
  closeOutline,
  closeCircleOutline,
  sendOutline,
  schoolOutline,
  trashOutline,
  calendarOutline,
  searchOutline,
  checkmarkCircleOutline,
  timeOutline,
  personOutline,
  documentOutline,
  eyeOutline,
  eyeOffOutline,
} from 'ionicons/icons';
import { adminAPI } from '../../services/api';
import './AdminHomeworkScreen.css';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const SERVER_BASE_URL = API_BASE_URL.replace('/api', '');

const AdminHomeworkScreen = () => {
  const attachmentInputRef = useRef(null);

  // Core Data States
  const [homeworkList, setHomeworkList] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState('');

  // Form Field States
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [givenDate, setGivenDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [maxMarks, setMaxMarks] = useState(100);
  const [tags, setTags] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Editing & Modals
  const [editingHomeworkId, setEditingHomeworkId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showClassModal, setShowClassModal] = useState(false);

  // Alerts
  const [showAlert, setShowAlert] = useState(false);
  const [alertHeader, setAlertHeader] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [homeworkRes, classRes] = await Promise.all([
        adminAPI.getHomework(1, 50),
        adminAPI.getClasses(),
      ]);

      if (homeworkRes.success && homeworkRes.data) {
        setHomeworkList(homeworkRes.data || []);
      }
      if (classRes.success && classRes.data) {
        setClasses(classRes.data);
      }
    } catch (error) {
      console.error('[AdminHomework] Failed to fetch data:', error);
      showAlertMessage('Error', 'Failed to load homework data.');
    } finally {
      setLoading(false);
    }
  };

  const showAlertMessage = (header, message) => {
    setAlertHeader(header);
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachmentFiles((prev) => [...prev, ...files]);
      files.forEach((file) => {
        setAttachments((prev) => [...prev, { name: file.name, url: URL.createObjectURL(file) }]);
      });
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };

  const resetForm = () => {
    setTitle('');
    setSubject('');
    setDescription('');
    setGivenDate('');
    setDueDate('');
    setSelectedClassId('');
    setAttachments([]);
    setAttachmentFiles([]);
    setMaxMarks(100);
    setTags('');
    setIsPublished(true);
    setEditingHomeworkId(null);
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      showAlertMessage('Warning', 'Please enter homework title.');
      return;
    }
    if (!subject.trim()) {
      showAlertMessage('Warning', 'Please select a subject.');
      return;
    }
    if (!selectedClassId) {
      showAlertMessage('Warning', 'Please select a class.');
      return;
    }
    if (!dueDate) {
      showAlertMessage('Warning', 'Please select a due date.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedClass = classes.find((c) => c.id === selectedClassId);
      const homeworkData = {
        title: title.trim(),
        subject,
        classGrade: selectedClass ? `Class ${selectedClass.name}` : '',
        description: description.trim(),
        givenDate: givenDate || new Date().toISOString(),
        dueDate: new Date(dueDate).toISOString(),
        classId: selectedClassId,
        maxMarks: parseInt(maxMarks) || 100,
        tags: tags.split(',').map((t) => t.trim()).filter((t) => t),
        isPublished,
        attachments: attachments.map((a) => a.url || `/uploads/homework/${a.name}`),
      };

      const response = editingHomeworkId
        ? await adminAPI.updateHomework(editingHomeworkId, homeworkData)
        : await adminAPI.createHomework(homeworkData);

      if (response.success) {
        showAlertMessage(
          'Success',
          editingHomeworkId ? 'Homework updated successfully!' : 'Homework created successfully!'
        );
        resetForm();
        fetchData();
      }
    } catch (error) {
      console.error('[AdminHomework] Submit error:', error);
      showAlertMessage('Error', error.response?.data?.error?.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setTitle(item.title);
    setSubject(item.subject);
    setDescription(item.description || '');
    setGivenDate(item.givenDate ? new Date(item.givenDate).toISOString().split('T')[0] : '');
    setDueDate(item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '');
    setSelectedClassId(item.classId?._id || item.classId || '');
    setAttachments(item.attachments?.map((a) => ({ name: a.split('/').pop(), url: a })) || []);
    setMaxMarks(item.maxMarks || 100);
    setTags(item.tags?.join(', ') || '');
    setIsPublished(item.isPublished ?? true);
    setEditingHomeworkId(item._id || item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    try {
      const response = await adminAPI.deleteHomework(id);
      if (response.success) {
        setHomeworkList((prev) => prev.filter((item) => (item._id || item.id) !== id));
        showAlertMessage('Deleted', 'Homework removed successfully.');
      }
    } catch (error) {
      showAlertMessage('Error', 'Failed to delete homework.');
    } finally {
      setDeleteId(null);
    }
  };

  const togglePublishStatus = async (item) => {
    try {
      const response = await adminAPI.updateHomework(item._id || item.id, {
        isPublished: !item.isPublished,
      });
      if (response.success) {
        setHomeworkList((prev) =>
          prev.map((hw) =>
            (hw._id || hw.id) === (item._id || item.id)
              ? { ...hw, isPublished: !item.isPublished }
              : hw
          )
        );
        showAlertMessage('Success', `Homework ${!item.isPublished ? 'published' : 'unpublished'}.`);
      }
    } catch (error) {
      showAlertMessage('Error', 'Failed to update publish status.');
    }
  };

  const filteredHomework = homeworkList.filter((item) => {
    const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = !filterClassId || (item.classId?._id === filterClassId || item.classId === filterClassId);
    return matchesSearch && matchesClass;
  });

  const getDueDateStatus = (dueDate) => {
    if (!dueDate) return { text: 'No due date', color: 'secondary' };
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    if (due < today) return { text: 'Overdue', color: 'danger' };
    if (due.getTime() === today.getTime()) return { text: 'Due Today', color: 'warning' };
    
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return { text: `Due in ${diffDays} day(s)`, color: 'warning' };
    return { text: 'Upcoming', color: 'success' };
  };

  return (
    <IonPage>
      <IonHeader className="admin-homework-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/dashboard" />
          </IonButtons>
          <IonTitle>Homework Management</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="admin-homework-content" fullscreen>
        <div className="onebyone-layout-container">
          {/* Header Summary Banner */}
          <div className="header-summary-card">
            <div>
              <h2>📚 Homework Manager</h2>
              <p>Create, assign, and track homework for your classes</p>
            </div>
            <div className="summary-stats">
              <span className="stat-badge">{homeworkList.length} Total</span>
              <span className="stat-badge published">
                {homeworkList.filter((h) => h.isPublished).length} Published
              </span>
            </div>
          </div>

          {/* Form Section */}
          <div className="form-step-card">
            <div className="step-card-header">
              <span className="step-badge">{editingHomeworkId ? 'EDIT MODE' : 'NEW'}</span>
              <h3>{editingHomeworkId ? 'Edit Homework' : 'Create New Homework'}</h3>
            </div>

            <div className="step-form-body">
              {/* STEP 1: Title */}
              <div className="vertical-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <label>Homework Title *</label>
                  <IonInput
                    className="step-input"
                    value={title}
                    onIonInput={(e) => setTitle(e.detail.value || '')}
                    placeholder="Enter homework title (e.g., Math Chapter 5 Exercises)"
                  />
                </div>
              </div>

              {/* STEP 2: Subject & Class */}
              <div className="vertical-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <label>Subject *</label>
                  <IonSelect
                    className="step-select"
                    value={subject}
                    onIonChange={(e) => setSubject(e.detail.value)}
                    placeholder="Select subject"
                    interface="popover"
                  >
                    <IonSelectOption value="Mathematics">Mathematics</IonSelectOption>
                    <IonSelectOption value="Science">Science</IonSelectOption>
                    <IonSelectOption value="English">English</IonSelectOption>
                    <IonSelectOption value="History">History</IonSelectOption>
                    <IonSelectOption value="Geography">Geography</IonSelectOption>
                    <IonSelectOption value="Computer Science">Computer Science</IonSelectOption>
                    <IonSelectOption value="Physics">Physics</IonSelectOption>
                    <IonSelectOption value="Chemistry">Chemistry</IonSelectOption>
                    <IonSelectOption value="Biology">Biology</IonSelectOption>
                    <IonSelectOption value="Hindi">Hindi</IonSelectOption>
                    <IonSelectOption value="Tamil">Tamil</IonSelectOption>
                    <IonSelectOption value="Malayalam">Malayalam</IonSelectOption>
                    <IonSelectOption value="Other">Other</IonSelectOption>
                  </IonSelect>
                </div>
              </div>

              <div className="vertical-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <label>Target Class *</label>
                  <div className="class-selection-area">
                    {selectedClassId ? (
                      <div className="selected-class-chip">
                        <IonIcon icon={schoolOutline} />
                        <span>
                          {classes.find((c) => c.id === selectedClassId)?.name || 'Selected Class'}
                        </span>
                        <button type="button" onClick={() => setSelectedClassId('')}>
                          <IonIcon icon={closeCircleOutline} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="select-class-btn"
                        onClick={() => setShowClassModal(true)}
                      >
                        <IonIcon icon={schoolOutline} />
                        <span>Select Class</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* STEP 4: Dates */}
              <div className="vertical-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <label>Due Date *</label>
                  <div className="date-inputs-row">
                    <div className="date-field">
                      <IonIcon icon={calendarOutline} />
                      <input
                        type="date"
                        className="step-date-input"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 5: Description */}
              <div className="vertical-step">
                <div className="step-number">5</div>
                <div className="step-content">
                  <label>Description (Optional)</label>
                  <IonTextarea
                    className="step-textarea"
                    value={description}
                    onIonInput={(e) => setDescription(e.detail.value || '')}
                    placeholder="Enter homework details, page numbers, specific instructions..."
                    rows={4}
                  />
                </div>
              </div>

              {/* STEP 6: Attachments */}
              <div className="vertical-step">
                <div className="step-number">6</div>
                <div className="step-content">
                  <label>Attachments (Optional)</label>
                  <div className="upload-options-row">
                    <input
                      type="file"
                      ref={attachmentInputRef}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                      multiple
                      onChange={handleAttachmentChange}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className="upload-box-btn"
                      onClick={() => attachmentInputRef.current?.click()}
                    >
                      <IonIcon icon={documentOutline} />
                      <span>Add Files</span>
                    </button>
                  </div>

                  {attachments.length > 0 && (
                    <div className="attachments-list">
                      {attachments.map((att, index) => (
                        <div key={index} className="attachment-chip">
                          <IonIcon icon={documentOutline} />
                          <span>{att.name}</span>
                          <button type="button" onClick={() => removeAttachment(index)}>
                            <IonIcon icon={closeCircleOutline} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 7: Max Marks & Tags */}
              <div className="vertical-step">
                <div className="step-number">7</div>
                <div className="step-content">
                  <label>Max Marks</label>
                  <IonInput
                    type="number"
                    className="step-input small-input"
                    value={maxMarks}
                    onIonInput={(e) => setMaxMarks(e.detail.value || 100)}
                    min={1}
                    max={1000}
                  />
                </div>
              </div>

              <div className="vertical-step">
                <div className="step-number">8</div>
                <div className="step-content">
                  <label>Tags (comma-separated)</label>
                  <IonInput
                    className="step-input"
                    value={tags}
                    onIonInput={(e) => setTags(e.detail.value || '')}
                    placeholder="e.g., chapter5, important, revision"
                  />
                </div>
              </div>

              {/* STEP 9: Publish Status */}
              <div className="vertical-step">
                <div className="step-number">9</div>
                <div className="step-content">
                  <label>Publish Status</label>
                  <div className="publish-toggle">
                    <button
                      type="button"
                      className={`toggle-btn ${isPublished ? 'active' : ''}`}
                      onClick={() => setIsPublished(true)}
                    >
                      <IonIcon icon={eyeOutline} />
                      <span>Published (Visible to students)</span>
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${!isPublished ? 'active' : ''}`}
                      onClick={() => setIsPublished(false)}
                    >
                      <IonIcon icon={eyeOffOutline} />
                      <span>Draft (Hidden from students)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="form-action-row">
                <IonButton
                  expand="block"
                  className="submit-post-btn"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <IonSpinner name="crescent" />
                  ) : (
                    <>
                      <IonIcon slot="start" icon={sendOutline} />
                      {editingHomeworkId ? 'Update Homework' : 'Assign Homework'}
                    </>
                  )}
                </IonButton>

                {editingHomeworkId && (
                  <IonButton
                    expand="block"
                    fill="clear"
                    className="cancel-post-btn"
                    onClick={resetForm}
                  >
                    Cancel Editing
                  </IonButton>
                )}
              </div>
            </div>
          </div>

          {/* Homework List Section */}
          <div className="feed-stream-section">
            <div className="feed-header-row">
              <h3>
                <IonIcon icon={bookOutline} /> Assigned Homework
              </h3>
              <div className="filter-row">
                <div className="search-input-box">
                  <IonIcon icon={searchOutline} />
                  <input
                    type="text"
                    placeholder="Search homework..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <IonSelect
                  className="filter-select"
                  value={filterClassId}
                  onIonChange={(e) => setFilterClassId(e.detail.value)}
                  placeholder="All Classes"
                  interface="popover"
                >
                  <IonSelectOption value="">All Classes</IonSelectOption>
                  {classes.map((cls) => (
                    <IonSelectOption key={cls.id} value={cls.id}>
                      Class {cls.name} {cls.section ? `(${cls.section})` : ''}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </div>
            </div>

            {loading ? (
              <div className="loading-state-box">
                <IonSpinner name="crescent" color="primary" />
                <p>Loading homework...</p>
              </div>
            ) : filteredHomework.length === 0 ? (
              <div className="empty-state-box">
                <IonIcon icon={bookOutline} />
                <p>No homework found. Create your first homework assignment!</p>
              </div>
            ) : (
              <div className="vertical-news-stream">
                {filteredHomework.map((item) => {
                  const dueStatus = getDueDateStatus(item.dueDate);
                  const selectedClass = classes.find(
                    (c) => c.id === (item.classId?._id || item.classId)
                  );

                  return (
                    <div key={item._id || item.id} className="news-stream-card homework-card">
                      <div className="homework-card-header">
                        <span className="subject-badge">{item.subject}</span>
                        <span className={`due-status ${dueStatus.color}`}>{dueStatus.text}</span>
                        <span className={`publish-status ${item.isPublished ? 'published' : 'draft'}`}>
                          {item.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </div>

                      <h4 className="news-card-title">{item.title}</h4>

                      {item.description && (
                        <p className="news-card-body">{item.description}</p>
                      )}

                      <div className="homework-meta-row">
                        <span className="meta-item">
                          <IonIcon icon={schoolOutline} />
                          {selectedClass ? `Class ${selectedClass.name} ${selectedClass.section ? `(${selectedClass.section})` : ''}` : 'No class'}
                        </span>
                        <span className="meta-item">
                          <IonIcon icon={calendarOutline} />
                          Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'}
                        </span>
                        <span className="meta-item">
                          <IonIcon icon={personOutline} />
                          {item.teacherDoc?.name || 'Admin'}
                        </span>
                        {item.maxMarks && (
                          <span className="meta-item">
                            <IonIcon icon={documentOutline} />
                            {item.maxMarks} marks
                          </span>
                        )}
                      </div>

                      {item.attachments && item.attachments.length > 0 && (
                        <div className="news-attachments">
                          {item.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.startsWith('http') ? att : `${SERVER_BASE_URL}${att}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="chip pdf-chip"
                            >
                              <IonIcon icon={documentOutline} />
                              {att.split('/').pop()}
                            </a>
                          ))}
                        </div>
                      )}

                      {item.tags && item.tags.length > 0 && (
                        <div className="tags-row">
                          {item.tags.map((tag, idx) => (
                            <IonChip key={idx} className="tag-chip">
                              <IonLabel>#{tag}</IonLabel>
                            </IonChip>
                          ))}
                        </div>
                      )}

                      <div className="news-card-actions">
                        <button
                          type="button"
                          className="btn-action toggle-publish"
                          onClick={() => togglePublishStatus(item)}
                          title={item.isPublished ? 'Unpublish' : 'Publish'}
                        >
                          <IonIcon icon={item.isPublished ? eyeOffOutline : eyeOutline} />
                        </button>
                        <button
                          type="button"
                          className="btn-action edit"
                          onClick={() => handleEdit(item)}
                        >
                          <IonIcon icon={createOutline} /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn-action delete"
                          onClick={() => setDeleteId(item._id || item.id)}
                        >
                          <IonIcon icon={trashOutline} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Class Selection Modal */}
        <IonModal
          isOpen={showClassModal}
          onDidDismiss={() => setShowClassModal(false)}
          className="class-selector-modal"
        >
          <div className="modal-inner-content">
            <div className="modal-header">
              <h4>Select Target Class</h4>
              <button type="button" onClick={() => setShowClassModal(false)}>
                <IonIcon icon={closeOutline} />
              </button>
            </div>
            <div className="modal-class-list">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className={`class-select-tile ${selectedClassId === cls.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    setShowClassModal(false);
                  }}
                >
                  <IonIcon
                    icon={selectedClassId === cls.id ? checkmarkCircleOutline : schoolOutline}
                    className="tile-icon"
                  />
                  <span>
                    Class {cls.name} {cls.section ? `(${cls.section})` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </IonModal>

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={!!deleteId}
          onDidDismiss={() => setDeleteId(null)}
          header="Delete Homework"
          message="Are you sure you want to permanently delete this homework assignment? This action cannot be undone."
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: () => deleteId && handleDelete(deleteId),
            },
          ]}
          cssClass="admin-alert"
        />

        {/* Global Alert */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => {
            setShowAlert(false);
            if (alertHeader === 'Success' || alertHeader === 'Deleted') {
              // Optionally reset form after success
            }
          }}
          header={alertHeader}
          message={alertMessage}
          buttons={['OK']}
          cssClass="admin-alert"
          backdropDismiss={false}
        />
      </IonContent>
    </IonPage>
  );
};

export default AdminHomeworkScreen;