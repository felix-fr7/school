/**
 * Class Exam Schedules List Screen
 * View and manage exam schedules for the class
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ClassControllerStackParamList } from '../../types';
import { classControllerAPI } from '../../services/api';
import { ExamSchedule } from '../../types';

type NavigationProp = StackNavigationProp<ClassControllerStackParamList, 'ClassExamSchedulesList'>;
type RoutePropType = RouteProp<ClassControllerStackParamList, 'ClassExamSchedulesList'>;

const ClassExamSchedulesListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchExams = async (refresh = false) => {
    try {
      if (refresh) {
        setPage(1);
      }
      
      const currentPage = refresh ? 1 : page;
      const response = await classControllerAPI.getExamSchedules(currentPage, 20);
      
      if (response.success && response.data) {
        const examsData = response.data.examSchedules || [];
        if (refresh) {
          setExams(examsData);
        } else {
          setExams(prev => [...prev, ...examsData]);
        }
        setTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      Alert.alert('Error', 'Failed to load exam schedules');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExams(true);
  };

  const handleDeleteExam = (exam: ExamSchedule) => {
    Alert.alert(
      'Delete Exam Schedule',
      `Are you sure you want to delete "${exam.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const response = await classControllerAPI.deleteExamSchedule(exam.id);
              if (response.success) {
                setExams(prev => prev.filter(e => e.id !== exam.id));
                Alert.alert('Success', 'Exam schedule deleted successfully');
              }
            } catch (error) {
              console.error('Error deleting exam:', error);
              Alert.alert('Error', 'Failed to delete exam schedule');
            }
          }
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) >= new Date();
  };

  const getSubjectColor = (subject: string) => {
    const colors: { [key: string]: string } = {
      Mathematics: '#4CAF50',
      Science: '#2196F3',
      English: '#FF9800',
      History: '#9C27B0',
      Geography: '#00BCD4',
      'Computer Science': '#E91E63',
      Physics: '#3F51B5',
      Chemistry: '#009688',
      Biology: '#4CAF50',
      'Physical Education': '#FF5722',
      Art: '#9C27B0',
      Music: '#E91E63',
    };
    return colors[subject] || '#607D8B';
  };

  const renderExam = ({ item }: { item: ExamSchedule }) => {
    const upcoming = isUpcoming(item.date);
    const subjectColor = getSubjectColor(item.subject);

    return (
      <TouchableOpacity 
        style={styles.examCard}
        activeOpacity={0.7}
        onPress={() => handleDeleteExam(item)}
      >
        <View style={[styles.subjectBadge, { backgroundColor: subjectColor }]}>
          <Text style={styles.subjectBadgeText}>
            {item.subject.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.examContent}>
          <Text style={styles.examTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          <View style={styles.examMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={[
                styles.metaText,
                !upcoming && styles.pastText
              ]}>
                {formatDate(item.date)}
                {!upcoming && ' (Completed)'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🕐</Text>
              <Text style={styles.metaText}>{formatTime(item.time)}</Text>
            </View>
          </View>
          
          {item.roomNo && (
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🚪</Text>
              <Text style={styles.metaText}>Room {item.roomNo}</Text>
            </View>
          )}
        </View>

        <View style={styles.examStatus}>
          {item.isPublished ? (
            <View style={styles.publishedBadge}>
              <Text style={styles.publishedText}>Published</Text>
            </View>
          ) : (
            <View style={styles.draftBadge}>
              <Text style={styles.draftText}>Draft</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && exams.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading exam schedules...</Text>
      </View>
    );
  }

  const upcomingExams = exams.filter(e => isUpcoming(e.date)).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Exam Schedules</Text>
          <Text style={styles.headerSubtitle}>
            {upcomingExams} upcoming exam{upcomingExams !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Exam List */}
        <FlatList
          data={exams}
          renderItem={renderExam}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#FF6B35"
              colors={['#FF6B35']}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (page < totalPages) {
              setPage(prev => prev + 1);
              fetchExams(false);
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && page < totalPages ? (
              <ActivityIndicator size="small" color="#FF6B35" style={styles.footerLoader} />
            ) : null
          }
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyText}>No exam schedules</Text>
                <Text style={styles.emptySubtext}>Create your first exam schedule</Text>
              </View>
            )
          }
        />

        {/* Floating Add Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('ClassCreateExamSchedule', { classId: route.params?.classId || '' })}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  examCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  subjectBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subjectBadgeText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  examContent: {
    flex: 1,
  },
  examTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  examMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  pastText: {
    color: '#999',
    fontStyle: 'italic',
  },
  examStatus: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  publishedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },
  draftBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  draftText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
    marginTop: -2,
  },
  footerLoader: {
    paddingVertical: 20,
  },
});

export default ClassExamSchedulesListScreen;