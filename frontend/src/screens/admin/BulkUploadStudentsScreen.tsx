/**
 * Admin Bulk Upload Students Screen
 * Allows admin to upload students via CSV to a specific class
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { adminAPI, utilsAPI } from '../../services/api';
import { Class } from '../../types';

interface UploadResult {
  totalProcessed: number;
  successfullyCreated: number;
  duplicates: number;
  students: Array<{ id: string; email: string; name: string; studentId: string; createdAt: string }>;
  errors?: Array<{ row: string | number; error: string }>;
}

const BulkUploadStudentsScreen: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await adminAPI.getClasses();
      if (response.success && response.data) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      Alert.alert('Error', 'Failed to load classes');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        if (file) {
          setSelectedFile(file);
        }
        setUploadResult(null);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const handleUpload = async () => {
    if (!selectedClassId) {
      Alert.alert('Error', 'Please select a class');
      return;
    }

    if (!selectedFile) {
      Alert.alert('Error', 'Please select a CSV file');
      return;
    }

    try {
      setUploading(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'text/csv',
      } as any);
      formData.append('classId', selectedClassId);

      const response = await adminAPI.bulkUploadStudentsCSV(
        formData as unknown as File,
        selectedClassId
      );

      if (response.success && response.data) {
        setUploadResult(response.data);
        setShowResultModal(true);
        setSelectedFile(null);
      }
    } catch (error: any) {
      Alert.alert(
        'Upload Failed',
        error.response?.data?.error?.message || 'Failed to upload file'
      );
    } finally {
      setUploading(false);
    }
  };

  const selectedClassName = classes.find(c => c.id === selectedClassId)?.name || 'Select Class';

  return (
    <ScrollView style={styles.container}>
      {/* Class Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Select Target Class</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowClassDropdown(!showClassDropdown)}
        >
          <Text style={styles.dropdownText}>{selectedClassName}</Text>
          <Text style={styles.dropdownIcon}>▼</Text>
        </TouchableOpacity>

        {showClassDropdown && (
          <View style={styles.dropdownMenu}>
            {classes.map((classItem) => (
              <TouchableOpacity
                key={classItem.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedClassId(classItem.id);
                  setShowClassDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>
                  {classItem.name}{classItem.section ? ` - ${classItem.section}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Download Sample CSV */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Download Sample CSV Template</Text>
        <Text style={styles.sectionDescription}>
          Download a sample CSV file to see the required format for bulk uploading students.
        </Text>
        <TouchableOpacity 
          style={styles.downloadTemplateButton} 
          onPress={async () => {
            try {
              const csvUrl = utilsAPI.getSampleCSVUrl();
              Linking.openURL(csvUrl);
            } catch (error) {
              Alert.alert('Error', 'Failed to download CSV template');
            }
          }}
        >
          <Text style={styles.downloadTemplateIcon}>📄</Text>
          <Text style={styles.downloadTemplateText}>Download Sample CSV Template</Text>
        </TouchableOpacity>
      </View>

      {/* File Upload */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Upload CSV File</Text>
        
        <TouchableOpacity style={styles.uploadCard} onPress={pickDocument}>
          {selectedFile ? (
            <View style={styles.fileSelected}>
              <Text style={styles.fileIcon}>📄</Text>
              <Text style={styles.fileName}>{selectedFile.name}</Text>
              <Text style={styles.fileSize}>
                {((selectedFile.size || 0) / 1024).toFixed(1)} KB
              </Text>
            </View>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Text style={styles.uploadIcon}>📁</Text>
              <Text style={styles.uploadText}>Tap to select CSV or Excel file</Text>
              <Text style={styles.uploadHint}>
                Supported: .csv, .xlsx, .xls
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Upload Button */}
      <TouchableOpacity
        style={[
          styles.uploadButton,
          (!selectedClassId || !selectedFile || uploading) && styles.uploadButtonDisabled,
        ]}
        onPress={handleUpload}
        disabled={uploading || !selectedClassId || !selectedFile}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.uploadButtonText}>Upload Students</Text>
        )}
      </TouchableOpacity>

      {uploading && (
        <Text style={styles.uploadingText}>
          Parsing data & uploading... Please wait.
        </Text>
      )}

      {/* Result Modal */}
      <Modal
        visible={showResultModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultIcon}>✅</Text>
              <Text style={styles.resultTitle}>Upload Complete</Text>
            </View>

            {uploadResult && (
              <>
                <View style={styles.resultStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{uploadResult.totalProcessed}</Text>
                    <Text style={styles.statLabel}>Total Parsed</Text>
                  </View>
                  <View style={[styles.statItem, styles.statSuccess]}>
                    <Text style={styles.statValue}>{uploadResult.successfullyCreated}</Text>
                    <Text style={styles.statLabel}>Created</Text>
                  </View>
                  <View style={[styles.statItem, styles.statWarning]}>
                    <Text style={styles.statValue}>{uploadResult.duplicates}</Text>
                    <Text style={styles.statLabel}>Skipped</Text>
                  </View>
                </View>

                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <View style={styles.errorsSection}>
                    <Text style={styles.errorsTitle}>Errors:</Text>
                    {uploadResult.errors.slice(0, 5).map((err, idx) => (
                      <Text key={idx} style={styles.errorItem}>
                        • Row {err.row}: {err.error}
                      </Text>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <Text style={styles.moreErrors}>
                        ...and {uploadResult.errors.length - 5} more errors
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowResultModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  sectionDescription: { fontSize: 14, color: '#666', marginBottom: 12, lineHeight: 20 },
  downloadTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#7b1fa2',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  downloadTemplateIcon: { fontSize: 20 },
  downloadTemplateText: { color: '#7b1fa2', fontSize: 15, fontWeight: '600' },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
  },
  dropdownText: { fontSize: 15, color: '#333' },
  dropdownIcon: { fontSize: 12, color: '#666' },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 5,
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dropdownItemText: { fontSize: 15, color: '#333' },
  uploadCard: {
    borderWidth: 2,
    borderColor: '#7b1fa2',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#faf5ff',
  },
  uploadPlaceholder: { alignItems: 'center' },
  uploadIcon: { fontSize: 48, marginBottom: 12 },
  uploadText: { fontSize: 16, fontWeight: '500', color: '#7b1fa2' },
  uploadHint: { fontSize: 13, color: '#999', marginTop: 4 },
  fileSelected: { alignItems: 'center' },
  fileIcon: { fontSize: 48, marginBottom: 8 },
  fileName: { fontSize: 15, fontWeight: '500', color: '#333' },
  fileSize: { fontSize: 13, color: '#666', marginTop: 4 },
  uploadButton: {
    backgroundColor: '#7b1fa2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  uploadButtonDisabled: { opacity: 0.5 },
  uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  uploadingText: {
    fontSize: 14,
    color: '#7b1fa2',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  resultIcon: { fontSize: 32, marginRight: 12 },
  resultTitle: { fontSize: 22, fontWeight: '700', color: '#333' },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: { alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: '#f5f5f5', flex: 1, marginHorizontal: 4 },
  statSuccess: { backgroundColor: '#e8f5e9' },
  statWarning: { backgroundColor: '#fff3e0' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 13, color: '#666', marginTop: 4 },
  errorsSection: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorsTitle: { fontSize: 14, fontWeight: '600', color: '#f44336', marginBottom: 8 },
  errorItem: { fontSize: 13, color: '#666', marginBottom: 4 },
  moreErrors: { fontSize: 12, color: '#999', fontStyle: 'italic', marginTop: 4 },
  closeButton: {
    backgroundColor: '#7b1fa2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default BulkUploadStudentsScreen;