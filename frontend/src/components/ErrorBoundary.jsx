/**
 * Error Boundary Component - Pure React Web
 * Catches runtime errors in child components and displays a clean fallback UI.
 */

import React, { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('═══════════════════════════════════════════');
    console.error('ErrorBoundary caught an error:');
    console.error('  Error:', error);
    console.error('  Error stack:', error.stack);
    console.error('  Component stack:', errorInfo.componentStack);
    console.error('═══════════════════════════════════════════');

    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="web-page error-boundary-page"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            backgroundColor: '#f8fafc',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '36px 28px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>

            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 10px 0',
              }}
            >
              Something went wrong
            </h1>

            <p
              style={{
                color: '#64748b',
                fontSize: '14px',
                lineHeight: 1.6,
                margin: '0 0 24px 0',
              }}
            >
              An unexpected error occurred. Please try reloading the page or return to the home page.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '20px',
                  textAlign: 'left',
                  fontSize: '12px',
                  color: '#991b1b',
                  overflow: 'auto',
                  maxHeight: '180px',
                }}
              >
                <strong>Error:</strong> {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleRetry}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                🔄 Retry
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                🏠 Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;