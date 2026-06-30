/**
 * Teacher News Screen
 * View school news and announcements
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

interface NewsItem {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category?: string;
  imageUrl?: string;
  createdAt: string;
  postedByUser?: { name: string };
}

const TeacherNewsScreen: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const response = await adminAPI.getNews(1, 20, '', 'true');
      if (response.success && response.data) {
        setNews(response.data.news);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const onRefresh = () => fetchNews(true);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderNewsItem = ({ item }: { item: NewsItem }) => (
    <View style={styles.newsCard}>
      {item.imageUrl && (
        <TouchableOpacity onPress={() => item.imageUrl && Linking.openURL(item.imageUrl)}>
          <View style={styles.newsImagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>📷</Text>
          </View>
        </TouchableOpacity>
      )}
      <View style={styles.newsContent}>
        <View style={styles.newsHeader}>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
          <Text style={styles.newsDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={styles.newsTitle}>{item.title}</Text>
        {item.summary && (
          <Text style={styles.newsSummary} numberOfLines={3}>{item.summary}</Text>
        )}
        <Text style={styles.newsAuthor}>By: {item.postedByUser?.name || 'Admin'}</Text>
      </View>
    </View>
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
      data={news}
      renderItem={renderNewsItem}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📰</Text>
          <Text style={styles.emptyText}>No news or announcements available</Text>
        </View>
      }
      contentContainerStyle={news.length === 0 ? { flex: 1 } : undefined}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center' },
  newsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  newsImagePlaceholder: {
    height: 120,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: { fontSize: 40 },
  newsContent: { padding: 16 },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#7b1fa2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  newsDate: { fontSize: 12, color: '#999' },
  newsTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
  newsSummary: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 8 },
  newsAuthor: { fontSize: 12, color: '#999', fontStyle: 'italic' },
});

export default TeacherNewsScreen;