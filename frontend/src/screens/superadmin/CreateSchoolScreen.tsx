/**
 * Create School Screen - Super Admin
 * Form to create a new school and assign admin
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SuperAdminStackParamList } from '../../types';
import { tenantsAPI } from '../../services/api';

type NavigationProp = StackNavigationProp<SuperAdminStackParamList, 'CreateSchool'>;

const CreateSchoolScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const handleCreate = async () => {
    // Validation
    if (!formData.name || !formData.code || !formData.adminName || !formData.adminEmail || !formData.adminPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await tenantsAPI.createTenant(formData);
      if (response.success) {
        Alert.alert('Success', 'School created successfully', [
          { text: 'OK', onPress: () => navigation.navigate('SuperAdminDashboard') }
        ]);
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to create school');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to create school');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>School Information</Text>
        
        <TextInput
          style={styles.input}
          placeholder="School Name *"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />
        
        <TextInput
          style={styles.input}
          placeholder="School Code * (e.g., SCH001)"
          value={formData.code}
          onChangeText={(text) => setFormData({ ...formData, code: text })}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Address"
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Phone"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          keyboardType="phone-pad"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin Credentials</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Admin Name *"
          value={formData.adminName}
          onChangeText={(text) => setFormData({ ...formData, adminName: text })}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Admin Email *"
          value={formData.adminEmail}
          onChangeText={(text) => setFormData({ ...formData, adminEmail: text })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Admin Password * (min 6 chars, 1 number)"
          value={formData.adminPassword}
          onChangeText={(text) => setFormData({ ...formData, adminPassword: text })}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={[styles.createButton, loading && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createButtonText}>Create School</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  createButton: {
    backgroundColor: '#1a237e',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateSchoolScreen;