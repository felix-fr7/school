/**
 * Login Screen
 * Supports Student login (Student ID/password), Staff login (email/password), 
 * and Class login (class code/password)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';

type LoginScreenProps = StackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, classLogin } = useAuth();
  const [loginMode, setLoginMode] = useState<'student' | 'staff' | 'class'>('student');
  
  // Student login state (Student ID + Password)
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  
  // Staff login state (Email + Password)
  const [email, setEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  
  // Class login state
  const [classCode, setClassCode] = useState('');
  const [classPassword, setClassPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  const handleStudentLogin = async () => {
    if (!studentId.trim() || !studentPassword.trim()) {
      Alert.alert('Error', 'Please enter Student ID and Password');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[StudentLogin] Attempting login with studentId:', studentId.trim());
      await login(studentId.trim(), studentPassword);
      console.log('[StudentLogin] Login successful');
    } catch (err: any) {
      console.log('[StudentLogin] Login error:', err);
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffLogin = async () => {
    if (!email.trim() || !staffPassword.trim()) {
      Alert.alert('Error', 'Please enter Email and Password');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), staffPassword);
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassLogin = async () => {
    if (!classCode.trim() || !classPassword.trim()) {
      Alert.alert('Error', 'Please enter Class ID and Password');
      return;
    }

    setIsLoading(true);
    try {
      await classLogin(classCode.trim().toUpperCase(), classPassword);
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (err: any) => {
    console.log("Raw login error caught:", err);

    let rawMessage: any = "Login failed. Please try again.";

    if (err?.response?.data?.error?.message) {
      rawMessage = err.response.data.error.message;
    } else if (err?.response?.data?.message) {
      rawMessage = err.response.data.message;
    } else if (err?.message) {
      rawMessage = err.message;
    } else if (err?.response?.data) {
      rawMessage = err.response.data;
    } else if (err) {
      rawMessage = err;
    }

    let cleanStringMessage = "";

    if (typeof rawMessage === 'string') {
      cleanStringMessage = rawMessage;
    } else if (typeof rawMessage === 'object' && rawMessage !== null) {
      try {
        cleanStringMessage = JSON.stringify(rawMessage);
      } catch (e) {
        cleanStringMessage = "Error parsing server dynamic response object.";
      }
    } else {
      cleanStringMessage = String(rawMessage);
    }

    if (typeof cleanStringMessage !== 'string' || cleanStringMessage.includes('[object')) {
      cleanStringMessage = "Authentication failed. Server returned an invalid payload structure.";
    }

    Alert.alert('Login Error', cleanStringMessage);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>School App</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* Login Mode Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, loginMode === 'student' && styles.toggleButtonActive]}
            onPress={() => setLoginMode('student')}
          >
            <Text style={[styles.toggleText, loginMode === 'student' && styles.toggleTextActive]}>
              Student
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, loginMode === 'staff' && styles.toggleButtonActive]}
            onPress={() => setLoginMode('staff')}
          >
            <Text style={[styles.toggleText, loginMode === 'staff' && styles.toggleTextActive]}>
              Staff
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, loginMode === 'class' && styles.toggleButtonActive]}
            onPress={() => setLoginMode('class')}
          >
            <Text style={[styles.toggleText, loginMode === 'class' && styles.toggleTextActive]}>
              Class
            </Text>
          </TouchableOpacity>
        </View>

        {/* Student Login Form */}
        {loginMode === 'student' && (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Student ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your Student ID (e.g., STU-0001)"
                value={studentId}
                onChangeText={setStudentId}
                keyboardType="default"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isLoading}
              />
              <Text style={styles.hintText}>
                Your Student ID was provided by your teacher (format: STU-XXXX)
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={studentPassword}
                onChangeText={setStudentPassword}
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleStudentLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In as Student</Text>
              )}
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Default password: </Text>
              <Text style={styles.passwordHint}>Student@123</Text>
            </View>
          </View>
        )}

        {/* Staff Login Form */}
        {loginMode === 'staff' && (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={staffPassword}
                onChangeText={setStaffPassword}
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleStaffLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Class Login Form */}
        {loginMode === 'class' && (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Class ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Class ID (e.g., CLS-1)"
                value={classCode}
                onChangeText={setClassCode}
                keyboardType="default"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isLoading}
              />
              <Text style={styles.hintText}>
                {classCode.length > 0 
                  ? `Logging in as Class: ${classCode.toUpperCase()}` 
                  : 'Enter your class code (e.g., CLS-1, CLS-2)'}
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Class Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter class password"
                value={classPassword}
                onChangeText={setClassPassword}
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleClassLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In as Class</Text>
              )}
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Contact your administrator for class credentials</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  hintText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 13,
    color: '#999',
  },
  passwordHint: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default LoginScreen;