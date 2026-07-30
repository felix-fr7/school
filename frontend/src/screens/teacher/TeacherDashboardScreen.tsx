import React, { useState, useEffect } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonButton } from '@ionic/react';
import { schoolOutline, peopleOutline, bookOutline, calendarOutline, chevronForwardOutline } from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useHistory } from 'react-router-dom';

const TeacherDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const history = useHistory();
  const [stats, setStats] = useState({ classes: 0, students: 0, pendingHomework: 0, todayAttendance: 0 });

  useEffect(() => {
    // Fetch dashboard stats
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    // Mock data - replace with actual API call
    setStats({
      classes: 3,
      students: 120,
      pendingHomework: 5,
      todayAttendance: 85
    });
  };

  const menuItems = [
    { title: 'My Classes', icon: schoolOutline, path: '/teacher/classes', color: 'primary' },
    { title: 'Students', icon: peopleOutline, path: '/teacher/students', color: 'success' },
    { title: 'Attendance', icon: calendarOutline, path: '/teacher/attendance', color: 'warning' },
    { title: 'Homework', icon: bookOutline, path: '/teacher/homework', color: 'danger' },
  ];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Teacher Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Welcome Card */}
        <IonCard className="welcome-card">
          <IonCardContent>
            <h2>Welcome back, {user?.name || 'Teacher'}!</h2>
            <p>Manage your classes and students effectively.</p>
          </IonCardContent>
        </IonCard>

        {/* Stats Grid */}
        <IonGrid>
          <IonRow>
            <IonCol size="6">
              <IonCard className="stat-card">
                <IonCardContent>
                  <IonIcon icon={schoolOutline} size="large" color="primary" />
                  <IonCardTitle>{stats.classes}</IonCardTitle>
                  <p>Classes</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="6">
              <IonCard className="stat-card">
                <IonCardContent>
                  <IonIcon icon={peopleOutline} size="large" color="success" />
                  <IonCardTitle>{stats.students}</IonCardTitle>
                  <p>Students</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
          <IonRow>
            <IonCol size="6">
              <IonCard className="stat-card">
                <IonCardContent>
                  <IonIcon icon={bookOutline} size="large" color="danger" />
                  <IonCardTitle>{stats.pendingHomework}</IonCardTitle>
                  <p>Pending Homework</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
            <IonCol size="6">
              <IonCard className="stat-card">
                <IonCardContent>
                  <IonIcon icon={calendarOutline} size="large" color="warning" />
                  <IonCardTitle>{stats.todayAttendance}%</IonCardTitle>
                  <p>Today's Attendance</p>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>

        {/* Quick Actions */}
        <h3 className="ion-margin-top">Quick Actions</h3>
        {menuItems.map((item, index) => (
          <IonCard key={index} className="menu-item-card" onClick={() => history.push(item.path)}>
            <IonCardContent>
              <IonIcon icon={item.icon} size="large" color={item.color as any} />
              <IonCardTitle>{item.title}</IonCardTitle>
              <IonIcon icon={chevronForwardOutline} slot="end" />
            </IonCardContent>
          </IonCard>
        ))}
      </IonContent>
    </IonPage>
  );
};

export default TeacherDashboardScreen;