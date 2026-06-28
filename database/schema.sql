-- ============================================
-- Full-Stack App Database Schema
-- MySQL 8.0+ compatible
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS fullstack_app;
USE fullstack_app;

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,  -- UUID
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Posts Table
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
    id CHAR(36) PRIMARY KEY,  -- UUID
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    userId CHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_posts_userId (userId),
    INDEX idx_posts_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================
-- Note: Password is hashed using bcrypt with cost factor 10
-- Password: "password123"
-- INSERT INTO users (id, email, password, name) VALUES 
-- ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', '$2b$10$YourHashedPasswordHere', 'Test User');

-- ============================================
-- Useful Queries for Testing
-- ============================================

-- Get all users with their posts count
-- SELECT u.*, COUNT(p.id) as postCount 
-- FROM users u 
-- LEFT JOIN posts p ON u.id = p.userId 
-- GROUP BY u.id;

-- Get all posts with user information
-- SELECT p.*, u.name as authorName, u.email as authorEmail 
-- FROM posts p 
-- JOIN users u ON p.userId = u.id 
-- ORDER BY p.createdAt DESC;

-- ============================================
-- Database Maintenance
-- ============================================

-- Optimize tables
-- OPTIMIZE TABLE users;
-- OPTIMIZE TABLE posts;

-- Check table status
-- SHOW TABLE STATUS;

-- View database size
-- SELECT 
--     table_name AS table_name,
--     ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
-- FROM information_schema.tables
-- WHERE table_schema = 'fullstack_app'
-- ORDER BY (data_length + index_length) DESC;