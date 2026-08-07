import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonText,
  IonCard,
  IonCardContent,
  IonBadge,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSkeletonText,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { 
  calendarOutline, 
  imageOutline, 
  documentOutline,
  refreshOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { classControllerAPI } from '../../services/api';
import './ClassNewsListScreen.css';

const NewsItem = ({ item, onClick }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <IonCard className="news-card" button onClick={() => onClick(item)}>
      {item.imageUrl && (
        <div className="card-image-wrapper">
          <img src={item.imageUrl} alt={item.title} className="news-image" />
        </div>
      )}
      <IonCardContent className="news-content">
        <div className="card-header-meta">
          {item.type && (
            <IonBadge color="primary" className="category-badge">
              {item.type}
            </IonBadge>
          )}
          <div className="news-date">
            <IonIcon icon={calendarOutline} />
            <span>{formatDate(item.createdAt)}</span>
          </div>
        </div>

        <h3 className="news-title">{item.title}</h3>
        <p className="news-summary">{item.content}</p>

        <div className="card-footer-meta">
          <div className="attachments">
            {item.imageUrl && (
              <span className="attachment-chip">
                <IonIcon icon={imageOutline} /> Image
              </span>
            )}
            {item.pdfUrl && (
              <span className="attachment-chip pdf">
                <IonIcon icon={documentOutline} /> PDF
              </span>
            )}
          </div>
          <IonIcon icon={chevronForwardOutline} className="read-more-icon" />
        </div>
      </IonCardContent>
    </IonCard>
  );
};

const ClassNewsListScreen = () => {
  const history = useHistory();
  
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);

  const fetchNews = async (isRefresh = false, targetPage = 1) => {
    try {
      if (isRefresh) {
        setPage(1);
        targetPage = 1;
      }
      
      const response = await classControllerAPI.getNews(targetPage, 10);
      
      if (response.success && response.data) {
        const newsData = response.data.news || [];
        const pagination = response.data.pagination || {};
        
        if (isRefresh || targetPage === 1) {
          setNewsList(newsData);
        } else {
          setNewsList((prev) => [...prev, ...newsData]);
        }
        
        setTotalPages(pagination.pages || 1);
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(true, 1);
  }, []);

  const onRefresh = async (event) => {
    await fetchNews(true, 1);
    event.detail.complete();
  };

  const handleNewsPress = (item) => {
    history.push(`/class-controller/news/${item.id}`);
  };

  const onIonInfinite = async (event) => {
    if (page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchNews(false, nextPage);
    }
    event.target.complete();
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller" />
          </IonButtons>
          <IonTitle>School Bulletin</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="news-list-content" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} />
        </IonRefresher>

        <div className="news-container">
          {/* Error State */}
          {error && (
            <div className="error-state">
              <IonText color="danger">
                <p>{error}</p>
              </IonText>
            </div>
          )}

          {/* Skeleton Loading State */}
          {loading && newsList.length === 0 ? (
            <div className="skeleton-wrapper">
              {[1, 2, 3].map((n) => (
                <IonCard key={n} className="news-card skeleton-card">
                  <IonSkeletonText animated style={{ width: '100%', height: '140px' }} />
                  <IonCardContent>
                    <IonSkeletonText animated style={{ width: '40%', height: '14px', marginBottom: '8px' }} />
                    <IonSkeletonText animated style={{ width: '80%', height: '20px', marginBottom: '12px' }} />
                    <IonSkeletonText animated style={{ width: '100%', height: '14px' }} />
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          ) : newsList.length === 0 ? (
            /* Empty State */
            <div className="empty-state">
              <div className="empty-icon">📰</div>
              <IonText color="dark">
                <h3>No Announcements Yet</h3>
                <p className="empty-subtext">
                  There are no active news or updates for your class right now.
                </p>
              </IonText>
            </div>
          ) : (
            /* News List */
            <>
              {newsList.map((item) => (
                <NewsItem 
                  key={item.id} 
                  item={item} 
                  onClick={handleNewsPress}
                />
              ))}
            </>
          )}

          {/* Infinite Scroll */}
          <IonInfiniteScroll
            onIonInfinite={onIonInfinite}
            disabled={page >= totalPages}
          >
            <IonInfiniteScrollContent
              loadingSpinner="crescent"
              loadingText="Loading more updates..."
            />
          </IonInfiniteScroll>

          {/* Footer Note */}
          {!loading && newsList.length > 0 && (
            <div className="list-footer">
              <p>Managed by School Administration</p>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ClassNewsListScreen;