import React from 'react';
import { IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonMenuToggle } from '@ionic/react';
import { homeOutline, peopleOutline, schoolOutline, bookOutline, newspaperOutline, documentTextOutline, calendarOutline, filmOutline, settingsOutline, logOutOutline, paperPlaneOutline, createOutline, searchOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminMenu = () => {
  const history = useHistory();
  const { logout } = useAuth();

const menuItems = [
    { title: 'Dashboard', icon: homeOutline, path: '/admin' },
    { title: 'Students', icon: peopleOutline, path: '/admin/students' },
    { title: 'Teachers', icon: peopleOutline, path: '/admin/teachers' },
    { title: 'Classes', icon: schoolOutline, path: '/admin/classes' },
    { title: 'Report Cards', icon: paperPlaneOutline, path: '/admin/report-cards' },
    { title: 'Search Report Cards', icon: searchOutline, path: '/admin/report-cards/search' },
    { title: 'Homework', icon: createOutline, path: '/admin/homework' },
    { title: 'News', icon: newspaperOutline, path: '/admin/news' },
    { title: 'Circulars', icon: documentTextOutline, path: '/admin/circulars' },
    { title: 'Calendar', icon: calendarOutline, path: '/admin/calendar' },
    { title: 'Exams', icon: schoolOutline, path: '/admin/exams' },
    { title: 'Videos', icon: filmOutline, path: '/admin/videos' },
    { title: 'Settings', icon: settingsOutline, path: '/settings' },
  ];

  return (
    <IonMenu contentId="main-content">
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>MACVEL Admin</IonTitle>
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

export default AdminMenu;