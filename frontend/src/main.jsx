/**
 * Application Entry Point
 * Multi-Tenant School Management System
 * 
 * Initializes React 18 root and wraps the app with ErrorBoundary
 * for graceful error handling.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { setupIonicReact } from '@ionic/react';

// Initialize Ionic framework (adds 'hydrated' class to <html> element)
setupIonicReact();

// Ionic CSS - Core styles (must be imported first)
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import App from '../App';
import { ErrorBoundary } from './components/ErrorBoundary';

// Create React 18 root
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the application with ErrorBoundary and StrictMode
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);