/**
 * Edit Post Screen (Ionic React Version)
 * Form for editing existing posts
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
  IonInput,
  IonTextarea,
  IonText,
  IonSpinner,
  IonAlert,
} from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { usePosts } from '../contexts/PostContext';
import { Post } from '../types';
import './EditPostScreen.css';

interface EditPostParams {
  postId: string;
}

const EditPostScreen: React.FC = () => {
  const { postId } = useParams<EditPostParams>();
  const history = useHistory();
  const { fetchPost, updatePost, isLoading } = usePosts();
  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [showNoChangesAlert, setShowNoChangesAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    const fetchedPost = await fetchPost(postId);
    if (fetchedPost) {
      setPost(fetchedPost);
      setTitle(fetchedPost.title);
      setContent(fetchedPost.content);
    }
  };

  const handleUpdate = async () => {
    // Validation
    if (!title.trim()) {
      setAlertMessage('Please enter a title');
      setShowErrorAlert(true);
      return;
    }

    if (title.trim().length > 255) {
      setAlertMessage('Title must be less than 255 characters');
      setShowErrorAlert(true);
      return;
    }

    if (!content.trim()) {
      setAlertMessage('Please enter some content');
      setShowErrorAlert(true);
      return;
    }

    if (content.trim().length > 10000) {
      setAlertMessage('Content must be less than 10,000 characters');
      setShowErrorAlert(true);
      return;
    }

    // Check if anything changed
    if (title === post?.title && content === post?.content) {
      setShowNoChangesAlert(true);
      return;
    }

    setIsSaving(true);

    try {
      const result = await updatePost(postId, { title: title.trim(), content: content.trim() });
      if (result) {
        setShowSuccessAlert(true);
      } else {
        setAlertMessage('Failed to update post');
        setShowErrorAlert(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update post';
      setAlertMessage(errorMessage);
      setShowErrorAlert(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuccessDismiss = () => {
    setShowSuccessAlert(false);
    history.goBack();
  };

  if (!post) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/posts" />
            </IonButtons>
            <IonTitle>Edit Post</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center ion-justify-content-center ion-align-items-center">
          <IonSpinner name="crescent" />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/posts/${postId}`} />
          </IonButtons>
          <IonTitle>Edit Post</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="edit-post-content">
        <div className="form-container">
          <div className="input-group">
            <label className="input-label">Title</label>
            <IonInput
              placeholder="Enter post title"
              value={title}
              onIonInput={(e) => setTitle(e.detail.value || '')}
              maxlength={255}
              disabled={isSaving || isLoading}
              className="input-field"
            />
            <IonText color="medium" className="char-count">
              {title.length}/255
            </IonText>
          </div>

          <div className="input-group">
            <label className="input-label">Content</label>
            <IonTextarea
              placeholder="Write your post content..."
              value={content}
              onIonInput={(e) => setContent(e.detail.value || '')}
              rows={10}
              maxlength={10000}
              disabled={isSaving || isLoading}
              className="textarea-field"
            />
            <IonText color="medium" className="char-count">
              {content.length}/10000
            </IonText>
          </div>

          <div className="button-container">
            <IonButton
              expand="block"
              color="medium"
              onClick={() => history.goBack()}
              disabled={isSaving || isLoading}
              className="cancel-button"
            >
              Cancel
            </IonButton>

            <IonButton
              expand="block"
              color="primary"
              onClick={handleUpdate}
              disabled={isSaving || isLoading}
              className="save-button"
            >
              {isSaving || isLoading ? <IonSpinner name="crescent" /> : 'Save Changes'}
            </IonButton>
          </div>
        </div>

        <IonAlert
          isOpen={showSuccessAlert}
          onDidDismiss={handleSuccessDismiss}
          header="Success"
          message="Post updated successfully"
          buttons={['OK']}
        />

        <IonAlert
          isOpen={showErrorAlert}
          onDidDismiss={() => setShowErrorAlert(false)}
          header="Error"
          message={alertMessage}
          buttons={['OK']}
        />

        <IonAlert
          isOpen={showNoChangesAlert}
          onDidDismiss={() => setShowNoChangesAlert(false)}
          header="Info"
          message="No changes made"
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default EditPostScreen;