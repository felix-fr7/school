/**
 * Student/Parent Dashboard
 * Sleek corporate dashboard for students and parents
 * Features: Child progress, report cards, homework tracker, media gallery, news feed
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const StudentParentDashboard = () => {
  // Auth context
  const { user, token, tenantId } = useAuth();

  // State management
  const [studentInfo, setStudentInfo] = useState(null);
  const [reportCards, setReportCards] = useState([]);
  const [selectedReportCard, setSelectedReportCard] = useState(null);
  const [homeworks, setHomeworks] = useState([]);
  const [mediaGallery, setMediaGallery] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaCategory, setMediaCategory] = useState('all');
  const [submissionForm, setSubmissionForm] = useState({
    submissionFile: '',
    note: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Get auth headers with schoolId context
  const getHeaders = useCallback(() => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    if (tenantId) {
      headers['X-School-ID'] = tenantId;
    }
    
    return { headers };
  }, [token, tenantId]);

  // Fetch student information
  const fetchStudentInfo = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/student/profile`, getHeaders());
      if (response.data.success) {
        setStudentInfo(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching student info:', err);
    }
  }, [getHeaders]);

  // Fetch report cards
  const fetchReportCards = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/student/report-cards`, getHeaders());
      if (response.data.success) {
        setReportCards(response.data.data.reportCards || []);
      }
    } catch (err) {
      console.error('Error fetching report cards:', err);
    }
  }, [getHeaders]);

  // Fetch homework assignments
  const fetchHomeworks = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/student/homeworks`, getHeaders());
      if (response.data.success) {
        setHomeworks(response.data.data.homeworks || []);
      }
    } catch (err) {
      console.error('Error fetching homeworks:', err);
    }
  }, [getHeaders]);

  // Fetch media gallery
  const fetchMediaGallery = useCallback(async () => {
    try {
      const params = mediaCategory !== 'all' ? { category: mediaCategory } : {};
      const response = await axios.get(`${API_URL}/api/school/media-gallery`, {
        ...getHeaders(),
        params
      });
      if (response.data.success) {
        setMediaGallery(response.data.data.media || []);
      }
    } catch (err) {
      console.error('Error fetching media gallery:', err);
    }
  }, [getHeaders, mediaCategory]);

  // Fetch school news
  const fetchNews = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/school/news`, getHeaders());
      if (response.data.success) {
        setNews(response.data.data.news || []);
      }
    } catch (err) {
      console.error('Error fetching news:', err);
    }
  }, [getHeaders]);

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchStudentInfo(),
          fetchReportCards(),
          fetchHomeworks(),
          fetchMediaGallery(),
          fetchNews()
        ]);
      } catch (err) {
        console.error('Dashboard initialization error:', err);
        setError('Failed to initialize dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (token && tenantId) {
      initializeDashboard();
    }
  }, [token, tenantId, fetchStudentInfo, fetchReportCards, fetchHomeworks, fetchMediaGallery, fetchNews]);

  // Refresh media when category changes
  useEffect(() => {
    if (activeTab === 'gallery') {
      fetchMediaGallery();
    }
  }, [mediaCategory, activeTab, fetchMediaGallery]);

  // Handle submission form changes
  const handleSubmissionChange = (e) => {
    const { name, value } = e.target;
    setSubmissionForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle homework submission
  const handleSubmitHomework = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload = {
        submissionFile: submissionForm.submissionFile,
        note: submissionForm.note
      };

      await axios.post(
        `${API_URL}/api/student/homeworks/${selectedHomework.id}/submit`,
        payload,
        getHeaders()
      );

      setSuccessMessage('Homework submitted successfully!');
      setShowSubmissionModal(false);
      setSubmissionForm({ submissionFile: '', note: '' });
      fetchHomeworks();
    } catch (err) {
      console.error('Homework submission error:', err);
      setError(err.response?.data?.error?.message || 'Failed to submit homework');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle view report card
  const handleViewReportCard = (reportCard) => {
    setSelectedReportCard(reportCard);
    setShowReportModal(true);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if homework is overdue
  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  // Get grade color
  const getGradeColor = (grade) => {
    const colors = {
      'A+': 'bg-green-500/20 text-green-400 border-green-500/30',
      'A': 'bg-green-500/20 text-green-400 border-green-500/30',
      'B+': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'B': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'C+': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'C': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'D': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'F': 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[grade] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  // Category label mapping
  const getCategoryLabel = (category) => {
    const labels = {
      'all': 'All Media',
      'Event Photos': 'Events',
      'Sports Day': 'Sports',
      'Annual Day': 'Annual Day',
      'Classroom Video': 'Classroom',
      'Learning Video': 'Learning',
      'Home Video': 'Home Videos'
    };
    return labels[category] || category;
  };

  // Loading state
  if (loading && !studentInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Side Navigation */}
      <aside className="relative z-20 w-64 min-h-screen backdrop-blur-xl bg-white/5 border-r border-white/10 hidden lg:block">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-pink-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">EduAdmin</span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {['overview', 'report-cards', 'homework', 'gallery', 'news'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab 
                    ? 'bg-gradient-to-r from-indigo-600/20 to-pink-600/20 text-white border border-indigo-500/30' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab === 'overview' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                )}
                {tab === 'report-cards' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                {tab === 'homework' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                )}
                {tab === 'gallery' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {tab === 'news' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                )}
                {tab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </button>
            ))}
          </nav>
        </div>

        {/* User Profile at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'S'}
              </span>
            </div>
            <div>
              <p className="text-white font-medium text-sm truncate">{user?.name || 'Student'}</p>
              <p className="text-gray-400 text-xs truncate">{user?.email || 'student@school.com'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 relative z-10 flex flex-col">
        {/* Header */}
        <header className="backdrop-blur-xl bg-white/5 border-b border-white/10">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {activeTab === 'overview' && 'Student Overview'}
                  {activeTab === 'report-cards' && 'Report Cards'}
                  {activeTab === 'homework' && 'Homework & Assignments'}
                  {activeTab === 'gallery' && 'Media Gallery'}
                  {activeTab === 'news' && 'School News & Announcements'}
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  {activeTab === 'overview' && 'Track your academic progress'}
                  {activeTab === 'report-cards' && 'View your academic performance'}
                  {activeTab === 'homework' && 'Manage your assignments'}
                  {activeTab === 'gallery' && 'School photos and videos'}
                  {activeTab === 'news' && 'Latest updates from school'}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-auto">
          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 backdrop-blur-sm animate-fade-in">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-200">{successMessage}</span>
                <button onClick={() => setSuccessMessage('')} className="ml-auto text-green-400 hover:text-green-300">×</button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 backdrop-blur-sm animate-fade-in">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-200">{error}</span>
                <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">×</button>
              </div>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && studentInfo && (
            <div className="space-y-8">
              {/* Student Info Card */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">
                      {studentInfo.name?.charAt(0)?.toUpperCase() || 'S'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white">{studentInfo.name}</h2>
                    <p className="text-gray-400">{studentInfo.email}</p>
                    <div className="flex gap-4 mt-2">
                      <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-400 text-sm">
                        Class: {studentInfo.class?.name || studentInfo.classGrade || '-'}
                      </span>
                      <span className="px-3 py-1 bg-pink-500/20 border border-pink-500/30 rounded-full text-pink-400 text-sm">
                        Roll: {studentInfo.rollNumber || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Attendance */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400 text-sm">Attendance</span>
                    <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {studentInfo.attendance?.percentage || 0}%
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-pink-500 h-2 rounded-full" 
                      style={{ width: `${studentInfo.attendance?.percentage || 0}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    {studentInfo.attendance?.present || 0} / {studentInfo.attendance?.total || 0} days
                  </p>
                </div>

                {/* Latest GPA */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400 text-sm">Latest GPA</span>
                    <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {reportCards.length > 0 ? (reportCards[0].totalPercentage || 0).toFixed(1) : '-'}%
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    Grade: {reportCards.length > 0 ? reportCards[0].overallGrade : '-'}
                  </p>
                </div>

                {/* Pending Homework */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400 text-sm">Pending Work</span>
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {homeworks.filter(hw => {
                      const hasSubmission = hw.submissions?.find(s => s.student?._id === user?.id || s.student === user?.id);
                      return !hasSubmission && new Date(hw.dueDate) >= new Date();
                    }).length}
                  </div>
                  <p className="text-gray-500 text-xs mt-2">Assignments pending</p>
                </div>
              </div>

              {/* Recent Report Cards */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Report Cards</h3>
                <div className="space-y-3">
                  {reportCards.slice(0, 3).map((rc) => (
                    <div key={rc.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{rc.overallGrade?.charAt(0) || '-'}</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{rc.academicYear} - {rc.term}</p>
                          <p className="text-gray-400 text-xs">Percentage: {rc.totalPercentage?.toFixed(1) || '-'}%</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewReportCard(rc)}
                        className="px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-indigo-400 hover:bg-indigo-500/30 transition-colors text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  ))}
                  {reportCards.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No report cards available yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Report Cards Tab */}
          {activeTab === 'report-cards' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportCards.map((rc) => (
                  <div key={rc.id} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-white font-bold text-lg">{rc.academicYear}</p>
                        <p className="text-gray-400 text-sm">{rc.term}</p>
                      </div>
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white font-bold text-2xl">{rc.overallGrade || '-'}</span>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Percentage</span>
                        <span className="text-white font-medium">{rc.totalPercentage?.toFixed(1) || '-'}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Subjects</span>
                        <span className="text-white font-medium">{rc.subjects?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Attendance</span>
                        <span className="text-white font-medium">{rc.attendance?.percentage?.toFixed(1) || '-'}%</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewReportCard(rc)}
                      className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-medium rounded-lg transition-all duration-300"
                    >
                      View Report Card
                    </button>
                  </div>
                ))}
              </div>
              {reportCards.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-400">No report cards available</p>
                  <p className="text-gray-500 text-sm mt-1">Report cards will appear here once published</p>
                </div>
              )}
            </div>
          )}

          {/* Homework Tab */}
          {activeTab === 'homework' && (
            <div className="space-y-6">
              {homeworks.map((hw) => {
                const studentSubmission = hw.submissions?.find(s => s.student?._id === user?.id || s.student === user?.id);
                const isSubmitted = !!studentSubmission;
                const isPastDue = isOverdue(hw.dueDate);

                return (
                  <div key={hw.id} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{hw.title}</h3>
                          {isSubmitted && (
                            <span className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-xs">
                              Submitted
                            </span>
                          )}
                          {isPastDue && !isSubmitted && (
                            <span className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs">
                              Overdue
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-3">{hw.description}</p>
                        <div className="flex gap-4 text-sm">
                          <span className="text-gray-400">Subject: {hw.subject}</span>
                          <span className="text-gray-400">Class: {hw.classGrade}</span>
                          <span className={` ${(isPastDue && !isSubmitted) ? 'text-red-400' : 'text-gray-400'}`}>
                            Due: {formatDate(hw.dueDate)}
                          </span>
                          <span className="text-gray-400">Max Marks: {hw.maxMarks}</span>
                        </div>
                        {studentSubmission && studentSubmission.status === 'Checked' && (
                          <div className="mt-3 p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-4">
                              <span className="text-white font-medium">Marks: {studentSubmission.marks}/{studentSubmission.maxMarks}</span>
                              {studentSubmission.feedback && (
                                <span className="text-gray-400 text-sm">Feedback: {studentSubmission.feedback}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {!isSubmitted && !isPastDue && (
                        <button
                          onClick={() => {
                            setSelectedHomework(hw);
                            setShowSubmissionModal(true);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-medium rounded-lg transition-all duration-300"
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {homeworks.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-400">No homework assignments</p>
                  <p className="text-gray-500 text-sm mt-1">Check back later for new assignments</p>
                </div>
              )}
            </div>
          )}

          {/* Media Gallery Tab */}
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              {/* Category Filters */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex flex-wrap gap-2">
                  {['all', 'Event Photos', 'Sports Day', 'Annual Day', 'Classroom Video', 'Learning Video'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setMediaCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-sm transition-all ${
                        mediaCategory === cat
                          ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white'
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {getCategoryLabel(cat)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Media Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mediaGallery.map((media) => (
                  <div
                    key={media.id}
                    onClick={() => {
                      setSelectedMedia(media);
                      setShowMediaModal(true);
                    }}
                    className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                  >
                    {media.mediaType === 'Image' ? (
                      <img
                        src={media.url}
                        alt={media.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        {media.thumbnailUrl ? (
                          <img src={media.thumbnailUrl} alt={media.title} className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <div>
                        <p className="text-white font-medium text-sm">{media.title}</p>
                        <p className="text-gray-300 text-xs">{media.category}</p>
                      </div>
                    </div>
                    {media.mediaType === 'Video' && (
                      <div className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {mediaGallery.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-400">No media available</p>
                  <p className="text-gray-500 text-sm mt-1">School media will appear here</p>
                </div>
              )}
            </div>
          )}

          {/* News Tab */}
          {activeTab === 'news' && (
            <div className="space-y-6">
              {news.map((item) => (
                <div key={item.id} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-start gap-4">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-24 h-24 object-cover rounded-xl"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded text-indigo-400 text-xs">
                          {item.category || 'Announcement'}
                        </span>
                        <span className="text-gray-500 text-xs">{formatDate(item.publishedAt || item.createdAt)}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                      <p className="text-gray-400 text-sm">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
              {news.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  <p className="text-gray-400">No news or announcements</p>
                  <p className="text-gray-500 text-sm mt-1">Check back later for updates</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Report Card Modal */}
      {showReportModal && selectedReportCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowReportModal(false)}
          ></div>
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Report Card</h2>
                  <p className="text-gray-400 text-sm">{selectedReportCard.academicYear} - {selectedReportCard.term}</p>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Overall Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-400">{selectedReportCard.totalPercentage?.toFixed(1) || '-'}%</p>
                  <p className="text-gray-400 text-xs">Overall</p>
                </div>
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center mb-2">
                    <span className="text-white font-bold text-xl">{selectedReportCard.overallGrade || '-'}</span>
                  </div>
                  <p className="text-gray-400 text-xs">Grade</p>
                </div>
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-pink-400">{selectedReportCard.rank ? `#${selectedReportCard.rank}` : '-'}</p>
                  <p className="text-gray-400 text-xs">Rank in Class</p>
                </div>
              </div>

              {/* Subjects */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Subject-wise Performance</h3>
                <div className="space-y-3">
                  {selectedReportCard.subjects?.map((subject, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                      <div className="flex-1">
                        <p className="text-white font-medium">{subject.subjectName}</p>
                        {subject.remarks && <p className="text-gray-500 text-xs mt-1">{subject.remarks}</p>}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-white font-medium">{subject.marksObtained}/{subject.totalMarks}</p>
                          <p className="text-gray-500 text-xs">{subject.marksObtained / subject.totalMarks * 100}%</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getGradeColor(subject.grade)}`}>
                          {subject.grade}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance */}
              {selectedReportCard.attendance && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Attendance</h3>
                  <div className="p-4 rounded-xl bg-white/5">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Present Days</span>
                      <span className="text-white">{selectedReportCard.attendance.present} / {selectedReportCard.attendance.total}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-pink-500 h-2 rounded-full" 
                        style={{ width: `${selectedReportCard.attendance.percentage || 0}%` }}
                      ></div>
                    </div>
                    <p className="text-gray-500 text-xs mt-2">{selectedReportCard.attendance.percentage?.toFixed(1) || '-'}% attendance</p>
                  </div>
                </div>
              )}

              {/* Remarks */}
              {(selectedReportCard.teacherRemarks || selectedReportCard.principalRemarks) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Remarks</h3>
                  {selectedReportCard.teacherRemarks && (
                    <div className="p-4 rounded-xl bg-white/5 mb-3">
                      <p className="text-indigo-400 text-sm font-medium mb-1">Teacher's Remarks</p>
                      <p className="text-gray-300">{selectedReportCard.teacherRemarks}</p>
                    </div>
                  )}
                  {selectedReportCard.principalRemarks && (
                    <div className="p-4 rounded-xl bg-white/5">
                      <p className="text-pink-400 text-sm font-medium mb-1">Principal's Remarks</p>
                      <p className="text-gray-300">{selectedReportCard.principalRemarks}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Download Button */}
              {selectedReportCard.pdfReportUrl && (
                <a
                  href={selectedReportCard.pdfReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-medium rounded-xl transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF Report Card
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Homework Submission Modal */}
      {showSubmissionModal && selectedHomework && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowSubmissionModal(false);
              setSubmissionForm({ submissionFile: '', note: '' });
            }}
          ></div>
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Submit Homework</h2>
                <button
                  onClick={() => {
                    setShowSubmissionModal(false);
                    setSubmissionForm({ submissionFile: '', note: '' });
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-gray-300 mb-4">{selectedHomework.title}</p>

              <form onSubmit={handleSubmitHomework} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Submission File/Link</label>
                  <input
                    type="url"
                    name="submissionFile"
                    value={submissionForm.submissionFile}
                    onChange={handleSubmissionChange}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="https://drive.google.com/... or https://..."
                  />
                  <p className="text-gray-500 text-xs mt-1">Provide a link to your submission (Google Drive, etc.)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Note (Optional)</label>
                  <textarea
                    name="note"
                    value={submissionForm.note}
                    onChange={handleSubmissionChange}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                    placeholder="Any message for your teacher..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubmissionModal(false);
                      setSubmissionForm({ submissionFile: '', note: '' });
                    }}
                    className="flex-1 px-6 py-3 border border-white/10 rounded-xl text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !submissionForm.submissionFile}
                    className={`flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 ${actionLoading || !submissionForm.submissionFile ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {actionLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </span>
                    ) : 'Submit Homework'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {showMediaModal && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowMediaModal(false)}
          ></div>
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl">
            <button
              onClick={() => setShowMediaModal(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {selectedMedia.mediaType === 'Image' ? (
              <img
                src={selectedMedia.url}
                alt={selectedMedia.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                src={selectedMedia.url}
                controls
                className="w-full h-full"
                autoPlay
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <h3 className="text-white font-bold text-lg">{selectedMedia.title}</h3>
              {selectedMedia.description && <p className="text-gray-300 text-sm mt-1">{selectedMedia.description}</p>}
              <p className="text-gray-500 text-xs mt-2">{selectedMedia.category} • {formatDate(selectedMedia.eventDate)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentParentDashboard;