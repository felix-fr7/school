import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Mark } from '../../types';
import { studentAPI } from '../../services/api';

const StudentMarksListScreen: React.FC = () => {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMarks = async () => {
    try {
      const response = await studentAPI.getMarks(1, 20);
      if (response.success && response.data) {
        setMarks(response.data.marks);
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching marks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchMarks(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchMarks(); };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#1565c0" /></View>;
  }

  const renderMark = ({ item }: { item: Mark }) => (
    <View style={styles.markCard}>
      <View style={styles.markHeader}>
        <Text style={styles.subject}>{item.subject}</Text>
        <Text style={styles.grade}>{item.grade || 'N/A'}</Text>
      </View>
      <Text style={styles.marks}>
        {item.marksObtained} / {item.totalMarks}
      </Text>
      <Text style={styles.examType}>{item.examType}</Text>
      {item.percentage && <Text style={styles.percentage}>{item.percentage.toFixed(1)}%</Text>}
    </View>
  );

  return (
    <FlatList
      data={marks}
      renderItem={renderMark}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        statistics ? (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Overall Statistics</Text>
            <Text style={styles.statItem}>Overall: {statistics.overallPercentage?.toFixed(1)}%</Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>No marks available yet</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  statsCard: { backgroundColor: '#1565c0', padding: 16, borderRadius: 8, marginBottom: 16 },
  statsTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  statItem: { fontSize: 14, color: '#fff' },
  markCard: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2 },
  markHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  subject: { fontSize: 16, fontWeight: '600', color: '#333' },
  grade: { fontSize: 18, fontWeight: 'bold', color: '#1565c0' },
  marks: { fontSize: 14, color: '#666', marginBottom: 4 },
  examType: { fontSize: 12, color: '#999' },
  percentage: { fontSize: 12, color: '#1565c0', fontWeight: '600', marginTop: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#666' },
});

export default StudentMarksListScreen;