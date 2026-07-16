/**
 * Create Post Screen (Ionic React Version)
 * Form for creating new posts
 */

import React, { useState } from 'react';
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
import { useHistory } from 'react-router-dom';
import { usePosts } from '../contexts/PostContext';
import './CreatePostScreen.css';

const CreatePostScreen: React.FC = () => {
  const history = useHistory();
  const { createPost, isLoading } = usePosts();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const handleCreate = async () => {
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

    try {
      const result = await createPost({ title: title.trim(), content: content.trim() });
      if (result) {
        setShowSuccessAlert(true);
      } else {
        setAlertMessage('Failed to create post');
        setShowErrorAlert(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create post';
      setAlertMessage(errorMessage);
      setShowErrorAlert(true);
    }
  };

  const handleSuccessDismiss = () => {
    setShowSuccessAlert(false);
    history.goBack();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/posts" />
          </IonButtons>
          <IonTitle>Create Post</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="create-post-content">
        <div className="form-container">
          <div className="input-group">
            <label className="input-label">Title</label>
            <IonInput
              placeholder="Enter post title"
              value={title}
              onIonInput={(e) => setTitle(e.detail.value || '')}
              maxlength={255}
              disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
              className="cancel-button"
            >
              Cancel
            </IonButton>

            <IonButton
              expand="block"
              color="primary"
              onClick={handleCreate}
              disabled={isLoading}
              className="create-button"
            >
              {isLoading ? <IonSpinner name="crescent" /> : 'Create Post'}
            </IonButton>
          </div>
        </div>

        <IonAlert
          isOpen={showSuccessAlert}
          onDidDismiss={handleSuccessDismiss}
          header="Success"
          message="Post created successfully"
          buttons={['OK']}
        />

        <IonAlert
          isOpen={showErrorAlert}
          onDidDismiss={() => setShowErrorAlert(false)}
          header="Error"
          message={alertMessage}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default CreatePostScreen;