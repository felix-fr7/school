/**
 * Student Homework List Screen
 * Displays all homework assignments for the student's class
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StudentStackParamList, Homework } from '../../types';
import { studentAPI } from '../../services/api';

type NavigationProp = StackNavigationProp<StudentStackParamList, 'StudentHomeworkList'>;

const StudentHomeworkListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHomework = async () => {
    try {
      const response = await studentAPI.getHomework(1, 20);
      if (response.success && response.data) {
        setHomeworks(response.data.homeworks);
      }
    } catch (error) {
      console.error('Error fetching homework:', error);
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
    fetchHomework();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  const renderHomework = ({ item }: { item: Homework }) => (
    <TouchableOpacity
      style={styles.homeworkCard}
      onPress={() => navigation.navigate('StudentHomeworkDetail', { homeworkId: item.id })}
    >
      <View style={styles.homeworkHeader}>
        <Text style={styles.subject}>{item.subject}</Text>
        {item.dueDate && (
          <Text style={styles.dueDate}>
            Due: {new Date(item.dueDate).toLocaleDateString()}
          </Text>
        )}
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>
      <Text style={styles.classInfo}>
        {item.class?.name}{item.class?.section ? ` - ${item.class.section}` : ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={homeworks}
      renderItem={renderHomework}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyText}>No homework assigned yet</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  homeworkCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  homeworkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565c0',
  },
  dueDate: {
    fontSize: 12,
    color: '#f44336',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  classInfo: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default StudentHomeworkListScreen;