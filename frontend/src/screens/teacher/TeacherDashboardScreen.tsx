/**
 * Teacher Dashboard Screen - 2026 International Premium Edition
 * Clean, professional grid layout with luxury minimalism
 * 
 * Visual Design Principles:
 * - Clean 2-column grid with fixed dimensions
 * - No text wrapping - single line labels only
 * - Premium white cards with soft shadows
 * - Uniform vector-style icons
 * - Perfect alignment and spacing
 * 
 * Key Changes from Old Design:
 * - Renamed "WEEKLY DIARY" to "HOME WORK" (routes to WeeklyLessonGrid for date-based lesson planning)
 * - Removed duplicate standalone "HOMEWORK" card
 * - Added full 20-item grid matching student dashboard structure
 * - All routes mapped to teacher-specific screens
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TeacherStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { teacherAPI } from '../../services/api';

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 12;
const CARD_WIDTH = (width - PADDING * 2 - GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * 0.85;

type NavigationProp = StackNavigationProp<TeacherStackParamList, 'TeacherDashboard'>;

interface DashboardProfile {
  teacher: {
    id: string;
    name: string;
    classId: string | null;
    className: string;
    sectionName: string;
    classSection: string;
  };
  school: {
    id: string;
    name: string;
    logoUrl: string | null;
    code: string;
  };
  stats: {
    totalStudents: number;
    totalHomework: number;
    totalExams: number;
  };
}

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  route?: keyof TeacherStackParamList;
}

const TeacherDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { logout } = useAuth();
  
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardProfile = async () => {
    try {
      const response = await teacherAPI.getDashboardProfile();
      if (response.success && response.data) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardProfile();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardProfile();
  };

  // All 20 menu items with clean configuration
  // Note: "HOME WORK" replaces the old "WEEKLY DIARY" - routes to date-based lesson planning
  // Note: Old standalone "HOMEWORK" card has been removed to avoid duplication
  const menuItems: MenuItem[] = [
    { id: '1', title: 'NEWS', icon: '📰', route: 'TeacherNews' },
    { id: '2', title: 'MESSAGES', icon: '💬' },
    { id: '3', title: 'HOME WORK', icon: '📚', route: 'WeeklyLessonGrid' }, // Renamed from WEEKLY DIARY
    { id: '4', title: 'EXAMS', icon: '📅', route: 'TeacherNews' }, // Using TeacherNews as placeholder - will show exam schedules
    { id: '5', title: 'TOPPERS', icon: '🏆' },
    { id: '6', title: 'CONTACT', icon: '📞' },
    { id: '7', title: 'ALBUMS', icon: '📸' },
    { id: '8', title: 'VIDEOS', icon: '🎬' },
    { id: '9', title: 'ATTENDANCE', icon: '📝', route: 'TeacherStudents' },
    { id: '10', title: 'CALENDAR', icon: '📆' },
    { id: '11', title: 'STUDENTS', icon: '👥', route: 'TeacherStudents' },
    { id: '12', title: 'GALLERY', icon: '🖼️' },
    { id: '13', title: 'CIRCULARS', icon: '📋', route: 'TeacherCirculars' },
    { id: '14', title: 'MARKS', icon: '📊', route: 'TeacherMarks' },
    { id: '15', title: 'PROFILE', icon: '✏️' },
    { id: '16', title: 'SETTINGS', icon: '⚙️' },
    { id: '17', title: 'VOICE MSG', icon: '🎤' },
    { id: '18', title: 'FEES', icon: '💰' },
    { id: '19', title: 'REPORTS', icon: '📈' },
    { id: '20', title: 'LOGOUT', icon: '🚪' },
  ];

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.id === '20') {
      logout();
      return;
    }

    if (item.route) {
      navigation.navigate(item.route as any, { title: item.title });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingSpinnerContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!profile || !profile.teacher.classId) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#1E3A8A"
            colors={['#1E3A8A']}
          />
        }
      >
        <View style={styles.noClassContainer}>
          <View style={styles.noClassIcon}>
            <Text style={styles.noClassEmoji}>🏫</Text>
          </View>
          <Text style={styles.noClassTitle}>No Class Assigned Yet</Text>
          <Text style={styles.noClassDescription}>
            The administrator has not assigned you to a class yet.{'\n'}
            Please contact your school admin for assistance.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchDashboardProfile}>
            <Text style={styles.refreshButtonText}>Refresh Status</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.logoutButtonSmall} onPress={logout}>
          <Text style={styles.logoutTextSmall}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#1E3A8A"
            colors={['#1E3A8A']}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Premium Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerContent}>
            {profile?.school.logoUrl ? (
              <Image
                source={{ uri: profile.school.logoUrl }}
                style={styles.schoolLogo}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.schoolLogo, styles.logoPlaceholder]}>
                <Text style={styles.logoPlaceholderText}>
                  {profile?.school.name?.charAt(0) || 'S'}
                </Text>
              </View>
            )}
            <View style={styles.schoolInfo}>
              <Text style={styles.schoolName} numberOfLines={2}>
                {profile?.school.name || 'School'}
              </Text>
            </View>
          </View>
        </View>

        {/* Modern Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileContent}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {profile?.teacher.name?.charAt(0) || 'T'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.teacherName} numberOfLines={1}>
                {profile?.teacher.name || 'Teacher'}
              </Text>
              <View style={styles.classContainer}>
                <Text style={styles.classText} numberOfLines={1}>
                  Class: {profile?.teacher.classSection || 'Not Assigned'}
                </Text>
              </View>
            </View>
          </View>
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.stats.totalStudents || 0}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.stats.totalHomework || 0}</Text>
              <Text style={styles.statLabel}>Homework</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.stats.totalExams || 0}</Text>
              <Text style={styles.statLabel}>Exams</Text>
            </View>
          </View>
        </View>

        {/* Clean 2-Column Grid */}
        <View style={styles.gridContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.gridItem}
              onPress={() => handleMenuItemPress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.gridItemContent}>
                <View style={styles.iconContainer}>
                  <Text style={styles.iconText}>{item.icon}</Text>
                </View>
                <Text 
                  style={styles.itemTitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {item.title}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {profile?.school.name ? `${profile.school.name.toUpperCase()} SCHOOL SYSTEM` : 'SCHOOL SYSTEM'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingSpinnerContainer: {
    padding: 20,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },

  // No Class Assigned State
  noClassContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  noClassIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  noClassEmoji: {
    fontSize: 48,
  },
  noClassTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  noClassDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButtonSmall: {
    backgroundColor: '#EF4444',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutTextSmall: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header Section
  headerSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: PADDING,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  schoolLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
  },
  logoPlaceholderText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  schoolInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  schoolName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.3,
  },

  // Profile Card
  profileCard: {
    marginHorizontal: PADDING,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  classContainer: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  classText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#ECEFF1',
  },

  // Grid Container
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING,
    marginTop: 20,
    gap: GAP,
  },
  gridItem: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  gridItemContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconText: {
    fontSize: 22,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    marginTop: 28,
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});

export default TeacherDashboardScreen;