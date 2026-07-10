/**
 * Class Profile Screen
 * View and manage class profile and settings
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ClassControllerStackParamList } from '../../types';
import { classControllerAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

type NavigationProp = StackNavigationProp<ClassControllerStackParamList, 'ClassProfile'>;

interface ClassProfile {
  id: string;
  classCode: string;
  name: string;
  section: string;
  teacher?: {
    name: string;
    email: string;
  } | null;
}

const ClassProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { currentClass, logout } = useAuth();
  
  const [profile, setProfile] = useState<ClassProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await classControllerAPI.getDashboard();
      
      if (response.success && response.data) {
        setProfile(response.data.class);
      }
    } catch (error) {
      console.error('Error fetching class profile:', error);
      Alert.alert('Error', 'Failed to load class profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
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

  const handleResetPassword = () => {
    Alert.alert(
      'Reset Class Password',
      'Are you sure you want to reset the class password? This will set it back to the default password.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive', 
          onPress: () => {
            // TODO: Implement password reset
            Alert.alert('Info', 'Password reset feature coming soon');
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading profile...</Text>
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
            tintColor="#FF6B35"
            colors={['#FF6B35']}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with Class Code */}
        <View style={styles.headerCard}>
          <View style={styles.classCodeContainer}>
            <Text style={styles.classCodeLabel}>Class ID</Text>
            <Text style={styles.classCodeValue}>
              {profile?.classCode || currentClass?.classCode || 'N/A'}
            </Text>
          </View>
          <View style={styles.classInfo}>
            <Text style={styles.className}>
              {profile?.name || currentClass?.name || 'Class'}
            </Text>
            {profile?.section && (
              <Text style={styles.classSection}>
                Section: {profile.section}
              </Text>
            )}
          </View>
        </View>

        {/* Teacher Info */}
        {profile?.teacher && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Class Teacher</Text>
            <View style={styles.teacherInfo}>
              <View style={styles.teacherAvatar}>
                <Text style={styles.teacherAvatarText}>
                  {profile.teacher.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.teacherDetails}>
                <Text style={styles.teacherName}>{profile.teacher.name}</Text>
                <Text style={styles.teacherEmail}>{profile.teacher.email}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.infoCardTitle}>Class Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>CLS-{(profile?.id || '').slice(-4).toUpperCase()}</Text>
              <Text style={styles.statLabel}>Class Code</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{new Date().getFullYear()}</Text>
              <Text style={styles.statLabel}>Academic Year</Text>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsCard}>
          <Text style={styles.infoCardTitle}>Settings</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleResetPassword}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconContainer}>
              <Text style={styles.settingIcon}>🔑</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Reset Password</Text>
              <Text style={styles.settingSubtitle}>
                Reset class login password
              </Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Alert.alert('Info', 'Export feature coming soon')}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconContainer}>
              <Text style={styles.settingIcon}>📥</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Export Data</Text>
              <Text style={styles.settingSubtitle}>
                Download class data as CSV
              </Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Alert.alert('Info', 'Help feature coming soon')}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconContainer}>
              <Text style={styles.settingIcon}>❓</Text>
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Help & Support</Text>
              <Text style={styles.settingSubtitle}>
                Get help with using the app
              </Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>Class Controller</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          <Text style={styles.aboutCopyright}>
            © 2026 School Management System
          </Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 40,
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
  headerCard: {
    backgroundColor: '#FF6B35',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  classCodeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  classCodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  classCodeValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  classInfo: {
    alignItems: 'center',
  },
  className: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  classSection: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  teacherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teacherAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  teacherAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  teacherDetails: {
    flex: 1,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  teacherEmail: {
    fontSize: 13,
    color: '#666',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#FFF5F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6B35',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIcon: {
    fontSize: 20,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  settingArrow: {
    fontSize: 24,
    color: '#CCC',
    fontWeight: '300',
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  aboutVersion: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  aboutCopyright: {
    fontSize: 11,
    color: '#999',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F44336',
    marginTop: 8,
  },
  logoutIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
});

export default ClassProfileScreen;