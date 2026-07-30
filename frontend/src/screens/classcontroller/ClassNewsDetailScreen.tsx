import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonSpinner,
  IonText,
  IonBadge,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { useHistory, useParams } from 'react-router-dom';
import { 
  calendarOutline, 
  personOutline, 
  documentTextOutline, 
  openOutline,
  shareSocialOutline,
} from 'ionicons/icons';
import { News } from '../../types';
import './ClassNewsDetailScreen.css';

interface RouteParams {
  id: string;
}

const ClassNewsDetailScreen: React.FC = () => {
  const history = useHistory();
  const { id: newsId } = useParams<RouteParams>();
  
  const [news, setNews] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNewsDetail();
  }, [newsId]);

  const fetchNewsDetail = async () => {
    try {
      setLoading(true);
      console.log('Fetching news detail for ID:', newsId);
      
      // Backend API இணைக்கப்படும் வரை போலி தரவு
      setNews({
        id: newsId || '1',
        title: 'Annual Sports Meet & Cultural Fest Schedule Announced',
        content: `We are excited to announce our upcoming Annual Sports Meet and Cultural Fest for this academic year. 

All students are requested to participate in the upcoming practice sessions starting next Monday. Parents are invited to attend the grand finale function on the weekend. 

Please refer to the attached PDF document for the detailed event schedule, time slots, and guidelines for track events.`,
        summary: 'Important updates regarding the upcoming Annual Sports Meet and practice schedules.',
        category: 'School Event',
        imageUrl: 'https://picsum.photos/800/400',
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        visibility: 'ALL',
        tenantId: '1',
        postedBy: '1',
        isPublished: true,
        postedByUser: { id: '1', name: 'School Administration' },
      });
    } catch (error) {
      console.error('Error fetching news detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleOpenPdf = () => {
    if (news?.pdfUrl) {
      window.open(news.pdfUrl, '_blank');
    }
  };

  const handleShare = () => {
    if (navigator.share && news) {
      navigator.share({
        title: news.title,
        text: news.summary || news.title,
        url: window.location.href,
      }).catch(console.error);
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar color="primary">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/class-controller/news" />
            </IonButtons>
            <IonTitle>News Detail</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center news-detail-loading">
          <IonSpinner name="crescent" color="primary" />
          <IonText color="medium">
            <p className="loading-text">Loading announcement...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  if (!news) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar color="primary">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/class-controller/news" />
            </IonButtons>
            <IonTitle>News Detail</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <div className="error-state">
            <div className="error-icon">📰</div>
            <IonText color="dark">
              <h3>Announcement Not Found</h3>
              <p>The requested news article might have been deleted or moved.</p>
            </IonText>
            <IonButton color="primary" fill="outline" onClick={() => history.goBack()}>
              Go Back
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/class-controller/news" />
          </IonButtons>
          <IonTitle>News Detail</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleShare}>
              <IonIcon slot="icon-only" icon={shareSocialOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="news-detail-content" fullscreen>
        <div className="news-container">
          
          {/* Header Image / Banner */}
          {news.imageUrl && (
            <div className="banner-wrapper">
              <img src={news.imageUrl} alt={news.title} className="news-banner" />
            </div>
          )}

          <div className="news-body">
            {/* Category & Date Meta */}
            <div className="meta-header">
              {news.category && (
                <IonBadge color="primary" className="category-badge">
                  {news.category}
                </IonBadge>
              )}
              <div className="meta-item">
                <IonIcon icon={calendarOutline} />
                <span>{formatDate(news.createdAt)}</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="news-title">{news.title}</h1>

            {/* Author */}
            {news.postedByUser && (
              <div className="author-card">
                <div className="author-avatar">
                  <IonIcon icon={personOutline} />
                </div>
                <div className="author-info">
                  <span className="author-label">Posted by</span>
                  <span className="author-name">{news.postedByUser.name}</span>
                </div>
              </div>
            )}

            {/* Summary Box */}
            {news.summary && (
              <div className="summary-callout">
                <span className="summary-title">Quick Summary</span>
                <p className="summary-text">{news.summary}</p>
              </div>
            )}

            {/* Main Content */}
            <IonCard className="content-card">
              <IonCardContent>
                <div className="news-content-text">
                  {news.content.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </IonCardContent>
            </IonCard>

            {/* PDF Attachment Card */}
            {news.pdfUrl && (
              <div className="attachment-section">
                <h3 className="section-title">Attachments</h3>
                <div className="attachment-card" onClick={handleOpenPdf}>
                  <div className="pdf-icon-wrapper">
                    <IonIcon icon={documentTextOutline} />
                  </div>
                  <div className="attachment-info">
                    <span className="attachment-name">Attachment Document.pdf</span>
                    <span className="attachment-subtext">Click to view or download PDF</span>
                  </div>
                  <IonIcon icon={openOutline} className="open-icon" />
                </div>
              </div>
            )}

          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ClassNewsDetailScreen;