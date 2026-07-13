/**
 * Class Controller Homework Detail Screen
 * Displays full homework details with sent date, due date, subject, and description
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { ClassControllerStackParamList } from '../../types';
import { classControllerAPI } from '../../services/api';

type HomeworkDetailScreenProps = StackScreenProps<ClassControllerStackParamList, 'ClassHomeworkDetail'>;

interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate?: string;
  due_date?: string; // snake_case fallback
  createdAt?: string;
  created_at?: string; // snake_case fallback
  isPublished: boolean;
  class?: {
    id: string;
    name: string;
    section?: string;
  } | null;
  assignedByUser?: {
    id: string;
    name: string;
  } | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ClassHomeworkDetailScreen: React.FC<HomeworkDetailScreenProps> = ({ route, navigation }) => {
  const { homeworkId } = route.params;
  const [homework, setHomework] = useState<HomeworkItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeworkDetail();
  }, [homeworkId]);

  const fetchHomeworkDetail = async () => {
    try {
      setLoading(true);
      const response = await classControllerAPI.getHomework(1, 20);
      if (response.success && response.data) {
        const foundHomework = response.data.homeworks.find((h: HomeworkItem) => h.id === homeworkId);
        if (foundHomework) {
          setHomework(foundHomework);
        }
      }
    } catch (error) {
      console.error('Error fetching homework detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = () => {
    // Handle both camelCase and snake_case
    const dueDate = homework?.dueDate || homework?.due_date;
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Homework',
      'Are you sure you want to delete this homework? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await classControllerAPI.deleteHomework(homeworkId);
              Alert.alert('Success', 'Homework deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              console.error('Error deleting homework:', error);
              Alert.alert('Error', 'Failed to delete homework');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!homework) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>📚</Text>
        <Text style={styles.errorText}>Homework not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Subject Badge */}
      <View style={styles.subjectBadge}>
        <Text style={styles.subjectText}>{homework.subject}</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>{homework.title}</Text>

      {/* Dates Row */}
      <View style={styles.datesRow}>
        <View style={styles.dateCard}>
          <Text style={styles.dateLabel}>Sent Date</Text>
          <Text style={styles.dateValue}>{formatDate(homework.createdAt || homework.created_at || '')}</Text>
        </View>
        <View style={[styles.dateCard, isOverdue() && styles.dateCardOverdue]}>
          <Text style={styles.dateLabel}>Due Date</Text>
          <Text style={[styles.dateValue, isOverdue() && styles.dateValueOverdue]}>
            {(homework.dueDate || homework.due_date) ? formatDate(homework.dueDate || homework.due_date || '') : 'No due date'}
          </Text>
        </View>
      </View>

      {/* Class Info */}
      {homework.class && (
        <View style={styles.classInfo}>
          <Text style={styles.classLabel}>Class</Text>
          <Text style={styles.classValue}>
            {homework.class.name}{homework.class.section ? ` - ${homework.class.section}` : ''}
          </Text>
        </View>
      )}

      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionLabel}>Description</Text>
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>{homework.description}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteButtonText}>🗑️ Delete Homework</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    paddingVertical: 60,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },

  // Subject Badge
  subjectBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 16,
    marginTop: 16,
  },
  subjectText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Title
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    lineHeight: 32,
  },

  // Dates Row
  datesRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  dateCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateCardOverdue: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FED7D7',
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  dateValueOverdue: {
    color: '#DC2626',
  },

  // Class Info
  classInfo: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  classLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  classValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },

  // Description
  descriptionContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
  },
  descriptionBox: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 120,
  },
  descriptionText: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 26,
    letterSpacing: 0.2,
  },

  // Actions
  actionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  deleteButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7D7',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
});

export default ClassHomeworkDetailScreen;