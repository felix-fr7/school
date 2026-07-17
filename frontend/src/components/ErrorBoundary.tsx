/**
 * Error Boundary Component
 * Catches runtime errors in child components and displays a fallback UI
 * Prevents entire app from crashing due to unexpected errors
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  IonApp,
  IonPage,
  IonContent,
  IonText,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { refreshOutline, homeOutline } from 'ionicons/icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state indicating an error occurred
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // ALWAYS log errors to console - never swallow silently
    console.error('═══════════════════════════════════════════');
    console.error('ErrorBoundary caught an error:');
    console.error('  Error:', error);
    console.error('  Error stack:', error.stack);
    console.error('  Component stack:', errorInfo.componentStack);
    console.error('═══════════════════════════════════════════');

    // In production, you might want to send errors to a monitoring service
    // if (process.env.NODE_ENV === 'production') {
    //   logErrorToService(error, errorInfo);
    // }

    // Store error info for display
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    // Clear error state and reload the page
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    // Navigate to home page
    window.location.href = '/';
  };

  public render() {
    // If there's an error, show the error UI
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with Ionic components
      return (
        <IonApp>
          <IonPage>
            <IonContent className="ion-padding ion-text-center">
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100vh',
                  padding: '20px',
                }}
              >
                {/* Error Icon */}
                <IonIcon
                  icon={refreshOutline}
                  style={{
                    fontSize: '64px',
                    color: '#f04e23',
                    marginBottom: '20px',
                  }}
                />

                {/* Error Title */}
                <h1
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    marginBottom: '12px',
                    color: '#333',
                  }}
                >
                  Something went wrong
                </h1>

                {/* Error Message */}
                <IonText color="medium">
                  <p
                    style={{
                      marginBottom: '20px',
                      maxWidth: '400px',
                      lineHeight: '1.5',
                    }}
                  >
                    An unexpected error occurred. Please try again or return to
                    the home page.
                  </p>
                </IonText>

                {/* Error Details (Development mode only) */}
                {import.meta.env.DEV && this.state.error && (
                    <div
                      style={{
                        backgroundColor: '#f5f5f5',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        textAlign: 'left',
                        maxWidth: '100%',
                        overflow: 'auto',
                        fontSize: '12px',
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <strong style={{ color: '#d32f2f' }}>Error:</strong>{' '}
                      {this.state.error.toString()}

                      {this.state.errorInfo && (
                        <details style={{ marginTop: '8px' }}>
                          <summary
                            style={{
                              cursor: 'pointer',
                              color: '#666',
                              marginTop: '8px',
                            }}
                          >
                            Component Stack Trace
                          </summary>
                          <pre
                            style={{
                              whiteSpace: 'pre-wrap',
                              marginTop: '8px',
                              fontSize: '11px',
                              color: '#666',
                            }}
                          >
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <IonButton onClick={this.handleRetry} color="primary">
                    <IonIcon icon={refreshOutline} slot="start" />
                    Retry
                  </IonButton>
                  <IonButton onClick={this.handleGoHome} color="medium">
                    <IonIcon icon={homeOutline} slot="start" />
                    Home
                  </IonButton>
                </div>
              </div>
            </IonContent>
          </IonPage>
        </IonApp>
      );
    }

    // If no error, render children normally
    // Add a debug wrapper to catch render-time issues
    return this.props.children;
  }
}

export default ErrorBoundary;