/**
 * Edit Post Screen
 * Form for editing existing posts
 */

import React, { useEffect, useState } from 'react';
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
import { MainStackParamList } from '../types';
import { usePosts } from '../contexts/PostContext';
import { Post } from '../types';

type EditPostScreenProps = StackScreenProps<MainStackParamList, 'EditPost'>;

const EditPostScreen: React.FC<EditPostScreenProps> = ({ navigation, route }) => {
  const { postId } = route.params;
  const { fetchPost, updatePost, isLoading } = usePosts();
  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    const fetchedPost = await fetchPost(postId);
    if (fetchedPost) {
      setPost(fetchedPost);
      setTitle(fetchedPost.title);
      setContent(fetchedPost.content);
    }
  };

  const handleUpdate = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (title.trim().length > 255) {
      Alert.alert('Error', 'Title must be less than 255 characters');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    if (content.trim().length > 10000) {
      Alert.alert('Error', 'Content must be less than 10,000 characters');
      return;
    }

    // Check if anything changed
    if (title === post?.title && content === post?.content) {
      Alert.alert('Info', 'No changes made');
      return;
    }

    setIsSaving(true);

    try {
      const result = await updatePost(postId, { title: title.trim(), content: content.trim() });
      if (result) {
        Alert.alert('Success', 'Post updated successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to update post');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update post';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (!post) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter post title"
              value={title}
              onChangeText={setTitle}
              maxLength={255}
              editable={!isSaving && !isLoading}
            />
            <Text style={styles.charCount}>{title.length}/255</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write your post content..."
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={10}
              maxLength={10000}
              editable={!isSaving && !isLoading}
            />
            <Text style={styles.charCount}>{content.length}/10000</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              disabled={isSaving || isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, (isSaving || isLoading) && styles.buttonDisabled]}
              onPress={handleUpdate}
              disabled={isSaving || isLoading}
            >
              {isSaving || isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
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
    minHeight: 44,
  },
  textArea: {
    minHeight: 200,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default EditPostScreen;