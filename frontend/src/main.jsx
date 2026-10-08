/**
 * Application Entry Point - Pure React Web
 * Multi-Tenant School Management System
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './theme.css';
import App from '../App';
import { ErrorBoundary } from './components/ErrorBoundary';
import * as UIComponents from './components/ui';

// Safely expose Ion* components globally without overwriting window properties
if (typeof window !== 'undefined') {
  try {
    Object.keys(UIComponents).forEach(key => {
      if (key.startsWith('Ion') && typeof window[key] === 'undefined') {
        window[key] = UIComponents[key];
      }
    });
  } catch (err) {
    console.warn('Global Ion component registration warning:', err);
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);