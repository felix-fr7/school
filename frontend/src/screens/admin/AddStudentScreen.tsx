/**
 * Add Student Screen
 * Dual-mode screen: Manual Student Form & Excel Bulk Upload
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { adminAPI } from '../../services/api';

type TabMode = 'manual' | 'excel';

interface StudentFormData {
  rollNumber: string;
  studentName: string;
  classAndSection: string;
  parentMobile: string;
  bloodGroup: string;
  studentAddress: string;
  userId: string;
  password: string;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const AddStudentScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabMode>('manual');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Manual form state
  const [formData, setFormData] = useState<StudentFormData>({
    rollNumber: '',
    studentName: '',
    classAndSection: '',
    parentMobile: '',
    bloodGroup: '',
    studentAddress: '',
    userId: '',
    password: '',
  });

  const updateForm = (field: keyof StudentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateManualForm = (): boolean => {
    if (!formData.rollNumber.trim()) {
      Alert.alert('Error', 'Roll Number is required');
      return false;
    }
    if (!formData.studentName.trim()) {
      Alert.alert('Error', 'Student Name is required');
      return false;
    }
    if (!formData.userId.trim() || !formData.userId.includes('@')) {
      Alert.alert('Error', 'Valid User ID (email) is required');
      return false;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleManualSubmit = async () => {
    if (!validateManualForm()) return;

    try {
      setLoading(true);
      const response = await adminAPI.createStudentManual({
        rollNumber: formData.rollNumber.trim(),
        studentName: formData.studentName.trim(),
        classAndSection: formData.classAndSection.trim() || undefined,
        parentMobile: formData.parentMobile.trim() || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        studentAddress: formData.studentAddress.trim() || undefined,
        userId: formData.userId.trim(),
        password: formData.password,
      });

      if (response.success) {
        Alert.alert('Success', 'Student created successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setFormData({
                rollNumber: '',
                studentName: '',
                classAndSection: '',
                parentMobile: '',
                bloodGroup: '',
                studentAddress: '',
                userId: '',
                password: '',
              });
            },
          },
        ]);
      }
    } catch (error: any) {
      const errMsg = error?.response?.data?.error?.message || error?.message || 'Failed to create student';
      Alert.alert('Error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await adminAPI.getStudentTemplate();
      if (response.success && response.data) {
        const columns = response.data.columns.join(', ');
        Alert.alert(
          'Template Information',
          `Required columns: ${columns}\n\nPlease create an Excel file with these exact column headers.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to fetch template');
    }
  };

  const handleUploadExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      if (!file) return;
      
      const fileName = file.name || 'students.xlsx';
      const fileSize = file.size || 0;
      
      // For React Native, we need to handle file upload differently
      // This is a simplified version - in production, use react-native-fs
      Alert.alert(
        'File Selected',
        `File: ${fileName}\nSize: ${fileSize} bytes\n\nNote: Excel upload requires additional native modules for full functionality. Please use the manual form for now.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'manual' && styles.tabActive]}
          onPress={() => setActiveTab('manual')}
        >
          <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>
            Manual Form
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'excel' && styles.tabActive]}
          onPress={() => setActiveTab('excel')}
        >
          <Text style={[styles.tabText, activeTab === 'excel' && styles.tabTextActive]}>
            Excel Bulk Upload
          </Text>
        </TouchableOpacity>
      </View>

      {/* Manual Form */}
      {activeTab === 'manual' && (
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Student Information</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.label}>Roll Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., STU001"
                value={formData.rollNumber}
                onChangeText={(text) => updateForm('rollNumber', text)}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.label}>Student Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                value={formData.studentName}
                onChangeText={(text) => updateForm('studentName', text)}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.label}>Class & Section</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10-A"
                value={formData.classAndSection}
                onChangeText={(text) => updateForm('classAndSection', text)}
              />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.label}>Parent Mobile</Text>
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                value={formData.parentMobile}
                onChangeText={(text) => updateForm('parentMobile', text)}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.label}>Blood Group</Text>
              <View style={styles.bloodGroupContainer}>
                {BLOOD_GROUPS.map(bg => (
                  <TouchableOpacity
                    key={bg}
                    style={[
                      styles.bloodGroupBadge,
                      formData.bloodGroup === bg && styles.bloodGroupBadgeActive,
                    ]}
                    onPress={() => updateForm('bloodGroup', bg)}
                  >
                    <Text style={[
                      styles.bloodGroupText,
                      formData.bloodGroup === bg && styles.bloodGroupTextActive,
                    ]}>
                      {bg}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.label}>Student Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Full address"
            value={formData.studentAddress}
            onChangeText={(text) => updateForm('studentAddress', text)}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.sectionTitle}>Login Credentials</Text>

          <Text style={styles.label}>User ID (Email) *</Text>
          <TextInput
            style={styles.input}
            placeholder="student@school.com"
            value={formData.userId}
            onChangeText={(text) => updateForm('userId', text)}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimum 6 characters"
            value={formData.password}
            onChangeText={(text) => updateForm('password', text)}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleManualSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Create Student</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Excel Bulk Upload */}
      {activeTab === 'excel' && (
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Bulk Student Import</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Instructions</Text>
            <Text style={styles.infoText}>
              1. Download the sample template to see the required column format.{'\n'}
              2. Fill in student data with these exact column headers:{'\n'}
              <Text style={styles.codeText}>
                rollNumber, studentName, classAndSection, parentMobile, bloodGroup, studentAddress, userId, password
              </Text>{'\n'}
              3. Upload the completed Excel file (.xlsx, .xls, or .csv).
            </Text>
          </View>

          <TouchableOpacity style={styles.templateButton} onPress={handleDownloadTemplate}>
            <Text style={styles.templateButtonText}>📥 Download Sample Template</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={handleUploadExcel}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.uploadIcon}>📁</Text>
                <Text style={styles.uploadButtonText}>Upload Excel File</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.warningCard}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Ensure all required fields are filled. Duplicate roll numbers or user IDs will be skipped.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#2e7d32' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#2e7d32' },
  formContainer: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 16 },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  inputHalf: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: { height: 80, textAlignVertical: 'top', marginBottom: 16 },
  bloodGroupContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bloodGroupBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  bloodGroupBadgeActive: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  bloodGroupText: { fontSize: 13, color: '#666' },
  bloodGroupTextActive: { color: '#fff', fontWeight: '600' },
  submitButton: {
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  infoCard: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#2e7d32', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#1b5e20', lineHeight: 20 },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    backgroundColor: '#c8e6c9',
    padding: 4,
    borderRadius: 4,
  },
  templateButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2e7d32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  templateButtonText: { color: '#2e7d32', fontSize: 16, fontWeight: '600' },
  uploadButton: {
    backgroundColor: '#2e7d32',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  uploadButtonDisabled: { opacity: 0.6 },
  uploadIcon: { fontSize: 24 },
  uploadButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
    gap: 8,
  },
  warningIcon: { fontSize: 20 },
  warningText: { flex: 1, fontSize: 13, color: '#e65100' },
});

export default AddStudentScreen;