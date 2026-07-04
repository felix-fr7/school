/**
 * Schools List Screen - Super Admin
 * Lists all schools/tenants with Edit and Delete functionality
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
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SuperAdminStackParamList, Tenant } from '../../types';
import { tenantsAPI } from '../../services/api';

type NavigationProp = StackNavigationProp<SuperAdminStackParamList, 'SchoolsList'>;

const SchoolsListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [schools, setSchools] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchSchools = async () => {
    try {
      const response = await tenantsAPI.getAllTenants(1, 50);
      if (response.success && response.data) {
        setSchools(response.data.tenants);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchools();
  };

  // Open edit modal with pre-filled data
  const openEditModal = (school: Tenant) => {
    setSelectedSchool(school);
    setEditForm({
      name: school.name,
      code: school.code,
      address: school.address || '',
      phone: school.phone || '',
      email: school.email || '',
    });
    setFormErrors({});
    setEditModalVisible(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModalVisible(false);
    setSelectedSchool(null);
    setEditForm({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
    });
    setFormErrors({});
  };

  // Validate edit form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editForm.name.trim()) {
      errors.name = 'School name is required';
    } else if (editForm.name.trim().length > 200) {
      errors.name = 'School name must be less than 200 characters';
    }

    if (!editForm.code.trim()) {
      errors.code = 'School code is required';
    } else if (editForm.code.trim().length > 50) {
      errors.code = 'School code must be less than 50 characters';
    }

    if (editForm.email.trim() && !editForm.email.trim().includes('@')) {
      errors.email = 'Please provide a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle update submission
  const handleUpdate = async () => {
    if (!validateForm() || !selectedSchool) {
      return;
    }

    setEditLoading(true);
    try {
      // Trim all values before sending
      const updateData = {
        name: editForm.name.trim(),
        code: editForm.code.trim(),
        address: editForm.address.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        email: editForm.email.trim() || undefined,
      };

      const response = await tenantsAPI.updateTenant(selectedSchool.id, updateData);

      if (response.success) {
        // Update the school in the list
        setSchools(prevSchools =>
          prevSchools.map(s =>
            s.id === selectedSchool.id ? { ...s, ...updateData } : s
          )
        );
        closeEditModal();
        Alert.alert('Success', 'School updated successfully');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || 'Failed to update school';
      Alert.alert('Error', errorMessage);
    } finally {
      setEditLoading(false);
    }
  };

  // Handle delete with confirmation
  const handleDelete = (school: Tenant) => {
    Alert.alert(
      'Delete School',
      `Are you sure you want to delete "${school.name}" and all its data?\n\nThis action cannot be undone. All users, classes, homework, marks, and other data associated with this school will be permanently deleted.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(school),
        },
      ],
      { cancelable: true }
    );
  };

  // Perform the actual delete operation
  const performDelete = async (school: Tenant) => {
    try {
      const response = await tenantsAPI.deleteTenant(school.id);

      if (response.success) {
        // Remove the school from the list
        setSchools(prevSchools => prevSchools.filter(s => s.id !== school.id));
        Alert.alert(
          'Success',
          `School "${school.name}" and all associated data have been deleted successfully.`
        );
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || 'Failed to delete school';
      Alert.alert('Error', errorMessage);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a237e" />
      </View>
    );
  }

  const renderSchool = ({ item }: { item: Tenant }) => (
    <View style={styles.schoolCard}>
      <TouchableOpacity
        style={styles.schoolInfo}
        onPress={() => navigation.navigate('SchoolDetail', { tenantId: item.id })}
      >
        <Text style={styles.schoolName}>{item.name}</Text>
        <Text style={styles.schoolCode}>Code: {item.code}</Text>
        {item.email && <Text style={styles.schoolEmail}>{item.email}</Text>}
      </TouchableOpacity>
      
      <View style={styles.actionsContainer}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(item)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {schools.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No schools found</Text>
          <Text style={styles.emptySubtext}>Create your first school to get started</Text>
        </View>
      ) : (
        <FlatList
          data={schools}
          renderItem={renderSchool}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit School</Text>
              <TouchableOpacity onPress={closeEditModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {/* Name Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>School Name *</Text>
                <TextInput
                  style={[styles.input, formErrors.name && styles.inputError]}
                  value={editForm.name}
                  onChangeText={(text) => {
                    setEditForm({ ...editForm, name: text });
                    if (formErrors.name) {
                      setFormErrors({ ...formErrors, name: '' });
                    }
                  }}
                  placeholder="Enter school name"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                />
                {formErrors.name ? (
                  <Text style={styles.errorText}>{formErrors.name}</Text>
                ) : null}
              </View>

              {/* Code Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>School Code *</Text>
                <TextInput
                  style={[styles.input, formErrors.code && styles.inputError]}
                  value={editForm.code}
                  onChangeText={(text) => {
                    setEditForm({ ...editForm, code: text.toUpperCase() });
                    if (formErrors.code) {
                      setFormErrors({ ...formErrors, code: '' });
                    }
                  }}
                  placeholder="Enter school code"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                />
                {formErrors.code ? (
                  <Text style={styles.errorText}>{formErrors.code}</Text>
                ) : null}
              </View>

              {/* Email Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[styles.input, formErrors.email && styles.inputError]}
                  value={editForm.email}
                  onChangeText={(text) => {
                    setEditForm({ ...editForm, email: text });
                    if (formErrors.email) {
                      setFormErrors({ ...formErrors, email: '' });
                    }
                  }}
                  placeholder="Enter school email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {formErrors.email ? (
                  <Text style={styles.errorText}>{formErrors.email}</Text>
                ) : null}
              </View>

              {/* Phone Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                  placeholder="Enter phone number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Address Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editForm.address}
                  onChangeText={(text) => setEditForm({ ...editForm, address: text })}
                  placeholder="Enter school address"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeEditModal}
                disabled={editLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveButton, editLoading && styles.saveButtonDisabled]}
                onPress={handleUpdate}
                disabled={editLoading}
              >
                {editLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
  schoolCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  schoolInfo: {
    flex: 1,
    marginBottom: 12,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  schoolCode: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  schoolEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  modalScrollView: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  inputError: {
    borderColor: '#f44336',
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#1a237e',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default SchoolsListScreen;