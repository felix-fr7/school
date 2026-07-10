/**
 * Class Homework List Screen
 * View and manage homework assignments for the class
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
import { Homework } from '../../types';

type NavigationProp = StackNavigationProp<ClassControllerStackParamList, 'ClassHomeworkList'>;
type RoutePropType = RouteProp<ClassControllerStackParamList, 'ClassHomeworkList'>;

const ClassHomeworkListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHomework = async (refresh = false) => {
    try {
      if (refresh) {
        setPage(1);
      }
      
      const currentPage = refresh ? 1 : page;
      const response = await classControllerAPI.getHomework(currentPage, 20);
      
      if (response.success && response.data) {
        const homeworkData = response.data.homeworks || [];
        if (refresh) {
          setHomework(homeworkData);
        } else {
          setHomework(prev => [...prev, ...homeworkData]);
        }
        setTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching homework:', error);
      Alert.alert('Error', 'Failed to load homework');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHomework();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomework(true);
  };

  const handleHomeworkPress = (item: Homework) => {
    // Navigate to edit screen or detail view
    Alert.alert(
      item.title,
      item.description,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => handleDeleteHomework(item) 
        },
      ]
    );
  };

  const handleDeleteHomework = (item: Homework) => {
    Alert.alert(
      'Delete Homework',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const response = await classControllerAPI.deleteHomework(item.id);
              if (response.success) {
                setHomework(prev => prev.filter(h => h.id !== item.id));
                Alert.alert('Success', 'Homework deleted successfully');
              }
            } catch (error) {
              console.error('Error deleting homework:', error);
              Alert.alert('Error', 'Failed to delete homework');
            }
          }
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
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

  const renderHomework = ({ item }: { item: Homework }) => {
    const overdue = isOverdue(item.dueDate);
    const subjectColor = getSubjectColor(item.subject);

    return (
      <TouchableOpacity 
        style={styles.homeworkCard}
        onPress={() => handleHomeworkPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.subjectBadge, { backgroundColor: subjectColor }]}>
          <Text style={styles.subjectBadgeText}>
            {item.subject.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.homeworkContent}>
          <Text style={styles.homeworkTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.homeworkDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.homeworkMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={[
                styles.metaText,
                overdue && styles.overdueText
              ]}>
                {item.dueDate ? formatDate(item.dueDate) : 'No due date'}
                {overdue && ' (Overdue)'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📚</Text>
              <Text style={styles.metaText}>{item.subject}</Text>
            </View>
          </View>
        </View>

        <View style={styles.homeworkStatus}>
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

  if (loading && homework.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading homework...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Homework</Text>
          <Text style={styles.headerSubtitle}>
            {homework.length} assignment{homework.length !== 1 ? 's' : ''} total
          </Text>
        </View>

        {/* Homework List */}
        <FlatList
          data={homework}
          renderItem={renderHomework}
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
              fetchHomework(false);
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
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyText}>No homework assigned</Text>
                <Text style={styles.emptySubtext}>Create your first homework assignment</Text>
              </View>
            )
          }
        />

        {/* Floating Add Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('ClassCreateHomework', { classId: route.params?.classId || '' })}
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
  homeworkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
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
  homeworkContent: {
    flex: 1,
  },
  homeworkTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  homeworkDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  homeworkMeta: {
    flexDirection: 'row',
    gap: 16,
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
  overdueText: {
    color: '#F44336',
    fontWeight: '600',
  },
  homeworkStatus: {
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

export default ClassHomeworkListScreen;