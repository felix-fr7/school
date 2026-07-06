/**
 * Student Dashboard Screen - 2026 International Premium Edition
 * Clean, professional grid layout with luxury minimalism
 * 
 * Visual Design Principles:
 * - Clean 2-column grid with fixed dimensions
 * - No text wrapping - single line labels only
 * - Premium white cards with soft shadows
 * - Uniform vector-style icons
 * - Perfect alignment and spacing
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
import { StudentStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI } from '../../services/api';

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 12;
const CARD_WIDTH = (width - PADDING * 2 - GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * 0.85;

type NavigationProp = StackNavigationProp<StudentStackParamList, 'StudentDashboard'>;

interface DashboardProfile {
  student: {
    id: string;
    name: string;
    rollNumber: string;
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
}

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  route?: keyof StudentStackParamList;
}

const StudentDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { logout } = useAuth();
  
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardProfile = async () => {
    try {
      const response = await studentAPI.getDashboardProfile();
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
  const menuItems: MenuItem[] = [
    { id: '1', title: 'NEWS', icon: '📰', route: 'StudentNewsList' },
    { id: '2', title: 'MESSAGES', icon: '💬' },
    { id: '3', title: 'HOMEWORK', icon: '📚', route: 'StudentHomeworkList' },
    { id: '4', title: 'EXAMS', icon: '📅', route: 'StudentExamSchedules' },
    { id: '5', title: 'TOPPERS', icon: '🏆' },
    { id: '6', title: 'CONTACT', icon: '📞' },
    { id: '7', title: 'ALBUMS', icon: '📸' },
    { id: '8', title: 'VIDEOS', icon: '🎬' },
    { id: '9', title: 'LEAVES', icon: '📝' },
    { id: '10', title: 'CALENDAR', icon: '📆' },
    { id: '11', title: 'HOME VIDEOS', icon: '🏠' },
    { id: '12', title: 'GALLERY', icon: '🖼️' },
    { id: '13', title: 'CIRCULARS', icon: '📋', route: 'StudentCircularsList' },
    { id: '14', title: 'REPORT CARD', icon: '📊', route: 'StudentMarksList' },
    { id: '15', title: 'PROFILE', icon: '✏️', route: 'StudentProfile' },
    { id: '16', title: 'TIMETABLE', icon: '⏰', route: 'WeeklyLessonView' },
    { id: '17', title: 'VOICE MSG', icon: '🎤' },
    { id: '18', title: 'FEES', icon: '💰' },
    { id: '19', title: 'SETTINGS', icon: '⚙️' },
    { id: '20', title: 'LOGOUT', icon: '🚪' },
  ];

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.id === '20') {
      logout();
      return;
    }

    if (item.route) {
      navigation.navigate(item.route as any);
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
                {profile?.student.name?.charAt(0) || 'S'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.studentName} numberOfLines={1}>
                {profile?.student.name || 'Student'}
              </Text>
              <View style={styles.classContainer}>
                <Text style={styles.classText} numberOfLines={1}>
                  {profile?.student.classSection || 'Class Not Assigned'}
                </Text>
              </View>
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
  studentName: {
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

export default StudentDashboardScreen;