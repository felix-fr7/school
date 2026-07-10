/**
 * Class Controller Dashboard Screen
 * Management dashboard for Class ID (CLS-X) login users
 * Full control over their specific class only
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ClassControllerStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { classControllerAPI } from '../../services/api';

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 12;
const CARD_WIDTH = (width - PADDING * 2 - GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * 0.85;

type NavigationProp = StackNavigationProp<ClassControllerStackParamList, 'ClassControllerDashboard'>;

interface DashboardData {
  class: {
    id: string;
    classCode: string;
    name: string;
    section: string;
    teacher?: {
      name: string;
      email: string;
    } | null;
  };
  stats: {
    totalStudents: number;
    totalHomework: number;
    upcomingExams: number;
    attendanceRate: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    createdAt: string;
  }>;
}

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route: keyof ClassControllerStackParamList;
  badge?: number;
}

const ClassControllerDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { currentClass, logout } = useAuth();
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await classControllerAPI.getDashboard();
      if (response.success && response.data) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Error fetching class controller dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading class dashboard...</Text>
      </View>
    );
  }

  // Menu items for class management
  const menuItems: MenuItem[] = [
    {
      id: '1',
      title: 'Students',
      subtitle: `${dashboardData?.stats.totalStudents ?? 0} students`,
      icon: '👥',
      color: '#4CAF50',
      route: 'ClassStudentsList',
    },
    {
      id: '2',
      title: 'Homework',
      subtitle: `${dashboardData?.stats.totalHomework ?? 0} assigned`,
      icon: '📚',
      color: '#2196F3',
      route: 'ClassHomeworkList',
    },
    {
      id: '3',
      title: 'Attendance',
      subtitle: `${dashboardData?.stats.attendanceRate ?? 0}% rate`,
      icon: '✅',
      color: '#FF9800',
      route: 'ClassAttendanceList',
    },
    {
      id: '4',
      title: 'Exams',
      subtitle: `${dashboardData?.stats.upcomingExams ?? 0} upcoming`,
      icon: '📅',
      color: '#9C27B0',
      route: 'ClassExamSchedulesList',
    },
    {
      id: '5',
      title: 'Circulars',
      subtitle: 'Class notices',
      icon: '📋',
      color: '#00BCD4',
      route: 'ClassCircularsList',
    },
    {
      id: '6',
      title: 'Add Student',
      subtitle: 'New enrollment',
      icon: '➕',
      color: '#E91E63',
      route: 'ClassAddStudent',
    },
    {
      id: '7',
      title: 'Create Homework',
      subtitle: 'Assign new',
      icon: '✍️',
      color: '#795548',
      route: 'ClassCreateHomework',
    },
    {
      id: '8',
      title: 'Profile',
      subtitle: 'Class settings',
      icon: '⚙️',
      color: '#607D8B',
      route: 'ClassProfile',
    },
  ];

  const handleMenuItemPress = (route: keyof ClassControllerStackParamList) => {
    navigation.navigate(route as any, { classId: currentClass?.id } as any);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#FF6B35"
            colors={['#FF6B35']}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerContent}>
            <View style={styles.classCodeBadge}>
              <Text style={styles.classCodeText}>
                {dashboardData?.class.classCode || currentClass?.classCode || 'CLS-X'}
              </Text>
            </View>
            <View style={styles.classInfo}>
              <Text style={styles.className}>
                {dashboardData?.class.name || currentClass?.name || 'Class'}
              </Text>
              {dashboardData?.class.section && (
                <Text style={styles.classSection}>
                  Section: {dashboardData.class.section}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{dashboardData?.stats.totalStudents ?? 0}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{dashboardData?.stats.totalHomework ?? 0}</Text>
            <Text style={styles.statLabel}>Homework</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{dashboardData?.stats.upcomingExams ?? 0}</Text>
            <Text style={styles.statLabel}>Exams</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{dashboardData?.stats.attendanceRate ?? 0}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
        </View>

        {/* Class ID Display */}
        <View style={styles.classIdCard}>
          <Text style={styles.classIdLabel}>Class Login ID</Text>
          <Text style={styles.classIdValue}>
            {dashboardData?.class.classCode || currentClass?.classCode || 'Not available'}
          </Text>
          <Text style={styles.classIdNote}>
            Share this ID with students for class access
          </Text>
        </View>

        {/* Management Menu Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Class Management</Text>
          <View style={styles.gridContainer}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.gridItem, { borderLeftColor: item.color }]}
                onPress={() => handleMenuItemPress(item.route)}
                activeOpacity={0.7}
              >
                <View style={styles.gridItemContent}>
                  <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                    <Text style={styles.iconText}>{item.icon}</Text>
                  </View>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                  {item.badge !== undefined && item.badge > 0 && (
                    <View style={[styles.badge, { backgroundColor: item.color }]}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Class Controller Dashboard</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF5F0',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF5F0',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },

  // Header Section
  headerSection: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: PADDING,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classCodeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  classCodeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  classInfo: {
    flex: 1,
    marginLeft: 16,
  },
  className: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  classSection: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING,
    marginTop: 16,
    gap: GAP,
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FF6B35',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },

  // Class ID Card
  classIdCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: PADDING,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  classIdLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  classIdValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FF6B35',
    letterSpacing: 2,
    marginVertical: 8,
  },
  classIdNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },

  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: PADDING,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },

  // Grid Container
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  gridItem: {
    width: CARD_WIDTH,
    minHeight: CARD_HEIGHT * 1.1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  gridItemContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 24,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Logout Button
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: PADDING,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  logoutIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B35',
  },

  // Footer
  footer: {
    marginTop: 28,
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '400',
  },
});

export default ClassControllerDashboardScreen;