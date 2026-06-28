/**
 * Post Context
 * Provides post state and CRUD operations throughout the app
 */

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Post, CreatePostInput, UpdatePostInput, PostContextType } from '../types';
import { postsAPI } from '../services/api';

// Create context
const PostContext = createContext<PostContextType | undefined>(undefined);

// Provider component
export const PostProvider = ({ children }: { children: ReactNode }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all posts
   */
  const fetchPosts = async (page = 1, limit = 10, search?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await postsAPI.getAllPosts(page, limit, search);

      if (response.success && response.data) {
        setPosts(response.data.posts);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch posts');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch posts';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch single post by ID
   */
  const fetchPost = async (id: string): Promise<Post | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await postsAPI.getPost(id);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to fetch post');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch post';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create new post
   */
  const createPost = async (data: CreatePostInput): Promise<Post | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await postsAPI.createPost(data.title, data.content);

      if (response.success && response.data) {
        setPosts([response.data, ...posts]);
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to create post');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update post
   */
  const updatePost = async (id: string, data: UpdatePostInput): Promise<Post | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await postsAPI.updatePost(id, data.title, data.content);

      if (response.success && response.data) {
        setPosts(posts.map((p) => (p.id === id ? response.data : p)));
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to update post');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update post';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Delete post
   */
  const deletePost = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await postsAPI.deletePost(id);

      if (response.success) {
        setPosts(posts.filter((p) => p.id !== id));
        return true;
      } else {
        throw new Error(response.error?.message || 'Failed to delete post');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete post';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PostContext.Provider
      value={{
        posts,
        isLoading,
        error,
        fetchPosts,
        fetchPost,
        createPost,
        updatePost,
        deletePost,
      }}
    >
      {children}
    </PostContext.Provider>
  );
};

/**
 * Custom hook to use post context
 */
export const usePosts = () => {
  const context = useContext(PostContext);
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostProvider');
  }
  return context;
};

export default PostContext;