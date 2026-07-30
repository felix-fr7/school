-- ============================================
-- MACVEL School Management Mobile App
-- Complete Database Schema
-- MySQL 8.0+ compatible
-- Roles: Admin, Class (Teacher), Student
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS macvel_school;
USE macvel_school;

-- ============================================
-- Tenants Table (Schools using the system)
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
    id CHAR(36) PRIMARY KEY,  -- UUID
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,  -- School code (e.g., MACVEL001)
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenants_code (code),
    INDEX idx_tenants_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Users Table (All users: Admin, Teachers, Students)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'TEACHER', 'STUDENT') NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_users_tenant (tenant_id),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Classes Table
-- ============================================
CREATE TABLE IF NOT EXISTS classes (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,  -- e.g., "Class 1-A", "Grade 5"
    section VARCHAR(50),  -- e.g., "A", "B", "C"
    grade_level INT NOT NULL,  -- 1-12
    class_teacher_id CHAR(36),  -- Main teacher for this class
    room_number VARCHAR(50),
    capacity INT,
    academic_year VARCHAR(20),  -- e.g., "2024-2025"
    is_active BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (class_teacher_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_classes_tenant (tenant_id),
    INDEX idx_classes_grade (grade_level),
    INDEX idx_classes_teacher (class_teacher_id),
    INDEX idx_classes_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Student Profiles (extends users table)
-- ============================================
CREATE TABLE IF NOT EXISTS student_profiles (
    id CHAR(36) PRIMARY KEY,  -- UUID
    user_id CHAR(36) NOT NULL UNIQUE,
    class_id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    student_id VARCHAR(50),  -- Sequential ID like STU-0001
    roll_number INT,
    admission_number VARCHAR(50),
    date_of_birth DATE,
    gender ENUM('Male', 'Female', 'Other'),
    blood_group VARCHAR(10),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100),
    father_name VARCHAR(255),
    father_phone VARCHAR(50),
    father_occupation VARCHAR(100),
    mother_name VARCHAR(255),
    mother_phone VARCHAR(50),
    mother_occupation VARCHAR(100),
    guardian_name VARCHAR(255),
    guardian_phone VARCHAR(50),
    emergency_contact VARCHAR(50),
    medical_conditions TEXT,
    transport_mode VARCHAR(100),
    is_transport_availed BOOLEAN DEFAULT FALSE,
    admission_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_id (tenant_id, student_id),
    INDEX idx_student_class (class_id),
    INDEX idx_student_tenant (tenant_id),
    INDEX idx_student_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Teacher Profiles (extends users table)
-- ============================================
CREATE TABLE IF NOT EXISTS teacher_profiles (
    id CHAR(36) PRIMARY KEY,  -- UUID
    user_id CHAR(36) NOT NULL UNIQUE,
    tenant_id CHAR(36) NOT NULL,
    teacher_id VARCHAR(50),  -- Sequential ID like TCH-0001
    qualification VARCHAR(255),
    experience_years INT,
    specialization VARCHAR(255),
    subjects TEXT,  -- JSON array of subjects
    date_of_birth DATE,
    gender ENUM('Male', 'Female', 'Other'),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100),
    emergency_contact VARCHAR(50),
    joining_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_teacher_id (tenant_id, teacher_id),
    INDEX idx_teacher_tenant (tenant_id),
    INDEX idx_teacher_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Subjects Table
-- ============================================
CREATE TABLE IF NOT EXISTS subjects (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,  -- e.g., "Mathematics", "Science"
    code VARCHAR(20),  -- e.g., "MATH", "SCI"
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_subjects_tenant (tenant_id),
    INDEX idx_subjects_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Class-Subject Assignment
-- ============================================
CREATE TABLE IF NOT EXISTS class_subjects (
    id CHAR(36) PRIMARY KEY,  -- UUID
    class_id CHAR(36) NOT NULL,
    subject_id CHAR(36) NOT NULL,
    teacher_id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    academic_year VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_class_subject (class_id, subject_id, academic_year),
    INDEX idx_class_subjects_class (class_id),
    INDEX idx_class_subjects_teacher (teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- News & Announcements
-- ============================================
CREATE TABLE IF NOT EXISTS news (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type ENUM('news', 'announcement', 'event', 'holiday', 'emergency', 'academic') DEFAULT 'news',
    image_url TEXT,
    attachment_url TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    publish_date TIMESTAMP NULL,
    expiry_date TIMESTAMP NULL,
    target_audience ENUM('all', 'admin', 'teacher', 'student', 'parent') DEFAULT 'all',
    priority INT DEFAULT 0,  -- Higher = more important
    views_count INT DEFAULT 0,
    created_by CHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_news_tenant (tenant_id),
    INDEX idx_news_published (is_published),
    INDEX idx_news_type (type),
    INDEX idx_news_publish_date (publish_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Messages
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    sender_id CHAR(36) NOT NULL,
    recipient_type ENUM('individual', 'class', 'all_teachers', 'all_students') NOT NULL,
    recipient_id CHAR(36),  -- For individual messages
    class_id CHAR(36),  -- For class messages
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_important BOOLEAN DEFAULT FALSE,
    attachment_url TEXT,
    read_at TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    INDEX idx_messages_tenant (tenant_id),
    INDEX idx_messages_sender (sender_id),
    INDEX idx_messages_recipient (recipient_id),
    INDEX idx_messages_class (class_id),
    INDEX idx_messages_read (is_read),
    INDEX idx_messages_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Homework
-- ============================================
CREATE TABLE IF NOT EXISTS homework (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    class_id CHAR(36) NOT NULL,
    subject_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    attachment_url TEXT,
    due_date DATE NOT NULL,
    is_published BOOLEAN DEFAULT TRUE,
    created_by CHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_homework_class (class_id),
    INDEX idx_homework_subject (subject_id),
    INDEX idx_homework_due_date (due_date),
    INDEX idx_homework_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Homework Submissions
-- ============================================
CREATE TABLE IF NOT EXISTS homework_submissions (
    id CHAR(36) PRIMARY KEY,  -- UUID
    homework_id CHAR(36) NOT NULL,
    student_id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    submission_text TEXT,
    attachment_url TEXT,
    status ENUM('pending', 'submitted', 'graded') DEFAULT 'pending',
    submitted_at TIMESTAMP NULL,
    grade VARCHAR(10),
    remarks TEXT,
    graded_at TIMESTAMP NULL,
    graded_by CHAR(36),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (homework_id) REFERENCES homework(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_homework_student (homework_id, student_id),
    INDEX idx_submissions_homework (homework_id),
    INDEX idx_submissions_student (student_id),
    INDEX idx_submissions_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Exams
-- ============================================
CREATE TABLE IF NOT EXISTS exams (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,  -- e.g., "Unit Test 1", "Annual Exam"
    type ENUM('unit_test', 'quarterly', 'half_yearly', 'annual', 'other') NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_published BOOLEAN DEFAULT FALSE,
    description TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_exams_tenant (tenant_id),
    INDEX idx_exams_type (type),
    INDEX idx_exams_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Exam Schedules
-- ============================================
CREATE TABLE IF NOT EXISTS exam_schedules (
    id CHAR(36) PRIMARY KEY,  -- UUID
    exam_id CHAR(36) NOT NULL,
    class_id CHAR(36) NOT NULL,
    subject_id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    schedule_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(50),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_exam_schedule_exam (exam_id),
    INDEX idx_exam_schedule_class (class_id),
    INDEX idx_exam_schedule_date (schedule_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Marks/Grades
-- ============================================
CREATE TABLE IF NOT EXISTS marks (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    student_id CHAR(36) NOT NULL,
    exam_id CHAR(36) NOT NULL,
    subject_id CHAR(36) NOT NULL,
    marks_obtained DECIMAL(5,2) NOT NULL,
    max_marks DECIMAL(5,2) NOT NULL,
    grade VARCHAR(5),
    remarks TEXT,
    graded_by CHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_mark (student_id, exam_id, subject_id),
    INDEX idx_marks_student (student_id),
    INDEX idx_marks_exam (exam_id),
    INDEX idx_marks_subject (subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Attendance
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    student_id CHAR(36) NOT NULL,
    class_id CHAR(36) NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused', 'holiday') NOT NULL,
    remarks TEXT,
    marked_by CHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (student_id, attendance_date),
    INDEX idx_attendance_student (student_id),
    INDEX idx_attendance_class (class_id),
    INDEX idx_attendance_date (attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Leave Requests
-- ============================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    student_id CHAR(36) NOT NULL,
    class_id CHAR(36) NOT NULL,
    leave_type ENUM('sick', 'personal', 'emergency', 'other') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    attachment_url TEXT,
    applied_by CHAR(36) NOT NULL,  -- Parent or student
    approved_by CHAR(36),
    approved_at TIMESTAMP NULL,
    remarks TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (applied_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_leave_student (student_id),
    INDEX idx_leave_status (status),
    INDEX idx_leave_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Circulars
-- ============================================
CREATE TABLE IF NOT EXISTS circulars (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    circular_number VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type ENUM('academic', 'holiday', 'examination', 'general', 'fee', 'event') NOT NULL,
    attachment_url TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    publish_date DATE,
    target_audience ENUM('all', 'admin', 'teacher', 'student', 'parent') DEFAULT 'all',
    created_by CHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_circulars_tenant (tenant_id),
    INDEX idx_circulars_type (type),
    INDEX idx_circulars_published (is_published),
    INDEX idx_circulars_date (publish_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Timetable (Weekly Schedule)
-- ============================================
CREATE TABLE IF NOT EXISTS timetables (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    class_id CHAR(36) NOT NULL,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    period_number INT NOT NULL,
    subject_id CHAR(36) NOT NULL,
    teacher_id CHAR(36) NOT NULL,
    room_number VARCHAR(50),
    start_time TIME,
    end_time TIME,
    is_active BOOLEAN DEFAULT TRUE,
    academic_year VARCHAR(20),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_timetable (class_id, day_of_week, period_number, academic_year),
    INDEX idx_timetable_class (class_id),
    INDEX idx_timetable_day (day_of_week),
    INDEX idx_timetable_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Academic Calendar Events
-- ============================================
CREATE TABLE IF NOT EXISTS academic_calendar (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type ENUM('holiday', 'exam', 'event', 'meeting', 'program', 'deadline') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern VARCHAR(50),  -- e.g., "yearly", "monthly"
    target_audience ENUM('all', 'admin', 'teacher', 'student', 'parent') DEFAULT 'all',
    color VARCHAR(20) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_calendar_tenant (tenant_id),
    INDEX idx_calendar_type (event_type),
    INDEX idx_calendar_dates (start_date, end_date),
    INDEX idx_calendar_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Photo Albums
-- ============================================
CREATE TABLE IF NOT EXISTS photo_albums (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    event_date DATE,
    is_published BOOLEAN DEFAULT FALSE,
    created_by CHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_albums_tenant (tenant_id),
    INDEX idx_albums_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Photos
-- ============================================
CREATE TABLE IF NOT EXISTS photos (
    id CHAR(36) PRIMARY KEY,  -- UUID
    album_id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    image_url TEXT NOT NULL,
    caption TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (album_id) REFERENCES photo_albums(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_photos_album (album_id),
    INDEX idx_photos_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Videos
-- ============================================
CREATE TABLE IF NOT EXISTS videos (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,  -- Can be YouTube/Vimeo link or uploaded file
    thumbnail_url TEXT,
    duration INT,  -- Duration in seconds
    category ENUM('educational', 'event', 'classroom', 'program', 'other') DEFAULT 'educational',
    is_published BOOLEAN DEFAULT FALSE,
    views_count INT DEFAULT 0,
    uploaded_by CHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_videos_tenant (tenant_id),
    INDEX idx_videos_category (category),
    INDEX idx_videos_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Voice Messages
-- ============================================
CREATE TABLE IF NOT EXISTS voice_messages (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    audio_url TEXT NOT NULL,
    duration INT,  -- Duration in seconds
    type ENUM('principal', 'teacher', 'emergency', 'announcement') DEFAULT 'announcement',
    target_audience ENUM('all', 'admin', 'teacher', 'student', 'parent') DEFAULT 'all',
    is_published BOOLEAN DEFAULT FALSE,
    created_by CHAR(36) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_voice_tenant (tenant_id),
    INDEX idx_voice_type (type),
    INDEX idx_voice_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- School Contacts
-- ============================================
CREATE TABLE IF NOT EXISTS school_contacts (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    department VARCHAR(100),  -- e.g., "Administration", "Transport", "Accounts"
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_contacts_tenant (tenant_id),
    INDEX idx_contacts_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Notification Tokens (for push notifications)
-- ============================================
CREATE TABLE IF NOT EXISTS notification_tokens (
    id CHAR(36) PRIMARY KEY,  -- UUID
    user_id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    token TEXT NOT NULL,
    platform ENUM('web', 'android', 'ios') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tokens_user (user_id),
    INDEX idx_tokens_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Audit Log
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
    id CHAR(36) PRIMARY KEY,  -- UUID
    tenant_id CHAR(36) NOT NULL,
    user_id CHAR(36),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id CHAR(36),
    old_value TEXT,  -- JSON
    new_value TEXT,  -- JSON
    ip_address VARCHAR(50),
    user_agent TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_tenant (tenant_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Insert Default Tenant (MACVEL School)
-- ============================================
INSERT INTO tenants (id, name, code, address, phone, email, website, is_active) 
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'MACVEL School',
    'MACVEL001',
    '123 Education Street, Knowledge City',
    '+91 9876543210',
    'info@macvelschool.com',
    'https://www.macvelschool.com',
    TRUE
);

-- ============================================
-- Insert Default Admin User
-- ============================================
-- Password: admin123 (hashed with bcrypt cost 10)
INSERT INTO users (id, tenant_id, email, phone, password, name, role, is_active) 
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@macvelschool.com',
    '+91 9876543210',
    '$2b$10$E2sYjR8hN9kLmPqR5tUvW.XyZ1aBcDeFgHiJkLmNoPqRsTuVwXyZ',
    'Admin',
    'ADMIN',
    TRUE
);

-- ============================================
-- Useful Views
-- ============================================

-- Active Students View
CREATE OR REPLACE VIEW active_students AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.phone,
    u.avatar_url,
    sp.student_id,
    sp.roll_number,
    sp.class_id,
    c.name as class_name,
    c.section,
    sp.date_of_birth,
    sp.gender,
    sp.father_name,
    sp.father_phone,
    sp.mother_name,
    sp.mother_phone
FROM users u
JOIN student_profiles sp ON u.id = sp.user_id
JOIN classes c ON sp.class_id = c.id
WHERE u.role = 'STUDENT' AND u.is_active = TRUE AND sp.is_active = TRUE;

-- Active Teachers View
CREATE OR REPLACE VIEW active_teachers AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.phone,
    u.avatar_url,
    tp.teacher_id,
    tp.qualification,
    tp.specialization,
    tp.subjects
FROM users u
JOIN teacher_profiles tp ON u.id = tp.user_id
WHERE u.role = 'TEACHER' AND u.is_active = TRUE AND tp.is_active = TRUE;

-- Class Summary View
CREATE OR REPLACE VIEW class_summary AS
SELECT 
    c.id,
    c.name,
    c.section,
    c.grade_level,
    c.room_number,
    c.capacity,
    ct.name as class_teacher_name,
    COUNT(DISTINCT sp.user_id) as student_count
FROM classes c
LEFT JOIN users ct ON c.class_teacher_id = ct.id
LEFT JOIN student_profiles sp ON c.id = sp.class_id AND sp.is_active = TRUE
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.section, c.grade_level, c.room_number, c.capacity, ct.name;

-- ============================================
-- Database Maintenance
-- ============================================

-- Optimize tables
-- OPTIMIZE TABLE users;
-- OPTIMIZE TABLE classes;
-- OPTIMIZE TABLE attendance;

-- Check table status
-- SHOW TABLE STATUS;

-- View database size
-- SELECT 
--     table_name AS table_name,
--     ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
-- FROM information_schema.tables
-- WHERE table_schema = 'macvel_school'
-- ORDER BY (data_length + index_length) DESC;