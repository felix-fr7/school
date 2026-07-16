/**
 * Home Screen (Ionic React Version)
 * Dashboard displaying all posts with pull-to-refresh
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonInput,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonFab,
  IonFabButton,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { addOutline, logOutOutline, searchOutline, personOutline, calendarOutline } from 'ionicons/icons';
import { usePosts } from '../contexts/PostContext';
import { useAuth } from '../contexts/AuthContext';
import { Post } from '../types';
import './HomeScreen.css';

const HomeScreen: React.FC = () => {
  const history = useHistory();
  const { posts, isLoading, fetchPosts } = usePosts();
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    await fetchPosts();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      history.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSearch = () => {
    fetchPosts(1, 10, searchQuery);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Posts</IonTitle>
          <IonButton slot="end" fill="clear" onClick={handleLogout}>
            <IonIcon icon={logOutOutline} slot="icon-only" />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="home-content">
        {/* Greeting */}
        <div className="greeting-container">
          <h1 className="greeting">Hello, {user?.name || 'Guest'}!</h1>
          <p className="subtitle">Here are the latest posts</p>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <IonInput
            placeholder="Search posts..."
            value={searchQuery}
            onIonInput={(e) => setSearchQuery(e.detail.value || '')}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="search-input"
          >
            <IonIcon icon={searchOutline} slot="start" className="search-icon" />
          </IonInput>
        </div>

        {/* Posts List */}
        {isLoading && posts.length === 0 ? (
          <div className="loading-container">
            <IonSpinner name="crescent" />
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-container">
            <IonText color="medium">
              <h3>No posts available</h3>
              <p>Be the first to create a post!</p>
            </IonText>
          </div>
        ) : (
          <IonList>
            {posts.map((post: Post) => (
              <IonItem
                key={post.id}
                button
                onClick={() => history.push(`/posts/${post.id}`)}
                className="post-item"
              >
                <IonCard className="post-card">
                  <IonCardContent>
                    <h3 className="post-title">{post.title}</h3>
                    <p className="post-content">
                      {post.content.length > 150
                        ? `${post.content.substring(0, 150)}...`
                        : post.content}
                    </p>
                    <div className="post-footer">
                      <div className="post-author">
                        <IonIcon icon={personOutline} />
                        <span>By {post.user.name}</span>
                      </div>
                      <div className="post-date">
                        <IonIcon icon={calendarOutline} />
                        <span>{formatDate(post.createdAt)}</span>
                      </div>
                    </div>
                  </IonCardContent>
                </IonCard>
              </IonItem>
            ))}
          </IonList>
        )}

        {/* Create Post FAB */}
        <IonFab
          vertical="bottom"
          horizontal="end"
          slot="fixed"
          className="create-post-fab"
        >
          <IonFabButton onClick={() => history.push('/posts/create')} color="primary">
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default HomeScreen;