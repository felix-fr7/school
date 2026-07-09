/**
 * Admin Circulars Screen
 * Premium minimalist 2-column bento style with visibility control
 * Features: Title, Message OR Image URL, Visibility selector
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
import { AdminStackParamList } from '../../types';
import { adminContentAPI } from '../../services/api';
import { Circular, CreateCircularInput } from '../../types';

type NavigationProp = StackNavigationProp<AdminStackParamList, 'CreateCircular'>;

type VisibilityType = 'ALL' | 'TEACHERS_ONLY';
type CircularMode = 'TEXT' | 'IMAGE';

interface CircularItemProps {
  item: Circular;
  onDelete: (id: string) => void;
  onEdit: (item: Circular) => void;
}

const CircularItem: React.FC<CircularItemProps> = ({ item, onDelete, onEdit }) => (
  <View style={styles.circularCard}>
    <View style={styles.circularCardContent}>
      <Text style={styles.circularTitle} numberOfLines={1}>
        {item.title}
      </Text>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.circularImage} resizeMode="cover" />
      ) : (
        <Text style={styles.circularContent} numberOfLines={2}>
          {item.content}
        </Text>
      )}
      <View style={styles.circularMetaRow}>
        <View style={[
          styles.visibilityBadge,
          item.visibility === 'ALL' ? styles.badgeAll : styles.badgeTeachersOnly
        ]}>
          <Text style={item.visibility === 'ALL' ? styles.badgeAllText : styles.badgeTeachersOnlyText}>
            {item.visibility === 'ALL' ? '👥 All' : '👨‍🏫 Teachers Only'}
          </Text>
        </View>
        <Text style={styles.circularDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
    <View style={styles.circularCardActions}>
      <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(item)}>
        <Text style={styles.actionButtonText}>✏️</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => Alert.alert(
          'Delete Circular',
          `Are you sure you want to delete "${item.title}"?`,
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

const AdminCircularsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [circularList, setCircularList] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>('ALL');
  const [mode, setMode] = useState<CircularMode>('TEXT');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCirculars = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(1);
      }
      const response = await adminContentAPI.getCirculars(refresh ? 1 : page, 10);
      if (response.success && response.data) {
        const circularsData = response.data;
        if (refresh) {
          setCircularList(circularsData.circulars);
          setTotalPages(circularsData.pagination.pages);
        } else {
          setCircularList(prev => [...prev, ...circularsData.circulars]);
        }
      }
    } catch (error) {
      console.error('Error fetching circulars:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCirculars();
  }, []);

  const onRefresh = () => fetchCirculars(true);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Title is required');
      return;
    }

    if (mode === 'TEXT' && !message.trim()) {
      Alert.alert('Validation Error', 'Message content is required');
      return;
    }

    if (mode === 'IMAGE' && !imageUrl.trim()) {
      Alert.alert('Validation Error', 'Image URL is required');
      return;
    }

    setSubmitting(true);
    try {
      const data: CreateCircularInput = {
        title: title.trim(),
        content: mode === 'TEXT' ? message.trim() : undefined,
        imageUrl: mode === 'IMAGE' ? imageUrl.trim() : undefined,
        visibility,
      };

      const response = await adminContentAPI.createCircular(data);
      if (response.success) {
        Alert.alert('Success', 'Circular created successfully');
        // Reset form
        setTitle('');
        setMessage('');
        setImageUrl('');
        setVisibility('ALL');
        setMode('TEXT');
        // Refresh list
        fetchCirculars(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to create circular');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await adminContentAPI.deleteCircular(id);
      if (response.success) {
        setCircularList(prev => prev.filter(item => item.id !== id));
        Alert.alert('Success', 'Circular deleted successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete circular');
    }
  };

  const handleEdit = (item: Circular) => {
    setTitle(item.title);
    if (item.imageUrl) {
      setMode('IMAGE');
      setImageUrl(item.imageUrl);
      setMessage('');
    } else {
      setMode('TEXT');
      setMessage(item.content || '');
      setImageUrl('');
    }
    setVisibility(item.visibility);
  };

  if (loading && circularList.length === 0) {
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
        <Text style={styles.headerTitle}>📋 Circulars Manager</Text>
        <Text style={styles.headerSubtitle}>Create and manage school circulars</Text>
      </View>

      {/* Create Form - Bento Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create New Circular</Text>

        {/* Mode Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Circular Type</Text>
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[styles.modeOption, mode === 'TEXT' && styles.modeOptionActive]}
              onPress={() => setMode('TEXT')}
            >
              <Text style={[styles.modeIcon, mode === 'TEXT' && styles.modeIconActive]}>📝</Text>
              <Text style={[styles.modeText, mode === 'TEXT' && styles.modeTextActive]}>
                Type Message
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeOption, mode === 'IMAGE' && styles.modeOptionActive]}
              onPress={() => setMode('IMAGE')}
            >
              <Text style={[styles.modeIcon, mode === 'IMAGE' && styles.modeIconActive]}>📷</Text>
              <Text style={[styles.modeText, mode === 'IMAGE' && styles.modeTextActive]}>
                Upload Image
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter circular title"
            value={title}
            onChangeText={setTitle}
            numberOfLines={1}
          />
        </View>

        {/* Content based on mode */}
        {mode === 'TEXT' ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write your circular message here..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
            />
          </View>
        ) : (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Image URL *</Text>
            <TextInput
              style={styles.input}
              placeholder="https://example.com/circular-image.jpg"
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

        {/* Visibility Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Audience Visibility</Text>
          <View style={styles.visibilityContainer}>
            <TouchableOpacity
              style={[
                styles.visibilityOption,
                visibility === 'ALL' && styles.visibilityOptionActive
              ]}
              onPress={() => setVisibility('ALL')}
            >
              <Text style={styles.visibilityIcon}>👥</Text>
              <Text style={[
                styles.visibilityOptionText,
                visibility === 'ALL' && styles.visibilityOptionTextActive
              ]}>
                All (Teachers + Students)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityOption,
                visibility === 'TEACHERS_ONLY' && styles.visibilityOptionActive
              ]}
              onPress={() => setVisibility('TEACHERS_ONLY')}
            >
              <Text style={styles.visibilityIcon}>👨‍🏫</Text>
              <Text style={[
                styles.visibilityOptionText,
                visibility === 'TEACHERS_ONLY' && styles.visibilityOptionTextActive
              ]}>
                Teachers Only
              </Text>
            </TouchableOpacity>
          </View>
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
            <Text style={styles.submitButtonText}>Publish Circular</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Circulars List */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Published Circulars ({circularList.length})</Text>
        {circularList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={styles.emptyStateText}>No circulars published yet</Text>
          </View>
        ) : (
          circularList.map((item) => (
            <CircularItem
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
              fetchCirculars();
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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
  visibilityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  visibilityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  visibilityOptionActive: {
    borderColor: '#2e7d32',
    backgroundColor: '#F0FDF4',
  },
  visibilityIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  visibilityOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  visibilityOptionTextActive: {
    color: '#2e7d32',
    fontWeight: '600',
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
  circularCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  circularCardContent: {
    flex: 1,
    marginRight: 12,
  },
  circularTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  circularImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  circularContent: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 8,
  },
  circularMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circularDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  visibilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeAll: {
    backgroundColor: '#E8F5E9',
  },
  badgeAllText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#2e7d32',
  },
  badgeTeachersOnly: {
    backgroundColor: '#FFF3E0',
  },
  badgeTeachersOnlyText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#E65100',
  },
  circularCardActions: {
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

export default AdminCircularsScreen;