/**
 * Class Timetable Screen
 * Class login creates weekly Classwork/Homework grid
 * Publish -> only this class students can view
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonButtons, IonBackButton, IonSpinner, IonCard, IonCardHeader, IonCardTitle,
  IonCardSubtitle, IonCardContent, IonBadge, IonModal, IonInput, IonTextarea,
  IonItem, IonLabel, IonList, IonToast, IonAlert, IonRefresher, IonRefresherContent,
} from '@ionic/react';
import {
  addCircleOutline, createOutline, trashOutline, eyeOffOutline,
  closeOutline, calendarOutline, sendOutline,
} from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import { timetableAPI } from '../../services/api';
import { DAYS, blankTemplateRows, classLabel, emptyRow } from '../../utils/timetableGrid';
import TimetableGridTable from '../shared/TimetableGridTable';
import '../shared/TimetableGrid.css';

const ClassTimetableScreen = () => {
  const { currentClass } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [weekLabel, setWeekLabel] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState(blankTemplateRows);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const fetching = useRef(false);

  const showToast = useCallback((color, message) => {
    setToast({ color, message, duration: 2800 });
  }, []);

  const fetchList = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      setLoading(true);
      const res = await timetableAPI.getMyTimetables();
      if (res.success) setList(res.data || []);
    } catch (e) {
      showToast('danger', e.response?.data?.error?.message || 'Failed to load');
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // Stable handlers — do not recreate Grid inside render
  const updateCell = useCallback((rowIdx, day, field, value) => {
    setRows((prev) => {
      const next = prev.slice();
      const row = { ...next[rowIdx] };
      row[day] = { ...(row[day] || {}), [field]: value };
      next[rowIdx] = row;
      return next;
    });
  }, []);

  const updateSubject = useCallback((rowIdx, value) => {
    setRows((prev) => {
      const next = prev.slice();
      next[rowIdx] = { ...next[rowIdx], subject: value };
      return next;
    });
  }, []);

  const removeSubjectRow = useCallback((idx) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addSubjectRow = useCallback(() => {
    setRows((prev) => prev.concat([emptyRow('New Subject')]));
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setTitle((currentClass?.name || 'Class') + (currentClass?.section ? ' - ' + currentClass.section : '') + ' Weekly Plan');
    setWeekLabel('Week 1');
    setDescription('');
    setRows(blankTemplateRows());
    setIsPublished(false);
    setShowForm(true);
  };

  const openEdit = (tt) => {
    setEditingId(tt._id);
    setTitle(tt.title || '');
    setWeekLabel(tt.weekLabel || '');
    setDescription(tt.description || '');
    if (tt.rows && tt.rows.length) {
      setRows(tt.rows.map((r) => {
        const row = emptyRow(r.subject || '');
        DAYS.forEach((d) => {
          row[d] = {
            classwork: (r[d] && r[d].classwork) || '',
            homework: (r[d] && r[d].homework) || '',
          };
        });
        return row;
      }));
    } else {
      setRows(blankTemplateRows());
    }
    setIsPublished(!!tt.isPublished);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return showToast('danger', 'Title required');
    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        weekLabel: weekLabel.trim(),
        description: description.trim(),
        rows,
        isPublished: !!isPublished,
      };
      const res = editingId
        ? await timetableAPI.updateTimetable(editingId, payload)
        : await timetableAPI.createTimetable(payload);
      if (res.success) {
        showToast('success', editingId ? 'Updated' : 'Created');
        setShowForm(false);
        fetchList();
      } else {
        showToast('danger', res.error?.message || 'Save failed');
      }
    } catch (e) {
      showToast('danger', e.response?.data?.error?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (tt) => {
    try {
      const res = await timetableAPI.publishTimetable(tt._id, !tt.isPublished);
      if (res.success) {
        showToast('success', res.message || 'Updated');
        fetchList();
      }
    } catch (e) {
      showToast('danger', e.response?.data?.error?.message || 'Publish failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await timetableAPI.deleteTimetable(deleteTarget._id);
      showToast('success', 'Deleted');
      fetchList();
    } catch (e) {
      showToast('danger', 'Delete failed');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading && !list.length) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start"><IonBackButton defaultHref="/class-controller/dashboard" /></IonButtons>
            <IonTitle>Timetable</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center"><IonSpinner /><p>Loading...</p></IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/class-controller/dashboard" /></IonButtons>
          <IonTitle>Class Timetable</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={openCreate}><IonIcon icon={addCircleOutline} slot="start" />Create</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await fetchList(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <p className="tt-hint">
          Create weekly plan (Classwork / Homework grid). Publish = only your class students can view.
        </p>

        {!list.length ? (
          <div className="tt-empty">
            <IonIcon icon={calendarOutline} />
            <h3>No timetable yet</h3>
            <IonButton onClick={openCreate}>Create Weekly Timetable</IonButton>
          </div>
        ) : list.map((tt) => (
          <IonCard key={tt._id} className="tt-list-card">
            <IonCardHeader>
              <div className="tt-card-top">
                <IonCardTitle>{tt.title}</IonCardTitle>
                <IonBadge color={tt.isPublished ? 'success' : 'medium'}>{tt.isPublished ? 'Published' : 'Draft'}</IonBadge>
              </div>
              <IonCardSubtitle>{tt.weekLabel || 'Weekly plan'} · {classLabel(tt) || 'This class'}</IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="tt-actions">
                <IonButton size="small" fill="outline" onClick={() => setViewTarget(tt)}>View</IonButton>
                <IonButton size="small" fill="outline" onClick={() => openEdit(tt)}><IonIcon icon={createOutline} slot="start" />Edit</IonButton>
                <IonButton size="small" color={tt.isPublished ? 'warning' : 'success'} onClick={() => togglePublish(tt)}>
                  <IonIcon icon={tt.isPublished ? eyeOffOutline : sendOutline} slot="start" />
                  {tt.isPublished ? 'Unpublish' : 'Send to students'}
                </IonButton>
                <IonButton size="small" color="danger" fill="outline" onClick={() => setDeleteTarget(tt)}><IonIcon icon={trashOutline} slot="start" />Delete</IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        ))}
      </IonContent>

      <IonModal isOpen={showForm} onDidDismiss={() => setShowForm(false)} className="tt-form-modal">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start"><IonButton onClick={() => setShowForm(false)}><IonIcon icon={closeOutline} /></IonButton></IonButtons>
            <IonTitle>{editingId ? 'Edit' : 'Create'} Timetable</IonTitle>
            <IonButtons slot="end"><IonButton strong disabled={saving} onClick={handleSave}>{saving ? <IonSpinner name="crescent" /> : 'Save'}</IonButton></IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Title *</IonLabel>
              <IonInput value={title} onIonInput={(e) => setTitle(e.detail.value || '')} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Week label</IonLabel>
              <IonInput value={weekLabel} placeholder="Week 5" onIonInput={(e) => setWeekLabel(e.detail.value || '')} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Notes</IonLabel>
              <IonTextarea value={description} rows={2} onIonInput={(e) => setDescription(e.detail.value || '')} />
            </IonItem>
            <IonItem>
              <IonLabel>Publish to class students now</IonLabel>
              <IonButton slot="end" size="small" fill={isPublished ? 'solid' : 'outline'} onClick={() => setIsPublished((v) => !v)}>
                {isPublished ? 'Yes' : 'No'}
              </IonButton>
            </IonItem>
          </IonList>
          <div className="tt-grid-toolbar">
            <strong>Weekly grid</strong>
            <IonButton size="small" fill="outline" onClick={addSubjectRow}>Add subject</IonButton>
          </div>
          <TimetableGridTable
            dataRows={rows}
            editable
            onUpdateCell={updateCell}
            onUpdateSubject={updateSubject}
            onRemoveRow={removeSubjectRow}
          />
        </IonContent>
      </IonModal>

      <IonModal isOpen={!!viewTarget} onDidDismiss={() => setViewTarget(null)} className="tt-form-modal">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start"><IonButton onClick={() => setViewTarget(null)}><IonIcon icon={closeOutline} /></IonButton></IonButtons>
            <IonTitle>{viewTarget?.title}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {viewTarget ? (
            <>
              <p className="tt-view-meta">{viewTarget.weekLabel} · {viewTarget.isPublished ? 'Published' : 'Draft'}</p>
              <TimetableGridTable dataRows={viewTarget.rows || []} editable={false} />
            </>
          ) : null}
        </IonContent>
      </IonModal>

      <IonAlert
        isOpen={!!deleteTarget}
        onDidDismiss={() => setDeleteTarget(null)}
        header="Delete timetable?"
        message={deleteTarget ? ('Delete "' + deleteTarget.title + '"?') : ''}
        buttons={[{ text: 'Cancel', role: 'cancel' }, { text: 'Delete', role: 'destructive', handler: handleDelete }]}
      />
      {toast ? (
        <IonToast isOpen onDidDismiss={() => setToast(null)} message={toast.message} duration={toast.duration} color={toast.color} position="top" />
      ) : null}
    </IonPage>
  );
};

export default ClassTimetableScreen;
