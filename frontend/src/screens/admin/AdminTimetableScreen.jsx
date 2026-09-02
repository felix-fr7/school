/** Admin Timetable — manage all class weekly grids (edit/delete/publish) */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  IonButtons, IonBackButton, IonSpinner, IonCard, IonCardHeader, IonCardTitle,
  IonCardSubtitle, IonCardContent, IonBadge, IonModal, IonInput, IonTextarea,
  IonItem, IonLabel, IonList, IonToast, IonAlert, IonRefresher, IonRefresherContent,
  IonSelect, IonSelectOption,
} from '@ionic/react';
import {
  createOutline, trashOutline, eyeOutline, eyeOffOutline, closeOutline,
  calendarOutline, schoolOutline, addCircleOutline,
} from 'ionicons/icons';
import { adminAPI, timetableAPI } from '../../services/api';
import { DAYS, blankTemplateRows, classLabel, emptyRow } from '../../utils/timetableGrid';
import TimetableGridTable from '../shared/TimetableGridTable';
import '../shared/TimetableGrid.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const AdminTimetableScreen = () => {
  const [list, setList] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [weekLabel, setWeekLabel] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [rows, setRows] = useState(blankTemplateRows);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const fetching = useRef(false);

  const showToast = useCallback((color, message) => {
    setToast({ color, message, duration: 2800 });
  }, []);

  const fetchAll = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      setLoading(true);
      const [ttRes, cRes] = await Promise.all([
        timetableAPI.getAdminTimetables(),
        adminAPI.getClasses(),
      ]);
      if (ttRes.success) setList(ttRes.data || []);
      if (cRes.success) {
        setClasses(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.classes || []));
      }
    } catch (e) {
      showToast('danger', e.response?.data?.error?.message || 'Failed to load');
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
    setTitle('');
    setWeekLabel('Week 1');
    setDescription('');
    setClassId('');
    setRows(blankTemplateRows());
    setIsPublished(false);
    setShowForm(true);
  };

  const openEdit = (tt) => {
    setEditingId(tt._id);
    setTitle(tt.title || '');
    setWeekLabel(tt.weekLabel || '');
    setDescription(tt.description || '');
    setClassId(tt.classId?._id || tt.classId || '');
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
    if (!classId) return showToast('danger', 'Select class');
    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        weekLabel: weekLabel.trim(),
        description: description.trim(),
        classId,
        rows,
        isPublished: !!isPublished,
      };
      const res = editingId
        ? await timetableAPI.updateTimetable(editingId, payload)
        : await timetableAPI.createTimetable(payload);
      if (res.success) {
        showToast('success', 'Saved');
        setShowForm(false);
        fetchAll();
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
        showToast('success', res.message || 'OK');
        fetchAll();
      }
    } catch (e) {
      showToast('danger', e.response?.data?.error?.message || 'Failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await timetableAPI.deleteTimetable(deleteTarget._id);
      showToast('success', 'Deleted');
      fetchAll();
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
            <IonButtons slot="start"><IonBackButton defaultHref="/admin/dashboard" /></IonButtons>
            <IonTitle>Timetables</IonTitle>
          <HomeLogoutButtons />
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
          <IonButtons slot="start"><IonBackButton defaultHref="/admin/dashboard" /></IonButtons>
          <IonTitle>All Class Timetables</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={openCreate}><IonIcon icon={addCircleOutline} slot="start" />Create</IonButton>
          </IonButtons>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await fetchAll(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>
        <p className="tt-hint">View / edit / delete / publish timetables created by any class. Students only see published ones for their own class.</p>

        {!list.length ? (
          <div className="tt-empty"><IonIcon icon={calendarOutline} /><h3>No timetables</h3></div>
        ) : list.map((tt) => (
          <IonCard key={tt._id} className="tt-list-card">
            <IonCardHeader>
              <div className="tt-card-top">
                <IonCardTitle>{tt.title}</IonCardTitle>
                <IonBadge color={tt.isPublished ? 'success' : 'medium'}>{tt.isPublished ? 'Published' : 'Draft'}</IonBadge>
              </div>
              <IonCardSubtitle>
                <IonIcon icon={schoolOutline} /> {classLabel(tt) || 'Class'} · {tt.weekLabel || 'Week'} · by {tt.createdByRole || '—'}
              </IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="tt-actions">
                <IonButton size="small" fill="outline" onClick={() => setViewTarget(tt)}>View</IonButton>
                <IonButton size="small" fill="outline" onClick={() => openEdit(tt)}><IonIcon icon={createOutline} slot="start" />Edit</IonButton>
                <IonButton size="small" color={tt.isPublished ? 'warning' : 'success'} onClick={() => togglePublish(tt)}>
                  <IonIcon icon={tt.isPublished ? eyeOffOutline : eyeOutline} slot="start" />
                  {tt.isPublished ? 'Unpublish' : 'Publish'}
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
              <IonInput value={weekLabel} onIonInput={(e) => setWeekLabel(e.detail.value || '')} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Class *</IonLabel>
              <IonSelect value={classId} interface="popover" placeholder="Select class" onIonChange={(e) => setClassId(e.detail.value)}>
                {classes.map((c) => (
                  <IonSelectOption key={c._id || c.id} value={c._id || c.id}>{c.name}{c.section ? ' - ' + c.section : ''}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Notes</IonLabel>
              <IonTextarea rows={2} value={description} onIonInput={(e) => setDescription(e.detail.value || '')} />
            </IonItem>
            <IonItem>
              <IonLabel>Published</IonLabel>
              <IonButton slot="end" size="small" fill={isPublished ? 'solid' : 'outline'} onClick={() => setIsPublished((v) => !v)}>{isPublished ? 'Yes' : 'No'}</IonButton>
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
              <p className="tt-view-meta">{classLabel(viewTarget)} · {viewTarget.weekLabel}</p>
              <TimetableGridTable dataRows={viewTarget.rows || []} editable={false} />
            </>
          ) : null}
        </IonContent>
      </IonModal>

      <IonAlert
        isOpen={!!deleteTarget}
        onDidDismiss={() => setDeleteTarget(null)}
        header="Delete?"
        message={deleteTarget ? ('Delete "' + deleteTarget.title + '"?') : ''}
        buttons={[{ text: 'Cancel', role: 'cancel' }, { text: 'Delete', role: 'destructive', handler: handleDelete }]}
      />
      {toast ? (
        <IonToast isOpen onDidDismiss={() => setToast(null)} message={toast.message} duration={toast.duration} color={toast.color} position="top" />
      ) : null}
    </IonPage>
  );
};

export default AdminTimetableScreen;
