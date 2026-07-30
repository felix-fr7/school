/**
 * Tenant Suspended Page
 * Multi-Tenant School Management System
 * 
 * Displayed when a tenant's account has been suspended.
 * Provides information and contact details for support.
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const TenantSuspended = () => {
  const { user, logout, isSuperAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header with warning icon */}
        <div className="bg-red-600 px-6 py-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Account Suspended
          </h2>
          
          <p className="text-gray-600 text-center mb-6">
            Your school's account has been temporarily suspended. 
            This may be due to:
          </p>

          <ul className="list-disc list-inside text-gray-600 mb-6 space-y-1">
            <li>Payment issues or expired subscription</li>
            <li>Violation of terms of service</li>
            <li>Administrative action by your school</li>
            <li>Security concerns</li>
          </ul>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">What to do next:</h3>
            <ol className="list-decimal list-inside text-blue-800 space-y-1 text-sm">
              <li>Contact your school administrator</li>
              <li>Check your email for suspension notice</li>
              <li>Resolve any outstanding payments</li>
              <li>Contact support if you believe this is an error</li>
            </ol>
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Contact Support</h3>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>support@macvelschool.com</span>
              </div>
              
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>+1 (555) 123-4567</span>
              </div>
              
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Support Hours: Mon-Fri, 9AM-5PM EST</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="bg-gray-50 px-6 py-4 flex flex-col space-y-3">
          {isSuperAdmin && (
            <button
              onClick={() => window.location.href = '/superadmin'}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to SuperAdmin Dashboard
            </button>
          )}
          
          <button
            onClick={logout}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantSuspended;