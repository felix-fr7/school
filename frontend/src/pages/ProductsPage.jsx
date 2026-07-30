/**
 * Products Page
 * Multi-Tenant School Management System
 * 
 * Tenant-isolated product management page
 * - Fetches and displays products for the current tenant
 * - Create, update, delete products (admin only)
 * - Automatic tenant context handling via x-tenant-id header
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { productsAPI } from '../services/api';

const ProductsPage = () => {
  const { user, tenantId, isAdmin, isTenantAdmin, isSuperAdmin, logout } = useAuth();
  
  // State
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    sku: '',
    price: 0,
    stock_quantity: 0,
    category: ''
  });

  // Check if user can manage products (admin roles only)
  const canManageProducts = isAdmin || isTenantAdmin || isSuperAdmin;

  // Fetch data when tenant changes
  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  const fetchData = async () => {
    if (!tenantId) {
      setError('No tenant selected. Please select a tenant to view products.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch products and stats in parallel
      const [productsResponse, statsResponse] = await Promise.all([
        productsAPI.getAllProducts({ limit: 50 }),
        productsAPI.getStats()
      ]);

      if (productsResponse.success) {
        setProducts(productsResponse.data.products);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock_quantity'
        ? parseFloat(value) || 0
        : value
    }));
  };

  // Create new product
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    
    if (!newProduct.name) {
      setError('Product name is required');
      return;
    }

    try {
      setCreating(true);
      const response = await productsAPI.createProduct(newProduct);
      
      if (response.success) {
        // Refresh data
        fetchData();
        // Close modal and reset form
        setShowCreateModal(false);
        setNewProduct({
          name: '',
          description: '',
          sku: '',
          price: 0,
          stock_quantity: 0,
          category: ''
        });
        setError(null);
      }
    } catch (err) {
      console.error('Error creating product:', err);
      setError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setCreating(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await productsAPI.deleteProduct(productId);
      
      if (response.success) {
        // Remove from local state
        setProducts(prev => prev.filter(p => p.id !== productId));
        // Refresh stats
        fetchData();
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Failed to delete product');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading products...</div>
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
                Products Management
              </h1>
              <p className="text-gray-600 mt-1">
                {user?.name} • Tenant: {tenantId ? tenantId.substring(0, 8) + '...' : 'Not set'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.total_products}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-green-600">Active Products</h3>
              <p className="text-2xl font-bold text-green-600">{stats.active_products}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-blue-600">Inventory Value</h3>
              <p className="text-2xl font-bold text-blue-600">${stats.inventory_value?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-yellow-600">Low Stock</h3>
              <p className="text-2xl font-bold text-yellow-600">{stats.low_stock}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-red-600">Out of Stock</h3>
              <p className="text-2xl font-bold text-red-600">{stats.out_of_stock}</p>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Products ({products.length})
            </h2>
            {canManageProducts && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Add Product
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  {canManageProducts && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      {product.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {product.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono">{product.sku || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{product.category || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${product.price?.toFixed(2) || '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        product.stock_quantity === 0
                          ? 'text-red-600'
                          : product.stock_quantity < 10
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}>
                        {product.stock_quantity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(product.created_at).toLocaleDateString()}
                    </td>
                    {canManageProducts && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={canManageProducts ? 8 : 7} className="px-6 py-4 text-center text-gray-500">
                      No products found for this tenant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Product</h3>
            </div>
            
            <form onSubmit={handleCreateProduct} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newProduct.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., School Uniform"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={newProduct.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Product description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      SKU
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={newProduct.sku}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., PROD-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <input
                      type="text"
                      name="category"
                      value={newProduct.category}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Uniforms"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={newProduct.price}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      name="stock_quantity"
                      value={newProduct.stock_quantity}
                      onChange={handleInputChange}
                      min="0"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  {creating ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;