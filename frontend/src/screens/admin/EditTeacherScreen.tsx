import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { Class } from '../../types';

const EditTeacherScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { teacherId } = route.params;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [classId, setClassId] = useState<string | undefined>(undefined);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingClasses, setFetchingClasses] = useState(false);

  useEffect(() => {
    fetchData();
  }, [teacherId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teacherRes, classesRes] = await Promise.all([
        adminAPI.getTeacher(teacherId),
        adminAPI.getClasses(),
      ]);

      if (teacherRes.success && teacherRes.data) {
        const teacher = teacherRes.data;
        setName(teacher.name);
        setEmail(teacher.email);
        setPhone(teacher.phone || '');
        setClassId(teacher.classId);
      }

      if (classesRes.success && classesRes.data) {
        setClasses(classesRes.data);
      }
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      Alert.alert('Error', 'Failed to load teacher data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter teacher name');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter teacher email');
      return;
    }

    try {
      setSaving(true);
      const response = await adminAPI.updateTeacher(teacherId, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        classId: classId,
      });

      if (response.success) {
        Alert.alert('Success', 'Teacher updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to update teacher');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to update teacher');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading teacher data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <Text style={styles.label}>Teacher Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter teacher name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter teacher email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Assigned Class</Text>
        {fetchingClasses ? (
          <View style={styles.pickerContainer}>
            <ActivityIndicator size="small" />
          </View>
        ) : (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={classId}
              onValueChange={(itemValue: string) => setClassId(itemValue || undefined)}
              style={styles.picker}
            >
              <Picker.Item label="No class assigned" value="" />
              {classes.map((cls) => (
                <Picker.Item
                  key={cls.id}
                  label={cls.section ? `${cls.name} - ${cls.section}` : cls.name}
                  value={cls.id}
                />
              ))}
            </Picker>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditTeacherScreen;