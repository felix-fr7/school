/**
 * Class Add Student Screen
 * Add a new student to the class with auto-generated sequential ID
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ClassControllerStackParamList } from '../../types';
import { classControllerAPI } from '../../services/api';

type NavigationProp = StackNavigationProp<ClassControllerStackParamList, 'ClassAddStudent'>;
type RoutePropType = RouteProp<ClassControllerStackParamList, 'ClassAddStudent'>;

interface StudentCreationResult {
  id: string;
  email: string;
  name: string;
  studentId: string;
  createdAt: string;
  temporaryPassword?: string;
}

const ClassAddStudentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [nextStudentId, setNextStudentId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<StudentCreationResult | null>(null);

  useEffect(() => {
    fetchNextStudentId();
  }, []);

  const fetchNextStudentId = async () => {
    try {
      const response = await classControllerAPI.getNextStudentId();
      if (response.success && response.data) {
        setNextStudentId(response.data.nextStudentId);
      }
    } catch (error) {
      console.error('Error fetching next student ID:', error);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Student name is required');
      return false;
    }
    
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Student email is required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const handleCreateStudent = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await classControllerAPI.createStudent({
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      
      if (response.success && response.data) {
        setCreatedStudent(response.data);
        setShowSuccessModal(true);
        // Reset form
        setName('');
        setEmail('');
        // Refresh next student ID
        fetchNextStudentId();
      }
    } catch (error: any) {
      console.error('Error creating student:', error);
      const errorMessage = error?.response?.data?.error?.message || 'Failed to create student';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setCreatedStudent(null);
    navigation.goBack();
  };

  const handleCopyPassword = () => {
    if (createdStudent?.temporaryPassword) {
      // On React Native, we can use Clipboard API
      // For now, just show it in an alert
      Alert.alert(
        'Temporary Password',
        `Password: ${createdStudent.temporaryPassword}\n\nPlease save this password securely!`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add New Student</Text>
            <Text style={styles.headerSubtitle}>
              Student ID will be auto-generated
            </Text>
          </View>

          {/* Next Student ID Preview */}
          {nextStudentId && (
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Next Student ID</Text>
              <Text style={styles.previewValue}>{nextStudentId}</Text>
              <Text style={styles.previewNote}>
                This ID will be assigned to the new student
              </Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            {/* Student Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Student Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter student's full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Student Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Student Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="student@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>

            {/* Temporary Password Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                A temporary password <Text style={styles.passwordHighlight}>Student@123</Text> will be 
                set for this student. They will be required to change it on first login.
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleCreateStudent}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Create Student</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseSuccessModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✅</Text>
            </View>

            <Text style={styles.modalTitle}>Student Created Successfully!</Text>
            
            {createdStudent && (
              <View style={styles.modalDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Student ID:</Text>
                  <Text style={styles.detailValue}>{createdStudent.studentId}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{createdStudent.name}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{createdStudent.email}</Text>
                </View>
                
                <View style={[styles.detailRow, styles.passwordRow]}>
                  <Text style={styles.detailLabel}>Temporary Password:</Text>
                  <View style={styles.passwordContainer}>
                    <Text style={styles.passwordValue}>
                      {createdStudent.temporaryPassword || 'Student@123'}
                    </Text>
                    <TouchableOpacity 
                      style={styles.copyButton}
                      onPress={handleCopyPassword}
                    >
                      <Text style={styles.copyButtonText}>📋 Copy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.modalWarning}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningText}>
                Please save the temporary password securely! You won't be able to see it again.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  setName('');
                  setEmail('');
                  setCreatedStudent(null);
                }}
              >
                <Text style={styles.modalSecondaryButtonText}>Add Another</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={handleCloseSuccessModal}
              >
                <Text style={styles.modalPrimaryButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
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
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  previewValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FF6B35',
    letterSpacing: 2,
    marginBottom: 8,
  },
  previewNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F0',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  passwordHighlight: {
    fontWeight: '700',
    color: '#FF6B35',
    backgroundColor: '#FFE8DD',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalDetails: {
    width: '100%',
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  passwordRow: {
    borderBottomWidth: 0,
    paddingTop: 12,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passwordValue: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '700',
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyButton: {
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
  },
  modalWarning: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  warningIcon: {
    fontSize: 16,
    lineHeight: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#F57F17',
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalSecondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B35',
  },
  modalPrimaryButton: {
    flex: 2,
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ClassAddStudentScreen;