/**
 * Post Detail Screen (Ionic React Version)
 * Displays full post content with edit and delete options
 */

import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonText,
  IonSpinner,
  IonAlert,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { createOutline, trashOutline, personOutline, calendarOutline } from 'ionicons/icons';
import { usePosts } from '../contexts/PostContext';
import { useAuth } from '../contexts/AuthContext';
import { Post } from '../types';
import './PostDetailScreen.css';

interface PostDetailParams {
  postId: string;
}

const PostDetailScreen: React.FC = () => {
  const { postId } = useParams<PostDetailParams>();
  const history = useHistory();
  const { fetchPost, deletePost, isLoading } = usePosts();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    const fetchedPost = await fetchPost(postId);
    setPost(fetchedPost);
  };

  const handleDelete = async () => {
    try {
      const success = await deletePost(postId);
      if (success) {
        history.goBack();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOwner = user && post && user.id === post.userId;

  if (isLoading && !post) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/posts" />
            </IonButtons>
            <IonTitle>Post Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
        </IonContent>
      </IonPage>
    );
  }

  if (!post) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/posts" />
            </IonButtons>
            <IonTitle>Post Details</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonText color="medium">
            <h3>Post not found</h3>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/posts" />
          </IonButtons>
          <IonTitle>Post Details</IonTitle>
          {isOwner && (
            <IonButtons slot="end">
              <IonButton onClick={() => history.push(`/posts/${postId}/edit`)}>
                <IonIcon icon={createOutline} />
              </IonButton>
              <IonButton onClick={() => setShowDeleteAlert(true)} color="danger">
                <IonIcon icon={trashOutline} />
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent className="post-detail-content">
        <div className="post-container">
          <h1 className="post-title">{post.title}</h1>

          <div className="post-meta">
            <div className="meta-item">
              <IonIcon icon={personOutline} />
              <span>By {post.user.name}</span>
            </div>
            <div className="meta-item">
              <IonIcon icon={calendarOutline} />
              <span>{formatDate(post.createdAt)}</span>
            </div>
          </div>

          <div className="post-divider" />

          <div className="post-content-text">{post.content}</div>
        </div>

        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Post"
          message="Are you sure you want to delete this post? This action cannot be undone."
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: handleDelete,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default PostDetailScreen;