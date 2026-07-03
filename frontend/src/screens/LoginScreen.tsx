/**
 * Login Screen
 * User authentication form with dual support: email OR student ID (roll number)
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
  const { login } = useAuth();
  const [usernameOrEmailOrId, setUsernameOrEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if input is email format
  const isEmailFormat = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleLogin = async () => {
    // Basic validation
    if (!usernameOrEmailOrId.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate email format if it contains @
    if (usernameOrEmailOrId.includes('@') && !isEmailFormat(usernameOrEmailOrId)) {
      Alert.alert('Error', 'Please enter a valid email address or Student ID');
      return;
    }

    setIsLoading(true);

    try {
      // Use the dual-login API - pass as usernameOrEmailOrId
      await login(usernameOrEmailOrId.trim(), password);
    } catch (err: any) {
      console.log("Raw login error caught:", err);

      let rawMessage: any = "Login failed. Please try again.";

      // 1. Extract potentially nested string message safely
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

      // 2. THE NUCLEAR SAFEGUARD: Absolutely destroy any remaining object reference
      let cleanStringMessage = "";

      if (typeof rawMessage === 'string') {
        cleanStringMessage = rawMessage;
      } else if (typeof rawMessage === 'object' && rawMessage !== null) {
        // If it's an object or ReadableNativeMap, force convert to standard JSON string
        try {
          cleanStringMessage = JSON.stringify(rawMessage);
        } catch (e) {
          cleanStringMessage = "Error parsing server dynamic response object.";
        }
      } else {
        cleanStringMessage = String(rawMessage);
      }

      // Double check it's a pure primitive string, otherwise fallback to hardcoded text
      if (typeof cleanStringMessage !== 'string' || cleanStringMessage.includes('[object')) {
        cleanStringMessage = "Authentication failed. Server returned an invalid payload structure.";
      }

      // 3. Trigger native dialog safely
      Alert.alert('Login Error', cleanStringMessage);
    } finally {
      setIsLoading(false);
    }
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

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email or Student ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email or Roll Number"
              value={usernameOrEmailOrId}
              onChangeText={setUsernameOrEmailOrId}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <Text style={styles.hintText}>
              {usernameOrEmailOrId.includes('@') 
                ? 'Logging in with Email' 
                : usernameOrEmailOrId.length > 0 
                  ? 'Logging in with Student ID / Roll Number' 
                  : 'Use your Roll Number (Students) or Email (Staff)'}
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Default password for students: </Text>
            <Text style={styles.passwordHint}>Student@123</Text>
          </View>
        </View>
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
    marginBottom: 40,
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