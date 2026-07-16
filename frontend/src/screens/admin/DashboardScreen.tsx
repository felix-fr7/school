/**
 * Admin Dashboard Screen (Ionic React Version)
 * Main dashboard for School Admin
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonBadge,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import {
  bookOutline,
  peopleOutline,
  personOutline,
  documentTextOutline,
  statsChartOutline,
  newspaperOutline,
  clipboardOutline,
  calendarOutline,
  logOutOutline,
  refreshOutline,
} from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../services/api';
import './DashboardScreen.css';

interface MenuItem {
  id: string;
  title: string;
  icon: any;
  route: string;
  count?: number;
}

const AdminDashboardScreen: React.FC = () => {
  const history = useHistory();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalHomework: 0,
    totalNews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [classesRes, studentsRes, homeworkRes, newsRes] = await Promise.all([
        adminAPI.getClasses(),
        adminAPI.getStudents(1, 1),
        adminAPI.getHomework(1, 1),
        adminAPI.getNews(1, 1),
      ]);

      setStats({
        totalStudents: studentsRes.success ? studentsRes.data?.pagination?.total || 0 : 0,
        totalClasses: classesRes.success ? classesRes.data?.length || 0 : 0,
        totalHomework: homeworkRes.success ? homeworkRes.data?.pagination?.total || 0 : 0,
        totalNews: newsRes.success ? newsRes.data?.pagination?.total || 0 : 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    setRefreshing(true);
    await fetchDashboardData();
    event.detail.complete();
  };

  const handleLogout = async () => {
    await logout();
    history.push('/login');
  };

  const menuItems: MenuItem[] = [
    { id: '1', title: 'Classes', icon: bookOutline, route: '/admin/classes', count: stats.totalClasses },
    { id: '2', title: 'Teachers', icon: personOutline, route: '/admin/teachers' },
    { id: '3', title: 'Students', icon: peopleOutline, route: '/admin/students', count: stats.totalStudents },
    { id: '4', title: 'Homework', icon: documentTextOutline, route: '/admin/homework', count: stats.totalHomework },
    { id: '5', title: 'Marks', icon: statsChartOutline, route: '/admin/marks' },
    { id: '6', title: 'News', icon: newspaperOutline, route: '/admin/admin-news', count: stats.totalNews },
    { id: '7', title: 'Circulars', icon: clipboardOutline, route: '/admin/admin-circulars' },
    { id: '8', title: 'Exams', icon: calendarOutline, route: '/admin/admin-exams' },
  ];

  if (loading) {
    return (
      <IonPage>
        <IonContent className="admin-dashboard-loading ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Admin Dashboard</IonTitle>
          <IonButton slot="end" fill="clear" onClick={handleLogout}>
            <IonIcon icon={logOutOutline} slot="icon-only" />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="admin-dashboard">
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} refreshingSpinner="crescent" />
        </IonRefresher>

        {/* Header */}
        <div className="dashboard-header">
          <h2 className="welcome-text">Welcome, {user?.name}</h2>
          <p className="role-text">School Administrator</p>
        </div>

        {/* Menu Grid */}
        <div className="menu-grid">
          {menuItems.map((item) => (
            <IonCard
              key={item.id}
              className="menu-item"
              onClick={() => history.push(item.route)}
            >
              <IonCardContent>
                <div className="menu-icon">
                  <IonIcon icon={item.icon} />
                </div>
                <h3 className="menu-title">{item.title}</h3>
                {item.count !== undefined && item.count > 0 && (
                  <IonBadge color="primary" className="menu-badge">
                    {item.count}
                  </IonBadge>
                )}
              </IonCardContent>
            </IonCard>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboardScreen;