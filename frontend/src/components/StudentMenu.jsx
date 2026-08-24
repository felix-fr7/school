import React from 'react';
import { IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonMenuToggle } from '@ionic/react';
import { homeOutline, bookOutline, calendarOutline, timeOutline, statsChartOutline, documentTextOutline, documentOutline, personOutline, logOutOutline, imagesOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const StudentMenu = () => {
  const history = useHistory();
  const { logout } = useAuth();

  const menuItems = [
    { title: 'Dashboard', icon: homeOutline, path: '/student' },
    { title: 'Homework', icon: bookOutline, path: '/student/homework' },
    { title: 'Exams', icon: calendarOutline, path: '/student/exams' },
    { title: 'Timetable', icon: timeOutline, path: '/student/timetable' },

    { title: 'Marks', icon: statsChartOutline, path: '/student/marks' },
    { title: 'Report Cards', icon: documentOutline, path: '/student/report-cards' },
    { title: 'Leave', icon: documentTextOutline, path: '/student/leave' },
    { title: 'Profile', icon: personOutline, path: '/student/profile' },
    { title: 'Albums', icon: imagesOutline, path: '/albums' },
  ];

  return (
    <IonMenu contentId="main-content">
      <IonHeader>
        <IonToolbar color="tertiary">
          <IonTitle>Student Portal</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {menuItems.map((item, index) => (
            <IonMenuToggle key={index} autoHide={false}>
              <IonItem
                routerLink={item.path}
                routerDirection="none"
                lines="none"
                detail={false}
                className="menu-item"
              >
                <IonIcon icon={item.icon} slot="start" />
                <IonLabel>{item.title}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          ))}
        </IonList>

        <IonList>
          <IonMenuToggle autoHide={false}>
            <IonItem
              button
              lines="none"
              detail={false}
              onClick={() => { logout(); history.push('/login'); }}
              className="menu-item"
            >
              <IonIcon icon={logOutOutline} slot="start" />
              <IonLabel>Logout</IonLabel>
            </IonItem>
          </IonMenuToggle>
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default StudentMenu;