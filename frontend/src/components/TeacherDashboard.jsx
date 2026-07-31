/**
 * Teacher Dashboard
 * Professional corporate dashboard for Teachers
 * Features: Homework management, assignment tracking, student submissions viewer, grading
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TeacherDashboard = () => {
  // Auth context
  const { user, token, tenantId } = useAuth();

  // State management
  const [stats, setStats] = useState(null);
  const [homeworks, setHomeworks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [editingHomework, setEditingHomework] = useState(null);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterClass, setFilterClass] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

  // Homework form state
  const [homeworkForm, setHomeworkForm] = useState({
    title: '',
    subject: '',
    classGrade: '',
    description: '',
    dueDate: '',
    maxMarks: 100,
    classId: '',
    attachments: '',
    tags: ''
  });

  // Grading form state
  const [gradingForm, setGradingForm] = useState({
    marks: '',
    maxMarks: '',
    feedback: ''
  });

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

  // Fetch dashboard statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/teacher/stats`, getHeaders());
      setStats(response.data.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load dashboard statistics');
    }
  }, [getHeaders]);

  // Fetch homeworks
  const fetchHomeworks = useCallback(async () => {
    try {
      const params = { 
        page: pagination.page, 
        limit: pagination.limit
      };
      
      if (filterClass !== 'all') {
        params.classId = filterClass;
      }

      const response = await axios.get(`${API_URL}/api/teacher/homeworks`, {
        ...getHeaders(),
        params
      });

      if (response.data.success) {
        setHomeworks(response.data.data.homeworks);
        setPagination(response.data.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching homeworks:', err);
      setError('Failed to load homework assignments');
    }
  }, [getHeaders, pagination.page, pagination.limit, filterClass]);

  // Fetch classes for the teacher
  const fetchClasses = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/teacher/classes`, getHeaders());
      if (response.data.success) {
        setClasses(response.data.data.classes || []);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  }, [getHeaders]);

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchStats(), fetchHomeworks(), fetchClasses()]);
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
  }, [token, tenantId, fetchStats, fetchHomeworks, fetchClasses]);

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setHomeworkForm(prev => ({ ...prev, [name]: value }));
  };

  // Reset homework form
  const resetHomeworkForm = () => {
    setHomeworkForm({
      title: '',
      subject: '',
      classGrade: '',
      description: '',
      dueDate: '',
      maxMarks: 100,
      classId: '',
      attachments: '',
      tags: ''
    });
    setEditingHomework(null);
  };

  // Handle homework creation/update
  const handleSaveHomework = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload = {
        ...homeworkForm,
        schoolId: tenantId,
        teacher: user?.id,
        maxMarks: parseInt(homeworkForm.maxMarks) || 100,
        attachments: homeworkForm.attachments 
          ? homeworkForm.attachments.split(',').map(url => url.trim()).filter(Boolean)
          : [],
        tags: homeworkForm.tags 
          ? homeworkForm.tags.split(',').map(tag => tag.trim()).filter(Boolean)
          : []
      };

      if (editingHomework) {
        // Update existing homework
        const response = await axios.put(
          `${API_URL}/api/teacher/homeworks/${editingHomework.id}`,
          payload,
          getHeaders()
        );
        setSuccessMessage(`Homework "${response.data.data.homework.title}" updated successfully!`);
      } else {
        // Create new homework
        const response = await axios.post(
          `${API_URL}/api/teacher/homeworks`,
          payload,
          getHeaders()
        );
        setSuccessMessage(`Homework "${response.data.data.homework.title}" created successfully!`);
      }

      setShowHomeworkModal(false);
      resetHomeworkForm();
      fetchHomeworks();
      fetchStats();
    } catch (err) {
      console.error('Homework save error:', err);
      setError(err.response?.data?.error?.message || 'Failed to save homework');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit homework
  const handleEditHomework = (homework) => {
    setEditingHomework(homework);
    setHomeworkForm({
      title: homework.title || '',
      subject: homework.subject || '',
      classGrade: homework.classGrade || '',
      description: homework.description || '',
      dueDate: homework.dueDate ? new Date(homework.dueDate).toISOString().split('T')[0] : '',
      maxMarks: homework.maxMarks || 100,
      classId: homework.classId || '',
      attachments: homework.attachments ? homework.attachments.join(', ') : '',
      tags: homework.tags ? homework.tags.join(', ') : ''
    });
    setShowHomeworkModal(true);
  };

  // Handle delete homework
  const handleDeleteHomework = async (homeworkId, homeworkTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${homeworkTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/teacher/homeworks/${homeworkId}`, getHeaders());
      setSuccessMessage(`Homework "${homeworkTitle}" deleted successfully`);
      fetchHomeworks();
      fetchStats();
    } catch (err) {
      setError('Failed to delete homework');
    }
  };

  // Handle view submissions
  const handleViewSubmissions = async (homework) => {
    setSelectedHomework(homework);
    setSubmissions(homework.submissions || []);
    setShowSubmissionsModal(true);
  };

  // Handle open grading modal
  const handleOpenGrading = (submission) => {
    setGradingSubmission(submission);
    setGradingForm({
      marks: submission.marks || '',
      maxMarks: submission.maxMarks || selectedHomework?.maxMarks || 100,
      feedback: submission.feedback || ''
    });
  };

  // Handle grade submission
  const handleGradeSubmission = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload = {
        marks: parseInt(gradingForm.marks),
        maxMarks: parseInt(gradingForm.maxMarks),
        feedback: gradingForm.feedback,
        status: 'Checked'
      };

      await axios.patch(
        `${API_URL}/api/teacher/homeworks/${selectedHomework.id}/submissions/${gradingSubmission.student.id}/grade`,
        payload,
        getHeaders()
      );

      setSuccessMessage('Submission graded successfully!');
      setGradingSubmission(null);
      
      // Refresh submissions
      const response = await axios.get(
        `${API_URL}/api/teacher/homeworks/${selectedHomework.id}`,
        getHeaders()
      );
      if (response.data.success) {
        setSubmissions(response.data.data.homework.submissions || []);
      }
    } catch (err) {
      console.error('Grading error:', err);
      setError(err.response?.data?.error?.message || 'Failed to grade submission');
    } finally {
      setActionLoading(false);
    }
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

  // Status badge component
  const SubmissionStatusBadge = ({ status }) => {
    const colors = {
      'Submitted': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Checked': 'bg-green-500/20 text-green-400 border-green-500/30'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status] || colors.Pending}`}>
        {status}
      </span>
    );
  };

  // Loading state
  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Side Navigation */}
      <aside className="relative z-20 w-64 min-h-screen backdrop-blur-xl bg-white/5 border-r border-white/10 hidden lg:block">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">EduAdmin</span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'overview' 
                  ? 'bg-gradient-to-r from-emerald-600/20 to-blue-600/20 text-white border border-emerald-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Overview
            </button>
            <button
              onClick={() => setActiveTab('homeworks')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'homeworks' 
                  ? 'bg-gradient-to-r from-emerald-600/20 to-blue-600/20 text-white border border-emerald-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Homework
            </button>
          </nav>
        </div>

        {/* User Profile at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'T'}
              </span>
            </div>
            <div>
              <p className="text-white font-medium text-sm truncate">{user?.name || 'Teacher'}</p>
              <p className="text-gray-400 text-xs truncate">{user?.email || 'teacher@school.com'}</p>
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
                <h1 className="text-2xl font-bold text-white">Teacher Dashboard</h1>
                <p className="text-gray-400 text-sm mt-1">Manage your classes and homework assignments</p>
              </div>
              {activeTab === 'homeworks' && (
                <button
                  onClick={() => {
                    resetHomeworkForm();
                    setShowHomeworkModal(true);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Homework
                </button>
              )}
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
          {activeTab === 'overview' && stats && (
            <div className="space-y-8">
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Assigned Classes */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Assigned Classes</p>
                      <p className="text-3xl font-bold text-emerald-400 mt-1">{stats.classes || 0}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Total Homework Created */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Homework Created</p>
                      <p className="text-3xl font-bold text-blue-400 mt-1">{stats.homeworkCreated || 0}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Pending Submissions */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Pending Reviews</p>
                      <p className="text-3xl font-bold text-yellow-400 mt-1">{stats.pendingSubmissions || 0}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Recent Activity</p>
                      <p className="text-3xl font-bold text-purple-400 mt-1">{stats.recentActivity || 0}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Homework */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Homework</h3>
                <div className="space-y-3">
                  {homeworks.slice(0, 5).map((hw) => (
                    <div key={hw.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">{hw.title}</p>
                          <p className="text-gray-400 text-xs">{hw.subject} • {hw.classGrade} • Due: {formatDate(hw.dueDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-white font-medium">{hw.submissions?.length || 0} submissions</p>
                          <p className="text-gray-400 text-xs">
                            {(hw.submissions || []).filter(s => s.status === 'Checked').length} checked
                          </p>
                        </div>
                        <button
                          onClick={() => handleViewSubmissions(hw)}
                          className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  )}
                  {homeworks.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No homework created yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Homework Tab */}
          {activeTab === 'homeworks' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  >
                    <option value="all">All Classes</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name || cls.className}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Homework Table */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Homework</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider hidden md:table-cell">Subject/Class</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Due Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider hidden lg:table-cell">Submissions</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {homeworks.map((hw) => (
                        <tr key={hw.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-white font-medium">{hw.title}</div>
                              <div className="text-gray-400 text-xs mt-1 line-clamp-1">{hw.description}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                            <div className="text-gray-300 text-sm">{hw.subject}</div>
                            <div className="text-gray-500 text-xs">{hw.classGrade}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${isOverdue(hw.dueDate) ? 'text-red-400' : 'text-gray-300'}`}>
                              {formatDate(hw.dueDate)}
                              {isOverdue(hw.dueDate) && <span className="ml-1 text-xs">(Overdue)</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                            <div className="text-gray-300 text-sm">
                              {hw.submissions?.length || 0} total
                            </div>
                            <div className="text-gray-500 text-xs">
                              {hw.submissions?.filter(s => s.status === 'Checked')?.length || 0} checked
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                              hw.isPublished 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                            }`}>
                              {hw.isPublished ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewSubmissions(hw)}
                                className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="View Submissions"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleEditHomework(hw)}
                                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="Edit Homework"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteHomework(hw.id, hw.title)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Delete Homework"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {homeworks.length === 0 && (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-400">No homework found</p>
                    <p className="text-gray-500 text-sm mt-1">Create your first homework assignment</p>
                  </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="px-6 py-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-400">
                        Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} homeworks
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                          disabled={pagination.page === 1}
                          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                          disabled={pagination.page === pagination.pages}
                          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Homework Modal */}
      {showHomeworkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowHomeworkModal(false);
              resetHomeworkForm();
            }}
          ></div>

          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingHomework ? 'Edit Homework' : 'Create New Homework'}
                </h2>
                <button
                  onClick={() => {
                    setShowHomeworkModal(false);
                    resetHomeworkForm();
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveHomework} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Homework Details</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={homeworkForm.title}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      placeholder="Enter homework title"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Subject *</label>
                      <input
                        type="text"
                        name="subject"
                        value={homeworkForm.subject}
                        onChange={handleFormChange}
                        required
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        placeholder="e.g., Mathematics"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Class/Grade *</label>
                      <select
                        name="classGrade"
                        value={homeworkForm.classGrade}
                        onChange={handleFormChange}
                        required
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      >
                        <option value="">Select class</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.name || cls.className}>
                            {cls.name || cls.className}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={homeworkForm.description}
                      onChange={handleFormChange}
                      rows={4}
                      maxLength={2000}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                      placeholder="Enter homework description and instructions..."
                    />
                    <p className="text-gray-500 text-xs mt-1 text-right">{homeworkForm.description.length}/2000</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Due Date *</label>
                      <input
                        type="date"
                        name="dueDate"
                        value={homeworkForm.dueDate}
                        onChange={handleFormChange}
                        required
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Max Marks</label>
                      <input
                        type="number"
                        name="maxMarks"
                        value={homeworkForm.maxMarks}
                        onChange={handleFormChange}
                        min={1}
                        max={1000}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Attachments (URLs, comma-separated)</label>
                    <input
                      type="text"
                      name="attachments"
                      value={homeworkForm.attachments}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      placeholder="https://example.com/file.pdf, https://example.com/doc.pdf"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      name="tags"
                      value={homeworkForm.tags}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      placeholder="chapter1, exercise, important"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowHomeworkModal(false);
                      resetHomeworkForm();
                    }}
                    className="flex-1 px-6 py-3 border border-white/10 rounded-xl text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className={`flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 ${actionLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {actionLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      editingHomework ? 'Update Homework' : 'Create Homework'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {showSubmissionsModal && selectedHomework && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowSubmissionsModal(false);
              setGradingSubmission(null);
            }}
          ></div>

          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Student Submissions</h2>
                  <p className="text-gray-400 text-sm mt-1">{selectedHomework.title} • {selectedHomework.subject}</p>
                </div>
                <button
                  onClick={() => {
                    setShowSubmissionsModal(false);
                    setGradingSubmission(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Submissions Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {submissions.filter(s => s.status === 'Submitted' || s.status === 'Checked').length}
                  </p>
                  <p className="text-gray-400 text-sm">Submitted</p>
                </div>
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-400">
                    {submissions.filter(s => s.status === 'Pending').length}
                  </p>
                  <p className="text-gray-400 text-sm">Pending</p>
                </div>
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {submissions.filter(s => s.status === 'Checked').length}
                  </p>
                  <p className="text-gray-400 text-sm">Checked</p>
                </div>
              </div>

              {/* Grading Form */}
              {gradingSubmission && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold text-white mb-4">Grade Submission</h3>
                  <form onSubmit={handleGradeSubmission} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Marks Awarded *</label>
                        <input
                          type="number"
                          value={gradingForm.marks}
                          onChange={(e) => setGradingForm(prev => ({ ...prev, marks: e.target.value }))}
                          required
                          min={0}
                          max={gradingForm.maxMarks}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Max Marks</label>
                        <input
                          type="number"
                          value={gradingForm.maxMarks}
                          onChange={(e) => setGradingForm(prev => ({ ...prev, maxMarks: e.target.value }))}
                          required
                          min={1}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Feedback</label>
                      <textarea
                        value={gradingForm.feedback}
                        onChange={(e) => setGradingForm(prev => ({ ...prev, feedback: e.target.value }))}
                        rows={3}
                        maxLength={500}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                        placeholder="Enter feedback for the student..."
                      />
                    </div>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setGradingSubmission(null)}
                        className="px-4 py-2 border border-white/10 rounded-lg text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className={`px-4 py-2 bg-gradient-to-r from-emerald-600 to-blue-600 text-white font-medium rounded-lg transition-all ${actionLoading ? 'opacity-70' : ''}`}
                      >
                        {actionLoading ? 'Saving...' : 'Save Grade'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Submissions List */}
              <div className="space-y-3">
                {submissions.map((submission, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {submission.student?.name?.charAt(0)?.toUpperCase() || 'S'}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{submission.student?.name || 'Student'}</p>
                        <p className="text-gray-400 text-xs">
                          {submission.submittedAt ? `Submitted: ${formatDate(submission.submittedAt)}` : 'Not submitted'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {submission.status === 'Checked' && (
                        <div className="text-right">
                          <p className="text-white font-medium">{submission.marks}/{submission.maxMarks}</p>
                          {submission.feedback && <p className="text-gray-400 text-xs line-clamp-1">{submission.feedback}</p>}
                        </div>
                      )}
                      <SubmissionStatusBadge status={submission.status} />
                      {submission.status !== 'Checked' && submission.status === 'Submitted' && (
                        <button
                          onClick={() => handleOpenGrading(submission)}
                          className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm"
                        >
                          Grade
                        </button>
                      )}
                      {submission.status === 'Checked' && (
                        <button
                          onClick={() => handleOpenGrading(submission)}
                          className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors text-sm"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {submissions.length === 0 && (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-400">No submissions yet</p>
                    <p className="text-gray-500 text-sm mt-1">Students haven't submitted their work</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;