import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { adminAPI } from '../../services/api';
import { User, Class } from '../../types';

type TeachersListScreenProps = {
  navigation: any;
};

const TeachersListScreen: React.FC<TeachersListScreenProps> = ({ navigation }) => {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(undefined);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0, limit: 10 });

  const fetchClasses = useCallback(async () => {
    try {
      const response = await adminAPI.getClasses();
      if (response.success && response.data) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  }, []);

  const fetchTeachers = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await adminAPI.getTeachers(
        pagination.page,
        pagination.limit,
        selectedClassId || '',
        searchQuery
      );
      if (response.success && response.data) {
        setTeachers(response.data.teachers);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      Alert.alert('Error', 'Failed to fetch teachers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, selectedClassId]);

  useFocusEffect(
    useCallback(() => {
      fetchClasses();
      fetchTeachers();
    }, [fetchClasses, fetchTeachers])
  );

  const onRefresh = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchTeachers(true);
  };

  const handleDelete = (teacherId: string, teacherName: string) => {
    Alert.alert(
      'Delete Teacher',
      `Are you sure you want to delete ${teacherName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await adminAPI.deleteTeacher(teacherId);
              if (response.success) {
                Alert.alert('Success', 'Teacher deleted successfully');
                fetchTeachers();
              } else {
                Alert.alert('Error', response.error?.message || 'Failed to delete teacher');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete teacher');
            }
          },
        },
      ]
    );
  };

  const renderTeacher = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.teacherCard}
      onPress={() => navigation.navigate('TeacherDetail', { teacherId: item.id })}
    >
      <View style={styles.teacherInfo}>
        <Text style={styles.teacherName}>{item.name}</Text>
        <Text style={styles.teacherEmail}>{item.email}</Text>
        {item.phone && <Text style={styles.teacherPhone}>{item.phone}</Text>}
        {item.class && (
          <Text style={styles.teacherClass}>
            Assigned Class: {item.class.section ? `${item.class.name} - ${item.class.section}` : item.class.name}
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditTeacher', { teacherId: item.id })}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id, item.name)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>👨‍🏫</Text>
      <Text style={styles.emptyText}>No teachers found</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery || selectedClassId ? 'Try adjusting your filters' : 'Add your first teacher to get started'}
      </Text>
    </View>
  );

  if (loading && teachers.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading teachers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Search and Add Button */}
      <View style={styles.headerRow}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search teachers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateTeacher')}
        >
          <Text style={styles.addButtonText}>+ Add Teacher</Text>
        </TouchableOpacity>
      </View>

      {/* Filter by Class */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Class:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedClassId}
            onValueChange={(itemValue: string) => {
              setSelectedClassId(itemValue || undefined);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            style={styles.picker}
          >
            <Picker.Item label="All Classes" value="" />
            {classes.map((cls) => (
              <Picker.Item
                key={cls.id}
                label={cls.section ? `${cls.name} - ${cls.section}` : cls.name}
                value={cls.id}
              />
            ))}
          </Picker>
        </View>
      </View>

      <FlatList
        data={teachers}
        renderItem={renderTeacher}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmpty}
        onEndReached={() => {
          if (pagination.page < pagination.pages) {
            setPagination(prev => ({ ...prev, page: prev.page + 1 }));
          }
        }}
        onEndReachedThreshold={0.5}
      />

      {pagination.pages > 1 && (
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Page {pagination.page} of {pagination.pages} ({pagination.total} teachers)
          </Text>
        </View>
      )}
    </View>
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
  headerRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 45,
  },
  teacherCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teacherInfo: {
    marginBottom: 12,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  teacherEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  teacherPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  teacherClass: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  paginationInfo: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paginationText: {
    fontSize: 14,
    color: '#666',
  },
});

export default TeachersListScreen;