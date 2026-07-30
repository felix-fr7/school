import React from 'react';
import { IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonMenuToggle } from '@ionic/react';
import { homeOutline, schoolOutline, peopleOutline, calendarOutline, bookOutline, settingsOutline, logOutOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const TeacherMenu: React.FC = () => {
  const history = useHistory();
  const { logout } = useAuth();

  const menuItems = [
    { title: 'Dashboard', icon: homeOutline, path: '/teacher' },
    { title: 'My Classes', icon: schoolOutline, path: '/teacher/classes' },
    { title: 'Students', icon: peopleOutline, path: '/teacher/students' },
    { title: 'Attendance', icon: calendarOutline, path: '/teacher/attendance' },
    { title: 'Homework', icon: bookOutline, path: '/teacher/homework' },
    { title: 'Settings', icon: settingsOutline, path: '/settings' },
  ];

  return (
    <IonMenu contentId="main-content">
      <IonHeader>
        <IonToolbar color="success">
          <IonTitle>Teacher Portal</IonTitle>
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

export default TeacherMenu;