/**
 * Teacher Circulars Screen
 * View school circulars and official notices
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { adminAPI } from '../../services/api';

interface CircularItem {
  id: string;
  title: string;
  content: string;
  circularNo?: string;
  issueDate: string;
  createdAt: string;
  issuedByUser?: { name: string };
}

const TeacherCircularsScreen: React.FC = () => {
  const [circulars, setCirculars] = useState<CircularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCirculars = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const response = await adminAPI.getCirculars(1, 20, 'true');
      if (response.success && response.data) {
        setCirculars(response.data.circulars);
      }
    } catch (error) {
      console.error('Error fetching circulars:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCirculars();
  }, []);

  const onRefresh = () => fetchCirculars(true);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderCircular = ({ item }: { item: CircularItem }) => (
    <TouchableOpacity
      style={styles.circularCard}
      onPress={() => {
        // Could expand to show full content in a modal
      }}
    >
      <View style={styles.circularHeader}>
        {item.circularNo && (
          <View style={styles.circularNoBadge}>
            <Text style={styles.circularNoText}>{item.circularNo}</Text>
          </View>
        )}
        <Text style={styles.circularDate}>Issued: {formatDate(item.issueDate)}</Text>
      </View>
      <Text style={styles.circularTitle}>{item.title}</Text>
      <Text style={styles.circularContent} numberOfLines={4}>
        {item.content}
      </Text>
      <Text style={styles.circularAuthor}>Issued by: {item.issuedByUser?.name || 'Admin'}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7b1fa2" />
      </View>
    );
  }

  return (
    <FlatList
      data={circulars}
      renderItem={renderCircular}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No circulars or notices available</Text>
        </View>
      }
      contentContainerStyle={circulars.length === 0 ? { flex: 1 } : undefined}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center' },
  circularCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#7b1fa2',
  },
  circularHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  circularNoBadge: {
    backgroundColor: '#f3e5f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  circularNoText: { color: '#7b1fa2', fontSize: 11, fontWeight: '600' },
  circularDate: { fontSize: 12, color: '#999' },
  circularTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
  circularContent: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 8 },
  circularAuthor: { fontSize: 12, color: '#999', fontStyle: 'italic' },
});

export default TeacherCircularsScreen;