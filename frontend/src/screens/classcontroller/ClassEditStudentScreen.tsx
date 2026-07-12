/**
 * Class Edit Student Screen
 * View and manage student details, display Student ID prominently,
 * and provide Reset Password functionality
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ClassControllerStackParamList, User } from '../../types';
import { classControllerAPI } from '../../services/api';

type NavigationProp = StackNavigationProp<ClassControllerStackParamList, 'ClassEditStudent'>;
type RoutePropType = RouteProp<ClassControllerStackParamList, 'ClassEditStudent'>;

const ClassEditStudentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { studentId } = route.params;

  const [student, setStudent] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchStudentDetails();
  }, []);

  const fetchStudentDetails = async () => {
    setLoading(true);
    try {
      // Get all students and find the one we need
      // In a real app, there would be a getStudentById endpoint
      const response = await classControllerAPI.getStudents(1, 100);
      if (response.success && response.data) {
        const foundStudent = response.data.students.find((s) => s.id === studentId);
        if (foundStudent) {
          setStudent(foundStudent);
        } else {
          Alert.alert('Error', 'Student not found');
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
      Alert.alert('Error', 'Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter a password');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long');
      return;
    }

    setResetting(true);
    try {
      const response = await classControllerAPI.resetStudentPassword(studentId, newPassword);
      if (response.success) {
        Alert.alert(
          'Password Reset Successful',
          `The student's password has been updated.`,
          [{ text: 'OK', onPress: () => setShowResetModal(false) }]
        );
        setNewPassword('');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      const errorMessage = error?.response?.data?.error?.message || 'Failed to reset password';
      Alert.alert('Error', errorMessage);
    } finally {
      setResetting(false);
    }
  };

  const handleResetToDefault = async () => {
    setResetting(true);
    try {
      const response = await classControllerAPI.resetStudentPassword(studentId);
      if (response.success) {
        Alert.alert(
          'Password Reset Successful',
          "The student's password has been reset to: Student@123",
          [{ text: 'OK', onPress: () => setShowResetModal(false) }]
        );
        setNewPassword('');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      const errorMessage = error?.response?.data?.error?.message || 'Failed to reset password';
      Alert.alert('Error', errorMessage);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading student details...</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>😕</Text>
        <Text style={styles.errorText}>Student not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonIcon}>
            <Text style={styles.backButtonIconText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Details</Text>
        </View>

        {/* Student ID Card - Prominently Displayed */}
        <View style={styles.studentIdCard}>
          <Text style={styles.studentIdLabel}>Student ID</Text>
          <Text style={styles.studentIdValue}>{student.studentId}</Text>
          <Text style={styles.studentIdHint}>Use this ID for login</Text>
        </View>

        {/* Student Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Student Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{student.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Student ID</Text>
            <Text style={styles.infoValue}>{student.studentId}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Added On</Text>
            <Text style={styles.infoValue}>
              {new Date(student.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Actions Card */}
        <View style={styles.actionsCard}>
          <Text style={styles.infoCardTitle}>Actions</Text>

          {/* Reset Password Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowResetModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>🔑</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Reset Password</Text>
              <Text style={styles.actionSubtitle}>
                Set a new password for this student
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxIcon}>ℹ️</Text>
          <Text style={styles.infoBoxText}>
            The student uses their <Text style={styles.idHighlight}>{student.studentId}</Text> as their username to login.
          </Text>
        </View>
      </ScrollView>

      {/* Reset Password Modal */}
      <Modal
        visible={showResetModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Choose a new password for {student.name}
            </Text>

            {/* Custom Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                textContentType="password"
              />
            </View>

            {/* Reset to Default Option */}
            <TouchableOpacity
              style={styles.defaultPasswordButton}
              onPress={handleResetToDefault}
              disabled={resetting}
            >
              <Text style={styles.defaultPasswordText}>
                Reset to default password (Student@123)
              </Text>
            </TouchableOpacity>

            {/* Custom Password Submit */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!newPassword || resetting) && styles.submitButtonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={!newPassword || resetting}
            >
              {resetting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Set New Password</Text>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowResetModal(false);
                setNewPassword('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonIconText: {
    fontSize: 24,
    color: '#333',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  // Student ID Card
  studentIdCard: {
    backgroundColor: '#FF6B35',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  studentIdLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  studentIdValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
  },
  studentIdHint: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  // Actions Card
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  actionArrow: {
    fontSize: 24,
    color: '#CCC',
    fontWeight: '300',
  },
  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F0',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoBoxIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  idHighlight: {
    fontWeight: '700',
    color: '#FF6B35',
    backgroundColor: '#FFE8DD',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  // Loading & Error
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    padding: 20,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
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
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
  defaultPasswordButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  defaultPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
});

export default ClassEditStudentScreen;