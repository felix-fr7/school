/**
 * Pure Web Router - Zero dependency replacement for @ionic/react-router
 * Re-exports standard React Router v5 routing components.
 */

import React from 'react';
import { BrowserRouter, Switch } from 'react-router-dom';

export const IonReactRouter = ({ children, ...props }) => (
  <BrowserRouter {...props}>{children}</BrowserRouter>
);

export const IonRouterOutlet = ({ children, className = '', ...props }) => (
  <div className={`web-router-outlet ${className}`} {...props}>
    {children}
  </div>
);

export default IonReactRouter;
