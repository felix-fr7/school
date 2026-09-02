/** Student — view-only published weekly timetable for their class */
import React, { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonSpinner, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonIcon, IonRefresher, IonRefresherContent, IonBadge,
} from '@ionic/react';
import { calendarOutline, schoolOutline } from 'ionicons/icons';
import { timetableAPI } from '../../services/api';
import { DAYS, classLabel } from '../../utils/timetableGrid';
import '../shared/TimetableGrid.css';
import HomeLogoutButtons from '../../components/HomeLogoutButtons';

const StudentTimetableScreen = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      let res;
      try { res = await timetableAPI.getStudentTimetable(); }
      catch (e) { res = await timetableAPI.getMyTimetables(); }
      if (res.success) setList(res.data || []);
      else { setList([]); setError(res.error?.message || 'Failed'); }
    } catch (e) {
      setList([]);
      setError(e.response?.data?.error?.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const Grid = ({ rows }) => (
    <div className="tt-grid-wrap">
      <table className="tt-grid-table">
        <thead>
          <tr>
            <th className="tt-sub-col" rowSpan={2}>Subjects</th>
            {DAYS.map((d) => <th key={d} colSpan={2} className="tt-day-head">{d}</th>)}
          </tr>
          <tr>
            {DAYS.map((d) => (
              <React.Fragment key={d}>
                <th className="tt-cw">Classwork</th>
                <th className="tt-hw">Homework</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((row, ri) => (
            <tr key={ri}>
              <td className="tt-sub-cell">{row.subject}</td>
              {DAYS.map((d) => (
                <React.Fragment key={d}>
                  <td className="tt-cell tt-cw-cell">{row[d]?.classwork || ''}</td>
                  <td className="tt-cell tt-hw-cell">{row[d]?.homework || ''}</td>
                </React.Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <IonPage>
        <IonHeader><IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/student/dashboard" /></IonButtons>
          <IonTitle>Timetable</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar></IonHeader>
        <IonContent className="ion-padding ion-text-center"><IonSpinner /><p>Loading...</p></IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/student/dashboard" /></IonButtons>
          <IonTitle>Timetable</IonTitle>
        <HomeLogoutButtons />
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await load(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {error && <p className="tt-hint" style={{ color: '#dc2626' }}>{error}</p>}
        {!list.length ? (
          <div className="tt-empty">
            <IonIcon icon={calendarOutline} />
            <h3>No timetable yet</h3>
            <p>When your class publishes the weekly plan, it will appear here.</p>
          </div>
        ) : list.map((tt) => (
          <IonCard key={tt._id} className="tt-list-card">
            <IonCardHeader>
              <IonCardTitle>{tt.title}</IonCardTitle>
              <IonCardSubtitle>
                {classLabel(tt) && (<><IonIcon icon={schoolOutline} /> {classLabel(tt)} · </>)}{tt.weekLabel || ''}
                <IonBadge color="success" style={{ marginLeft: 8 }}>Published</IonBadge>
              </IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>
              {tt.description && <p className="tt-hint">{tt.description}</p>}
              <Grid rows={tt.rows} />
            </IonCardContent>
          </IonCard>
        ))}
      </IonContent>
    </IonPage>
  );
};

export default StudentTimetableScreen;
