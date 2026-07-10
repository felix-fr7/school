/**
 * Class Students List Screen
 * View and manage students for the class
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
  Alert,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ClassControllerStackParamList } from '../../types';
import { classControllerAPI } from '../../services/api';
import { User } from '../../types';

type NavigationProp = StackNavigationProp<ClassControllerStackParamList, 'ClassStudentsList'>;
type RoutePropType = RouteProp<ClassControllerStackParamList, 'ClassStudentsList'>;

interface Student {
  id: string;
  email: string;
  name: string;
  studentId: string;
  createdAt: string;
}

const ClassStudentsListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchStudents = async (refresh = false, search = '') => {
    try {
      if (refresh) {
        setPage(1);
      }
      
      const currentPage = refresh ? 1 : page;
      const response = await classControllerAPI.getStudents(currentPage, 50, search);
      
      if (response.success && response.data) {
        const studentsData = response.data.students.map(s => ({
          id: s.id,
          email: s.email,
          name: s.name,
          studentId: s.studentId || '',
          createdAt: s.createdAt,
        }));
        
        if (refresh) {
          setStudents(studentsData);
        } else {
          setStudents(prev => [...prev, ...studentsData]);
        }
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents(true, searchQuery);
  };

  const handleSearch = () => {
    fetchStudents(true, searchQuery);
  };

  const handleStudentPress = (student: Student) => {
    navigation.navigate('ClassEditStudent', { 
      studentId: student.id,
      classId: route.params?.classId || ''
    });
  };

  const handleDeleteStudent = (student: Student) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete ${student.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const response = await classControllerAPI.deleteStudent(student.id);
              if (response.success) {
                setStudents(prev => prev.filter(s => s.id !== student.id));
                Alert.alert('Success', 'Student deleted successfully');
              }
            } catch (error) {
              console.error('Error deleting student:', error);
              Alert.alert('Error', 'Failed to delete student');
            }
          }
        },
      ]
    );
  };

  const handleResetPassword = (student: Student) => {
    Alert.alert(
      'Reset Password',
      `Reset password for ${student.name} to Student@123?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          onPress: async () => {
            try {
              const response = await classControllerAPI.resetStudentPassword(student.id);
              if (response.success) {
                Alert.alert('Success', 'Password reset to: Student@123');
              }
            } catch (error) {
              console.error('Error resetting password:', error);
              Alert.alert('Error', 'Failed to reset password');
            }
          }
        },
      ]
    );
  };

  const renderStudent = ({ item }: { item: Student }) => (
    <TouchableOpacity 
      style={styles.studentCard}
      onPress={() => handleStudentPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.studentCardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.studentEmail} numberOfLines={1}>
            {item.email}
          </Text>
          <View style={styles.studentIdBadge}>
            <Text style={styles.studentIdText}>{item.studentId}</Text>
          </View>
        </View>
      </View>
      <View style={styles.studentCardRight}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleResetPassword(item)}
        >
          <Text style={styles.actionButtonText}>🔑</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteStudent(item)}
        >
          <Text style={styles.actionButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading && students.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading students...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Students List */}
        <FlatList
          data={students}
          renderItem={renderStudent}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#FF6B35"
              colors={['#FF6B35']}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (page < totalPages) {
              setPage(prev => prev + 1);
              fetchStudents(false, searchQuery);
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && page < totalPages ? (
              <ActivityIndicator size="small" color="#FF6B35" style={styles.footerLoader} />
            ) : null
          }
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={styles.emptyText}>No students found</Text>
                <Text style={styles.emptySubtext}>Add your first student to get started</Text>
              </View>
            )
          }
        />

        {/* Floating Add Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('ClassAddStudent', { classId: route.params?.classId || '' })}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#FFF5F0',
  },
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 18,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  studentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  studentIdBadge: {
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  studentIdText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6B35',
  },
  studentCardRight: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FFF0F0',
  },
  actionButtonText: {
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
    marginTop: -2,
  },
  footerLoader: {
    paddingVertical: 20,
  },
});

export default ClassStudentsListScreen;