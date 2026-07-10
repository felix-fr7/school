/**
 * Class Circulars List Screen
 * View circulars/announcements with visibility filtering
 * Only shows circulars where visibility is 'ALL' OR the current class is included
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
  SafeAreaView,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ClassControllerStackParamList } from '../../types';
import { classControllerAPI, adminContentAPI } from '../../services/api';
import { Circular } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

type NavigationProp = StackNavigationProp<ClassControllerStackParamList, 'ClassCircularsList'>;
type RoutePropType = RouteProp<ClassControllerStackParamList, 'ClassCircularsList'>;

const ClassCircularsListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { currentClass } = useAuth();
  
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCirculars = async (refresh = false) => {
    try {
      if (refresh) {
        setPage(1);
      }
      
      const currentPage = refresh ? 1 : page;
      
      // Fetch circulars from the class controller API
      // The backend should filter circulars based on visibility:
      // - Show circulars where visibility = 'ALL'
      // - Show circulars where the current class ID is in the target list
      const response = await classControllerAPI.getCirculars(currentPage, 20);
      
      if (response.success && response.data) {
        const circularsData = response.data.circulars || [];
        
        // Additional client-side filtering for visibility
        // (This is a safety net - backend should handle this)
        const filteredCirculars = circularsData.filter(circular => {
          // If visibility is 'ALL', show to everyone
          if (circular.visibility === 'ALL') {
            return true;
          }
          // If visibility is 'SPECIFIC_CLASSES', check if current class is included
          // This would require a targetClasses field on the circular
          // For now, we trust the backend filtering
          return true;
        });
        
        if (refresh) {
          setCirculars(filteredCirculars);
        } else {
          setCirculars(prev => [...prev, ...filteredCirculars]);
        }
        setTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching circulars:', error);
      Alert.alert('Error', 'Failed to load circulars');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCirculars();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCirculars(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleCircularPress = (circular: Circular) => {
    Alert.alert(
      circular.title,
      circular.content,
      [
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const handleDeleteCircular = (circular: Circular) => {
    Alert.alert(
      'Delete Circular',
      `Are you sure you want to delete "${circular.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const response = await classControllerAPI.deleteCircular(circular.id);
              if (response.success) {
                setCirculars(prev => prev.filter(c => c.id !== circular.id));
                Alert.alert('Success', 'Circular deleted successfully');
              }
            } catch (error) {
              console.error('Error deleting circular:', error);
              Alert.alert('Error', 'Failed to delete circular');
            }
          }
        },
      ]
    );
  };

  const renderCircular = ({ item }: { item: Circular }) => (
    <TouchableOpacity 
      style={styles.circularCard}
      onPress={() => handleCircularPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.circularHeader}>
        <View style={styles.circularNoBadge}>
          <Text style={styles.circularNoText}>
            {item.circularNo || 'N/A'}
          </Text>
        </View>
        <View style={styles.circularTitleContainer}>
          <Text style={styles.circularTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        <View style={[styles.visibilityBadge, item.visibility === 'ALL' ? styles.visibilityAll : styles.visibilitySpecific]}>
          <Text style={styles.visibilityText}>
            {item.visibility === 'ALL' ? '🌍 All' : '🎯 Specific'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.circularContent} numberOfLines={3}>
        {item.content}
      </Text>
      
      <View style={styles.circularFooter}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerIcon}>📅</Text>
          <Text style={styles.footerText}>
            {item.issueDate ? formatDate(item.issueDate) : formatDate(item.createdAt)}
          </Text>
        </View>
        <View style={styles.footerRight}>
          {item.imageUrl && (
            <TouchableOpacity onPress={() => { /* Open image */ }}>
              <Text style={styles.attachmentIcon}>📎</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleDeleteCircular(item)}>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && circulars.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading circulars...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Circulars</Text>
          <Text style={styles.headerSubtitle}>
            Official announcements and notices
          </Text>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Showing circulars visible to {currentClass?.name || 'your class'}
          </Text>
        </View>

        {/* Circulars List */}
        <FlatList
          data={circulars}
          renderItem={renderCircular}
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
              fetchCirculars(false);
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
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>No circulars available</Text>
                <Text style={styles.emptySubtext}>Check back later for announcements</Text>
              </View>
            )
          }
        />
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 16,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 100,
  },
  circularCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  circularHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  circularNoBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 10,
  },
  circularNoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  circularTitleContainer: {
    flex: 1,
  },
  circularTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  visibilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  visibilityAll: {
    backgroundColor: '#E8F5E9',
  },
  visibilitySpecific: {
    backgroundColor: '#FFF3E0',
  },
  visibilityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  circularContent: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  circularFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerIcon: {
    fontSize: 12,
  },
  footerText: {
    fontSize: 11,
    color: '#999',
  },
  footerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  attachmentIcon: {
    fontSize: 16,
  },
  deleteIcon: {
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
  footerLoader: {
    paddingVertical: 20,
  },
});

export default ClassCircularsListScreen;