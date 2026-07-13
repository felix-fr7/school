/**
 * Class News List Screen
 * Displays school news for class controller (class-based login) users
 * Fetches news from GET /api/content/news endpoint with proper class isolation
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ClassControllerStackParamList, News } from '../../types';
import { contentAPI } from '../../services/api';

type NavigationProp = StackNavigationProp<ClassControllerStackParamList, 'ClassNewsList'>;
type RoutePropType = RouteProp<ClassControllerStackParamList, 'ClassNewsList'>;

interface NewsItemProps {
  item: News;
  onPress: (item: News) => void;
}

const NewsItem: React.FC<NewsItemProps> = ({ item, onPress }) => (
  <TouchableOpacity style={styles.newsCard} onPress={() => onPress(item)} activeOpacity={0.7}>
    {item.imageUrl && (
      <Image source={{ uri: item.imageUrl }} style={styles.newsImage} resizeMode="cover" />
    )}
    <View style={[styles.newsContent, !item.imageUrl && styles.newsContentNoImage]}>
      <Text style={styles.newsTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.newsSummary} numberOfLines={3}>
        {item.content}
      </Text>
      <View style={styles.newsMeta}>
        <Text style={styles.newsDate}>
          {new Date(item.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        )}
      </View>
      {(item.imageUrl || item.pdfUrl) && (
        <View style={styles.attachments}>
          {item.imageUrl && (
            <View style={styles.attachmentBadge}>
              <Text style={styles.attachmentBadgeText}>🖼️ Image</Text>
            </View>
          )}
          {item.pdfUrl && (
            <View style={styles.attachmentBadge}>
              <Text style={styles.attachmentBadgeText}>📄 PDF</Text>
            </View>
          )}
        </View>
      )}
    </View>
  </TouchableOpacity>
);

const ClassNewsListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  
  const [newsList, setNewsList] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNews = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(1);
      }
      
      const currentPage = refresh ? 1 : page;
      const response = await contentAPI.getNews(currentPage, 10);
      
      if (response.success && response.data) {
        const newsData = response.data;
        
        if (refresh) {
          setNewsList(newsData.news);
          setTotalPages(newsData.pagination.pages);
        } else {
          setNewsList(prev => [...prev, ...newsData.news]);
        }
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      Alert.alert('Error', 'Failed to load news');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const onRefresh = () => fetchNews(true);

  const handleNewsPress = (item: News) => {
    // Navigate to detail screen for full news view
    navigation.navigate('ClassNewsDetail', { newsId: item.id });
  };

  if (loading && newsList.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
        <Text style={styles.loadingText}>Loading news...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#FF5722"
            colors={['#FF5722']}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📰 School News</Text>
        </View>

        {/* News List */}
        {newsList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📰</Text>
            <Text style={styles.emptyStateTitle}>No News Yet</Text>
            <Text style={styles.emptyStateText}>
              No news has been published for your class. Check back later!
            </Text>
          </View>
        ) : (
          <>
            {newsList.map((item) => (
              <NewsItem 
                key={item.id} 
                item={item} 
                onPress={handleNewsPress}
              />
            ))}
            
            {page < totalPages && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => {
                  setPage(prev => prev + 1);
                  fetchNews();
                }}
              >
                <Text style={styles.loadMoreButtonText}>Load More</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            News is managed by your school administration
          </Text>
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 20,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#FF5722',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  newsImage: {
    width: '100%',
    height: 150,
  },
  newsContent: {
    padding: 16,
  },
  newsContentNoImage: {
    paddingTop: 16,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  newsSummary: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  newsMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsDate: {
    fontSize: 12,
    color: '#999',
  },
  categoryBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    color: '#FF5722',
    fontWeight: '600',
  },
  attachments: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  attachmentBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attachmentBadgeText: {
    fontSize: 11,
    color: '#1976D2',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadMoreButton: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF5722',
  },
  loadMoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5722',
  },
  footer: {
    marginTop: 32,
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default ClassNewsListScreen;