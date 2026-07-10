/**
 * Admin Circulars Screen
 * Premium minimalist 2-column bento style with visibility control
 * Features: Title, Message OR Image Picker, Target Audience selector (All Classes or Specific Classes)
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
  Modal,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AdminStackParamList, Class, Circular, CreateCircularInput } from '../../types';
import { adminContentAPI, adminAPI } from '../../services/api';

type NavigationProp = StackNavigationProp<AdminStackParamList, 'CreateCircular'>;

type VisibilityType = 'ALL' | 'SPECIFIC_CLASSES';
type CircularMode = 'TEXT' | 'IMAGE';

interface CircularItemProps {
  item: Circular;
  onDelete: (id: string) => void;
  onEdit: (item: Circular) => void;
}

// Map visibility to display text
const getVisibilityLabel = (visibility: string) => {
  if (visibility === 'ALL') return '👥 All Classes';
  if (visibility === 'SPECIFIC_CLASSES') return '🏫 Specific Classes';
  return '👥 All Classes';
};

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
          item.visibility === 'ALL' ? styles.badgeAll : styles.badgeSpecific
        ]}>
          <Text style={item.visibility === 'ALL' ? styles.badgeAllText : styles.badgeSpecificText}>
            {item.visibility === 'ALL' ? '👥 All Classes' : '🏫 Specific Classes'}
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
  const [imageName, setImageName] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>('ALL');
  const [mode, setMode] = useState<CircularMode>('TEXT');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [showClassSelector, setShowClassSelector] = useState(false);

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
    fetchCirculars();
    fetchClasses();
  }, []);

  const onRefresh = () => fetchCirculars(true);

  // Request permissions
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant permission to access your photos.'
      );
      return false;
    }
    return true;
  };

  // Pick image from gallery
  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset) {
        setImageUrl(asset.uri);
        setImageName(asset.fileName || 'Selected Image');
      }
    }
  };

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

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
      Alert.alert('Validation Error', 'Please select an image file');
      return;
    }

    if (visibility === 'SPECIFIC_CLASSES' && selectedClassIds.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one class');
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
        setImageName('');
        setVisibility('ALL');
        setSelectedClassIds([]);
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
      setImageName('Current Image');
      setMessage('');
    } else {
      setMode('TEXT');
      setMessage(item.content || '');
      setImageUrl('');
      setImageName('');
    }
    setVisibility(item.visibility);
  };

  const renderClassItem = ({ item }: { item: Class }) => {
    const isSelected = selectedClassIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.classItem, isSelected && styles.classItemActive]}
        onPress={() => toggleClassSelection(item.id)}
      >
        <View style={styles.classItemLeft}>
          <Text style={styles.classItemIcon}>{isSelected ? '✅' : '⬜'}</Text>
          <Text style={[styles.classItemText, isSelected && styles.classItemTextActive]}>
            {item.name}{item.section ? ` - ${item.section}` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
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
            <Text style={styles.inputLabel}>Select Image File *</Text>
            <TouchableOpacity style={styles.filePickerButton} onPress={pickImage}>
              <Text style={styles.filePickerIcon}>🖼️</Text>
              <Text style={styles.filePickerText}>
                {imageName || 'Browse and select image from gallery'}
              </Text>
            </TouchableOpacity>
            {imageUrl && (
              <Image source={{ uri: imageUrl }} style={styles.imagePreview} resizeMode="cover" />
            )}
          </View>
        )}

        {/* Target Audience Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Target Audience</Text>
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
                All Classes & Students
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityOption,
                visibility === 'SPECIFIC_CLASSES' && styles.visibilityOptionActive
              ]}
              onPress={() => {
                setVisibility('SPECIFIC_CLASSES');
                setShowClassSelector(true);
              }}
            >
              <Text style={styles.visibilityIcon}>🏫</Text>
              <Text style={[
                styles.visibilityOptionText,
                visibility === 'SPECIFIC_CLASSES' && styles.visibilityOptionTextActive
              ]}>
                Specific Classes Only
              </Text>
            </TouchableOpacity>
          </View>
          {visibility === 'SPECIFIC_CLASSES' && selectedClassIds.length > 0 && (
            <View style={styles.selectedClassesContainer}>
              <Text style={styles.selectedClassesLabel}>
                Selected: {selectedClassIds.length} class(es)
              </Text>
              <TouchableOpacity onPress={() => setShowClassSelector(true)}>
                <Text style={styles.selectedClassesLink}>View / Edit</Text>
              </TouchableOpacity>
            </View>
          )}
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

      {/* Class Selector Modal */}
      <Modal
        visible={showClassSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowClassSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Classes</Text>
              <TouchableOpacity onPress={() => setShowClassSelector(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Tap to select one or more classes for this circular
            </Text>
            <FlatList
              data={classes}
              keyExtractor={(item) => item.id}
              renderItem={renderClassItem}
              style={styles.classList}
            />
            <View style={styles.modalFooter}>
              <Text style={styles.selectedCount}>
                {selectedClassIds.length} class(es) selected
              </Text>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={() => setShowClassSelector(false)}
              >
                <Text style={styles.modalConfirmText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
  },
  filePickerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  filePickerText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
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
    justifyContent: 'center',
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
    marginRight: 6,
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
  selectedClassesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2e7d32',
  },
  selectedClassesLabel: {
    fontSize: 13,
    color: '#2e7d32',
    fontWeight: '500',
  },
  selectedClassesLink: {
    fontSize: 13,
    color: '#2e7d32',
    fontWeight: '600',
    textDecorationLine: 'underline',
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
  badgeSpecific: {
    backgroundColor: '#E3F2FD',
  },
  badgeSpecificText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1565C0',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalClose: {
    fontSize: 24,
    color: '#94A3B8',
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    padding: 16,
    paddingTop: 8,
  },
  classList: {
    maxHeight: 300,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  classItemActive: {
    backgroundColor: '#F0FDF4',
  },
  classItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  classItemIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  classItemText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },
  classItemTextActive: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  selectedCount: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  modalConfirmButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AdminCircularsScreen;