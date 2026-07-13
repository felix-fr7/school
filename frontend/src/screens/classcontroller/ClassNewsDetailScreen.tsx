/**
 * Class News Detail Screen
 * Displays full news article with content, images, and PDF attachments for Class Controllers
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { ClassControllerStackParamList } from '../../types';
import { contentAPI } from '../../services/api';
import * as Sharing from 'expo-sharing';

type NewsDetailScreenProps = StackScreenProps<ClassControllerStackParamList, 'ClassNewsDetail'>;

interface NewsItem {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category?: string;
  imageUrl?: string;
  pdfUrl?: string;
  createdAt: string;
  postedByUser?: { name: string };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.5;

const ClassNewsDetailScreen: React.FC<NewsDetailScreenProps> = ({ route, navigation }) => {
  const { newsId } = route.params;
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNewsDetail();
  }, [newsId]);

  const fetchNewsDetail = async () => {
    try {
      setLoading(true);
      const response = await contentAPI.getNews(1, 20, '');
      if (response.success && response.data) {
        const foundNews = response.data.news.find((n: NewsItem) => n.id === newsId);
        if (foundNews) {
          setNews(foundNews);
        }
      }
    } catch (error) {
      console.error('Error fetching news detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleOpenPdf = async () => {
    if (!news?.pdfUrl) return;

    const url = news.pdfUrl;

    try {
      if (url.startsWith('file://')) {
        // Handle local cache files safely via sharing/viewing sheets
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(url);
        } else {
          Alert.alert(
            'File Not Supported',
            'Local file sharing is not available on this device. Please try opening the PDF from a web browser.'
          );
        }
      } else if (url.startsWith('http://') || url.startsWith('https://')) {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert(
            'Cannot Open URL',
            'This device cannot open the PDF link. Please try using a different browser or app.'
          );
        }
      } else {
        Alert.alert(
          'Invalid Format',
          'The document format is not supported. Please contact support if this issue persists.'
        );
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert(
        'Error',
        'Could not open the PDF file. Please try again later or contact support.'
      );
    }
  };

  const handleOpenImage = async () => {
    if (!news?.imageUrl) return;

    const url = news.imageUrl;

    try {
      if (url.startsWith('file://')) {
        // Handle local cache files safely via sharing/viewing sheets
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(url);
        } else {
          Alert.alert(
            'File Not Supported',
            'Local image sharing is not available on this device.'
          );
        }
      } else if (url.startsWith('http://') || url.startsWith('https://')) {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert(
            'Cannot Open URL',
            'This device cannot open the image link. Please try using a different browser or app.'
          );
        }
      } else {
        Alert.alert(
          'Invalid Format',
          'The image format is not supported. Please contact support if this issue persists.'
        );
      }
    } catch (error) {
      console.error('Error opening image:', error);
      Alert.alert(
        'Error',
        'Could not open the image file. Please try again later or contact support.'
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!news) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>📰</Text>
        <Text style={styles.errorText}>News article not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Category Badge */}
      {news.category && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{news.category}</Text>
        </View>
      )}

      {/* Title */}
      <Text style={styles.title}>{news.title}</Text>

      {/* Meta Information */}
      <View style={styles.metaContainer}>
        <Text style={styles.date}>{formatDate(news.createdAt)}</Text>
        {news.postedByUser && (
          <Text style={styles.author}>By: {news.postedByUser.name}</Text>
        )}
      </View>

      {/* Image */}
      {news.imageUrl && (
        <TouchableOpacity onPress={handleOpenImage} activeOpacity={0.8}>
          <Image
            source={{ uri: news.imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}

      {/* Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.content}>{news.content}</Text>
      </View>

      {/* PDF Attachment */}
      {news.pdfUrl && (
        <View style={styles.pdfContainer}>
          <Text style={styles.pdfLabel}>📎 Attachment</Text>
          <TouchableOpacity
            style={styles.pdfButton}
            onPress={handleOpenPdf}
            activeOpacity={0.7}
          >
            <Text style={styles.pdfButtonText}>📄 Open PDF Document</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Summary (if different from content) */}
      {news.summary && news.summary !== news.content && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>Summary</Text>
          <Text style={styles.summaryText}>{news.summary}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    paddingVertical: 60,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },

  // Category Badge
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 16,
    marginTop: 16,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Title
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    lineHeight: 32,
  },

  // Meta Information
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  date: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  author: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },

  // Image
  image: {
    width: SCREEN_WIDTH - 32,
    height: IMAGE_HEIGHT,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },

  // Content
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  content: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 26,
    letterSpacing: 0.2,
  },

  // PDF Attachment
  pdfContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  pdfLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  pdfButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pdfButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B35',
  },

  // Summary
  summaryContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
});

export default ClassNewsDetailScreen;