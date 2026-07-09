/**
 * Admin Exams Screen (Exam Timetables)
 * Premium minimalist 2-column bento style
 * Features: Exam Name, Class selector, PDF URL OR Image URL
 * Publicly visible to all roles upon creation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AdminStackParamList, Class, Exam, CreateExamInput } from '../../types';
import { adminContentAPI, adminAPI } from '../../services/api';

type NavigationProp = StackNavigationProp<AdminStackParamList, 'CreateExamSchedule'>;

type ExamMode = 'PDF' | 'IMAGE';

interface ExamItemProps {
  item: Exam;
  onDelete: (id: string) => void;
  onEdit: (item: Exam) => void;
}

const ExamItem: React.FC<ExamItemProps> = ({ item, onDelete, onEdit }) => (
  <View style={styles.examCard}>
    <View style={styles.examCardContent}>
      <Text style={styles.examTitle} numberOfLines={1}>
        {item.examName}
      </Text>
      <Text style={styles.examClass}>
        {item.class ? `${item.class.name}${item.class.section ? '-' + item.class.section : ''}` : '🏫 School-wide'}
      </Text>
      <View style={styles.examMetaRow}>
        {(item.pdfUrl || item.imageUrl) && (
          <View style={styles.attachmentsRow}>
            {item.pdfUrl && (
              <View style={styles.attachmentBadge}>
                <Text style={styles.attachmentBadgeText}>📄 PDF</Text>
              </View>
            )}
            {item.imageUrl && (
              <View style={styles.attachmentBadge}>
                <Text style={styles.attachmentBadgeText}>🖼️ Image</Text>
              </View>
            )}
          </View>
        )}
        <Text style={styles.examDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
    <View style={styles.examCardActions}>
      <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(item)}>
        <Text style={styles.actionButtonText}>✏️</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => Alert.alert(
          'Delete Exam',
          `Are you sure you want to delete "${item.examName}"?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) }
          ]
        )}
      >
        <Text style={styles.actionButtonText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const AdminExamsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [examList, setExamList] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [examName, setExamName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(undefined);
  const [pdfUrl, setPdfUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [mode, setMode] = useState<ExamMode>('PDF');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchExams = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(1);
      }
      const response = await adminContentAPI.getExams(refresh ? 1 : page, 10);
      if (response.success && response.data) {
        const examsData = response.data;
        if (refresh) {
          setExamList(examsData.exams);
          setTotalPages(examsData.pagination.pages);
        } else {
          setExamList(prev => [...prev, ...examsData.exams]);
        }
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await adminAPI.getClasses();
      if (response.success && response.data) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchClasses();
  }, []);

  const onRefresh = () => fetchExams(true);

  const handleSubmit = async () => {
    if (!examName.trim()) {
      Alert.alert('Validation Error', 'Exam name is required');
      return;
    }

    if (mode === 'PDF' && !pdfUrl.trim()) {
      Alert.alert('Validation Error', 'PDF URL is required');
      return;
    }

    if (mode === 'IMAGE' && !imageUrl.trim()) {
      Alert.alert('Validation Error', 'Image URL is required');
      return;
    }

    setSubmitting(true);
    try {
      const data: CreateExamInput = {
        examName: examName.trim(),
        classId: selectedClassId,
        pdfUrl: mode === 'PDF' ? pdfUrl.trim() : undefined,
        imageUrl: mode === 'IMAGE' ? imageUrl.trim() : undefined,
      };

      const response = await adminContentAPI.createExam(data);
      if (response.success) {
        Alert.alert('Success', 'Exam timetable created successfully');
        // Reset form
        setExamName('');
        setSelectedClassId(undefined);
        setPdfUrl('');
        setImageUrl('');
        setMode('PDF');
        // Refresh list
        fetchExams(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to create exam');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await adminContentAPI.deleteExam(id);
      if (response.success) {
        setExamList(prev => prev.filter(item => item.id !== id));
        Alert.alert('Success', 'Exam deleted successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete exam');
    }
  };

  const handleEdit = (item: Exam) => {
    setExamName(item.examName);
    setSelectedClassId(item.classId);
    if (item.pdfUrl) {
      setMode('PDF');
      setPdfUrl(item.pdfUrl);
      setImageUrl('');
    } else if (item.imageUrl) {
      setMode('IMAGE');
      setImageUrl(item.imageUrl);
      setPdfUrl('');
    }
  };

  if (loading && examList.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 Exam Timetables</Text>
        <Text style={styles.headerSubtitle}>Manage exam schedules and timetables</Text>
      </View>

      {/* Create Form - Bento Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create New Exam</Text>

        {/* Exam Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Exam Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Midterm Exam 2024"
            value={examName}
            onChangeText={setExamName}
            numberOfLines={1}
          />
        </View>

        {/* Class Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Class (Optional - leave empty for school-wide)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.classSelector}>
              <TouchableOpacity
                style={[
                  styles.classOption,
                  !selectedClassId && styles.classOptionActive
                ]}
                onPress={() => setSelectedClassId(undefined)}
              >
                <Text style={[
                  styles.classOptionText,
                  !selectedClassId && styles.classOptionTextActive
                ]}>
                  🏫 All Classes
                </Text>
              </TouchableOpacity>
              {classes.map((cls) => (
                <TouchableOpacity
                  key={cls.id}
                  style={[
                    styles.classOption,
                    selectedClassId === cls.id && styles.classOptionActive
                  ]}
                  onPress={() => setSelectedClassId(cls.id)}
                >
                  <Text style={[
                    styles.classOptionText,
                    selectedClassId === cls.id && styles.classOptionTextActive
                  ]}>
                    {cls.name}{cls.section ? `-${cls.section}` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Mode Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Timetable Format</Text>
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[styles.modeOption, mode === 'PDF' && styles.modeOptionActive]}
              onPress={() => setMode('PDF')}
            >
              <Text style={[styles.modeIcon, mode === 'PDF' && styles.modeIconActive]}>📄</Text>
              <Text style={[styles.modeText, mode === 'PDF' && styles.modeTextActive]}>
                PDF Document
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeOption, mode === 'IMAGE' && styles.modeOptionActive]}
              onPress={() => setMode('IMAGE')}
            >
              <Text style={[styles.modeIcon, mode === 'IMAGE' && styles.modeIconActive]}>🖼️</Text>
              <Text style={[styles.modeText, mode === 'IMAGE' && styles.modeTextActive]}>
                Image File
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* URL Input based on mode */}
        {mode === 'PDF' ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PDF URL *</Text>
            <TextInput
              style={styles.input}
              placeholder="https://example.com/timetable.pdf"
              value={pdfUrl}
              onChangeText={setPdfUrl}
              numberOfLines={1}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ) : (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Image URL *</Text>
            <TextInput
              style={styles.input}
              placeholder="https://example.com/timetable.jpg"
              value={imageUrl}
              onChangeText={setImageUrl}
              numberOfLines={1}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.imagePreview} resizeMode="cover" />
            ) : null}
          </View>
        )}

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Text style={styles.infoNoteIcon}>ℹ️</Text>
          <Text style={styles.infoNoteText}>
            Exam timetables are visible to ALL teachers and students upon creation.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Publish Exam</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Exams List */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Published Exams ({examList.length})</Text>
        {examList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📅</Text>
            <Text style={styles.emptyStateText}>No exam timetables published yet</Text>
          </View>
        ) : (
          examList.map((item) => (
            <ExamItem
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))
        )}
        {page < totalPages && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() => {
              setPage(prev => prev + 1);
              fetchExams();
            }}
          >
            <Text style={styles.loadMoreButtonText}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1E293B',
  },
  classSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  classOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginRight: 8,
  },
  classOptionActive: {
    borderColor: '#2e7d32',
    backgroundColor: '#F0FDF4',
  },
  classOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  classOptionTextActive: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modeOptionActive: {
    borderColor: '#2e7d32',
    backgroundColor: '#F0FDF4',
  },
  modeIcon: {
    fontSize: 20,
    marginRight: 8,
    color: '#64748B',
  },
  modeIconActive: {
    color: '#2e7d32',
  },
  modeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  modeTextActive: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginTop: 12,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoNoteIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoNoteText: {
    fontSize: 13,
    color: '#0369A1',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '500',
  },
  examCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  examCardContent: {
    flex: 1,
    marginRight: 12,
  },
  examTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  examClass: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  examMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachmentsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  attachmentBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  attachmentBadgeText: {
    fontSize: 11,
    color: '#1565C0',
  },
  examDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  examCardActions: {
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  actionButtonText: {
    fontSize: 18,
  },
  loadMoreButton: {
    backgroundColor: '#F1F5F9',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loadMoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
});

export default AdminExamsScreen;