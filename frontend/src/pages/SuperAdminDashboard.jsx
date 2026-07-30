/**
 * SuperAdmin Dashboard
 * Multi-Tenant School Management System
 * 
 * Dashboard view for SUPER_ADMIN users to manage tenants
 * - View all active tenants in a table format
 * - Create new tenants
 * - Toggle tenant status (ACTIVE / SUSPENDED)
 * - View system-wide statistics
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { superadminAPI } from '../services/api';

const SuperAdminDashboard = () => {
  const { user, isSuperAdmin, logout } = useAuth();
  
  // State
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    domain_slug: '',
    subscription_plan: 'FREE',
    max_users: 100,
    max_students: 1000
  });

  // Check if user is SUPER_ADMIN
  useEffect(() => {
    if (!isSuperAdmin) {
      setError('Access denied. SUPER_ADMIN role required.');
    }
  }, [isSuperAdmin]);

  // Fetch data
  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats and tenants in parallel
      const [statsResponse, tenantsResponse] = await Promise.all([
        superadminAPI.getStats(),
        superadminAPI.getAllTenants({ limit: 50 })
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      if (tenantsResponse.success) {
        setTenants(tenantsResponse.data.tenants);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTenant(prev => ({
      ...prev,
      [name]: name === 'max_users' || name === 'max_students' 
        ? parseInt(value) || 0 
        : value
    }));
  };

  // Create new tenant
  const handleCreateTenant = async (e) => {
    e.preventDefault();
    
    if (!newTenant.name || !newTenant.domain_slug) {
      setError('Name and domain slug are required');
      return;
    }

    try {
      setCreating(true);
      const response = await superadminAPI.createTenant(newTenant);
      
      if (response.success) {
        // Refresh data
        fetchData();
        // Close modal and reset form
        setShowCreateModal(false);
        setNewTenant({
          name: '',
          domain_slug: '',
          subscription_plan: 'FREE',
          max_users: 100,
          max_students: 1000
        });
        setError(null);
      }
    } catch (err) {
      console.error('Error creating tenant:', err);
      setError(err.response?.data?.message || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  // Toggle tenant status
  const handleToggleStatus = async (tenantId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    
    try {
      const response = await superadminAPI.updateTenantStatus(tenantId, newStatus);
      
      if (response.success) {
        // Update local state
        setTenants(prev => prev.map(t => 
          t.id === tenantId ? { ...t, status: newStatus } : t
        ));
        // Refresh stats
        fetchData();
      }
    } catch (err) {
      console.error('Error updating tenant status:', err);
      alert('Failed to update tenant status');
    }
  };

  // Delete tenant
  const handleDeleteTenant = async (tenantId) => {
    if (!window.confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await superadminAPI.deleteTenant(tenantId);
      
      if (response.success) {
        // Remove from local state
        setTenants(prev => prev.filter(t => t.id !== tenantId));
        // Refresh stats
        fetchData();
      }
    } catch (err) {
      console.error('Error deleting tenant:', err);
      alert('Failed to delete tenant');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You need SUPER_ADMIN privileges to access this page.
          </p>
          <button
            onClick={logout}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Super Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome, {user?.name} ({user?.email})
              </p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Total Tenants</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.tenants.total}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-green-600 uppercase">Active Tenants</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {stats.tenants.active}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-red-600 uppercase">Suspended Tenants</h3>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {stats.tenants.suspended}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-blue-600 uppercase">Total Users</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {stats.users.total}
              </p>
            </div>
          </div>
        )}

        {/* Tenants Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Tenants ({tenants.length})
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Create New Tenant
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users / Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants.map(tenant => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{tenant.domain_slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tenant.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{tenant.subscription_plan || 'FREE'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {tenant.admin_count || 0} admins
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleToggleStatus(tenant.id, tenant.status)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        {tenant.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteTenant(tenant.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      No tenants found. Create your first tenant to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create New Tenant</h3>
            </div>
            
            <form onSubmit={handleCreateTenant} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tenant Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newTenant.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., MacVell Public School"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Domain Slug *
                  </label>
                  <input
                    type="text"
                    name="domain_slug"
                    value={newTenant.domain_slug}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., macvell-school"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    This will be used in the URL (e.g., macvell-school.yourapp.com)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Subscription Plan
                  </label>
                  <select
                    name="subscription_plan"
                    value={newTenant.subscription_plan}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="FREE">Free</option>
                    <option value="STANDARD">Standard</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Max Users
                    </label>
                    <input
                      type="number"
                      name="max_users"
                      value={newTenant.max_users}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Max Students
                    </label>
                    <input
                      type="number"
                      name="max_students"
                      value={newTenant.max_students}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;