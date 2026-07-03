/**
 * Premium Student Dashboard Screen
 * World-class 2-column Grid Card Layout for mobile devices
 * Features touchable interactive menu cards with distinct iconography and badge counters
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StudentStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI, studentAPIExtended } from '../../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with 24px padding on each side

type NavigationProp = StackNavigationProp<StudentStackParamList, 'StudentDashboard'>;

interface DashboardStats {
  totalHomework: number;
  totalMarks: number;
  totalNews: number;
  totalCirculars: number;
  upcomingExams: number;
}

interface AttendanceStats {
  overall: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    excusedDays: number;
    percentage: number;
  };
  last30Days: {
    totalDays: number;
    presentDays: number;
    percentage: number;
  };
}

interface FeeData {
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  dueDate?: string;
}

const StudentDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalHomework: 0,
    totalMarks: 0,
    totalNews: 0,
    totalCirculars: 0,
    upcomingExams: 0,
  });
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [feeData, setFeeData] = useState<FeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // Fetch main dashboard stats
      const dashboardResponse = await studentAPI.getDashboard();
      if (dashboardResponse.success && dashboardResponse.data) {
        setStats(dashboardResponse.data.stats);
      }

      // Fetch attendance stats
      try {
        const attendanceResponse = await studentAPIExtended.getAttendanceStats();
        if (attendanceResponse.success && attendanceResponse.data) {
          setAttendanceStats(attendanceResponse.data);
        }
      } catch (attError) {
        console.log('Attendance stats not available:', attError);
      }

      // Fetch fee data
      try {
        const feeResponse = await studentAPIExtended.getFees();
        if (feeResponse.success && feeResponse.data) {
          setFeeData(feeResponse.data);
        }
      } catch (feeError) {
        console.log('Fee data not available:', feeError);
      }
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1565c0" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  // Menu items configuration for the 2-column grid
  const menuItems = [
    {
      id: 'StudentHomeworkList',
      title: 'HOMEWORK',
      subtitle: 'Assignments',
      icon: '📚',
      count: stats.totalHomework,
      gradient: ['#FF6B6B', '#EE5A24'],
      route: 'StudentHomeworkList',
    },
    {
      id: 'StudentExamSchedules',
      title: 'EXAMS',
      subtitle: 'Schedule',
      icon: '📊',
      count: stats.upcomingExams,
      gradient: ['#4ECDC4', '#44BD9E'],
      route: 'StudentExamSchedules',
    },
    {
      id: 'StudentMarksList',
      title: 'RESULTS',
      subtitle: 'My Marks',
      icon: '🏆',
      count: stats.totalMarks,
      gradient: ['#A29BFE', '#6C5CE7'],
      route: 'StudentMarksList',
    },
    {
      id: 'StudentNewsList',
      title: 'NEWS',
      subtitle: 'Circulars',
      icon: '📰',
      count: stats.totalNews + stats.totalCirculars,
      gradient: ['#FD79A8', '#E84393'],
      route: 'StudentNewsList',
    },
  ];

  const getFeeStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID': return '#00B894';
      case 'PARTIAL': return '#FDCB6E';
      case 'UNPAID': return '#E17055';
      case 'WAIVED': return '#00CEC9';
      default: return '#636E72';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#1565c0"
            colors={['#1565c0']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.name || 'Student'}</Text>
              <View style={styles.badgeContainer}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>STUDENT</Text>
                </View>
                {user?.studentId && (
                  <View style={styles.idBadge}>
                    <Text style={styles.idBadgeText}>ID: {user.studentId}</Text>
                  </View>
                )}
              </View>
              {user?.class && (
                <Text style={styles.classText}>
                  {user.class.name}{user.class.section ? ` - Section ${user.class.section}` : ''}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.logoutButtonSmall} onPress={logout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* School Info Card */}
        {user?.tenant && (
          <View style={styles.schoolCard}>
            <View style={styles.schoolCardHeader}>
              <Text style={styles.schoolName}>{user.tenant.name}</Text>
              <View style={styles.schoolCodeBadge}>
                <Text style={styles.schoolCodeText}>{user.tenant.code}</Text>
              </View>
            </View>
            <Text style={styles.schoolCodeLabel}>School Code</Text>
          </View>
        )}

        {/* Quick Stats Row */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatNumber}>{stats.totalHomework}</Text>
            <Text style={styles.quickStatLabel}>Homework</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatNumber}>{stats.upcomingExams}</Text>
            <Text style={styles.quickStatLabel}>Upcoming Exams</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatNumber}>{stats.totalMarks}</Text>
            <Text style={styles.quickStatLabel}>Marks</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatNumber}>{stats.totalNews + stats.totalCirculars}</Text>
            <Text style={styles.quickStatLabel}>Updates</Text>
          </View>
        </View>

        {/* Main Grid Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuCard, { backgroundColor: item.gradient[0] }]}
                onPress={() => navigation.navigate(item.route as any)}
                activeOpacity={0.85}
              >
                <View style={styles.menuCardContent}>
                  <View style={styles.menuIconContainer}>
                    <Text style={styles.menuIcon}>{item.icon}</Text>
                    {item.count > 0 && (
                      <View style={styles.menuBadge}>
                        <Text style={styles.menuBadgeText}>{item.count}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Attendance Stats Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Tracker</Text>
          <View style={styles.attendanceCard}>
            {attendanceStats ? (
              <>
                <View style={styles.attendanceHeader}>
                  <Text style={styles.attendanceTitle}>Overall Attendance</Text>
                  <View style={[
                    styles.attendancePercentageBadge,
                    { backgroundColor: attendanceStats.overall.percentage >= 75 ? '#00B894' : '#E17055' }
                  ]}>
                    <Text style={styles.attendancePercentageText}>
                      {attendanceStats.overall.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${attendanceStats.overall.percentage}%`,
                        backgroundColor: attendanceStats.overall.percentage >= 75 ? '#00B894' : '#E17055'
                      }
                    ]}
                  />
                </View>
                
                <View style={styles.attendanceDetails}>
                  <View style={styles.attendanceDetailItem}>
                    <Text style={styles.attendanceDetailLabel}>Present</Text>
                    <Text style={styles.attendanceDetailValue}>
                      {attendanceStats.overall.presentDays} days
                    </Text>
                  </View>
                  <View style={styles.attendanceDetailItem}>
                    <Text style={styles.attendanceDetailLabel}>Absent</Text>
                    <Text style={[styles.attendanceDetailValue, { color: '#E17055' }]}>
                      {attendanceStats.overall.absentDays} days
                    </Text>
                  </View>
                  <View style={styles.attendanceDetailItem}>
                    <Text style={styles.attendanceDetailLabel}>Total</Text>
                    <Text style={styles.attendanceDetailValue}>
                      {attendanceStats.overall.totalDays} days
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataIcon}>📅</Text>
                <Text style={styles.noDataText}>Attendance data not available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Fee Ledger Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fee Ledger</Text>
          <View style={styles.feeCard}>
            {feeData ? (
              <>
                <View style={styles.feeHeader}>
                  <Text style={styles.feeTitle}>Fee Summary</Text>
                  <View style={[styles.feeStatusBadge, { backgroundColor: getFeeStatusColor(feeData.status) }]}>
                    <Text style={styles.feeStatusText}>{feeData.status}</Text>
                  </View>
                </View>
                
                <View style={styles.feeDetails}>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Total Amount</Text>
                    <Text style={styles.feeValue}>{formatCurrency(feeData.totalAmount)}</Text>
                  </View>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Paid Amount</Text>
                    <Text style={[styles.feeValue, { color: '#00B894' }]}>
                      {formatCurrency(feeData.paidAmount)}
                    </Text>
                  </View>
                  <View style={[styles.feeRow, styles.feeRowHighlight]}>
                    <Text style={styles.feeLabelBold}>Outstanding Balance</Text>
                    <Text style={[
                      styles.feeValueBold, 
                      { color: feeData.balanceAmount > 0 ? '#E17055' : '#00B894' }
                    ]}>
                      {formatCurrency(feeData.balanceAmount)}
                    </Text>
                  </View>
                </View>
                
                {feeData.dueDate && (
                  <View style={styles.feeDueDate}>
                    <Text style={styles.feeDueDateLabel}>Due Date:</Text>
                    <Text style={styles.feeDueDateValue}>
                      {new Date(feeData.dueDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataIcon}>💳</Text>
                <Text style={styles.noDataText}>Fee data not available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More Options</Text>
          <View style={styles.moreOptionsRow}>
            <TouchableOpacity
              style={styles.moreOptionButton}
              onPress={() => navigation.navigate('StudentProfile')}
              activeOpacity={0.85}
            >
              <Text style={styles.moreOptionIcon}>👤</Text>
              <Text style={styles.moreOptionText}>My Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>School Management System v2.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  
  // Header Styles
  header: {
    backgroundColor: '#1565c0',
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  idBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  idBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  classText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 6,
    fontWeight: '500',
  },
  logoutButtonSmall: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // School Card
  schoolCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -10,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  schoolCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  schoolCodeBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  schoolCodeText: {
    fontSize: 11,
    color: '#1565c0',
    fontWeight: '600',
  },
  schoolCodeLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },

  // Quick Stats Row
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickStatNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1565c0',
  },
  quickStatLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },

  // Section Styles
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Menu Grid
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  menuCard: {
    width: CARD_WIDTH,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  menuCardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  menuIconContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  menuIcon: {
    fontSize: 36,
  },
  menuBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  menuBadgeText: {
    color: '#E17055',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  menuSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Attendance Card
  attendanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  attendancePercentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  attendancePercentageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  attendanceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  attendanceDetailItem: {
    alignItems: 'center',
  },
  attendanceDetailLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  attendanceDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  // Fee Card
  feeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  feeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  feeStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  feeStatusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  feeDetails: {
    gap: 12,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  feeRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    marginTop: 4,
  },
  feeLabel: {
    fontSize: 13,
    color: '#666',
  },
  feeLabelBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  feeValueBold: {
    fontSize: 16,
    fontWeight: '700',
  },
  feeDueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  feeDueDateLabel: {
    fontSize: 12,
    color: '#999',
    marginRight: 6,
  },
  feeDueDateValue: {
    fontSize: 12,
    color: '#E17055',
    fontWeight: '600',
  },

  // No Data Container
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDataIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },

  // More Options
  moreOptionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  moreOptionButton: {
    flex: 1,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  moreOptionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  moreOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  // Footer
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
});

export default StudentDashboardScreen;