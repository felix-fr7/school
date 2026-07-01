/**
 * Teacher Homework Screen
 * Create and manage homework assignments for the teacher's class
 * Supports full CRUD operations with teacher-scoped validation
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { teacherAPI } from '../../services/api';

interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate?: string;
  createdAt: string;
  isPublished?: boolean;
}

const TeacherHomeworkScreen: React.FC = () => {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);

  const fetchHomeworks = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const response = await teacherAPI.getHomework(1, 50);
      if (response.success && response.data) {
        setHomeworks(response.data.homeworks);
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
    fetchHomeworks();
  }, []);

  const onRefresh = () => fetchHomeworks(true);

  const validateForm = () => {
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter subject');
      return false;
    }
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter homework title');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter description');
      return false;
    }
    return true;
  };

  const resetForm = (): void => {
    setSubject('');
    setTitle('');
    setDescription('');
    setDueDate('');
    setEditingHomework(null);
    setShowForm(false);
  };

  const handleCreateHomework = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const response = await teacherAPI.createHomework({
        subject: subject.trim(),
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });

      if (response.success) {
        Alert.alert('Success', 'Homework assigned successfully!', [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              fetchHomeworks();
            },
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to create homework');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateHomework = async () => {
    if (!validateForm() || !editingHomework) return;

    try {
      setSaving(true);
      const response = await teacherAPI.updateHomework(editingHomework.id, {
        subject: subject.trim(),
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });

      if (response.success) {
        Alert.alert('Success', 'Homework updated successfully!', [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              fetchHomeworks();
            },
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to update homework');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHomework = (homework: Homework) => {
    Alert.alert(
      'Delete Homework',
      `Are you sure you want to delete "${homework.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await teacherAPI.deleteHomework(homework.id);
              if (response.success) {
                Alert.alert('Success', 'Homework deleted successfully', [
                  { text: 'OK', onPress: () => { fetchHomeworks(); } },
                ]);
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error?.message || 'Failed to delete homework');
            }
          },
        },
      ]
    );
  };

  const handleEditHomework = (homework: Homework) => {
    setEditingHomework(homework);
    setSubject(homework.subject);
    setTitle(homework.title);
    setDescription(homework.description);
    const dueDateValue: string = homework.dueDate ? String(homework.dueDate.split('T')[0]) : '';
    setDueDate(dueDateValue);
    setShowForm(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderHomework = ({ item }: { item: Homework }) => (
    <TouchableOpacity
      style={styles.homeworkCard}
      onPress={() => handleEditHomework(item)}
      onLongPress={() => handleDeleteHomework(item)}
      activeOpacity={0.7}
    >
      <View style={styles.homeworkHeader}>
        <View style={[styles.subjectBadge, { backgroundColor: '#7b1fa2' }]}>
          <Text style={styles.subjectBadgeText}>{item.subject}</Text>
        </View>
        {item.dueDate && (
          <Text style={styles.dueDate}>Due: {formatDate(item.dueDate)}</Text>
        )}
      </View>
      <Text style={styles.homeworkTitle}>{item.title}</Text>
      <Text style={styles.homeworkDesc} numberOfLines={2}>{item.description}</Text>
      <Text style={styles.homeworkDate}>Assigned: {formatDate(item.createdAt)}</Text>
      <View style={styles.actionHint}>
        <Text style={styles.actionHintText}>Tap to edit • Long press to delete</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7b1fa2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Create/Edit Homework Toggle */}
      <TouchableOpacity
        style={styles.formToggle}
        onPress={() => (showForm ? resetForm() : setShowForm(true))}
      >
        <Text style={styles.formToggleText}>
          {showForm ? '✕ Cancel' : '+ Assign New Homework'}
        </Text>
      </TouchableOpacity>

      {/* Create/Edit Homework Form */}
      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingHomework ? 'Edit Homework' : 'Assign New Homework'}
          </Text>

          <Text style={styles.label}>Subject *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Mathematics, Science, English"
            value={subject}
            onChangeText={(text) => setSubject(text)}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Chapter 5 Exercises"
            value={title}
            onChangeText={(text) => setTitle(text)}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter homework details and instructions..."
            value={description}
            onChangeText={(text) => setDescription(text)}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Due Date (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={dueDate}
            onChangeText={(text) => setDueDate(text)}
          />

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={editingHomework ? handleUpdateHomework : handleCreateHomework}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {editingHomework ? 'Update Homework' : 'Assign Homework'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Homework List */}
      <FlatList
        data={homeworks}
        renderItem={renderHomework}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyText}>No homework assigned yet</Text>
            <Text style={styles.emptySubtext}>Use the form above to assign homework</Text>
          </View>
        }
        contentContainerStyle={homeworks.length === 0 ? { flex: 1 } : undefined}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  formToggle: {
    backgroundColor: '#7b1fa2',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  formToggleText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
  },
  formTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  submitButton: {
    backgroundColor: '#7b1fa2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#e0e0e0', marginHorizontal: 16 },
  homeworkCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  homeworkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  subjectBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  dueDate: { fontSize: 12, color: '#f44336', fontWeight: '500' },
  homeworkTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 6 },
  homeworkDesc: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 8 },
  homeworkDate: { fontSize: 12, color: '#999' },
  actionHint: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  actionHintText: { fontSize: 11, color: '#999', textAlign: 'center', fontStyle: 'italic' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#333' },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 4 },
});

export default TeacherHomeworkScreen;