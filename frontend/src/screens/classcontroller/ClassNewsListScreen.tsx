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
import { News } from '../../types';
import './ClassNewsListScreen.css';

interface NewsItemProps {
  item: News;
  onClick: (item: News) => void;
}

const NewsItem: React.FC<NewsItemProps> = ({ item, onClick }) => {
  const formatDate = (dateString: string) => {
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
          {item.category && (
            <IonBadge color="primary" className="category-badge">
              {item.category}
            </IonBadge>
          )}
          <div className="news-date">
            <IonIcon icon={calendarOutline} />
            <span>{formatDate(item.createdAt)}</span>
          </div>
        </div>

        <h3 className="news-title">{item.title}</h3>
        <p className="news-summary">{item.summary || item.content}</p>

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

const ClassNewsListScreen: React.FC = () => {
  const history = useHistory();
  
  const [newsList, setNewsList] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Mock API Loader Function
  const fetchNewsApi = async (pageNumber: number): Promise<{ data: News[]; totalPages: number }> => {
    // API Call Simulate
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockData: News[] = [
      {
        id: '1',
        title: 'Annual Sports Meet & Cultural Fest Schedule',
        content: 'We are excited to announce our upcoming Annual Sports Meet for this academic year. Practice starts next Monday.',
        summary: 'Annual Sports meet dates and event details announced for all classes.',
        category: 'Sports',
        imageUrl: 'https://picsum.photos/600/300?random=1',
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        visibility: 'ALL',
        tenantId: '1',
        postedBy: '1',
        isPublished: true,
      },
      {
        id: '2',
        title: 'Parent-Teacher Meeting Next Saturday',
        content: 'Parent-Teacher Meeting for Term 1 results will be held this Saturday between 9:00 AM and 1:00 PM.',
        summary: 'PTM schedule and discussion topics for Term 1 progress.',
        category: 'Academic',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        visibility: 'ALL',
        tenantId: '1',
        postedBy: '1',
        isPublished: true,
      },
    ];

    return {
      data: mockData,
      totalPages: 2,
    };
  };

  const fetchNews = async (isRefresh = false, targetPage = 1) => {
    try {
      if (isRefresh) {
        setPage(1);
      }
      
      const response = await fetchNewsApi(targetPage);

      if (isRefresh || targetPage === 1) {
        setNewsList(response.data);
      } else {
        setNewsList((prev) => [...prev, ...response.data]);
      }

      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(true, 1);
  }, []);

  const onRefresh = async (event: CustomEvent) => {
    await fetchNews(true, 1);
    event.detail.complete();
  };

  const handleNewsPress = (item: News) => {
    history.push(`/class-controller/news/${item.id}`);
  };

  const onIonInfinite = async (event: CustomEvent) => {
    if (page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchNews(false, nextPage);
    }
    (event.target as HTMLIonInfiniteScrollElement).complete();
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller" />
          </IonButtons>
          <IonTitle>Class Announcements</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="news-list-content" fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent pullingIcon={refreshOutline} />
        </IonRefresher>

        <div className="news-container">
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